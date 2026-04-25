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
