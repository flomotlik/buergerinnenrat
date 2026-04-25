// Stage 1 (Versand-Liste) — type definitions.
// All shapes are framework-agnostic plain TS interfaces so this module
// can be consumed both from Vitest (Node) and from the Solid web app.

/** A single stratum: cross-product key + indices into the original input rows. */
export interface Stratum {
  /** Key map of axis-name → cell value (e.g. { district: '01-zentrum', age_band: '25-34' }). */
  key: Record<string, string>;
  /** Indices into the original `rows[]` array, NOT row copies. */
  rowIndices: number[];
}

/** Options for {@link stratify}. */
export interface StratifyOpts {
  /** CSV column names that span the stratification cross-product. Empty array => single bucket (SRS). */
  axes: string[];
  /** Total number of people to draw across all strata. Must satisfy `targetN <= rows.length`. */
  targetN: number;
  /** Mulberry32 seed (any JS number — normalized to uint32 internally). */
  seed: number;
}

/** Per-stratum allocation result. */
export interface StratumResult {
  key: Record<string, string>;
  /** How many people from this stratum exist in the input pool. */
  n_h_pool: number;
  /** How many people the largest-remainder allocation assigned to this stratum. */
  n_h_target: number;
  /** How many people were actually drawn (= min(n_h_target, n_h_pool)). */
  n_h_actual: number;
  /** True iff `n_h_actual < n_h_target` (pool was too small for the target). */
  underfilled: boolean;
}

/** Full result of {@link stratify}. */
export interface StratifyResult {
  /** Indices into the original `rows[]` array, in deterministic output order. */
  selected: number[];
  /** All occupied strata, sorted by lexicographic stratum key. */
  strata: StratumResult[];
  /** Human-readable warnings (German). One entry per underfilled stratum. */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Audit document (Stage 1)
// ---------------------------------------------------------------------------

/** Source of the seed value, surfaced in the audit document for traceability. */
export type Stage1SeedSource = 'user' | 'unix-time-default';

/** Stage 1 audit JSON document. Signature fields are filled in by the web layer. */
export interface Stage1AuditDoc {
  schema_version: '0.1';
  operation: 'stage1-versand';
  seed: number;
  seed_source: Stage1SeedSource;
  /** SHA-256 (lowercase hex) of the raw bytes of the uploaded CSV. */
  input_csv_sha256: string;
  input_csv_filename: string;
  input_csv_size_bytes: number;
  pool_size: number;
  target_n: number;
  /** Actual number of people drawn (= `selected.length`; can be < target_n on underfill). */
  actual_n: number;
  stratification_axes: string[];
  /** Per-stratum table, sorted by lexicographic stratum key. */
  strata: Array<{
    key: Record<string, string>;
    n_h_pool: number;
    n_h_target: number;
    n_h_actual: number;
    underfilled: boolean;
  }>;
  /** Human-readable warnings (1:1 from StratifyResult.warnings). */
  warnings: string[];
  /** ISO 8601 UTC timestamp when the audit doc was built. */
  timestamp_iso: string;
  /** Wall-clock duration in milliseconds for the full Stage 1 pipeline. */
  duration_ms: number;
  // Filled by the web layer via signStage1Audit().
  public_key?: string;
  signature?: string;
  signature_algo?: 'Ed25519' | 'ECDSA-P256-SHA256';
}

/** Inputs to {@link buildStage1Audit}. */
export interface BuildStage1AuditArgs {
  /** Raw bytes of the uploaded CSV file (for SHA-256). */
  inputBytes: Uint8Array;
  /** Original filename of the uploaded CSV. */
  filename: string;
  /** Original size in bytes of the uploaded CSV (== inputBytes.length, but kept explicit). */
  sizeBytes: number;
  axes: string[];
  targetN: number;
  seed: number;
  seedSource: Stage1SeedSource;
  poolSize: number;
  result: StratifyResult;
  durationMs: number;
}
