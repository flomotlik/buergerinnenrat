import { describe, it, expect } from 'vitest';
import {
  buildAudit,
  inputSha256,
  selectedToCsv,
  AUDIT_SCHEMA_VERSION,
} from '../../src/run/audit';
import type { Pool, Quotas, RunResult } from '@sortition/engine-contract';

// Unit coverage for run/audit.ts:
//   - inputSha256 (parameterized via fixed Pool+Quotas) → deterministic hex
//   - canonicalQuotas behavior is exercised indirectly via inputSha256 +
//     order-independence test (the function is module-private, but its
//     contract is observable through inputSha256)
//   - buildAudit shape: every documented field populated, schema version,
//     selected sorted ascending
//   - selectedToCsv: header + body line for known input

function makePool(): Pool {
  return {
    id: 'test',
    people: [
      { person_id: 'p001', gender: 'm' },
      { person_id: 'p002', gender: 'f' },
      { person_id: 'p003', gender: 'm' },
    ],
  };
}

function makeQuotas(reverseCategoryOrder = false): Quotas {
  // Two categories so canonicalQuotas's sort-by-column has actual work.
  // We use the same panel_size in both fixtures so swapping order yields the
  // same canonical hash (covered in the order-independence test below).
  const cats = [
    { column: 'gender', bounds: { m: { min: 1, max: 2 }, f: { min: 1, max: 2 } } },
    { column: 'district', bounds: { d1: { min: 0, max: 2 }, d2: { min: 0, max: 2 } } },
  ];
  return {
    panel_size: 2,
    categories: reverseCategoryOrder ? [cats[1]!, cats[0]!] : cats,
  };
}

function makeRunResult(): RunResult {
  return {
    selected: ['p003', 'p001'], // intentionally unsorted to verify buildAudit sorts
    marginals: { p001: 0.5, p002: 0.5, p003: 0.5 },
    quota_fulfillment: [
      { column: 'gender', value: 'm', selected: 1, bound_min: 1, bound_max: 2, ok: true },
      { column: 'gender', value: 'f', selected: 0, bound_min: 1, bound_max: 2, ok: false },
    ],
    timing: { total_ms: 12, num_committees: 5 },
    engine_meta: {
      engine_id: 'engine-a-highs',
      engine_version: '0.1.0',
      solver: 'highs',
      algorithm: 'maximin',
    },
  };
}

describe('inputSha256', () => {
  it('returns lowercase 64-char hex', async () => {
    const hash = await inputSha256(makePool(), makeQuotas());
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same input', async () => {
    const a = await inputSha256(makePool(), makeQuotas());
    const b = await inputSha256(makePool(), makeQuotas());
    expect(a).toBe(b);
  });

  it('is order-independent across categories[] (canonicalQuotas sorts by column)', async () => {
    const forward = await inputSha256(makePool(), makeQuotas(false));
    const reversed = await inputSha256(makePool(), makeQuotas(true));
    expect(forward).toBe(reversed);
  });

  it('changes when pool content changes', async () => {
    const a = await inputSha256(makePool(), makeQuotas());
    const tampered: Pool = {
      id: makePool().id,
      people: [...makePool().people, { person_id: 'p999', gender: 'm' }],
    };
    const b = await inputSha256(tampered, makeQuotas());
    expect(a).not.toBe(b);
  });
});

describe('buildAudit', () => {
  it('populates every documented field', async () => {
    const doc = await buildAudit({
      pool: makePool(),
      quotas: makeQuotas(),
      seed: 42,
      result: makeRunResult(),
      duration_ms: 99,
    });
    expect(doc.schema_version).toBe(AUDIT_SCHEMA_VERSION);
    expect(doc.engine).toEqual({ id: 'engine-a-highs', version: '0.1.0' });
    expect(doc.algorithm).toBe('maximin');
    expect(doc.seed).toBe(42);
    expect(doc.input_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(doc.panel_size).toBe(2);
    expect(doc.pool_size).toBe(3);
    expect(doc.marginals).toEqual({ p001: 0.5, p002: 0.5, p003: 0.5 });
    expect(doc.quota_fulfillment).toHaveLength(2);
    expect(doc.timing.duration_ms).toBe(99);
    expect(doc.timing.total_ms).toBe(12);
    expect(doc.timing.num_committees).toBe(5);
    // signature fields are filled by signAudit, not buildAudit.
    expect(doc.public_key).toBeUndefined();
    expect(doc.signature).toBeUndefined();
    expect(doc.signature_algo).toBeUndefined();
  });

  it('sorts selected[] ascending', async () => {
    const doc = await buildAudit({
      pool: makePool(),
      quotas: makeQuotas(),
      seed: 42,
      result: makeRunResult(),
      duration_ms: 1,
    });
    expect(doc.selected).toEqual(['p001', 'p003']);
  });

  it('omits num_committees from timing when not provided', async () => {
    const result: RunResult = {
      ...makeRunResult(),
      timing: { total_ms: 7 },
    };
    const doc = await buildAudit({
      pool: makePool(),
      quotas: makeQuotas(),
      seed: 1,
      result,
      duration_ms: 2,
    });
    expect(doc.timing.num_committees).toBeUndefined();
    expect(doc.timing.total_ms).toBe(7);
  });
});

describe('selectedToCsv', () => {
  it('emits header + one row per selected person, attribute order from first person', async () => {
    const csv = selectedToCsv(makePool(), ['p001', 'p003']);
    const lines = csv.trimEnd().split('\n');
    expect(lines[0]).toBe('person_id,gender');
    // p001 row
    expect(lines[1]).toBe('p001,m');
    // p003 row
    expect(lines[2]).toBe('p003,m');
    // Trailing newline preserved.
    expect(csv.endsWith('\n')).toBe(true);
  });

  it('returns empty string when selection is empty', () => {
    const csv = selectedToCsv(makePool(), []);
    expect(csv).toBe('');
  });

  it('skips ids that are not present in the pool', () => {
    const csv = selectedToCsv(makePool(), ['p001', 'pZZZ']);
    const lines = csv.trimEnd().split('\n');
    expect(lines).toHaveLength(2); // header + p001 only
    expect(lines[1]).toBe('p001,m');
  });
});
