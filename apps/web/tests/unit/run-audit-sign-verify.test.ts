import { describe, it, expect, vi } from 'vitest';
import { signAudit, type AuditDoc, AUDIT_SCHEMA_VERSION } from '../../src/run/audit';

// Round-trip verification of signAudit (Stage 3). Same protection as the
// Stage 1 sibling test: if signing produces a doc whose signature does not
// actually verify against its public_key over its bodyJson, this catches it.

function makeDoc(): AuditDoc {
  return {
    schema_version: AUDIT_SCHEMA_VERSION,
    engine: { id: 'engine-a', version: '0.1.0' },
    algorithm: 'maximin',
    seed: 42,
    input_sha256: 'a'.repeat(64),
    panel_size: 6,
    pool_size: 20,
    selected: ['p001', 'p002', 'p003', 'p004', 'p005', 'p006'],
    marginals: { p001: 0.3, p002: 0.3, p003: 0.3, p004: 0.3, p005: 0.3, p006: 0.3 },
    quota_fulfillment: [
      { column: 'gender', value: 'm', selected: 3, bound_min: 2, bound_max: 4, ok: true },
      { column: 'gender', value: 'f', selected: 3, bound_min: 2, bound_max: 4, ok: true },
    ],
    timing: { duration_ms: 50, total_ms: 50, num_committees: 100 },
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

describe('signAudit (Stage 3) — round-trip verification', () => {
  it('produces a signature that verifies against the public key over bodyJson', async () => {
    const signed = await signAudit(makeDoc());

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

  it('detects body tampering — flipping the seed value invalidates signature', async () => {
    const signed = await signAudit(makeDoc());
    const algo = signed.doc.signature_algo!;
    const format = algo === 'Ed25519' ? 'raw' : 'spki';
    const pubKey = await importPublicKey(format, algo, signed.doc.public_key!);
    const sig = fromBase64(signed.doc.signature!);

    const tamperedJson = signed.bodyJson.replace('"seed":42', '"seed":43');
    expect(tamperedJson).not.toBe(signed.bodyJson);

    const ok = await verify(algo, pubKey, sig, new TextEncoder().encode(tamperedJson));
    expect(ok).toBe(false);
  });

  it('detects signature tampering — Ed25519 returns false (no throw)', async () => {
    const signed = await signAudit(makeDoc());
    if (signed.doc.signature_algo !== 'Ed25519') {
      return;
    }
    const pubKey = await importPublicKey('raw', 'Ed25519', signed.doc.public_key!);
    const sig = fromBase64(signed.doc.signature!);
    const body = new TextEncoder().encode(signed.bodyJson);

    const tampered = new Uint8Array(sig);
    tampered[0] = tampered[0]! ^ 0x01;

    // Ed25519 verify is required to resolve to false on a corrupted
    // signature, NOT throw. Strict assertion catches regressions where
    // the verifier becomes exception-driven.
    const ok = await verify('Ed25519', pubKey, tampered, body);
    expect(ok).toBe(false);
  });

  it('bodyJson is the JSON.stringify of the doc with signature fields stripped', async () => {
    const doc = makeDoc();
    const signed = await signAudit(doc);
    // run/audit.ts uses plain JSON.stringify (NOT canonicalStage1Json sort —
    // schema 0.1 predates the canonicalizer); the body must equal stringify
    // of the input doc (which has no signature fields yet).
    expect(signed.bodyJson).toBe(JSON.stringify(doc));
  });
});

describe('signAudit (Stage 3) — seat_allocation coverage (Task 5)', () => {
  function makeDocWithSeatAllocation(): AuditDoc {
    const base = makeDoc();
    return {
      ...base,
      seat_allocation: {
        baseline: { gender: { m: 3, f: 3 } },
        override: {
          axis: 'gender',
          seats: { m: 4, f: 2 },
          rationale: 'Geschlechter-Quote-Override gemäss Geschäftsordnung §17 Absatz 3.',
          timestamp_iso: '2026-05-04T12:00:00Z',
        },
        deviation: {
          m: { delta_seats: 1, delta_percent: 1 / 6 },
          f: { delta_seats: -1, delta_percent: -1 / 6 },
        },
      },
    };
  }

  it('round-trips a signed doc with seat_allocation.override populated', async () => {
    const signed = await signAudit(makeDocWithSeatAllocation());
    expect(signed.doc.seat_allocation).toBeDefined();
    expect(signed.doc.seat_allocation!.override?.axis).toBe('gender');

    const algo = signed.doc.signature_algo!;
    const format = algo === 'Ed25519' ? 'raw' : 'spki';
    const pubKey = await importPublicKey(format, algo, signed.doc.public_key!);
    const sig = fromBase64(signed.doc.signature!);
    const body = new TextEncoder().encode(signed.bodyJson);
    expect(await verify(algo, pubKey, sig, body)).toBe(true);
  });

  it('detects tampering — rationale changed without re-sign → verify false', async () => {
    const signed = await signAudit(makeDocWithSeatAllocation());
    const algo = signed.doc.signature_algo!;
    const format = algo === 'Ed25519' ? 'raw' : 'spki';
    const pubKey = await importPublicKey(format, algo, signed.doc.public_key!);
    const sig = fromBase64(signed.doc.signature!);

    const tamperedJson = signed.bodyJson.replace(
      'Geschlechter-Quote-Override gemäss Geschäftsordnung §17 Absatz 3.',
      'Andere Begründung — manipuliert nach dem Signieren.',
    );
    expect(tamperedJson).not.toBe(signed.bodyJson);

    const ok = await verify(algo, pubKey, sig, new TextEncoder().encode(tamperedJson));
    expect(ok).toBe(false);
  });

  it('detects tampering — override.seats[m] flipped → verify false', async () => {
    const signed = await signAudit(makeDocWithSeatAllocation());
    const algo = signed.doc.signature_algo!;
    const format = algo === 'Ed25519' ? 'raw' : 'spki';
    const pubKey = await importPublicKey(format, algo, signed.doc.public_key!);
    const sig = fromBase64(signed.doc.signature!);

    const tamperedJson = signed.bodyJson.replace('"m":4', '"m":5');
    expect(tamperedJson).not.toBe(signed.bodyJson);

    const ok = await verify(algo, pubKey, sig, new TextEncoder().encode(tamperedJson));
    expect(ok).toBe(false);
  });

  it('detects tampering — schema_version downgrade 0.2 → 0.1 → verify false', async () => {
    const signed = await signAudit(makeDocWithSeatAllocation());
    const algo = signed.doc.signature_algo!;
    const format = algo === 'Ed25519' ? 'raw' : 'spki';
    const pubKey = await importPublicKey(format, algo, signed.doc.public_key!);
    const sig = fromBase64(signed.doc.signature!);

    const tamperedJson = signed.bodyJson.replace('"schema_version":"0.2"', '"schema_version":"0.1"');
    expect(tamperedJson).not.toBe(signed.bodyJson);

    const ok = await verify(algo, pubKey, sig, new TextEncoder().encode(tamperedJson));
    expect(ok).toBe(false);
  });

  it('backward-compat: a hand-written 0.1-shaped doc still signs + verifies', async () => {
    // Simulate a pre-existing 0.1 audit (no seat_allocation field). signAudit
    // is unchanged from 0.1 → 0.2; the round trip must still hold so
    // existing 0.1 manifests verify against the unchanged signing code.
    const legacy: AuditDoc = {
      ...makeDoc(),
      schema_version: '0.1',
    };
    const signed = await signAudit(legacy);
    expect(signed.doc.seat_allocation).toBeUndefined();
    expect(signed.doc.schema_version).toBe('0.1');

    const algo = signed.doc.signature_algo!;
    const format = algo === 'Ed25519' ? 'raw' : 'spki';
    const pubKey = await importPublicKey(format, algo, signed.doc.public_key!);
    const sig = fromBase64(signed.doc.signature!);
    const body = new TextEncoder().encode(signed.bodyJson);
    expect(await verify(algo, pubKey, sig, body)).toBe(true);
  });
});

describe('signAudit (Stage 3) — ECDSA fallback', () => {
  it('falls back to ECDSA-P256-SHA256 when Ed25519 generateKey throws, and the result still round-trips', async () => {
    const original = crypto.subtle.generateKey.bind(crypto.subtle);
    const spy = vi
      .spyOn(crypto.subtle, 'generateKey')
      .mockImplementation((alg, extractable, usages) => {
        const algName = (alg as { name?: string }).name;
        if (algName === 'Ed25519') {
          return Promise.reject(new DOMException('forced fallback for test', 'NotSupportedError'));
        }
        return original(alg, extractable, usages) as Promise<CryptoKeyPair>;
      });

    try {
      const signed = await signAudit(makeDoc());
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
