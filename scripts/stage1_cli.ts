// CLI wrapper around Stage 1 stratify: read CSV, run stratify(), emit JSON.
// Used by the cross-runtime validation harness to compare TS vs Python.
//
// Usage:
//   pnpm exec tsx scripts/stage1_cli.ts \
//     --input pool.csv --axes district,age_band,gender \
//     --target-n 300 --seed 42 --out result.json

import { readFileSync, writeFileSync } from 'node:fs';
import { stratify } from '../packages/core/src/stage1/index';

interface CliArgs {
  input: string;
  axes: string[];
  targetN: number;
  seed: number;
  out: string | null;
}

function parse(argv: string[]): CliArgs {
  const opts: Partial<CliArgs> = { out: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--input') opts.input = v;
    else if (k === '--axes') opts.axes = v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];
    else if (k === '--target-n') opts.targetN = Number(v);
    else if (k === '--seed') opts.seed = Number(v);
    else if (k === '--out') opts.out = v;
    if (k && k.startsWith('--')) i++;
  }
  if (!opts.input || opts.axes === undefined || opts.targetN === undefined || opts.seed === undefined) {
    throw new Error('usage: --input <csv> --axes a,b,c --target-n N --seed N [--out <json>]');
  }
  return opts as CliArgs;
}

function readCsvAsRows(path: string): Record<string, string>[] {
  // Minimal CSV reader for the validation fixtures (no embedded quotes).
  // The real upload path uses parseCsvFile in apps/web; here we don't need
  // the heavy parser because all test fixtures are simple comma CSV.
  const text = readFileSync(path, 'utf-8');
  // Strip BOM if present.
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines = clean.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0]!.split(',');
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i]!.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = fields[j] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function main(): void {
  const args = parse(process.argv.slice(2));
  const rows = readCsvAsRows(args.input);
  const result = stratify(rows, { axes: args.axes, targetN: args.targetN, seed: args.seed });
  const out = JSON.stringify(result, null, 2);
  if (args.out) {
    writeFileSync(args.out, out, 'utf-8');
  } else {
    process.stdout.write(out + '\n');
  }
}

main();
