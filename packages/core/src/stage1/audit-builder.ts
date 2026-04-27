import type { BuildStage1AuditArgs, Stage1AuditDoc } from './types';

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/** Convert a byte array to lowercase hex. */
function bytesToHex(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]!;
    s += b.toString(16).padStart(2, '0');
  }
  return s;
}

/**
 * SHA-256 of `bytes`, returned as lowercase hex.
 *
 * Uses Web Crypto API (`globalThis.crypto.subtle`), which is available in
 * the browser and Node.js 20+ (RESEARCH.md risk 2 — confirmed).
 */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // We have to convert the Uint8Array to a fresh ArrayBuffer for subtle.digest
  // because some Node BufferSource constraints reject Uint8Array views over
  // a SharedArrayBuffer. Slicing creates a tightly-owned ArrayBuffer.
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const digest = await crypto.subtle.digest('SHA-256', ab);
  return bytesToHex(new Uint8Array(digest));
}

// ---------------------------------------------------------------------------
// Canonical JSON serialization
// ---------------------------------------------------------------------------

/** Deep-sort object keys ASC; arrays keep their order. Used for stable signing. */
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => sortKeysDeep(v));
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const k of sortedKeys) out[k] = sortKeysDeep(obj[k]);
    return out;
  }
  return value;
}

/**
 * Stable canonical JSON for a Stage1AuditDoc. Top-level (and nested) object
 * keys are sorted ASC; arrays keep their order. Output is single-line for
 * deterministic signing.
 */
export function canonicalStage1Json(doc: Stage1AuditDoc): string {
  return JSON.stringify(sortKeysDeep(doc));
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/** Build a {@link Stage1AuditDoc} from the result of `stratify()` plus context. */
export async function buildStage1Audit(args: BuildStage1AuditArgs): Promise<Stage1AuditDoc> {
  const inputHash = await sha256Hex(args.inputBytes);

  // Stratify already returns strata in lex stratum-key order; preserve that.
  // forced_zero (Issue #62) is propagated only when present (omit when false
  // so canonical JSON stays minimal for the common case).
  const strata = args.result.strata.map((s) => ({
    key: s.key,
    n_h_pool: s.n_h_pool,
    n_h_target: s.n_h_target,
    n_h_actual: s.n_h_actual,
    underfilled: s.underfilled,
    ...(s.forced_zero ? { forced_zero: true } : {}),
  }));

  return {
    schema_version: '0.4',
    operation: 'stage1-versand',
    algorithm_version: 'stage1@1.2.0',
    prng: 'mulberry32',
    tie_break_rule: 'largest-remainder, then largest n_h, then codepoint-smaller key',
    key_encoding: 'json-compact-array-of-pairs',
    stratum_sort: 'codepoint-ascending',
    seed: args.seed,
    seed_source: args.seedSource,
    input_csv_sha256: inputHash,
    input_csv_filename: args.filename,
    input_csv_size_bytes: args.sizeBytes,
    pool_size: args.poolSize,
    target_n: args.targetN,
    actual_n: args.result.selected.length,
    stratification_axes: args.axes,
    selected_indices: [...args.result.selected],
    strata,
    warnings: args.result.warnings,
    // Issue #62: derived_columns / forced_zero_strata are only emitted when
    // the caller passed something — undefined fields stay absent in the
    // canonical JSON for backward compatibility with v0.2 verifiers.
    ...(args.derivedColumns ? { derived_columns: args.derivedColumns } : {}),
    ...(args.forcedZeroStrata ? { forced_zero_strata: args.forcedZeroStrata } : {}),
    // Issue #64: only emit when the caller actually had a proposal — keeps
    // older 0.3-shaped audit consumers (and manual-N runs) lean.
    ...(args.sampleSizeProposal ? { sample_size_proposal: args.sampleSizeProposal } : {}),
    timestamp_iso: new Date().toISOString(),
    duration_ms: args.durationMs,
  };
}
