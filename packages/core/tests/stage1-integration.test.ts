import { describe, it, expect } from 'vitest';
import { generatePool, PROFILES, stratify } from '../src';

const KLEINSTADT = PROFILES['kleinstadt-bezirkshauptort']!;

/** Convert PoolRow[] to Record<string,string>[] for stratify(). */
function toStringRows(rows: ReturnType<typeof generatePool>): Record<string, string>[] {
  return rows.map((r) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v)])),
  );
}

describe('Stage 1 integration: 6000-row pool', () => {
  // Build the 6000-row pool ONCE for all tests in this describe block; it is
  // pure-deterministic for a given seed, and saves ~5x test runtime.
  const pool = generatePool({
    profile: KLEINSTADT,
    size: 6000,
    seed: 42,
    tightness: 0.7,
  });
  const rows = toStringRows(pool);

  it('selects exactly 300 from 6000-pool', () => {
    const r = stratify(rows, {
      axes: ['district', 'age_band', 'gender'],
      targetN: 300,
      seed: 12345,
    });
    expect(r.selected.length).toBe(300);
  });

  it('keeps each stratum within ±1 of expected proportional count', () => {
    const r = stratify(rows, {
      axes: ['district', 'age_band', 'gender'],
      targetN: 300,
      seed: 12345,
    });
    for (const s of r.strata) {
      const expected = (300 * s.n_h_pool) / 6000;
      const diff = Math.abs(s.n_h_actual - expected);
      // Largest-Remainder rounds at most by 1 in either direction.
      expect(diff).toBeLessThanOrEqual(1);
    }
  });

  it('largest-remainder allocation sums to 300 exactly', () => {
    const r = stratify(rows, {
      axes: ['district', 'age_band', 'gender'],
      targetN: 300,
      seed: 12345,
    });
    const sumTarget = r.strata.reduce((s, x) => s + x.n_h_target, 0);
    expect(sumTarget).toBe(300);
    const sumActual = r.strata.reduce((s, x) => s + x.n_h_actual, 0);
    expect(sumActual).toBe(300);
  });

  it('is deterministic across runs', () => {
    const a = stratify(rows, {
      axes: ['district', 'age_band', 'gender'],
      targetN: 300,
      seed: 12345,
    });
    const b = stratify(rows, {
      axes: ['district', 'age_band', 'gender'],
      targetN: 300,
      seed: 12345,
    });
    expect(a.selected).toEqual(b.selected);
    expect(a.strata).toEqual(b.strata);
  });

  it('produces no underfill warnings on the full 6000-pool', () => {
    const r = stratify(rows, {
      axes: ['district', 'age_band', 'gender'],
      targetN: 300,
      seed: 12345,
    });
    expect(r.warnings).toEqual([]);
  });

  it('completes generatePool + stratify within 500 ms', () => {
    const t0 = performance.now();
    const p = toStringRows(
      generatePool({ profile: KLEINSTADT, size: 6000, seed: 99, tightness: 0.7 }),
    );
    stratify(p, {
      axes: ['district', 'age_band', 'gender'],
      targetN: 300,
      seed: 1,
    });
    const dt = performance.now() - t0;
    // Generous safety net; observed locally < 100 ms.
    expect(dt).toBeLessThan(500);
  });

  it('returns selected indices that are valid (0..rows.length-1) and unique', () => {
    const r = stratify(rows, {
      axes: ['district', 'age_band', 'gender'],
      targetN: 300,
      seed: 12345,
    });
    const seen = new Set<number>();
    for (const i of r.selected) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(rows.length);
      expect(seen.has(i)).toBe(false);
      seen.add(i);
    }
  });
});
