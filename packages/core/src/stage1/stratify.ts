import { Mulberry32 } from '../pool/mulberry32';
import type { StratifyOpts, StratifyResult, StratumResult } from './types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a canonical stratum key string from the axis values for a row.
 * Axes are iterated in their declared order; values are JSON-encoded so
 * empty strings, special characters, and `null`-ish coercions stay distinct.
 */
function stratumKeyString(row: Record<string, string>, axes: string[]): string {
  // Use a JSON-encoded array of [axis, value] pairs in the declared axis
  // order. This is deterministic and unambiguous for any string values.
  const pairs: [string, string][] = axes.map((a) => [a, row[a] ?? '']);
  return JSON.stringify(pairs);
}

/** Re-hydrate the stratum key into a `{ axis: value, ... }` map (declared order). */
function decodeStratumKey(keyString: string): Record<string, string> {
  const pairs = JSON.parse(keyString) as [string, string][];
  const out: Record<string, string> = {};
  for (const [a, v] of pairs) out[a] = v;
  return out;
}

/** Bucketize input rows by stratum key. Returns map preserving insertion order is irrelevant — caller sorts. */
export function bucketize(
  rows: Record<string, string>[],
  axes: string[],
): Map<string, number[]> {
  const buckets = new Map<string, number[]>();
  if (axes.length === 0) {
    // Empty axes => degenerate single stratum (simple random sample).
    const all: number[] = [];
    for (let i = 0; i < rows.length; i++) all.push(i);
    buckets.set(JSON.stringify([] as [string, string][]), all);
    return buckets;
  }
  for (let i = 0; i < rows.length; i++) {
    const k = stratumKeyString(rows[i]!, axes);
    let arr = buckets.get(k);
    if (arr === undefined) {
      arr = [];
      buckets.set(k, arr);
    }
    arr.push(i);
  }
  return buckets;
}

/**
 * Largest-remainder (Hamilton) allocation.
 *
 * Given `targetN` and a list of strata sizes `N_h`, returns `n_h_target` for
 * each stratum such that `sum(n_h_target) === targetN` exactly.
 *
 * Tie-breaking for the +1 remainder bonus (in this order):
 *   1. larger `N_h` first
 *   2. lexicographically smaller stratum key first (deterministic fallback)
 *
 * `forcedZeroIndices` (Issue #62): if provided and non-empty, every index in
 * the set is forced to 0; the remaining strata are allocated as if they
 * carried the full `targetN` proportional to THEIR sizes only. The pool
 * itself is NOT filtered — the rows for forced strata stay where they are,
 * they just never receive an allocation. When the parameter is undefined or
 * an empty set, behavior is byte-identical to the pre-#62 implementation.
 */
export function largestRemainderAllocation(
  stratumKeys: string[],
  stratumSizes: number[],
  targetN: number,
  forcedZeroIndices?: ReadonlySet<number>,
): number[] {
  const hasForced = forcedZeroIndices !== undefined && forcedZeroIndices.size > 0;

  if (!hasForced) {
    // Original code path — preserved verbatim for byte-identical behavior.
    const total = stratumSizes.reduce((a, b) => a + b, 0);
    if (total === 0) return stratumSizes.map(() => 0);
    const quotas = stratumSizes.map((nh) => (targetN * nh) / total);
    const floors = quotas.map((q) => Math.floor(q));
    const remainders = quotas.map((q, i) => ({ idx: i, rem: q - floors[i]! }));
    let assigned = floors.reduce((a, b) => a + b, 0);
    let delta = targetN - assigned;
    if (delta > 0) {
      remainders.sort((a, b) => {
        // Larger remainder first.
        if (b.rem !== a.rem) return b.rem - a.rem;
        // Tie → larger N_h first.
        const sizeDiff = stratumSizes[b.idx]! - stratumSizes[a.idx]!;
        if (sizeDiff !== 0) return sizeDiff;
        // Tie → codepoint-order smaller stratum key first.
        const ka = stratumKeys[a.idx]!;
        const kb = stratumKeys[b.idx]!;
        return ka < kb ? -1 : ka > kb ? 1 : 0;
      });
      for (let i = 0; i < delta; i++) {
        const idx = remainders[i]!.idx;
        floors[idx] = (floors[idx] ?? 0) + 1;
      }
    }
    return floors;
  }

  // Forced-zero branch: only consider non-forced indices for the proportional
  // allocation; forced indices end up at 0.
  const forced = forcedZeroIndices;
  let remainingTotal = 0;
  for (let i = 0; i < stratumSizes.length; i++) {
    if (!forced.has(i)) remainingTotal += stratumSizes[i]!;
  }
  if (remainingTotal === 0) return stratumSizes.map(() => 0);

  const quotas = stratumSizes.map((nh, i) =>
    forced.has(i) ? 0 : (targetN * nh) / remainingTotal,
  );
  const floors = quotas.map((q) => Math.floor(q));
  // Build remainders ONLY for non-forced indices (forced ones must stay at 0).
  const remainders = quotas
    .map((q, i) => ({ idx: i, rem: q - floors[i]! }))
    .filter((e) => !forced.has(e.idx));
  const assigned = floors.reduce((a, b) => a + b, 0);
  const delta = targetN - assigned;
  if (delta > 0) {
    remainders.sort((a, b) => {
      if (b.rem !== a.rem) return b.rem - a.rem;
      const sizeDiff = stratumSizes[b.idx]! - stratumSizes[a.idx]!;
      if (sizeDiff !== 0) return sizeDiff;
      const ka = stratumKeys[a.idx]!;
      const kb = stratumKeys[b.idx]!;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
    const bumps = Math.min(delta, remainders.length);
    for (let i = 0; i < bumps; i++) {
      const idx = remainders[i]!.idx;
      floors[idx] = (floors[idx] ?? 0) + 1;
    }
  }
  return floors;
}

/** Fisher-Yates shuffle in place using the supplied RNG. */
function shuffleInPlace<T>(arr: T[], rng: Mulberry32): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng.nextFloat() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Proportional stratified random sample without replacement, using the
 * Largest-Remainder method for allocation and Fisher-Yates shuffles
 * (Mulberry32 RNG) for in-stratum draws. Fully deterministic for a given seed.
 *
 * Edge cases (per CONTEXT.md / Issue #45):
 *  - `axes=[]`: degenerates to simple random sample over the entire pool.
 *  - empty stratum (`n_h_target=0`): listed in result with zeros, no error.
 *  - `n_h_target > n_h_pool`: clamped to `n_h_pool`, marked `underfilled`,
 *    warning pushed. NO redistribution of the remainder to other strata.
 *  - `targetN > rows.length`: throws — the input pool is too small.
 *  - `forcedZeroStrataKeys` (Issue #62): every stratum whose canonical key
 *    matches one in this set is forced to n_h_target=0 and emits
 *    `forced_zero: true` in its result entry. The pool itself is NOT
 *    filtered — those rows still appear in n_h_pool counts, they just
 *    never receive an allocation. We do NOT push an underfill warning for
 *    a forced-zero stratum even when n_h_pool > 0; the zero is intentional.
 */
export function stratify(
  rows: Record<string, string>[],
  opts: StratifyOpts,
): StratifyResult {
  const { axes, targetN, seed, forcedZeroStrataKeys } = opts;

  if (targetN < 0) {
    throw new Error('Stichprobengröße (targetN) muss >= 0 sein.');
  }
  if (targetN > rows.length) {
    throw new Error(
      `Eingangs-Pool hat nur ${rows.length} Personen, mehr als das ist nicht ziehbar (angefragt: ${targetN}).`,
    );
  }

  const buckets = bucketize(rows, axes);

  // Sort stratum keys by codepoint order (NOT localeCompare) so allocation,
  // shuffle, and output order are deterministic AND identical between TS and
  // Python. localeCompare differs between runtimes for Umlaut-bearing keys.
  const stratumKeys = [...buckets.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const stratumIndexLists = stratumKeys.map((k) => [...buckets.get(k)!]);
  const stratumSizes = stratumIndexLists.map((l) => l.length);

  // Resolve forced-zero indices from the caller-supplied key set. Keys not
  // matching any present stratum are simply ignored.
  const forcedZeroIndices = new Set<number>();
  if (forcedZeroStrataKeys && forcedZeroStrataKeys.size > 0) {
    for (let i = 0; i < stratumKeys.length; i++) {
      if (forcedZeroStrataKeys.has(stratumKeys[i]!)) {
        forcedZeroIndices.add(i);
      }
    }
  }

  const allocation = largestRemainderAllocation(
    stratumKeys,
    stratumSizes,
    targetN,
    forcedZeroIndices.size > 0 ? forcedZeroIndices : undefined,
  );

  // Single shared RNG so iteration over strata in lex order is deterministic.
  const rng = new Mulberry32(seed);

  const stratumResults: StratumResult[] = [];
  const warnings: string[] = [];
  const selectedByStratum: number[][] = [];

  for (let i = 0; i < stratumKeys.length; i++) {
    const k = stratumKeys[i]!;
    const indices = stratumIndexLists[i]!;
    const nhPool = stratumSizes[i]!;
    const nhTarget = allocation[i]!;
    const nhActual = Math.min(nhTarget, nhPool);
    const isForcedZero = forcedZeroIndices.has(i);
    const underfilled = nhActual < nhTarget;

    // Forced-zero strata always have n_h_target=0, so `underfilled` is
    // naturally false; suppressing the warning here is a defensive guard.
    if (underfilled && !isForcedZero) {
      warnings.push(
        `Stratum ${k} unter-vertreten: ${nhActual} von ${nhTarget} angefragt (Pool: ${nhPool}).`,
      );
    }

    // Shuffle even when nhActual === 0 to keep RNG state advancement stable
    // across strata? We deliberately DO NOT advance the RNG for empty draws —
    // an empty stratum simply skips. Determinism is anchored on lex stratum
    // order, not on RNG-state per stratum.
    if (nhActual > 0) {
      shuffleInPlace(indices, rng);
    }

    const drawn = indices.slice(0, nhActual);
    selectedByStratum.push(drawn);

    const stratumResult: StratumResult = {
      key: decodeStratumKey(k),
      n_h_pool: nhPool,
      n_h_target: nhTarget,
      n_h_actual: nhActual,
      underfilled,
    };
    // Only set forced_zero when true — keeps canonical JSON minimal and
    // older Stage1AuditDoc consumers (no forced_zero field) unaffected.
    if (isForcedZero) {
      stratumResult.forced_zero = true;
    }
    stratumResults.push(stratumResult);
  }

  // Final selection: union of per-stratum draws, sorted by stratum key (lex)
  // then by original row index ASC for reproducible CSV order.
  const selected: number[] = [];
  for (const drawn of selectedByStratum) {
    const sorted = [...drawn].sort((a, b) => a - b);
    selected.push(...sorted);
  }

  return { selected, strata: stratumResults, warnings };
}
