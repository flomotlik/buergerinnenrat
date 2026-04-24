// Iteration-1 CLI for the panel ops (issues 21, 22, 23). Acts on a previously
// produced RunResult JSON (e.g. from scripts/run_engine_a.ts) and emits a new
// RunResult-shaped JSON describing the updated panel.

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  EngineA,
  replaceSinglePerson,
  extendBy,
  type ExtendResult,
  type ReplaceResult,
} from '../packages/engine-a/src/index';
import type { Pool, Quotas } from '../packages/engine-contract/src/index';

interface CliArgs {
  command: 'reroll' | 'replace' | 'extend';
  pool: string;
  quotas: string;
  panel?: string; // path to a json containing { selected: [...] }
  removed?: string;
  seed: number;
  out: string;
  newQuotas?: string;
}

function parse(argv: string[]): CliArgs {
  const cmd = argv[0];
  if (!cmd) throw new Error('usage: <reroll|replace|extend> [opts]');
  const opts: Partial<CliArgs> = { seed: 1 };
  for (let i = 1; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--pool') opts.pool = v;
    else if (k === '--quotas') opts.quotas = v;
    else if (k === '--panel') opts.panel = v;
    else if (k === '--removed') opts.removed = v;
    else if (k === '--seed') opts.seed = Number(v);
    else if (k === '--out') opts.out = v;
    else if (k === '--new-quotas') opts.newQuotas = v;
    if (k && k.startsWith('--')) i++;
  }
  if (!opts.pool || !opts.quotas || !opts.out) {
    throw new Error('required: --pool --quotas --out');
  }
  return { ...(opts as CliArgs), command: cmd as CliArgs['command'] };
}

function readPool(csvPath: string): Pool {
  const text = readFileSync(csvPath, 'utf-8');
  const lines = text.trim().split('\n');
  const headers = lines[0]!.split(',');
  const people = lines.slice(1).map((line) => {
    const fields = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = fields[i] ?? ''));
    return { ...row, person_id: row['person_id']! };
  });
  return { id: csvPath, people };
}

(async () => {
  const args = parse(process.argv.slice(2));
  const pool = readPool(args.pool);
  const quotas = JSON.parse(readFileSync(args.quotas, 'utf-8')) as Quotas;
  let payload: Record<string, unknown> = {};

  if (args.command === 'reroll') {
    const engine = new EngineA();
    let result;
    for await (const ev of engine.run({
      pool,
      quotas,
      params: { seed: args.seed, algorithm: 'maximin' },
    })) {
      if (ev.type === 'done') result = ev.result;
    }
    payload = { command: 'reroll', seed: args.seed, result };
  } else if (args.command === 'replace') {
    if (!args.panel || !args.removed) throw new Error('replace needs --panel and --removed');
    const panelDoc = JSON.parse(readFileSync(args.panel, 'utf-8'));
    const panel: string[] = panelDoc.result?.selected ?? panelDoc.selected;
    const r: ReplaceResult = await replaceSinglePerson({
      pool,
      panel,
      removed: args.removed,
      quotas,
      seed: args.seed,
    });
    payload = { command: 'replace', removed: args.removed, ...r };
  } else if (args.command === 'extend') {
    if (!args.panel || !args.newQuotas) throw new Error('extend needs --panel and --new-quotas');
    const panelDoc = JSON.parse(readFileSync(args.panel, 'utf-8'));
    const panel: string[] = panelDoc.result?.selected ?? panelDoc.selected;
    const newQuotas = JSON.parse(readFileSync(args.newQuotas, 'utf-8')) as Quotas;
    const r: ExtendResult = await extendBy({
      pool,
      panel,
      newQuotas,
      seed: args.seed,
    });
    payload = { command: 'extend', original_size: panel.length, ...r };
  } else {
    throw new Error(`unknown command: ${args.command}`);
  }

  mkdirSync(dirname(resolve(args.out)), { recursive: true });
  writeFileSync(args.out, JSON.stringify(payload, null, 2));
  process.stderr.write(`${args.command}: wrote ${args.out}\n`);
})();
