import { describe, it, expect } from 'vitest';
import type { Pool, Quotas, RunResult } from '@sortition/engine-contract';
import { EngineA } from '../src';

function toyPool(n: number): Pool {
  const people = Array.from({ length: n }, (_, i) => ({
    person_id: `p${String(i + 1).padStart(3, '0')}`,
    gender: i % 2 === 0 ? 'female' : 'male',
    age: i < n / 2 ? 'young' : 'old',
  }));
  return { id: `toy-${n}`, people };
}

function genderQuotas(panel: number): Quotas {
  const half = Math.floor(panel / 2);
  return {
    panel_size: panel,
    categories: [
      {
        column: 'gender',
        bounds: {
          female: { min: half, max: panel - half },
          male: { min: half, max: panel - half },
        },
      },
    ],
  };
}

async function runEngine(pool: Pool, quotas: Quotas, seed = 42): Promise<RunResult> {
  const engine = new EngineA({ initialCommittees: 8, maxColumnGenerationIters: 2 });
  let result: RunResult | null = null;
  for await (const ev of engine.run({ pool, quotas, params: { seed, algorithm: 'maximin' } })) {
    if (ev.type === 'done') result = ev.result;
    if (ev.type === 'error') throw new Error(`${ev.code}: ${ev.message}`);
  }
  if (!result) throw new Error('engine produced no result');
  return result;
}

describe('EngineA — basic correctness', () => {
  it('finds a feasible panel of the requested size', async () => {
    const r = await runEngine(toyPool(20), genderQuotas(6));
    expect(r.selected).toHaveLength(6);
  });

  it('respects quota bounds', async () => {
    const r = await runEngine(toyPool(20), genderQuotas(8));
    for (const q of r.quota_fulfillment) {
      expect(q.ok).toBe(true);
    }
  });

  it('marginals sum to panel_size', async () => {
    const r = await runEngine(toyPool(20), genderQuotas(8));
    const sum = Object.values(r.marginals).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(8, 4);
  });

  it('every selected person is in the pool', async () => {
    const r = await runEngine(toyPool(20), genderQuotas(8));
    const ids = new Set(toyPool(20).people.map((p) => p.person_id));
    for (const id of r.selected) expect(ids.has(id)).toBe(true);
  });

  it('reports engine_meta correctly', async () => {
    const r = await runEngine(toyPool(20), genderQuotas(8));
    expect(r.engine_meta.engine_id).toBe('engine-a-highs');
    expect(r.engine_meta.algorithm).toBe('maximin');
  });

  it('signals infeasibility cleanly', async () => {
    const pool = toyPool(20);
    // Demand 30 women out of a 20-person pool (10 women).
    const quotas: Quotas = {
      panel_size: 20,
      categories: [
        {
          column: 'gender',
          bounds: {
            female: { min: 18, max: 20 },
            male: { min: 0, max: 2 },
          },
        },
      ],
    };
    const engine = new EngineA({ initialCommittees: 4, maxColumnGenerationIters: 0 });
    let saw_error = false;
    for await (const ev of engine.run({
      pool,
      quotas,
      params: { seed: 1, algorithm: 'maximin' },
    })) {
      if (ev.type === 'error' && ev.code === 'infeasible_quotas') saw_error = true;
    }
    expect(saw_error).toBe(true);
  });

  it('is deterministic for the same seed', async () => {
    const pool = toyPool(40);
    const q = genderQuotas(8);
    const a = await runEngine(pool, q, 123);
    const b = await runEngine(pool, q, 123);
    expect([...a.selected].sort()).toEqual([...b.selected].sort());
  });
});
