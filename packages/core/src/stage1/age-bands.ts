// Age-band shape used by Stage 1's derived `altersgruppe` column and by the
// allocator's display-only-zero logic.
//
// Two modes:
//   - 'selection'    — the band participates in stratified sampling.
//                      Hamilton allocates to it like any other stratum.
//   - 'display-only' — the band stays in the pool (no row removal!) but the
//                      allocator forces n_h_target=0 for every cross-product
//                      stratum whose altersgruppe value matches this label.
//                      Used for ethical "do not draw" cases (e.g. minors)
//                      without falsifying the underlying register data.

/** A single age band: closed lower bound, optionally open upper bound. */
export interface AgeBand {
  /** Inclusive lower bound, integer ≥ 0. */
  min: number;
  /** Inclusive upper bound, integer ≥ min, or `null` for an open-ended band. */
  max: number | null;
  /** Human-readable label; also the value written into the `altersgruppe` cell. */
  label: string;
  /** 'selection' (drawn) vs. 'display-only' (forced to n_h_target=0). */
  mode: 'selection' | 'display-only';
}
