/**
 * Pure Hamilton-Apportionment helpers used by the in-app docs walkthrough.
 *
 * Kept separate from the SVG component so unit tests can import the math
 * without dragging in Solid's JSX runtime, which throws when invoked outside
 * a browser-like environment that has the client renderer wired up.
 */

export interface ToyStratum {
  /** Stable sort key for tie-break (alphabetical). */
  key: string;
  /** Display label rendered in the SVG box. */
  label: string;
  /** People available in this stratum. */
  pool: number;
}

export interface HamiltonRow {
  key: string;
  label?: string;
  pool: number;
  /** Soll = pool / totalPool * targetN. */
  quote: number;
  /** Integer floor of `quote`. */
  floor: number;
  /** Fractional part of `quote`. */
  remainder: number;
  /**
   * 1-indexed rank of this row's remainder, descending. Tie-break:
   * alphabetical by `key`. Rank is assigned to ALL rows so a viewer can
   * compare bonuses across strata; only the top-K (where K = targetN −
   * sum(floor)) actually receive a bonus.
   */
  remainderRank: number;
  /** 1 if this row received a leftover seat (top-K by remainderRank), else 0. */
  bonus: number;
  /** floor + bonus. */
  final: number;
}

/**
 * Toy strata for the in-app didactic walkthrough — 100 people, 3 districts ×
 * 2 genders, target N = 10. Hand-crafted so the bonus assignment hits two
 * non-trivial remainders (A/w 0.8, C/m 0.5).
 */
export const TOY_STRATA: ReadonlyArray<ToyStratum> = [
  { key: 'A / w', label: 'A / w', pool: 18 },
  { key: 'A / m', label: 'A / m', pool: 12 },
  { key: 'B / w', label: 'B / w', pool: 22 },
  { key: 'B / m', label: 'B / m', pool: 13 },
  { key: 'C / w', label: 'C / w', pool: 20 },
  { key: 'C / m', label: 'C / m', pool: 15 },
];

export const TOY_TOTAL_POOL: number = TOY_STRATA.reduce(
  (a, s) => a + s.pool,
  0,
);
export const TOY_TARGET_N = 10;

/**
 * Compute Hamilton (largest-remainder) allocation for the given strata.
 *
 * Steps:
 *   1. quote_h     = pool_h / totalPool * targetN
 *   2. floor_h     = ⌊quote_h⌋
 *   3. remainder_h = quote_h − floor_h
 *   4. K           = targetN − sum(floor_h) leftover seats
 *   5. Sort rows by remainder DESC; tie-break alphabetically by `key` ASC
 *      (deterministic — same input yields same output).
 *   6. Top-K rows get bonus = 1; the rest get 0.
 */
export function computeHamiltonAllocation(
  strata: ReadonlyArray<ToyStratum>,
  targetN: number,
  totalPool: number,
): HamiltonRow[] {
  const rows: HamiltonRow[] = strata.map((s) => {
    const quote = (s.pool / totalPool) * targetN;
    const floor = Math.floor(quote);
    const remainder = quote - floor;
    return {
      key: s.key,
      label: s.label,
      pool: s.pool,
      quote,
      floor,
      remainder,
      remainderRank: 0,
      bonus: 0,
      final: floor,
    };
  });

  const ranked = [...rows].sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
  ranked.forEach((r, idx) => {
    r.remainderRank = idx + 1;
  });

  const sumFloor = rows.reduce((a, r) => a + r.floor, 0);
  const leftover = targetN - sumFloor;
  for (let i = 0; i < Math.max(0, leftover) && i < ranked.length; i++) {
    const winner = ranked[i]!;
    winner.bonus = 1;
    winner.final = winner.floor + 1;
  }

  return rows;
}
