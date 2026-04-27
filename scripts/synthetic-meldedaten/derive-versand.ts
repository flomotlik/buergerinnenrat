// Derive a stratified Versand-Liste from a Stage-1 melderegister CSV.
// Stratification axes: sprengel × geburtsjahr-band (4 buckets) × geschlecht.
// Allocation via Hamilton (largest-remainder) on the cross-product, then
// uniform random pick within each cell using Mulberry32 — fully
// deterministic given an input file + seed.
//
//   pnpm tsx scripts/synthetic-meldedaten/derive-versand.ts \
//       --input apps/web/public/beispiele/herzogenburg-melderegister-8000.csv \
//       --output apps/web/public/beispiele/herzogenburg-versand-300.csv \
//       --n 300 --seed 4711

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Mulberry32 } from '../../packages/core/src/pool/mulberry32';

interface Row {
  raw: string;
  cells: string[];
}

interface CliArgs {
  input: string;
  output: string;
  n: number;
  seed: number;
}

function parseArgs(argv: string[]): CliArgs {
  const out: Partial<CliArgs> = { seed: 4711 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--input':
        out.input = argv[++i];
        break;
      case '--output':
        out.output = argv[++i];
        break;
      case '--n': {
        const v = Number.parseInt(argv[++i] ?? '', 10);
        if (!Number.isFinite(v) || v <= 0) throw new Error('--n must be positive integer');
        out.n = v;
        break;
      }
      case '--seed': {
        const v = Number.parseInt(argv[++i] ?? '', 10);
        if (!Number.isFinite(v)) throw new Error('--seed must be a number');
        out.seed = v >>> 0;
        break;
      }
      default:
        throw new Error(`Unknown arg: ${a}`);
    }
  }
  if (!out.input) throw new Error('--input is required');
  if (!out.output) throw new Error('--output is required');
  if (out.n === undefined) throw new Error('--n is required');
  return out as CliArgs;
}

// Minimal CSV reader (LF or CRLF, conservative quote handling). The generator
// output never contains quoted fields with embedded commas/newlines for the
// columns we care about, so we keep this small.
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  let cur = '';
  let inQuote = false;
  while (i < line.length) {
    const c = line.charAt(i);
    if (inQuote) {
      if (c === '"') {
        if (line.charAt(i + 1) === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQuote = false;
        i++;
        continue;
      }
      cur += c;
      i++;
    } else {
      if (c === ',') {
        out.push(cur);
        cur = '';
        i++;
        continue;
      }
      if (c === '"') {
        inQuote = true;
        i++;
        continue;
      }
      cur += c;
      i++;
    }
  }
  out.push(cur);
  return out;
}

function readCsv(path: string): { header: string; rows: Row[] } {
  let text = readFileSync(path, 'utf8');
  // Strip BOM.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) throw new Error(`Empty CSV: ${path}`);
  const header = lines[0]!;
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i]!;
    rows.push({ raw, cells: parseCsvLine(raw) });
  }
  return { header, rows };
}

function geburtsjahrBand(year: number): string {
  const age = 2026 - year;
  if (age < 30) return 'lt30';
  if (age < 50) return '30-49';
  if (age < 70) return '50-69';
  return 'gte70';
}

interface StratumKey {
  sprengel: string;
  band: string;
  geschlecht: string;
}

function keyToString(k: StratumKey): string {
  return `${k.sprengel}|${k.band}|${k.geschlecht}`;
}

interface CellAlloc {
  key: StratumKey;
  members: number[];
  target: number;
}

function hamiltonAllocate(
  totalUnits: number,
  cells: { key: string; share: number }[],
): Map<string, number> {
  const out = new Map<string, number>();
  let total = 0;
  for (const c of cells) total += c.share;
  if (total <= 0) return out;
  const exact: { key: string; integer: number; remainder: number }[] = [];
  let assigned = 0;
  for (const c of cells) {
    const proportional = (totalUnits * c.share) / total;
    const integer = Math.floor(proportional);
    exact.push({ key: c.key, integer, remainder: proportional - integer });
    assigned += integer;
  }
  let leftover = totalUnits - assigned;
  exact.sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder;
    return a.key < b.key ? -1 : 1;
  });
  for (const e of exact) {
    let extra = 0;
    if (leftover > 0) {
      extra = 1;
      leftover--;
    }
    out.set(e.key, e.integer + extra);
  }
  return out;
}

function deriveVersand(args: CliArgs): void {
  const { header, rows } = readCsv(args.input);
  const headerCells = parseCsvLine(header);
  const idxSprengel = headerCells.indexOf('sprengel');
  const idxGeburts = headerCells.indexOf('geburtsjahr');
  const idxGeschlecht = headerCells.indexOf('geschlecht');
  if (idxSprengel < 0 || idxGeburts < 0 || idxGeschlecht < 0) {
    throw new Error('Input CSV missing one of: sprengel, geburtsjahr, geschlecht');
  }

  // Bucket rows by stratum key, sorted for determinism.
  const buckets = new Map<string, number[]>();
  const keyForString = new Map<string, StratumKey>();
  for (let i = 0; i < rows.length; i++) {
    const c = rows[i]!.cells;
    const sprengel = c[idxSprengel] ?? '';
    const year = Number.parseInt(c[idxGeburts] ?? '0', 10);
    const band = geburtsjahrBand(year);
    const geschlecht = c[idxGeschlecht] ?? '';
    const key: StratumKey = { sprengel, band, geschlecht };
    const ks = keyToString(key);
    keyForString.set(ks, key);
    let arr = buckets.get(ks);
    if (!arr) {
      arr = [];
      buckets.set(ks, arr);
    }
    arr.push(i);
  }

  // Hamilton allocate args.n across buckets proportional to size.
  const cells = Array.from(buckets.entries())
    .map(([k, ms]) => ({ key: k, share: ms.length }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));
  const allocation = hamiltonAllocate(args.n, cells);

  const rng = new Mulberry32(args.seed);
  const selected: number[] = [];
  for (const c of cells) {
    const target = Math.min(allocation.get(c.key) ?? 0, buckets.get(c.key)!.length);
    if (target === 0) continue;
    const members = buckets.get(c.key)!.slice();
    // Fisher-Yates shuffle then slice — deterministic.
    for (let i = members.length - 1; i > 0; i--) {
      const j = Math.floor(rng.nextFloat() * (i + 1));
      const tmp = members[i]!;
      members[i] = members[j]!;
      members[j] = tmp;
    }
    for (let i = 0; i < target; i++) selected.push(members[i]!);
    void keyForString; // kept for future debug if needed
  }

  // Sort selected by original row index to preserve the master CSV's order.
  selected.sort((a, b) => a - b);

  // Write output: header + selected rows verbatim.
  const lines: string[] = [];
  lines.push(header);
  for (const idx of selected) lines.push(rows[idx]!.raw);
  const text = lines.join('\n') + '\n';

  const cellsRef: CellAlloc[] = []; // satisfy unused warning
  void cellsRef;

  mkdirSync(dirname(args.output), { recursive: true });
  writeFileSync(args.output, text, 'utf8');
  process.stderr.write(
    `[derive-versand] Selected ${selected.length} rows into ${args.output}\n`,
  );
}

const isMain = (() => {
  try {
    const argvUrl = process.argv[1] ? new URL(`file://${resolve(process.argv[1])}`).href : '';
    return import.meta.url === argvUrl;
  } catch {
    return false;
  }
})();

if (isMain) {
  try {
    const args = parseArgs(process.argv);
    deriveVersand(args);
  } catch (err) {
    process.stderr.write(`[derive-versand] ${(err as Error).message}\n`);
    process.exit(1);
  }
}

void fileURLToPath; // silence "unused" if isMain check refactors
