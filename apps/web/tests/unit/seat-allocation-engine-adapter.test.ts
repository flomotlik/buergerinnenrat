import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Pool, Quotas } from '@sortition/engine-contract';
import type { SeatAllocationOverride } from '../../src/quotas/seat-allocation';

// We dynamically import runEngineA AFTER mocking @sortition/engine-a so the
// mocked EngineA wins. vi.mock with a factory hoists, so this is safe at
// the top of the file.
vi.mock('@sortition/engine-a', () => {
  const calls: Array<{ pool: Pool; quotas: Quotas; params: unknown }> = [];
  class EngineA {
    static calls = calls;
    async *run(args: { pool: Pool; quotas: Quotas; params: unknown }): AsyncIterable<unknown> {
      calls.push({ pool: args.pool, quotas: args.quotas, params: args.params });
      yield {
        type: 'done',
        result: {
          selected: args.pool.people.map((p) => p.person_id).slice(0, args.quotas.panel_size),
          marginals: Object.fromEntries(args.pool.people.map((p) => [p.person_id, 0.5])),
          quota_fulfillment: [],
          timing: { total_ms: 1, num_committees: 1 },
          engine_meta: {
            engine_id: 'engine-a-mock',
            engine_version: '0.0.0',
            solver: 'mock',
            algorithm: 'maximin',
          },
        },
      };
    }
  }
  return { EngineA };
});

import { runEngineA } from '../../src/run/runEngine';
import { EngineA } from '@sortition/engine-a';

function makePool(): Pool {
  // 12m + 8f = 20 people; panel_size=10 in fixtures below.
  const people: Pool['people'] = [];
  for (let i = 0; i < 12; i++) people.push({ person_id: `m${i}`, gender: 'm' });
  for (let i = 0; i < 8; i++) people.push({ person_id: `f${i}`, gender: 'f' });
  return { id: 'mock-pool', people };
}

function makeQuotas(): Quotas {
  return {
    panel_size: 10,
    categories: [{ column: 'gender', bounds: { m: { min: 4, max: 6 }, f: { min: 4, max: 6 } } }],
  };
}

const noopProgress = () => undefined;
const noopLog = () => undefined;

beforeEach(() => {
  // Reset spy on engine call list between tests.
  (EngineA as unknown as { calls: unknown[] }).calls.length = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('runEngineA — null override (backward-compat)', () => {
  it('passes original quotas to engine when override is null', async () => {
    const pool = makePool();
    const quotas = makeQuotas();
    const r = await runEngineA({
      pool,
      quotas,
      seed: 1,
      onProgress: noopProgress,
      onLog: noopLog,
      override: null,
    });
    expect(r.ok).toBe(true);
    const calls = (EngineA as unknown as { calls: Array<{ quotas: Quotas }> }).calls;
    expect(calls).toHaveLength(1);
    expect(calls[0]!.quotas).toEqual(quotas);
  });

  it('passes original quotas to engine when override field is omitted', async () => {
    const pool = makePool();
    const quotas = makeQuotas();
    const r = await runEngineA({
      pool,
      quotas,
      seed: 1,
      onProgress: noopProgress,
      onLog: noopLog,
    });
    expect(r.ok).toBe(true);
    const calls = (EngineA as unknown as { calls: Array<{ quotas: Quotas }> }).calls;
    expect(calls[0]!.quotas).toEqual(quotas);
  });
});

describe('runEngineA — valid override applies to quotas before engine.run', () => {
  it('passes effectiveQuotas (override-collapsed bounds) to engine', async () => {
    const override: SeatAllocationOverride = {
      axis: 'gender',
      seats: { m: 7, f: 3 },
      rationale: 'Repräsentations-Boost für m, dokumentiert im Audit-Manifest.',
      timestamp_iso: '2026-05-04T12:00:00Z',
    };
    const r = await runEngineA({
      pool: makePool(),
      quotas: makeQuotas(),
      seed: 1,
      onProgress: noopProgress,
      onLog: noopLog,
      override,
    });
    expect(r.ok).toBe(true);
    const calls = (EngineA as unknown as { calls: Array<{ quotas: Quotas }> }).calls;
    const cat = calls[0]!.quotas.categories[0]!;
    expect(cat.column).toBe('gender');
    expect(cat.bounds['m']).toEqual({ min: 7, max: 7 });
    expect(cat.bounds['f']).toEqual({ min: 3, max: 3 });
  });

  it('returns effectiveQuotas on the outcome so caller can hash the post-override LP config', async () => {
    const override: SeatAllocationOverride = {
      axis: 'gender',
      seats: { m: 7, f: 3 },
      rationale: 'Repräsentations-Boost für m, dokumentiert im Audit-Manifest.',
      timestamp_iso: '2026-05-04T12:00:00Z',
    };
    const r = await runEngineA({
      pool: makePool(),
      quotas: makeQuotas(),
      seed: 1,
      onProgress: noopProgress,
      onLog: noopLog,
      override,
    });
    expect(r.effectiveQuotas).toBeDefined();
    expect(r.effectiveQuotas!.categories[0]!.bounds['m']).toEqual({ min: 7, max: 7 });
  });
});

describe('runEngineA — pre-flight rejects invalid override', () => {
  it('returns code=override_invalid and does NOT call engine.run', async () => {
    const override: SeatAllocationOverride = {
      axis: 'gender',
      seats: { m: 7, f: 3 },
      rationale: 'zu kurz', // < 20 non-whitespace chars
      timestamp_iso: '2026-05-04T12:00:00Z',
    };
    const r = await runEngineA({
      pool: makePool(),
      quotas: makeQuotas(),
      seed: 1,
      onProgress: noopProgress,
      onLog: noopLog,
      override,
    });
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('override_invalid');
    expect(r.error?.message).toMatch(/Begründung/);
    const calls = (EngineA as unknown as { calls: unknown[] }).calls;
    expect(calls).toHaveLength(0);
  });

  it('rejects override that asks for more seats than pool capacity', async () => {
    // Pool has 8 'f', override demands 14 → pool-capacity violation.
    const override: SeatAllocationOverride = {
      axis: 'gender',
      seats: { m: 0, f: 14 },
      rationale: 'Extreme Verschiebung — sollte vom Pool-Capacity-Check geblockt werden.',
      timestamp_iso: '2026-05-04T12:00:00Z',
    };
    const r = await runEngineA({
      pool: makePool(),
      // panel_size 14 to keep the sum-check clean; the pool-capacity error
      // should still trigger on f=14 vs 8 in pool.
      quotas: { panel_size: 14, categories: [] },
      seed: 1,
      onProgress: noopProgress,
      onLog: noopLog,
      override,
    });
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('override_invalid');
    expect(r.error?.message).toMatch(/Pool/);
  });
});
