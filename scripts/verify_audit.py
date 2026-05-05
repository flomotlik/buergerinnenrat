#!/usr/bin/env python3
"""Verify a sortition audit JSON exported from the browser app.

Checks:
1. The JSON parses against the audit schema (lite check).
2. The Ed25519 or ECDSA-P256 signature matches the body bytes.
3. If `--pool` and `--quotas` are passed, recomputes `input_sha256` and
   matches it against the audit's claimed hash.

Exit codes:
  0 = all checks passed
  1 = signature mismatch
  2 = input hash mismatch
  3 = malformed audit (missing fields, etc.)
  4 = missing optional dependency
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

REQUIRED_FIELDS = (
    "schema_version",
    "engine",
    "algorithm",
    "seed",
    "input_sha256",
    "panel_size",
    "pool_size",
    "selected",
    "marginals",
    "quota_fulfillment",
    "timing",
    "public_key",
    "signature",
)


def _strip_signature(doc: dict[str, Any]) -> dict[str, Any]:
    out = {k: v for k, v in doc.items() if k not in ("public_key", "signature", "signature_algo")}
    return out


def _verify_ed25519(public_key: bytes, body: bytes, signature: bytes) -> bool:
    try:
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
        from cryptography.exceptions import InvalidSignature
    except ImportError:
        print("[error] cryptography package required for verification", file=sys.stderr)
        sys.exit(4)
    try:
        pk = Ed25519PublicKey.from_public_bytes(public_key)
        pk.verify(signature, body)
        return True
    except InvalidSignature:
        return False


def _verify_ecdsa_p256(public_key_spki: bytes, body: bytes, signature_raw: bytes) -> bool:
    try:
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives.serialization import load_der_public_key
        from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
        from cryptography.exceptions import InvalidSignature
        from cryptography.hazmat.primitives import hashes
    except ImportError:
        print("[error] cryptography package required for verification", file=sys.stderr)
        sys.exit(4)
    try:
        pk = load_der_public_key(public_key_spki)
        if not isinstance(pk, ec.EllipticCurvePublicKey):
            return False
        # WebCrypto produces a raw r||s signature (64 bytes for P-256).
        if len(signature_raw) != 64:
            return False
        r = int.from_bytes(signature_raw[:32], "big")
        s = int.from_bytes(signature_raw[32:], "big")
        der_sig = encode_dss_signature(r, s)
        pk.verify(der_sig, body, ec.ECDSA(hashes.SHA256()))
        return True
    except InvalidSignature:
        return False


def _canonical_quotas(quotas: dict[str, Any]) -> str:
    cats = sorted(quotas["categories"], key=lambda c: c["column"])
    norm: dict[str, Any] = {
        "panel_size": quotas["panel_size"],
        "categories": [],
    }
    for c in cats:
        keys = sorted(c["bounds"].keys())
        bounds = {k: {"min": c["bounds"][k]["min"], "max": c["bounds"][k]["max"]} for k in keys}
        norm["categories"].append({"column": c["column"], "bounds": bounds})
    # ensure_ascii=False so the canonicalisation matches the JS-side
    # implementation in apps/web/src/run/audit.ts.
    return json.dumps(norm, separators=(",", ":"), ensure_ascii=False)


def _canonical_pool(pool: dict[str, Any]) -> str:
    persons = sorted(pool["people"], key=lambda p: p["person_id"])
    norm: dict[str, Any] = {"id": pool["id"], "people": []}
    for p in persons:
        keys = sorted(p.keys())
        norm["people"].append({k: p[k] for k in keys})
    # ensure_ascii=False so person attributes with German umlauts round-trip
    # identically between JS and Python (see _canonical_quotas note).
    return json.dumps(norm, separators=(",", ":"), ensure_ascii=False)


def _input_sha256(pool: dict[str, Any], quotas: dict[str, Any]) -> str:
    text = (_canonical_pool(pool) + _canonical_quotas(quotas)).encode("utf-8")
    return hashlib.sha256(text).hexdigest()


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("audit", type=Path, help="audit JSON")
    p.add_argument("--pool", type=Path, help="pool JSON for input_sha256 verification")
    p.add_argument("--quotas", type=Path, help="quotas JSON for input_sha256 verification")
    args = p.parse_args()

    doc = json.loads(args.audit.read_text())
    for field in REQUIRED_FIELDS:
        if field not in doc:
            print(f"[error] missing field: {field}", file=sys.stderr)
            return 3

    # ensure_ascii=False so non-ASCII characters (e.g. German umlauts in a
    # rationale string, or in person attributes) round-trip as raw UTF-8 —
    # JS `JSON.stringify` does NOT escape them, so the Python body bytes
    # must match. Without this, every audit with a non-ASCII string fails
    # verification even when the signature is valid.
    body = json.dumps(_strip_signature(doc), separators=(",", ":"), ensure_ascii=False).encode(
        "utf-8"
    )
    pubkey = base64.b64decode(doc["public_key"])
    sig = base64.b64decode(doc["signature"])
    algo = doc.get("signature_algo", "Ed25519")

    if algo == "Ed25519":
        if not _verify_ed25519(pubkey, body, sig):
            print("[fail] Ed25519 signature did not verify", file=sys.stderr)
            return 1
    elif algo == "ECDSA-P256-SHA256":
        if not _verify_ecdsa_p256(pubkey, body, sig):
            print("[fail] ECDSA-P256 signature did not verify", file=sys.stderr)
            return 1
    else:
        print(f"[error] unknown signature_algo: {algo}", file=sys.stderr)
        return 3

    print(f"[ok] signature verified ({algo})")

    if args.pool and args.quotas:
        pool = json.loads(args.pool.read_text())
        quotas = json.loads(args.quotas.read_text())
        h = _input_sha256(pool, quotas)
        if h != doc["input_sha256"]:
            print(f"[fail] input_sha256 mismatch: audit={doc['input_sha256']}, recomputed={h}", file=sys.stderr)
            return 2
        print(f"[ok] input_sha256 matches: {h}")

    print(
        f"[ok] audit valid: panel_size={doc['panel_size']}, "
        f"selected={len(doc['selected'])}, seed={doc['seed']}, "
        f"engine={doc['engine']['id']}@{doc['engine']['version']}",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
