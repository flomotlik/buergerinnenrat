// Sign a Stage1AuditDoc using the same Web-Crypto Ed25519 -> ECDSA-P256-SHA256
// fallback chain as apps/web/src/run/audit.ts.
//
// We deliberately duplicate the ~30 lines of sign-with-fallback logic instead
// of refactoring the shared helper out of run/audit.ts. The Stretch goal in
// PLAN.md task 3 says: if extracting `signString` breaks any existing audit
// behavior, prefer duplication. Since there is no audit unit test today, we
// stay conservative and keep both call sites independent.

import { canonicalStage1Json, type Stage1AuditDoc } from '@sortition/core';

/** Signed Stage 1 audit: doc with signature fields populated + bodyJson actually signed. */
export interface SignedStage1Audit {
  doc: Stage1AuditDoc;
  /** The exact JSON string that was signed (== canonical form of the stripped doc). */
  bodyJson: string;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

async function signWithEd25519(
  bodyJson: string,
): Promise<{ pubB64: string; sigB64: string; algo: 'Ed25519' }> {
  const keyPair = (await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const pub = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const sig = await crypto.subtle.sign(
    'Ed25519',
    keyPair.privateKey,
    new TextEncoder().encode(bodyJson),
  );
  return {
    pubB64: toBase64(new Uint8Array(pub)),
    sigB64: toBase64(new Uint8Array(sig)),
    algo: 'Ed25519',
  };
}

async function signWithEcdsa(
  bodyJson: string,
): Promise<{ pubB64: string; sigB64: string; algo: 'ECDSA-P256-SHA256' }> {
  const keyPair = (await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const pub = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keyPair.privateKey,
    new TextEncoder().encode(bodyJson),
  );
  return {
    pubB64: toBase64(new Uint8Array(pub)),
    sigB64: toBase64(new Uint8Array(sig)),
    algo: 'ECDSA-P256-SHA256',
  };
}

/** Strip the signature fields before signing; identical pattern to run/audit.ts. */
function stripSignature(
  doc: Stage1AuditDoc,
): Omit<Stage1AuditDoc, 'public_key' | 'signature' | 'signature_algo'> {
  const { public_key: _pk, signature: _sig, signature_algo: _algo, ...rest } = doc;
  return rest;
}

/**
 * Sign a Stage1AuditDoc. Tries Ed25519 first (Chromium 113+, Firefox 130+);
 * falls back to ECDSA-P256-SHA256 on older runtimes. Both algorithms are
 * NIST-approved and the audit JSON's `signature_algo` field disambiguates
 * downstream verification.
 *
 * The bodyJson returned is the canonical (key-sorted) form of the doc with
 * signature fields stripped — i.e. exactly the bytes that were signed.
 */
export async function signStage1Audit(doc: Stage1AuditDoc): Promise<SignedStage1Audit> {
  const stripped = stripSignature(doc) as Stage1AuditDoc; // structural cast for canonicalizer
  const bodyJson = canonicalStage1Json(stripped);

  let signed: { pubB64: string; sigB64: string; algo: 'Ed25519' | 'ECDSA-P256-SHA256' };
  try {
    signed = await signWithEd25519(bodyJson);
  } catch (_e) {
    signed = await signWithEcdsa(bodyJson);
  }

  const out: Stage1AuditDoc = {
    ...doc,
    public_key: signed.pubB64,
    signature: signed.sigB64,
    signature_algo: signed.algo,
  };
  return { doc: out, bodyJson };
}
