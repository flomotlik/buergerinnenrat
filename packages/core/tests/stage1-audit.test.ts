import { describe, it, expect } from 'vitest';
import {
  buildStage1Audit,
  canonicalStage1Json,
  sha256Hex,
  stratify,
  type Stage1AuditDoc,
  type StratifyResult,
} from '../src';

const enc = new TextEncoder();

function makeRows(n: number, districts: string[]): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      person_id: `p-${i}`,
      district: districts[i % districts.length]!,
      gender: i % 2 === 0 ? 'female' : 'male',
    });
  }
  return rows;
}

describe('sha256Hex', () => {
  it('hashes identical bytes to identical sha256', async () => {
    const a = await sha256Hex(enc.encode('hello'));
    const b = await sha256Hex(enc.encode('hello'));
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashes different bytes to different sha256', async () => {
    const a = await sha256Hex(enc.encode('hello'));
    const b = await sha256Hex(enc.encode('hellp'));
    expect(a).not.toBe(b);
  });

  it('matches the known SHA-256 vector for "abc"', async () => {
    // FIPS 180-4 worked example: SHA-256("abc") = ba7816bf8f01cfea4141...
    const h = await sha256Hex(enc.encode('abc'));
    expect(h).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('canonicalStage1Json', () => {
  it('produces stable canonical JSON across re-serialization', async () => {
    const rows = makeRows(60, ['a', 'b', 'c']);
    const result = stratify(rows, { axes: ['district'], targetN: 9, seed: 42 });
    const doc = await buildStage1Audit({
      inputBytes: enc.encode('csv-bytes'),
      filename: 'in.csv',
      sizeBytes: 9,
      axes: ['district'],
      targetN: 9,
      seed: 42,
      seedSource: 'user',
      poolSize: 60,
      result,
      durationMs: 12,
    });
    const a = canonicalStage1Json(doc);
    // Round-trip JSON.parse -> JSON.stringify(canonical) must yield identical bytes.
    const b = canonicalStage1Json(JSON.parse(a) as Stage1AuditDoc);
    expect(a).toBe(b);
  });

  it('sorts top-level keys alphabetically', async () => {
    const rows = makeRows(20, ['a', 'b']);
    const result = stratify(rows, { axes: ['district'], targetN: 4, seed: 1 });
    const doc = await buildStage1Audit({
      inputBytes: enc.encode('x'),
      filename: 'f.csv',
      sizeBytes: 1,
      axes: ['district'],
      targetN: 4,
      seed: 1,
      seedSource: 'user',
      poolSize: 20,
      result,
      durationMs: 1,
    });
    const json = canonicalStage1Json(doc);
    // The first top-level key in the canonical output must be the
    // alphabetically smallest key — `actual_n` (still smallest after the
    // schema additions: 'algorithm_version', 'duration_ms', etc. all > 'a_').
    expect(json.startsWith('{"actual_n":')).toBe(true);
  });
});

describe('buildStage1Audit', () => {
  it('preserves warnings from stratify result', async () => {
    // Construct a tiny stratum forced to underfill via direct injection.
    // Real underfill via stratify is very rare with proportional rounding;
    // we synthesize a StratifyResult manually here.
    const fakeResult: StratifyResult = {
      selected: [0],
      strata: [
        {
          key: { district: 'tiny' },
          n_h_pool: 1,
          n_h_target: 3,
          n_h_actual: 1,
          underfilled: true,
        },
      ],
      warnings: ['Stratum [["district","tiny"]] unter-vertreten: 1 von 3 angefragt (Pool: 1).'],
    };
    const doc = await buildStage1Audit({
      inputBytes: enc.encode('x'),
      filename: 'f.csv',
      sizeBytes: 1,
      axes: ['district'],
      targetN: 3,
      seed: 1,
      seedSource: 'user',
      poolSize: 1,
      result: fakeResult,
      durationMs: 1,
    });
    expect(doc.warnings).toEqual(fakeResult.warnings);
  });

  it('sets actual_n to selected.length, not target_n', async () => {
    const fakeResult: StratifyResult = {
      selected: [0, 1, 2],
      strata: [
        {
          key: { district: 'x' },
          n_h_pool: 3,
          n_h_target: 5,
          n_h_actual: 3,
          underfilled: true,
        },
      ],
      warnings: ['x'],
    };
    const doc = await buildStage1Audit({
      inputBytes: enc.encode('x'),
      filename: 'f.csv',
      sizeBytes: 1,
      axes: ['district'],
      targetN: 5,
      seed: 1,
      seedSource: 'user',
      poolSize: 3,
      result: fakeResult,
      durationMs: 1,
    });
    expect(doc.actual_n).toBe(3);
    expect(doc.target_n).toBe(5);
  });

  it('exposes seed_source field as provided', async () => {
    const rows = makeRows(20, ['a', 'b']);
    const result = stratify(rows, { axes: ['district'], targetN: 4, seed: 1 });
    const docUser = await buildStage1Audit({
      inputBytes: enc.encode('x'),
      filename: 'f.csv',
      sizeBytes: 1,
      axes: ['district'],
      targetN: 4,
      seed: 1,
      seedSource: 'user',
      poolSize: 20,
      result,
      durationMs: 1,
    });
    const docAuto = await buildStage1Audit({
      inputBytes: enc.encode('x'),
      filename: 'f.csv',
      sizeBytes: 1,
      axes: ['district'],
      targetN: 4,
      seed: 1,
      seedSource: 'unix-time-default',
      poolSize: 20,
      result,
      durationMs: 1,
    });
    expect(docUser.seed_source).toBe('user');
    expect(docAuto.seed_source).toBe('unix-time-default');
  });

  it('sets schema_version=0.4, operation=stage1-versand, and algorithm provenance fields', async () => {
    const rows = makeRows(20, ['a', 'b']);
    const result = stratify(rows, { axes: ['district'], targetN: 4, seed: 1 });
    const doc = await buildStage1Audit({
      inputBytes: enc.encode('x'),
      filename: 'f.csv',
      sizeBytes: 1,
      axes: ['district'],
      targetN: 4,
      seed: 1,
      seedSource: 'user',
      poolSize: 20,
      result,
      durationMs: 1,
    });
    expect(doc.schema_version).toBe('0.4');
    expect(doc.operation).toBe('stage1-versand');
    expect(doc.algorithm_version).toBe('stage1@1.2.0');
    expect(doc.prng).toBe('mulberry32');
    expect(doc.tie_break_rule).toContain('largest-remainder');
    expect(doc.key_encoding).toBe('json-compact-array-of-pairs');
    expect(doc.stratum_sort).toBe('codepoint-ascending');
  });

  it('omits sample_size_proposal when the args do not provide it (Issue #64)', async () => {
    const rows = makeRows(20, ['a', 'b']);
    const result = stratify(rows, { axes: ['district'], targetN: 4, seed: 1 });
    const doc = await buildStage1Audit({
      inputBytes: enc.encode('x'),
      filename: 'f.csv',
      sizeBytes: 1,
      axes: ['district'],
      targetN: 4,
      seed: 1,
      seedSource: 'user',
      poolSize: 20,
      result,
      durationMs: 1,
    });
    expect(doc.sample_size_proposal).toBeUndefined();
  });

  it('emits sample_size_proposal verbatim when args provide it (Issue #64)', async () => {
    const rows = makeRows(200, ['a', 'b']);
    const result = stratify(rows, { axes: ['district'], targetN: 110, seed: 1 });
    const doc = await buildStage1Audit({
      inputBytes: enc.encode('x'),
      filename: 'f.csv',
      sizeBytes: 1,
      axes: ['district'],
      targetN: 110,
      seed: 1,
      seedSource: 'user',
      poolSize: 200,
      result,
      durationMs: 1,
      sampleSizeProposal: {
        panel_size: 30,
        outreach: 'mail-plus-phone',
        response_rate_min: 0.3,
        response_rate_max: 0.5,
        safety_factor: 1.5,
        recommended: 110,
        range: [60, 150],
        manually_overridden: false,
      },
    });
    expect(doc.sample_size_proposal).toEqual({
      panel_size: 30,
      outreach: 'mail-plus-phone',
      response_rate_min: 0.3,
      response_rate_max: 0.5,
      safety_factor: 1.5,
      recommended: 110,
      range: [60, 150],
      manually_overridden: false,
    });
  });

  it('records manually_overridden when the user changed N after accepting (Issue #64)', async () => {
    const rows = makeRows(20, ['a', 'b']);
    const result = stratify(rows, { axes: ['district'], targetN: 4, seed: 1 });
    const doc = await buildStage1Audit({
      inputBytes: enc.encode('x'),
      filename: 'f.csv',
      sizeBytes: 1,
      axes: ['district'],
      targetN: 200,
      seed: 1,
      seedSource: 'user',
      poolSize: 20,
      result,
      durationMs: 1,
      sampleSizeProposal: {
        panel_size: 30,
        outreach: 'mail-plus-phone',
        response_rate_min: 0.3,
        response_rate_max: 0.5,
        safety_factor: 1.5,
        recommended: 110,
        range: [60, 150],
        manually_overridden: true,
      },
    });
    expect(doc.sample_size_proposal?.manually_overridden).toBe(true);
    expect(doc.sample_size_proposal?.recommended).toBe(110);
    expect(doc.target_n).toBe(200);
  });

  it('omits derived_columns and forced_zero_strata when the args do not provide them', async () => {
    const rows = makeRows(20, ['a', 'b']);
    const result = stratify(rows, { axes: ['district'], targetN: 4, seed: 1 });
    const doc = await buildStage1Audit({
      inputBytes: enc.encode('x'),
      filename: 'f.csv',
      sizeBytes: 1,
      axes: ['district'],
      targetN: 4,
      seed: 1,
      seedSource: 'user',
      poolSize: 20,
      result,
      durationMs: 1,
    });
    expect(doc.derived_columns).toBeUndefined();
    expect(doc.forced_zero_strata).toBeUndefined();
    // Issue #62: pool_filter must NEVER appear in the schema.
    expect((doc as unknown as Record<string, unknown>).pool_filter).toBeUndefined();
  });

  it('emits derived_columns and forced_zero_strata when args provide them', async () => {
    const rows = makeRows(20, ['a', 'b']);
    const result = stratify(rows, { axes: ['district'], targetN: 4, seed: 1 });
    const forcedKeys = ['[["altersgruppe","unter-16"]]'];
    const doc = await buildStage1Audit({
      inputBytes: enc.encode('x'),
      filename: 'f.csv',
      sizeBytes: 1,
      axes: ['district'],
      targetN: 4,
      seed: 1,
      seedSource: 'user',
      poolSize: 20,
      result,
      durationMs: 1,
      derivedColumns: {
        altersgruppe: {
          source: 'geburtsjahr',
          description: 'test',
          bands: [{ min: 0, max: 15, label: 'unter-16', mode: 'display-only' }],
        },
      },
      forcedZeroStrata: forcedKeys,
    });
    expect(doc.derived_columns?.altersgruppe?.source).toBe('geburtsjahr');
    expect(doc.derived_columns?.altersgruppe?.bands).toHaveLength(1);
    expect(doc.forced_zero_strata).toEqual(forcedKeys);
  });

  it('canonical JSON for a doc with derived_columns is deterministic across two builds', async () => {
    const rows = makeRows(20, ['a', 'b']);
    const result = stratify(rows, { axes: ['district'], targetN: 4, seed: 1 });
    const args = {
      inputBytes: enc.encode('x'),
      filename: 'f.csv',
      sizeBytes: 1,
      axes: ['district'],
      targetN: 4,
      seed: 1,
      seedSource: 'user' as const,
      poolSize: 20,
      result,
      durationMs: 1,
      derivedColumns: {
        altersgruppe: {
          source: 'geburtsjahr',
          description: 'derived',
          bands: [
            { min: 0, max: 15, label: 'unter-16', mode: 'display-only' as const },
          ],
        },
      },
      forcedZeroStrata: ['[["altersgruppe","unter-16"]]'],
    };
    const doc1 = await buildStage1Audit(args);
    const doc2 = await buildStage1Audit(args);
    // Each build picks up its own timestamp_iso, so isolate by stripping it.
    doc1.timestamp_iso = '';
    doc2.timestamp_iso = '';
    expect(canonicalStage1Json(doc1)).toBe(canonicalStage1Json(doc2));
  });

  it('binds the audit to the actual selection via selected_indices', async () => {
    const rows = makeRows(20, ['a', 'b']);
    const result = stratify(rows, { axes: ['district'], targetN: 4, seed: 1 });
    const doc = await buildStage1Audit({
      inputBytes: enc.encode('x'),
      filename: 'f.csv',
      sizeBytes: 1,
      axes: ['district'],
      targetN: 4,
      seed: 1,
      seedSource: 'user',
      poolSize: 20,
      result,
      durationMs: 1,
    });
    expect(doc.selected_indices).toEqual(result.selected);
    expect(doc.selected_indices).not.toBe(result.selected); // defensive copy
  });

  it('emits an ISO 8601 UTC timestamp', async () => {
    const rows = makeRows(20, ['a', 'b']);
    const result = stratify(rows, { axes: ['district'], targetN: 4, seed: 1 });
    const doc = await buildStage1Audit({
      inputBytes: enc.encode('x'),
      filename: 'f.csv',
      sizeBytes: 1,
      axes: ['district'],
      targetN: 4,
      seed: 1,
      seedSource: 'user',
      poolSize: 20,
      result,
      durationMs: 1,
    });
    // ISO 8601 with `Z` suffix.
    expect(doc.timestamp_iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/);
  });

  it('hashes the input bytes into input_csv_sha256', async () => {
    const rows = makeRows(10, ['a']);
    const result = stratify(rows, { axes: ['district'], targetN: 1, seed: 1 });
    const bytes = enc.encode('hello-world');
    const expected = await sha256Hex(bytes);
    const doc = await buildStage1Audit({
      inputBytes: bytes,
      filename: 'f.csv',
      sizeBytes: bytes.length,
      axes: ['district'],
      targetN: 1,
      seed: 1,
      seedSource: 'user',
      poolSize: 10,
      result,
      durationMs: 1,
    });
    expect(doc.input_csv_sha256).toBe(expected);
  });
});
