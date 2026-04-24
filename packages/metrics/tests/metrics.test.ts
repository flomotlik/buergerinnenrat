import { describe, it, expect } from 'vitest';
import { computeMetrics, aggregateMultiRun, type QualityMetrics } from '../src';
import type { RunResult } from '@sortition/engine-contract';

function makeResult(marginals: Record<string, number>, selected: string[]): RunResult {
  return {
    selected,
    marginals,
    quota_fulfillment: [
      {
        column: 'gender',
        value: 'female',
        selected: selected.length,
        bound_min: 1,
        bound_max: selected.length + 1,
        ok: true,
      },
    ],
    timing: { total_ms: 1, num_committees: 1 },
    engine_meta: {
      engine_id: 'engine-a-highs',
      engine_version: '0.1.0',
      solver: 'highs',
      algorithm: 'maximin',
    },
  };
}

describe('computeMetrics', () => {
  it('uniform distribution → gini 0', async () => {
    const m = await computeMetrics(makeResult({ a: 0.1, b: 0.1, c: 0.1, d: 0.1 }, ['a', 'b']));
    expect(m.gini).toBeCloseTo(0, 8);
    expect(m.min_pi).toBeCloseTo(0.1, 8);
    expect(m.variance_pi).toBeCloseTo(0, 8);
    expect(m.count_below_epsilon).toBe(0);
  });

  it('one-zero outlier → high gini', async () => {
    const m = await computeMetrics(
      makeResult({ a: 0, b: 0.4, c: 0.4, d: 0.4 }, ['b']),
    );
    expect(m.min_pi).toBe(0);
    expect(m.gini).toBeGreaterThan(0.1);
    expect(m.count_below_epsilon).toBe(1);
  });

  it('reproducibility hash deterministic', async () => {
    const r = makeResult({ a: 0.5, b: 0.5 }, ['a', 'b']);
    const m1 = await computeMetrics(r);
    const m2 = await computeMetrics(r);
    expect(m1.reproducibility_hash).toBe(m2.reproducibility_hash);
    expect(m1.reproducibility_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('quota slack computed correctly', async () => {
    const r = makeResult({ a: 0.3 }, ['a']);
    const m = await computeMetrics(r);
    const s = m.quota_slack_per_category[0]!;
    expect(s.slack_min).toBe(s.selected - s.bound_min);
    expect(s.slack_max).toBe(s.bound_max - s.selected);
  });
});

describe('aggregateMultiRun', () => {
  it('counts panel frequency across runs', () => {
    const a = makeResult({ p1: 0.3, p2: 0.3, p3: 0.3 }, ['p1', 'p2']);
    const b = makeResult({ p1: 0.3, p2: 0.3, p3: 0.3 }, ['p2', 'p3']);
    const c = makeResult({ p1: 0.3, p2: 0.3, p3: 0.3 }, ['p1', 'p3']);
    const m = aggregateMultiRun([a, b, c]);
    expect(m.panel_frequency['p1']).toBe(2);
    expect(m.panel_frequency['p2']).toBe(2);
    expect(m.panel_frequency['p3']).toBe(2);
    expect(m.panel_signature_count).toBe(3);
  });

  it('detects same-panel-twice', () => {
    const a = makeResult({ p1: 0.5, p2: 0.5 }, ['p1', 'p2']);
    const m = aggregateMultiRun([a, a, a]);
    expect(m.panel_signature_count).toBe(1);
  });
});
