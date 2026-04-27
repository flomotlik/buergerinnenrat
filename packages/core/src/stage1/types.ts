// Stage 1 (Versand-Liste) — type definitions.
// All shapes are framework-agnostic plain TS interfaces so this module
// can be consumed both from Vitest (Node) and from the Solid web app.

import type { AgeBand } from './age-bands';

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
  /**
   * Optional (Issue #62): canonical stratum-key strings that must receive
   * n_h_target=0. Used by the Stage1Panel pipeline to implement the
   * "display-only" age-band mode without filtering the underlying pool.
   * Keys are produced via the same `JSON.stringify([[axis, value], …])`
   * encoding that {@link bucketize} emits.
   */
  forcedZeroStrataKeys?: ReadonlySet<string>;
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
  /**
   * Optional (Issue #62): present and `true` for strata whose n_h_target was
   * forced to 0 via {@link StratifyOpts.forcedZeroStrataKeys} (typically the
   * "display-only" age band). Omitted when false to keep canonical JSON
   * minimal.
   */
  forced_zero?: boolean;
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

/**
 * Stage 1 sample-size proposal, recorded in the audit doc when the user
 * used the SampleSizeCalculator (Issue #64). Optional — manually-set N
 * still produces a valid 0.4 audit doc, the field is simply absent.
 */
export interface Stage1SampleSizeProposalAudit {
  /** Target panel size the user entered. */
  panel_size: number;
  /** Outreach method choice. */
  outreach: 'mail-only' | 'mail-plus-phone' | 'custom';
  /** Pessimistic response rate (0..1) used to compute range_max. */
  response_rate_min: number;
  /** Optimistic response rate (0..1) used to compute range_min. */
  response_rate_max: number;
  /** Safety factor applied to compensate for Stage 3 drop-outs. */
  safety_factor: number;
  /** N that the calculator suggested (rounded to nearest 10). */
  recommended: number;
  /** [optimistic_min, conservative_max] — both integers. */
  range: [number, number];
  /**
   * True iff the actually-used target_n diverges from `recommended` —
   * surfaced in the footer/Markdown so reviewers see "manuell überschrieben".
   */
  manually_overridden: boolean;
}

/** Stage 1 audit JSON document. Signature fields are filled in by the web layer. */
export interface Stage1AuditDoc {
  /**
   * Schema version of the audit document itself. Bump on breaking shape
   * changes.
   *
   * 0.4 (Issue #64): adds optional `sample_size_proposal`. Older 0.3 docs
   * remain valid — the field is omitted when no calculator was used.
   */
  schema_version: '0.4';
  operation: 'stage1-versand';
  /**
   * Algorithm version: identifier of the algorithm + tie-break + key-encoding
   * convention used to produce this output. Bump if any of those change so
   * that older audit docs cannot be silently re-played with the new code.
   *
   * 1.1.0 (Issue #62): adds optional `forcedZeroStrataKeys` allocator branch.
   * 1.2.0 (Issue #64): adds optional `sample_size_proposal` audit field.
   *   Allocator behavior is byte-identical to 1.1.0 — only metadata is
   *   widened.
   */
  algorithm_version: 'stage1@1.2.0';
  /** PRNG identifier — currently always 'mulberry32'. */
  prng: 'mulberry32';
  /**
   * Hamilton tie-break rule, recorded so future verifiers know how to
   * reproduce. Order matters: largest remainder, then largest N_h, then
   * codepoint-smaller stratum key.
   */
  tie_break_rule: 'largest-remainder, then largest n_h, then codepoint-smaller key';
  /**
   * Stratum key encoding format. Future verifiers need to know how
   * `(axis, value)` pairs are folded into a comparable string.
   */
  key_encoding: 'json-compact-array-of-pairs';
  /** Stratum sort order (used for the `selected[]` output as well). */
  stratum_sort: 'codepoint-ascending';
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
  /**
   * Selected row indices (0-based, into the original input rows AS PARSED).
   * Order: lex stratum order, then ascending original-index within stratum
   * (matches StratifyResult.selected). Binding the audit signature to the
   * actual selection — without this field, a signed audit could be paired
   * with a different output CSV.
   */
  selected_indices: number[];
  /** Per-stratum table, sorted by lexicographic stratum key. */
  strata: Array<{
    key: Record<string, string>;
    n_h_pool: number;
    n_h_target: number;
    n_h_actual: number;
    underfilled: boolean;
    /** Set to true when this stratum was forced to n_h_target=0 (Issue #62). */
    forced_zero?: boolean;
  }>;
  /** Human-readable warnings (1:1 from StratifyResult.warnings). */
  warnings: string[];
  /**
   * Optional (Issue #62): documentation for columns synthesized by the
   * upload pipeline (e.g. `altersgruppe` derived from `geburtsjahr`). Each
   * entry includes the raw source column, a German description, and — for
   * age-band derivations — the band configuration used at draw time.
   */
  derived_columns?: Record<
    string,
    {
      source: string;
      description: string;
      bands?: AgeBand[];
    }
  >;
  /**
   * Optional (Issue #62): canonical stratum-key strings whose n_h_target
   * was forced to 0 (e.g. age bands with mode 'display-only'). The pool
   * itself is unchanged — these strata simply never receive an allocation.
   * Sorted ascending by codepoint for stable canonical JSON.
   */
  forced_zero_strata?: string[];
  /**
   * Optional (Issue #64): sample-size proposal recorded when the user used
   * the SampleSizeCalculator. Absent when N was set manually without the
   * calculator — keeps backward-compat with 0.3 docs.
   */
  sample_size_proposal?: Stage1SampleSizeProposalAudit;
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
  /**
   * Optional (Issue #62): see {@link Stage1AuditDoc.derived_columns}.
   */
  derivedColumns?: Stage1AuditDoc['derived_columns'];
  /**
   * Optional (Issue #62): see {@link Stage1AuditDoc.forced_zero_strata}.
   */
  forcedZeroStrata?: string[];
  /**
   * Optional (Issue #64): see {@link Stage1AuditDoc.sample_size_proposal}.
   * The web layer composes this from the SampleSizeCalculator's last accepted
   * proposal plus a manualOverride flag captured at run-time.
   */
  sampleSizeProposal?: Stage1SampleSizeProposalAudit;
}
