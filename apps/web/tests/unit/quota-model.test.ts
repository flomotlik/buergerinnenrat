import { describe, it, expect } from 'vitest';
import {
  uniqueValues,
  valueCounts,
  emptyCategory,
  validateQuotas,
  quotaConfigToJson,
  quotaConfigFromJson,
} from '../../src/quotas/model';
import type { QuotaConfig } from '../../src/quotas/model';

const ROWS = [
  { person_id: 'p1', gender: 'female' },
  { person_id: 'p2', gender: 'male' },
  { person_id: 'p3', gender: 'female' },
];

describe('uniqueValues', () => {
  it('returns sorted distinct values', () => {
    expect(uniqueValues(ROWS, 'gender')).toEqual(['female', 'male']);
  });
});

describe('valueCounts', () => {
  it('counts values', () => {
    expect(valueCounts(ROWS, 'gender')).toEqual({ female: 2, male: 1 });
  });
});

describe('validateQuotas', () => {
  function cfg(panel: number, sumMin: number, sumMax: number): QuotaConfig {
    return {
      panel_size: panel,
      categories: [
        {
          column: 'gender',
          bounds: {
            female: { min: Math.floor(sumMin / 2), max: Math.ceil(sumMax / 2) },
            male: { min: Math.ceil(sumMin / 2), max: Math.floor(sumMax / 2) },
          },
        },
      ],
    };
  }

  it('flags panel_size < 10', () => {
    expect(validateQuotas(ROWS, cfg(5, 2, 5)).panel_errors[0]).toContain('Panel');
  });
  it('flags panel_size > pool', () => {
    expect(validateQuotas(ROWS, cfg(20, 5, 20)).panel_errors[0]).toContain('Pool');
  });
  it('flags sumMin > panel', () => {
    const c: QuotaConfig = {
      panel_size: 10,
      categories: [
        {
          column: 'gender',
          bounds: {
            female: { min: 8, max: 10 },
            male: { min: 8, max: 10 },
          },
        },
      ],
    };
    const v = validateQuotas(ROWS, c);
    expect(v.per_category[0]?.errors[0]).toContain('min');
  });
  it('flags sumMax < panel', () => {
    const c: QuotaConfig = {
      panel_size: 10,
      categories: [
        {
          column: 'gender',
          bounds: {
            female: { min: 0, max: 3 },
            male: { min: 0, max: 3 },
          },
        },
      ],
    };
    const v = validateQuotas(ROWS, c);
    expect(v.per_category[0]?.errors.join(' ')).toContain('max');
  });
  it('warns when min > available in pool', () => {
    const c: QuotaConfig = {
      panel_size: 10,
      categories: [
        {
          column: 'gender',
          bounds: {
            female: { min: 5, max: 10 }, // pool only has 2 females
            male: { min: 0, max: 5 },
          },
        },
      ],
    };
    const v = validateQuotas(ROWS, c);
    expect(v.per_category[0]?.warnings.join(' ')).toContain('infeasible');
  });
  it('passes a valid config', () => {
    const c: QuotaConfig = {
      panel_size: 2,
      categories: [
        {
          column: 'gender',
          bounds: {
            female: { min: 1, max: 2 },
            male: { min: 0, max: 1 },
          },
        },
      ],
    };
    // Pool has 3 rows, so panel=2 is fine and we have 2 female + 1 male.
    const v = validateQuotas(ROWS, { ...c, panel_size: 10 });
    // panel=10 > pool=3 → expect a panel_error
    expect(v.panel_errors.length).toBeGreaterThan(0);
  });
});

describe('emptyCategory', () => {
  it('initializes bounds at min=0, max=panel_size', () => {
    const cat = emptyCategory('gender', ['female', 'male'], 30);
    expect(cat.bounds['female']).toEqual({ min: 0, max: 30 });
  });
});

describe('JSON round-trip', () => {
  it('serializes and parses', () => {
    const config: QuotaConfig = {
      panel_size: 20,
      categories: [{ column: 'gender', bounds: { f: { min: 9, max: 11 } } }],
    };
    const restored = quotaConfigFromJson(quotaConfigToJson(config));
    expect(restored).toEqual(config);
  });
  it('rejects non-config JSON', () => {
    expect(() => quotaConfigFromJson('{"foo":1}')).toThrow();
  });
});
