// Derive a Stage-3 Antwortenden-Liste from a Versand-Liste CSV.
// Adds two self-report columns (bildung, migrationshintergrund) per
// person, weighted by age + cluster heuristic. Deterministic via the
// supplied seed.
//
//   pnpm tsx scripts/synthetic-meldedaten/derive-antwortende.ts \
//       --input apps/web/public/beispiele/herzogenburg-versand-300.csv \
//       --output apps/web/public/beispiele/herzogenburg-antwortende-60.csv \
//       --n 60 --seed 4711

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { Mulberry32 } from '../../packages/core/src/pool/mulberry32';
import { loadClusterPools } from './cluster-pool';

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

const HERE = dirname(new URL(import.meta.url).pathname);
const NAMES_DIR = resolve(HERE, 'names');

const BILDUNG_VALUES = ['pflicht', 'lehre', 'matura', 'hochschul'] as const;
const MIGRATION_VALUES = ['keiner', 'erste-generation', 'zweite-generation'] as const;

function pickWeighted<T>(rng: Mulberry32, items: readonly T[], weights: number[]): T {
  let total = 0;
  for (const w of weights) total += w;
  const r = rng.nextFloat() * total;
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += weights[i]!;
    if (r < acc) return items[i]!;
  }
  return items[items.length - 1]!;
}

function deriveAntwortende(args: CliArgs): void {
  let text = readFileSync(args.input, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) throw new Error(`Empty CSV: ${args.input}`);

  const headerCells = parseCsvLine(lines[0]!);
  const rows = lines.slice(1).map((l) => parseCsvLine(l));

  const idxVorname = headerCells.indexOf('vorname');
  const idxGeburts = headerCells.indexOf('geburtsjahr');
  if (idxVorname < 0 || idxGeburts < 0) {
    throw new Error('Input CSV missing vorname or geburtsjahr');
  }

  const pools = loadClusterPools(NAMES_DIR);
  const trVornamen = new Set([...pools.tr.vornamen_w, ...pools.tr.vornamen_m]);
  const exYuVornamen = new Set([
    ...pools['ex-yu'].vornamen_w,
    ...pools['ex-yu'].vornamen_m,
  ]);
  const ostVornamen = new Set([
    ...pools.osteuropa.vornamen_w,
    ...pools.osteuropa.vornamen_m,
  ]);

  const rng = new Mulberry32(args.seed);

  // Fisher-Yates shuffle indices for deterministic sampling.
  const indices = rows.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng.nextFloat() * (i + 1));
    const tmp = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = tmp;
  }
  const picked = indices.slice(0, Math.min(args.n, indices.length));

  // Sort picked back to original order so the output CSV reads cleanly.
  picked.sort((a, b) => a - b);

  // Append bildung + migrationshintergrund columns.
  const newHeader = headerCells.concat(['bildung', 'migrationshintergrund']);
  const outLines: string[] = [];
  outLines.push(newHeader.join(','));
  for (const i of picked) {
    const r = rows[i]!;
    const vorname = r[idxVorname] ?? '';
    const year = Number.parseInt(r[idxGeburts] ?? '0', 10);
    const age = 2026 - year;
    const young = age < 35;
    const bildungWeights = young
      ? [0.12, 0.32, 0.32, 0.24]
      : [0.25, 0.45, 0.2, 0.1];
    const bildung = pickWeighted(rng, BILDUNG_VALUES, bildungWeights);

    let migWeights = [0.95, 0.03, 0.02];
    if (trVornamen.has(vorname)) migWeights = [0.15, 0.25, 0.6];
    else if (exYuVornamen.has(vorname)) migWeights = [0.25, 0.3, 0.45];
    else if (ostVornamen.has(vorname)) migWeights = [0.4, 0.4, 0.2];
    const mig = pickWeighted(rng, MIGRATION_VALUES, migWeights);

    outLines.push(r.concat([bildung, mig]).join(','));
  }
  const outText = outLines.join('\n') + '\n';
  mkdirSync(dirname(args.output), { recursive: true });
  writeFileSync(args.output, outText, 'utf8');
  process.stderr.write(
    `[derive-antwortende] Selected ${picked.length} rows into ${args.output}\n`,
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
    deriveAntwortende(args);
  } catch (err) {
    process.stderr.write(`[derive-antwortende] ${(err as Error).message}\n`);
    process.exit(1);
  }
}
