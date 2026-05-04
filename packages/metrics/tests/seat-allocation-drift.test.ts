import { describe, it, expect } from 'vitest';
import { seatAllocationDrift } from '../src/seat-allocation-drift';

// Drift metric: how far an override deviates from the proportional baseline.
// L1 = Σ |override - baseline|, NOT halved. Doku in JSDoc explains why.
// Max  = max |override[v] - baseline[v]|. Both also reported as a fraction
// of panel_size for cross-panel comparability.

describe('seatAllocationDrift', () => {
  it('symmetric 2-value override: l1=4, max=2 at panel=10 → pct 0.4 / 0.2', () => {
    const r = seatAllocationDrift('gender', { m: 5, f: 5 }, { m: 7, f: 3 }, 10);
    expect(r.axis).toBe('gender');
    expect(r.l1_drift).toBe(4);
    expect(r.l1_drift_pct).toBeCloseTo(0.4, 9);
    expect(r.max_value_drift).toBe(2);
    expect(r.max_value_drift_pct).toBeCloseTo(0.2, 9);
  });

  it('returns 0 across the board when override == baseline', () => {
    const r = seatAllocationDrift('gender', { m: 5, f: 5 }, { m: 5, f: 5 }, 10);
    expect(r.l1_drift).toBe(0);
    expect(r.l1_drift_pct).toBe(0);
    expect(r.max_value_drift).toBe(0);
    expect(r.max_value_drift_pct).toBe(0);
  });

  it('panel_size=0 → all pct values 0 (no NaN/Infinity)', () => {
    const r = seatAllocationDrift('gender', { m: 0, f: 0 }, { m: 0, f: 0 }, 0);
    expect(Number.isFinite(r.l1_drift_pct)).toBe(true);
    expect(Number.isFinite(r.max_value_drift_pct)).toBe(true);
    expect(r.l1_drift_pct).toBe(0);
    expect(r.max_value_drift_pct).toBe(0);
  });

  it('asymmetric keys: missing override key treated as 0', () => {
    // baseline {a:5, b:5}, override {a:10}. b implicit → 0.
    // l1 = |10-5| + |0-5| = 10. max = 5.
    const r = seatAllocationDrift('axis', { a: 5, b: 5 }, { a: 10 }, 10);
    expect(r.l1_drift).toBe(10);
    expect(r.max_value_drift).toBe(5);
  });

  it('asymmetric keys: extra override key treated as 0 baseline', () => {
    // baseline {a:5}, override {a:3, b:2}. a baseline=5, b implicit baseline=0.
    // l1 = |3-5| + |2-0| = 4. max = 2.
    const r = seatAllocationDrift('axis', { a: 5 }, { a: 3, b: 2 }, 5);
    expect(r.l1_drift).toBe(4);
    expect(r.max_value_drift).toBe(2);
  });

  it('three-value axis with mixed deviations', () => {
    // baseline {<50:6, 50-65:3, >65:1}, override {<50:4, 50-65:5, >65:1}
    // l1 = |4-6| + |5-3| + |1-1| = 4. max = 2.
    const r = seatAllocationDrift(
      'age',
      { '<50': 6, '50-65': 3, '>65': 1 },
      { '<50': 4, '50-65': 5, '>65': 1 },
      10,
    );
    expect(r.l1_drift).toBe(4);
    expect(r.max_value_drift).toBe(2);
    expect(r.l1_drift_pct).toBeCloseTo(0.4, 9);
  });

  it('records the axis name unchanged on the result', () => {
    const r = seatAllocationDrift('district', { d1: 2, d2: 8 }, { d1: 5, d2: 5 }, 10);
    expect(r.axis).toBe('district');
  });
});
