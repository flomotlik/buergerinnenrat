import { describe, it, expect, vi } from 'vitest';
import { signStage1Audit } from '../../src/stage1/audit-sign';
import { canonicalStage1Json, type Stage1AuditDoc } from '@sortition/core';

// Round-trip verification of signStage1Audit. Catches the silent-failure
// mode in which signing returns a doc whose `signature` cannot actually be
// verified against `public_key` over `bodyJson` — e.g. wrong key encoding,
// algorithm/key mismatch, or canonicalizer drift between sign and verify.

function makeDoc(): Stage1AuditDoc {
  return {
    schema_version: '0.4',
    operation: 'stage1-versand',
    algorithm_version: 'stage1@1.2.0',
    prng: 'mulberry32',
    tie_break_rule: 'largest-remainder, then largest n_h, then codepoint-smaller key',
    key_encoding: 'json-compact-array-of-pairs',
    stratum_sort: 'codepoint-ascending',
    seed: 42,
    seed_source: 'user',
    input_csv_sha256: 'a'.repeat(64),
    input_csv_filename: 'pool.csv',
    input_csv_size_bytes: 100,
    pool_size: 10,
    target_n: 4,
    actual_n: 4,
    stratification_axes: ['district'],
    selected_indices: [0, 1, 5, 6],
    strata: [
      { key: { district: 'a' }, n_h_pool: 5, n_h_target: 2, n_h_actual: 2, underfilled: false },
      { key: { district: 'b' }, n_h_pool: 5, n_h_target: 2, n_h_actual: 2, underfilled: false },
    ],
    warnings: [],
    timestamp_iso: '2026-04-25T18:00:00Z',
    duration_ms: 12,
  };
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function importPublicKey(format: 'raw' | 'spki', algo: 'Ed25519' | 'ECDSA-P256-SHA256', pubB64: string) {
  if (algo === 'Ed25519') {
    return crypto.subtle.importKey(format, fromBase64(pubB64), { name: 'Ed25519' }, false, ['verify']);
  }
  return crypto.subtle.importKey(
    format,
    fromBase64(pubB64),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );
}

async function verify(algo: 'Ed25519' | 'ECDSA-P256-SHA256', pubKey: CryptoKey, sigBytes: Uint8Array, body: Uint8Array): Promise<boolean> {
  if (algo === 'Ed25519') {
    return crypto.subtle.verify('Ed25519', pubKey, sigBytes, body);
  }
  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pubKey, sigBytes, body);
}

describe('signStage1Audit — round-trip verification', () => {
  it('produces a signature that verifies against the public key over bodyJson (Ed25519 path)', async () => {
    const signed = await signStage1Audit(makeDoc());

    expect(['Ed25519', 'ECDSA-P256-SHA256']).toContain(signed.doc.signature_algo);
    expect(signed.doc.signature).toBeTypeOf('string');
    expect(signed.doc.public_key).toBeTypeOf('string');

    const algo = signed.doc.signature_algo!;
    const format = algo === 'Ed25519' ? 'raw' : 'spki';
    const pubKey = await importPublicKey(format, algo, signed.doc.public_key!);
    const sig = fromBase64(signed.doc.signature!);
    const body = new TextEncoder().encode(signed.bodyJson);

    const ok = await verify(algo, pubKey, sig, body);
    expect(ok).toBe(true);
  });

  it('detects body tampering — flipping one byte in bodyJson invalidates signature', async () => {
    const signed = await signStage1Audit(makeDoc());
    const algo = signed.doc.signature_algo!;
    const format = algo === 'Ed25519' ? 'raw' : 'spki';
    const pubKey = await importPublicKey(format, algo, signed.doc.public_key!);
    const sig = fromBase64(signed.doc.signature!);

    // Mutate the canonical body: replace the seed value 42 with 43. This
    // changes a single character but leaves the JSON parseable, exercising
    // the worst-case attacker scenario where the audit is structurally
    // valid but its content has been altered.
    const tamperedJson = signed.bodyJson.replace('"seed":42', '"seed":43');
    expect(tamperedJson).not.toBe(signed.bodyJson);

    const ok = await verify(algo, pubKey, sig, new TextEncoder().encode(tamperedJson));
    expect(ok).toBe(false);
  });

  it('detects signature tampering — flipping one byte in signature invalidates verify', async () => {
    const signed = await signStage1Audit(makeDoc());
    const algo = signed.doc.signature_algo!;
    const format = algo === 'Ed25519' ? 'raw' : 'spki';
    const pubKey = await importPublicKey(format, algo, signed.doc.public_key!);
    const sig = fromBase64(signed.doc.signature!);
    const body = new TextEncoder().encode(signed.bodyJson);

    // XOR the first signature byte to flip its low bit.
    const tampered = new Uint8Array(sig);
    tampered[0] = tampered[0]! ^ 0x01;

    // Some impls throw on a malformed ECDSA signature instead of returning
    // false; either outcome counts as detection. Wrap and normalize.
    let ok: boolean;
    try {
      ok = await verify(algo, pubKey, tampered, body);
    } catch {
      ok = false;
    }
    expect(ok).toBe(false);
  });

  it('bodyJson matches canonicalStage1Json of the doc with signature fields stripped', async () => {
    const doc = makeDoc();
    const signed = await signStage1Audit(doc);
    const stripped: Stage1AuditDoc = { ...doc };
    delete stripped.public_key;
    delete stripped.signature;
    delete stripped.signature_algo;
    expect(signed.bodyJson).toBe(canonicalStage1Json(stripped));
  });
});

describe('signStage1Audit — ECDSA fallback', () => {
  // Force the ECDSA-P256 fallback by making the Ed25519 generateKey call
  // throw. This exercises the branch that older browsers (pre-Ed25519
  // WebCrypto support) would exercise organically.
  it('falls back to ECDSA-P256-SHA256 when Ed25519 generateKey throws, and the result still round-trips', async () => {
    const original = crypto.subtle.generateKey.bind(crypto.subtle);
    const spy = vi
      .spyOn(crypto.subtle, 'generateKey')
      .mockImplementation((alg, extractable, usages) => {
        const algName = (alg as { name?: string }).name;
        if (algName === 'Ed25519') {
          return Promise.reject(new DOMException('forced fallback for test', 'NotSupportedError'));
        }
        // delegate to the real impl for the ECDSA branch
        return original(alg, extractable, usages) as Promise<CryptoKeyPair>;
      });

    try {
      const signed = await signStage1Audit(makeDoc());
      expect(signed.doc.signature_algo).toBe('ECDSA-P256-SHA256');

      const pubKey = await importPublicKey('spki', 'ECDSA-P256-SHA256', signed.doc.public_key!);
      const sig = fromBase64(signed.doc.signature!);
      const body = new TextEncoder().encode(signed.bodyJson);
      const ok = await verify('ECDSA-P256-SHA256', pubKey, sig, body);
      expect(ok).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });
});
