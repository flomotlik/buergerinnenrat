import { describe, it, expect } from 'vitest';
import type { Pool, Quotas } from '@sortition/engine-contract';
import { EngineA, replaceSinglePerson, extendBy } from '../src';

function toyPool(n: number): Pool {
  return {
    id: `toy-${n}`,
    people: Array.from({ length: n }, (_, i) => ({
      person_id: `p${String(i + 1).padStart(3, '0')}`,
      gender: i % 2 === 0 ? 'female' : 'male',
      age: i < n / 2 ? 'young' : 'old',
    })),
  };
}

function balancedQuotas(panel: number): Quotas {
  const half = Math.floor(panel / 2);
  return {
    panel_size: panel,
    categories: [
      {
        column: 'gender',
        bounds: { female: { min: half, max: panel - half }, male: { min: half, max: panel - half } },
      },
    ],
  };
}

async function pickInitialPanel(pool: Pool, q: Quotas, seed: number): Promise<string[]> {
  const engine = new EngineA({ initialCommittees: 4, maxColumnGenerationIters: 5 });
  for await (const ev of engine.run({ pool, quotas: q, params: { seed, algorithm: 'maximin' } })) {
    if (ev.type === 'done') return ev.result.selected;
    if (ev.type === 'error') throw new Error(`${ev.code}: ${ev.message}`);
  }
  throw new Error('no result');
}

describe('replaceSinglePerson', () => {
  it('finds a valid replacement', async () => {
    const pool = toyPool(20);
    const q = balancedQuotas(8);
    const panel = await pickInitialPanel(pool, q, 1);
    const removed = panel[0]!;
    const r = await replaceSinglePerson({ pool, panel, removed, quotas: q, seed: 42 });
    expect(r.ok).toBe(true);
    expect(r.newPanel).toHaveLength(8);
    expect(r.newPanel!.includes(removed)).toBe(false);
  });

  it('rejects if person is not in panel', async () => {
    const pool = toyPool(20);
    const q = balancedQuotas(8);
    const panel = await pickInitialPanel(pool, q, 1);
    const r = await replaceSinglePerson({ pool, panel, removed: 'notInPanel', quotas: q, seed: 1 });
    expect(r.ok).toBe(false);
  });
});

describe('extendBy', () => {
  it('keeps existing panel and adds new seats', async () => {
    const pool = toyPool(40);
    const q = balancedQuotas(8);
    const panel = await pickInitialPanel(pool, q, 1);
    const newQ = balancedQuotas(12);
    const r = await extendBy({ pool, panel, newQuotas: newQ, seed: 42 });
    expect(r.ok).toBe(true);
    expect(r.newPanel).toHaveLength(12);
    expect(r.added).toHaveLength(4);
    for (const id of panel) expect(r.newPanel!.includes(id)).toBe(true);
  });

  it('rejects if newQuotas.panel_size <= current', async () => {
    const pool = toyPool(20);
    const r = await extendBy({
      pool,
      panel: ['p001'],
      newQuotas: balancedQuotas(1),
      seed: 1,
    });
    expect(r.ok).toBe(false);
  });
});
