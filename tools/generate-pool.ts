#!/usr/bin/env -S node --experimental-strip-types
// Synthetic pool CLI (TS twin of scripts/generate_pool.py).
// Run via `pnpm tsx tools/generate-pool.ts ...`.
//
// Produces byte-identical CSV to the Python generator for the same
// --size, --seed, --tightness, --community.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { generatePool, PROFILES, rowsToCsv } from '../packages/core/src/index';

interface CliArgs {
  size: number;
  seed: number;
  tightness: number;
  community: string;
  out: string;
}

function parseArgs(argv: string[]): CliArgs {
  const opts: Partial<CliArgs> = { tightness: 0.7, seed: 42, community: 'kleinstadt-bezirkshauptort' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    switch (k) {
      case '--size':
        opts.size = Number(v);
        i++;
        break;
      case '--seed':
        opts.seed = Number(v);
        i++;
        break;
      case '--tightness':
        opts.tightness = Number(v);
        i++;
        break;
      case '--community':
        opts.community = v;
        i++;
        break;
      case '--out':
        opts.out = v;
        i++;
        break;
      default:
        throw new Error(`unknown arg: ${k}`);
    }
  }
  if (opts.size === undefined || !opts.out) {
    throw new Error('usage: generate-pool --size N --out PATH [--seed S] [--tightness T] [--community C]');
  }
  return opts as CliArgs;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const profile = PROFILES[args.community];
  if (!profile) {
    const valid = Object.keys(PROFILES).sort().join(', ');
    throw new Error(`unknown community: ${args.community}. Valid: ${valid}`);
  }
  const rows = generatePool({
    profile,
    size: args.size,
    seed: args.seed,
    tightness: args.tightness,
  });
  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, rowsToCsv(rows), 'utf-8');
}

main();
