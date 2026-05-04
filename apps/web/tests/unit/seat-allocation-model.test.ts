import { describe, it, expect } from 'vitest';
import {
  applyOverrideToQuotas,
  computeBaseline,
  nonWhitespaceLength,
  validateOverride,
  type SeatAllocationOverride,
} from '../../src/quotas/seat-allocation';
import type { Quotas } from '@sortition/engine-contract';

// Pure-helper tests for the SeatAllocation data model. Behaviour map:
//   - nonWhitespaceLength: counts non-whitespace chars (Unicode whitespace).
//   - computeBaseline: per-axis Hamilton/largest-remainder allocation.
//   - validateOverride: pre-flight validation in the order documented in PLAN.md.
//   - applyOverrideToQuotas: pure composition; original quotas not mutated.

const ROWS_30: Record<string, string>[] = (() => {
  const rows: Record<string, string>[] = [];
  // 18 'm' / 12 'f' = 30 people. With panel_size=10 the Hamilton baseline is
  // m=6, f=4 (clean integer split, no remainder).
  for (let i = 0; i < 18; i++) rows.push({ person_id: `m${i}`, gender: 'm', age_group: '<50' });
  for (let i = 0; i < 12; i++) rows.push({ person_id: `f${i}`, gender: 'f', age_group: '50+' });
  return rows;
})();

describe('nonWhitespaceLength', () => {
  it('counts only non-whitespace characters in a mixed string', () => {
    expect(nonWhitespaceLength('  hello  world  ')).toBe(10);
  });

  it('returns 0 for a string of 20 ASCII spaces (PLAN.md anti-bypass)', () => {
    expect(nonWhitespaceLength('                    ')).toBe(0);
  });

  it('returns 0 for tabs and newlines', () => {
    expect(nonWhitespaceLength('\t\t\n\n\r ')).toBe(0);
  });

  it('returns 0 for the empty string', () => {
    expect(nonWhitespaceLength('')).toBe(0);
  });

  it('treats trailing whitespace correctly', () => {
    expect(nonWhitespaceLength('abc   ')).toBe(3);
  });
});

describe('computeBaseline', () => {
  it('Hamilton split for a clean 30/10 pool (gender)', () => {
    const baseline = computeBaseline(ROWS_30, 10, ['gender']);
    expect(baseline['gender']).toBeDefined();
    expect(baseline['gender']!['m']).toBe(6);
    expect(baseline['gender']!['f']).toBe(4);
    // Total per axis equals panel_size (Hamilton invariant).
    const sum = Object.values(baseline['gender']!).reduce((a, b) => a + b, 0);
    expect(sum).toBe(10);
  });

  it('handles multiple axes independently', () => {
    const baseline = computeBaseline(ROWS_30, 10, ['gender', 'age_group']);
    expect(Object.keys(baseline)).toEqual(['gender', 'age_group']);
    const sumGender = Object.values(baseline['gender']!).reduce((a, b) => a + b, 0);
    const sumAge = Object.values(baseline['age_group']!).reduce((a, b) => a + b, 0);
    expect(sumGender).toBe(10);
    expect(sumAge).toBe(10);
  });

  it('returns empty per-axis records when pool is empty (no exception)', () => {
    const baseline = computeBaseline([], 10, ['gender']);
    expect(baseline['gender']).toEqual({});
  });

  it('largest-remainder distributes leftover seats deterministically', () => {
    // 7 people: 3a, 2b, 2c. panel=4. Quotas: a=4*3/7=1.714 → 1, b=4*2/7=1.143 → 1,
    // c=4*2/7=1.143 → 1. Sum=3, leftover=1, biggest remainder is a (0.714) → a=2.
    const rows: Record<string, string>[] = [
      ...Array.from({ length: 3 }, (_, i) => ({ person_id: `a${i}`, k: 'a' })),
      ...Array.from({ length: 2 }, (_, i) => ({ person_id: `b${i}`, k: 'b' })),
      ...Array.from({ length: 2 }, (_, i) => ({ person_id: `c${i}`, k: 'c' })),
    ];
    const b = computeBaseline(rows, 4, ['k']);
    expect(b['k']).toEqual({ a: 2, b: 1, c: 1 });
  });
});

describe('validateOverride', () => {
  function baseOverride(overrides: Partial<SeatAllocationOverride> = {}): SeatAllocationOverride {
    return {
      axis: 'gender',
      seats: { m: 6, f: 4 },
      rationale: 'Geschlechter-Parität wichtig für die politische Akzeptanz vor Ort.',
      timestamp_iso: '2026-05-04T12:00:00Z',
      ...overrides,
    };
  }

  it('passes for a well-formed override', () => {
    const v = validateOverride(ROWS_30, 10, baseOverride());
    expect(v.ok).toBe(true);
    expect(v.errors).toEqual([]);
  });

  it('errors when axis is not a column in the rows', () => {
    const v = validateOverride(ROWS_30, 10, baseOverride({ axis: 'unknown_col' }));
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes('unknown_col'))).toBe(true);
  });

  it('errors when Σ override.seats != panel_size', () => {
    const v = validateOverride(ROWS_30, 10, baseOverride({ seats: { m: 6, f: 5 } }));
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => /Summe/.test(e))).toBe(true);
  });

  it('errors when an override seat count is negative', () => {
    const v = validateOverride(ROWS_30, 10, baseOverride({ seats: { m: 11, f: -1 } }));
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => /negativ|< 0|≥ 0/.test(e))).toBe(true);
  });

  it('errors when override exceeds pool capacity for a value', () => {
    // Only 12 'f' in the pool; asking for 14 seats is impossible.
    const v = validateOverride(ROWS_30, 14, baseOverride({ seats: { m: 0, f: 14 } }));
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => /f/.test(e) && /Pool/.test(e))).toBe(true);
  });

  it('errors when rationale has < 20 non-whitespace characters', () => {
    const v = validateOverride(ROWS_30, 10, baseOverride({ rationale: 'zu kurz' }));
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => /Begründung/.test(e))).toBe(true);
  });

  it('errors when rationale is 20 spaces (whitespace bypass)', () => {
    const v = validateOverride(ROWS_30, 10, baseOverride({ rationale: '                    ' }));
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => /Begründung/.test(e))).toBe(true);
  });

  it('errors when timestamp_iso is not ISO-8601', () => {
    const v = validateOverride(ROWS_30, 10, baseOverride({ timestamp_iso: '04.05.2026' }));
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => /Timestamp|ISO/.test(e))).toBe(true);
  });
});

describe('applyOverrideToQuotas', () => {
  const QUOTAS: Quotas = {
    panel_size: 10,
    categories: [
      { column: 'gender', bounds: { m: { min: 4, max: 6 }, f: { min: 4, max: 6 } } },
      { column: 'age_group', bounds: { '<50': { min: 0, max: 10 }, '50+': { min: 0, max: 10 } } },
    ],
  };

  it('returns the same reference when override is null (identity)', () => {
    const result = applyOverrideToQuotas(QUOTAS, null);
    expect(result).toBe(QUOTAS);
  });

  it('replaces bounds of the overridden axis with min == max == n', () => {
    const override: SeatAllocationOverride = {
      axis: 'gender',
      seats: { m: 7, f: 3 },
      rationale: 'Repräsentations-Boost für m, dokumentiert im Audit.',
      timestamp_iso: '2026-05-04T12:00:00Z',
    };
    const result = applyOverrideToQuotas(QUOTAS, override);
    const gender = result.categories.find((c) => c.column === 'gender')!;
    expect(gender.bounds['m']).toEqual({ min: 7, max: 7 });
    expect(gender.bounds['f']).toEqual({ min: 3, max: 3 });
  });

  it('leaves other axes untouched when override targets one axis', () => {
    const override: SeatAllocationOverride = {
      axis: 'gender',
      seats: { m: 7, f: 3 },
      rationale: 'Repräsentations-Boost für m, dokumentiert im Audit.',
      timestamp_iso: '2026-05-04T12:00:00Z',
    };
    const result = applyOverrideToQuotas(QUOTAS, override);
    const ageGroup = result.categories.find((c) => c.column === 'age_group')!;
    expect(ageGroup.bounds['<50']).toEqual({ min: 0, max: 10 });
    expect(ageGroup.bounds['50+']).toEqual({ min: 0, max: 10 });
  });

  it('does not mutate the input quotas object (purity)', () => {
    const override: SeatAllocationOverride = {
      axis: 'gender',
      seats: { m: 7, f: 3 },
      rationale: 'Repräsentations-Boost für m, dokumentiert im Audit.',
      timestamp_iso: '2026-05-04T12:00:00Z',
    };
    const snapshot = JSON.stringify(QUOTAS);
    applyOverrideToQuotas(QUOTAS, override);
    expect(JSON.stringify(QUOTAS)).toBe(snapshot);
  });
});
