import { describe, it, expect } from 'vitest';
import { signStage1Audit } from '../../src/stage1/audit-sign';
import { canonicalStage1Json, type Stage1AuditDoc } from '@sortition/core';

function makeDoc(): Stage1AuditDoc {
  return {
    schema_version: '0.1',
    operation: 'stage1-versand',
    seed: 42,
    seed_source: 'user',
    input_csv_sha256: 'a'.repeat(64),
    input_csv_filename: 'pool.csv',
    input_csv_size_bytes: 100,
    pool_size: 10,
    target_n: 4,
    actual_n: 4,
    stratification_axes: ['district'],
    strata: [
      { key: { district: 'a' }, n_h_pool: 5, n_h_target: 2, n_h_actual: 2, underfilled: false },
      { key: { district: 'b' }, n_h_pool: 5, n_h_target: 2, n_h_actual: 2, underfilled: false },
    ],
    warnings: [],
    timestamp_iso: '2026-04-25T18:00:00Z',
    duration_ms: 12,
  };
}

describe('signStage1Audit (smoke)', () => {
  it('populates public_key, signature, signature_algo without throwing', async () => {
    const doc = makeDoc();
    const signed = await signStage1Audit(doc);
    expect(signed.doc.public_key).toBeTypeOf('string');
    expect(signed.doc.signature).toBeTypeOf('string');
    expect(signed.doc.public_key!.length).toBeGreaterThan(0);
    expect(signed.doc.signature!.length).toBeGreaterThan(0);
    expect(['Ed25519', 'ECDSA-P256-SHA256']).toContain(signed.doc.signature_algo);
  });

  it('signs the canonical form of the stripped doc', async () => {
    const doc = makeDoc();
    const signed = await signStage1Audit(doc);
    // bodyJson must equal canonicalStage1Json applied to the doc *without*
    // signature fields — because we strip-then-sign-then-fill.
    const stripped: Stage1AuditDoc = { ...doc };
    delete stripped.public_key;
    delete stripped.signature;
    delete stripped.signature_algo;
    expect(signed.bodyJson).toBe(canonicalStage1Json(stripped));
  });

  it('does not mutate the input doc', async () => {
    const doc = makeDoc();
    const before = JSON.stringify(doc);
    await signStage1Audit(doc);
    expect(JSON.stringify(doc)).toBe(before);
  });
});
