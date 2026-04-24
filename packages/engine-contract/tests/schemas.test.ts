import { describe, it, expect } from 'vitest';
import {
  PoolSchema,
  QuotasSchema,
  RunParamsSchema,
  RunResultSchema,
  EngineEventSchema,
  validatePool,
  validateQuotas,
  validateRunResult,
} from '../src';

const TOY_POOL = {
  id: 'toy-10',
  people: Array.from({ length: 10 }, (_, i) => ({
    person_id: `p${String(i + 1).padStart(2, '0')}`,
    gender: i % 2 === 0 ? 'female' : 'male',
    age_band: i < 5 ? '25-34' : '55-64',
  })),
};

const TOY_QUOTAS = {
  panel_size: 4,
  categories: [
    {
      column: 'gender',
      bounds: {
        female: { min: 2, max: 2 },
        male: { min: 2, max: 2 },
      },
    },
    {
      column: 'age_band',
      bounds: {
        '25-34': { min: 1, max: 3 },
        '55-64': { min: 1, max: 3 },
      },
    },
  ],
};

const TOY_RESULT = {
  selected: ['p01', 'p03', 'p06', 'p08'],
  marginals: { p01: 0.5, p02: 0.5, p03: 0.5, p04: 0.5, p05: 0.5, p06: 0.5, p07: 0.5, p08: 0.5, p09: 0.5, p10: 0.5 },
  quota_fulfillment: [
    { column: 'gender', value: 'female', selected: 2, bound_min: 2, bound_max: 2, ok: true },
    { column: 'gender', value: 'male', selected: 2, bound_min: 2, bound_max: 2, ok: true },
  ],
  timing: { total_ms: 42 },
  engine_meta: {
    engine_id: 'engine-a-highs' as const,
    engine_version: '0.1.0',
    solver: 'highs-js@1.10.0',
    algorithm: 'maximin' as const,
  },
};

describe('Pool schema', () => {
  it('accepts a well-formed pool', () => {
    expect(() => validatePool(TOY_POOL)).not.toThrow();
  });
  it('rejects empty people', () => {
    expect(() => validatePool({ id: 'x', people: [] })).toThrow();
  });
  it('rejects missing person_id', () => {
    expect(() =>
      validatePool({ id: 'x', people: [{ gender: 'female' }] }),
    ).toThrow();
  });
});

describe('Quotas schema', () => {
  it('accepts well-formed quotas', () => {
    expect(() => validateQuotas(TOY_QUOTAS)).not.toThrow();
  });
  it('rejects max < min', () => {
    const bad = {
      panel_size: 4,
      categories: [{ column: 'gender', bounds: { female: { min: 3, max: 2 } } }],
    };
    expect(() => validateQuotas(bad)).toThrow();
  });
  it('rejects panel_size 0', () => {
    expect(() => validateQuotas({ panel_size: 0, categories: TOY_QUOTAS.categories })).toThrow();
  });
});

describe('RunParams schema', () => {
  it('accepts maximin', () => {
    expect(() => RunParamsSchema.parse({ seed: 42, algorithm: 'maximin' })).not.toThrow();
  });
  it('rejects leximin', () => {
    expect(() =>
      RunParamsSchema.parse({ seed: 42, algorithm: 'leximin' }),
    ).toThrow();
  });
});

describe('RunResult schema', () => {
  it('accepts a result with required fields', () => {
    expect(() => validateRunResult(TOY_RESULT)).not.toThrow();
  });
  it('rejects marginals out of [0,1]', () => {
    const bad = { ...TOY_RESULT, marginals: { p01: 1.2 } };
    expect(() => validateRunResult(bad)).toThrow();
  });
});

describe('EngineEvent discriminator', () => {
  it('accepts all four event types', () => {
    expect(() => EngineEventSchema.parse({ type: 'progress', phase: 'lp', fraction: 0.5 })).not.toThrow();
    expect(() => EngineEventSchema.parse({ type: 'log', level: 'info', message: 'hi' })).not.toThrow();
    expect(() => EngineEventSchema.parse({ type: 'done', result: TOY_RESULT })).not.toThrow();
    expect(() => EngineEventSchema.parse({ type: 'error', code: 'E1', message: 'bad' })).not.toThrow();
  });
});
