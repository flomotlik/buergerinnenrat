// Synthetic Meldedaten generator CLI. Run with:
//   pnpm tsx scripts/synthetic-meldedaten/generator.ts \
//       --profile herzogenburg \
//       --output apps/web/public/beispiele/herzogenburg-melderegister-8000.csv \
//       --seed 4711
//
// Pure Node — no browser imports. All randomness is funneled through a
// single Mulberry32 instance so the byte output is deterministic for any
// given (profile, seed) pair.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Mulberry32 } from '../../packages/core/src/pool/mulberry32';
import { loadClusterPools, pickName } from './cluster-pool';
import { buildHousehold } from './household-builder';
import { writeCsv } from './csv-writer';
import { isProfile, type Person, type Profile } from './types';

const HERE = dirname(fileURLToPath(import.meta.url));
const NAMES_DIR = resolve(HERE, 'names');
const PROFILES_DIR = resolve(HERE, 'profiles');
const NOE_AVG_HOUSEHOLD_SIZE = 2.16;

interface CliArgs {
  profile?: string;
  config?: string;
  output?: string;
  seed: number;
  bom: boolean;
  extraFields: 'none' | 'self-report';
  limit?: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    seed: 4711,
    bom: false,
    extraFields: 'none',
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--profile': {
        const v = argv[++i];
        if (v === undefined) throw new Error('--profile requires a value');
        args.profile = v;
        break;
      }
      case '--config': {
        const v = argv[++i];
        if (v === undefined) throw new Error('--config requires a value');
        args.config = v;
        break;
      }
      case '--output': {
        const v = argv[++i];
        if (v === undefined) throw new Error('--output requires a value');
        args.output = v;
        break;
      }
      case '--seed': {
        const v = Number.parseInt(argv[++i] ?? '', 10);
        if (!Number.isFinite(v)) throw new Error(`Invalid --seed value: ${argv[i]}`);
        args.seed = v >>> 0;
        break;
      }
      case '--bom':
        args.bom = true;
        break;
      case '--extra-fields': {
        const v = argv[++i];
        if (v !== 'none' && v !== 'self-report') {
          throw new Error(`--extra-fields must be 'none' or 'self-report', got ${v}`);
        }
        args.extraFields = v;
        break;
      }
      case '--limit': {
        const v = Number.parseInt(argv[++i] ?? '', 10);
        if (!Number.isFinite(v) || v <= 0) {
          throw new Error(`Invalid --limit value: ${argv[i]}`);
        }
        args.limit = v;
        break;
      }
      default:
        throw new Error(`Unknown argument: ${a}`);
    }
  }
  return args;
}

function loadProfile(args: CliArgs): Profile {
  let path: string;
  if (args.config) {
    path = resolve(args.config);
  } else if (args.profile) {
    path = resolve(PROFILES_DIR, `${args.profile}.json`);
  } else {
    throw new Error('Either --profile or --config must be provided');
  }
  const raw = readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  isProfile(parsed); // throws TypeError on mismatch
  return parsed as Profile;
}

// ---------------------------------------------------------------------------
// Hamilton allocation: distribute totalHouseholds across KGs proportional
// to populationShare with deterministic remainder distribution.
// ---------------------------------------------------------------------------

function hamiltonAllocate(
  totalUnits: number,
  shares: { id: string; share: number }[],
): Map<string, number> {
  const result = new Map<string, number>();
  // Sort shares by id for determinism — caller already sorts but we
  // reaffirm here so the function is self-contained.
  const sortedShares = shares.slice().sort((a, b) => (a.id < b.id ? -1 : 1));
  let totalShare = 0;
  for (const s of sortedShares) totalShare += s.share;
  if (totalShare <= 0) return result;

  const exact: { id: string; integer: number; remainder: number }[] = [];
  let assigned = 0;
  for (const s of sortedShares) {
    const proportional = (totalUnits * s.share) / totalShare;
    const integer = Math.floor(proportional);
    const remainder = proportional - integer;
    exact.push({ id: s.id, integer, remainder });
    assigned += integer;
  }
  // Remaining slots go to the largest remainders — ties broken by id.
  let leftover = totalUnits - assigned;
  exact.sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder;
    return a.id < b.id ? -1 : 1;
  });
  for (const e of exact) {
    let extra = 0;
    if (leftover > 0) {
      extra = 1;
      leftover--;
    }
    result.set(e.id, e.integer + extra);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Self-report extra fields (bildung + migrationshintergrund). Deterministic
// via the same Mulberry32 instance.
// ---------------------------------------------------------------------------

const BILDUNG_VALUES = ['pflicht', 'lehre', 'matura', 'hochschul'] as const;
const MIGRATION_VALUES = ['keiner', 'erste-generation', 'zweite-generation'] as const;

function pickWeighted<T>(rng: Mulberry32, items: T[], weights: number[]): T {
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

function applySelfReport(
  rng: Mulberry32,
  persons: Person[],
  pools: ReturnType<typeof loadClusterPools>,
  refYear: number,
): void {
  // Index name pools so we can infer cluster from vorname (best-effort).
  const trVornamen = new Set([...pools.tr.vornamen_w, ...pools.tr.vornamen_m]);
  const exYuVornamen = new Set([
    ...pools['ex-yu'].vornamen_w,
    ...pools['ex-yu'].vornamen_m,
  ]);
  const ostVornamen = new Set([
    ...pools.osteuropa.vornamen_w,
    ...pools.osteuropa.vornamen_m,
  ]);

  for (const p of persons) {
    const age = refYear - p.geburtsjahr;
    // Bildung: weights tilt towards higher education for younger cohorts.
    const young = age < 35;
    const bildungWeights = young
      ? [0.12, 0.32, 0.32, 0.24]
      : [0.25, 0.45, 0.2, 0.1];
    p.bildung = pickWeighted(rng, [...BILDUNG_VALUES], bildungWeights);

    // Migration: heuristic by vorname cluster.
    let migWeights = [0.95, 0.03, 0.02];
    if (trVornamen.has(p.vorname)) migWeights = [0.15, 0.25, 0.6];
    else if (exYuVornamen.has(p.vorname)) migWeights = [0.25, 0.3, 0.45];
    else if (ostVornamen.has(p.vorname)) migWeights = [0.4, 0.4, 0.2];
    p.migrationshintergrund = pickWeighted(rng, [...MIGRATION_VALUES], migWeights);
  }
}

// ---------------------------------------------------------------------------
// Core generation entry — also re-exported for unit / integration tests.
// ---------------------------------------------------------------------------

export interface GenerateResult {
  persons: Person[];
  csv: string;
  summary: string;
}

export interface GenerateOptions {
  profile: Profile;
  seed: number;
  bom?: boolean;
  extraFields?: 'none' | 'self-report';
  limit?: number;
  referenceYear?: number;
}

export function generate(options: GenerateOptions): GenerateResult {
  const refYear = options.referenceYear ?? 2026;
  const profile = options.profile;
  const rng = new Mulberry32(options.seed);
  const pools = loadClusterPools(NAMES_DIR);

  // Compute expected mean household size from the household-size
  // distribution. Using the NÖ average (2.16) as a fallback creates a
  // systematic over-allocation because the distribution-derived mean is
  // higher (~2.25), which would force a large tail trim that skips the
  // alphabetically-last KG entirely.
  let expectedMeanSize = 0;
  for (const k of [1, 2, 3, 4, 5, 6] as const) {
    expectedMeanSize += k * profile.householdDistribution[k];
  }
  if (expectedMeanSize <= 0) expectedMeanSize = NOE_AVG_HOUSEHOLD_SIZE;
  const totalHouseholds = Math.round(profile.totalPopulation / expectedMeanSize);

  // Allocate households per KG via Hamilton on populationShare.
  const kgShares = profile.katastralgemeinden.map((kg) => ({
    id: kg.id,
    share: kg.populationShare,
  }));
  const householdsPerKg = hamiltonAllocate(totalHouseholds, kgShares);

  // Per KG: pick sprengel for each household. sprengel pool comes from
  // profile.sprengel filtered by katastralgemeindeId, sorted by id. KGs
  // without their own sprengel fall back to the first sprengel in the
  // profile (id-sorted) — this matches the real Herzogenburg layout where
  // small outlying KGs are merged into a neighbouring Wahlsprengel.
  const allSprengel = (profile.sprengel ?? []).map((s) => s.id).sort();
  const fallbackSprengel = allSprengel[0];
  const sprengelByKg = new Map<string, string[]>();
  for (const kg of profile.katastralgemeinden) {
    const list = (profile.sprengel ?? [])
      .filter((s) => s.katastralgemeindeId === kg.id)
      .map((s) => s.id)
      .sort();
    if (list.length > 0) {
      sprengelByKg.set(kg.id, list);
    } else if (fallbackSprengel) {
      sprengelByKg.set(kg.id, [fallbackSprengel]);
    } else {
      // Profile has no sprengel at all — use the KG id itself.
      sprengelByKg.set(kg.id, [kg.id]);
    }
  }

  const persons: Person[] = [];
  const idCounter = { value: 1 };
  let householdCounter = 1;

  // Iterate KGs in id-sorted order for determinism. We do NOT short-circuit
  // when totalPopulation is reached mid-iteration — that would systematically
  // skip alphabetically-late KGs. Instead we generate all KGs and trim
  // afterwards.
  const kgsSorted = profile.katastralgemeinden.slice().sort((a, b) =>
    a.id < b.id ? -1 : 1,
  );
  for (const kg of kgsSorted) {
    const hhCount = householdsPerKg.get(kg.id) ?? 0;
    const sprengel = sprengelByKg.get(kg.id)!;
    for (let i = 0; i < hhCount; i++) {
      const sprengelId = sprengel[i % sprengel.length]!;
      const hhNum = `${profile.idPrefix}-h${String(householdCounter).padStart(5, '0')}`;
      householdCounter++;
      const newPersons = buildHousehold(rng, {
        profile,
        pools,
        sprengel: sprengelId,
        katastralgemeinde: kg.id,
        haushaltsnummer: hhNum,
        idCounter,
        idPrefix: profile.idPrefix,
        referenceYear: refYear,
      });
      for (const p of newPersons) {
        persons.push(p);
      }
    }
  }

  // Trim to exact totalPopulation. The trim is biased to whichever
  // households happen to be at the tail of the alphabet — for KGs with
  // shares ≥ 1% this is fine because all KGs get at least some households.
  const trimmed = persons.slice(0, profile.totalPopulation);

  // Self-report extra fields.
  if (options.extraFields === 'self-report') {
    applySelfReport(rng, trimmed, pools, refYear);
  }

  // Limit (Fisher-Yates shuffle then slice — deterministic).
  let final = trimmed;
  if (options.limit !== undefined && options.limit < trimmed.length) {
    const indexed = trimmed
      .map((p, i) => ({ p, i }))
      .sort((a, b) => (a.p.person_id < b.p.person_id ? -1 : 1));
    // Fisher-Yates on indexed array.
    for (let i = indexed.length - 1; i > 0; i--) {
      const j = Math.floor(rng.nextFloat() * (i + 1));
      const tmp = indexed[i]!;
      indexed[i] = indexed[j]!;
      indexed[j] = tmp;
    }
    final = indexed.slice(0, options.limit).map((x) => x.p);
  }

  const csv = writeCsv(final, {
    bom: options.bom ?? false,
    extraFields: options.extraFields ?? 'none',
  });

  // Summary stats.
  const uniqueHh = new Set(final.map((p) => p.haushaltsnummer)).size;
  const uniqueKg = new Set(final.map((p) => p.katastralgemeinde)).size;
  const summary = `Generated ${final.length} persons in ${uniqueHh} households across ${uniqueKg} KGs.`;

  // Avoid "value never read" warning — pickName is exported by cluster-pool
  // and re-imported here for consumers; not used directly in this scope.
  void pickName;

  return { persons: final, csv, summary };
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

function main(): void {
  let args: CliArgs;
  try {
    args = parseArgs(process.argv);
  } catch (err) {
    process.stderr.write(`[generator] Argument error: ${(err as Error).message}\n`);
    process.exit(1);
  }
  if (!args.output) {
    process.stderr.write('[generator] --output is required\n');
    process.exit(1);
  }
  let profile: Profile;
  try {
    profile = loadProfile(args);
  } catch (err) {
    process.stderr.write(`[generator] Profile error: ${(err as Error).message}\n`);
    process.exit(1);
  }

  const genOpts: GenerateOptions = {
    profile,
    seed: args.seed,
    bom: args.bom,
    extraFields: args.extraFields,
  };
  if (args.limit !== undefined) genOpts.limit = args.limit;
  const result = generate(genOpts);

  // Ensure output directory exists.
  mkdirSync(dirname(args.output), { recursive: true });
  writeFileSync(args.output, result.csv, 'utf8');

  process.stderr.write(`[generator] ${result.summary}\n`);
  process.stderr.write(`[generator] Wrote ${args.output}\n`);
}

// Only run main when executed directly (tsx execution sets import.meta.url
// to the file URL of this script, NOT when the module is imported).
const isMain = (() => {
  try {
    const argvUrl = process.argv[1] ? new URL(`file://${resolve(process.argv[1])}`).href : '';
    return import.meta.url === argvUrl;
  } catch {
    return false;
  }
})();

if (isMain) {
  main();
}
