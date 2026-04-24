// CLI wrapper around Engine A: read pool CSV + quotas JSON, run engine,
// emit a RunResult JSON. Used by the comparison harness to drive engine A
// from the shell without spinning up a browser.

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { EngineA } from '../packages/engine-a/src/index';
import type { Pool, Quotas, RunResult } from '../packages/engine-contract/src/index';

interface CliArgs {
  pool: string;
  quotas: string;
  seed: number;
  out: string;
}

function parse(argv: string[]): CliArgs {
  const opts: Partial<CliArgs> = { seed: 42 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--pool') opts.pool = v;
    else if (k === '--quotas') opts.quotas = v;
    else if (k === '--seed') opts.seed = Number(v);
    else if (k === '--out') opts.out = v;
    if (k && k.startsWith('--')) i++;
  }
  if (!opts.pool || !opts.quotas || !opts.out) {
    throw new Error('usage: --pool <csv> --quotas <json> --seed N --out <json>');
  }
  return opts as CliArgs;
}

function readPool(csvPath: string): Pool {
  const text = readFileSync(csvPath, 'utf-8');
  const lines = text.trim().split('\n');
  const headers = lines[0]!.split(',');
  const people = lines.slice(1).map((line) => {
    const fields = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = fields[i] ?? ''));
    if (!row['person_id']) throw new Error('CSV missing person_id column');
    return { ...row, person_id: row['person_id']! };
  });
  return { id: csvPath, people };
}

(async () => {
  const args = parse(process.argv.slice(2));
  const pool = readPool(args.pool);
  const quotas = JSON.parse(readFileSync(args.quotas, 'utf-8')) as Quotas;
  const t0 = performance.now();
  const engine = new EngineA();
  let result: RunResult | null = null;
  let error: { code: string; message: string } | null = null;
  for await (const ev of engine.run({
    pool,
    quotas,
    params: { seed: args.seed, algorithm: 'maximin' },
  })) {
    if (ev.type === 'done') result = ev.result;
    if (ev.type === 'error') error = { code: ev.code, message: ev.message };
  }
  const t1 = performance.now();
  const payload = {
    schema_version: '0.1',
    input: {
      pool_csv: args.pool,
      quotas_json: args.quotas,
      pool_size: pool.people.length,
      panel_size: quotas.panel_size,
      seed: args.seed,
    },
    result,
    error,
    duration_ms: t1 - t0,
  };
  mkdirSync(dirname(resolve(args.out)), { recursive: true });
  writeFileSync(args.out, JSON.stringify(payload, null, 2));
  if (result) {
    const ms = t1 - t0;
    process.stderr.write(
      `engine-a: panel=${result.selected.length}, |C|=${result.timing.num_committees}, t=${ms.toFixed(0)}ms\n`,
    );
  } else if (error) {
    process.stderr.write(`engine-a error: ${error.code}: ${error.message}\n`);
    process.exit(1);
  }
})();
