// Stage 1 — sample-size suggestion (Issue #64).
//
// Pure functions for translating "Wieviele Personen sollen im Panel sitzen?"
// + "Welche Outreach-Methode?" into a recommended Versand-Stichprobe N
// (number of letters to send) plus a defensible range.
//
// Outreach response-rate defaults derived from Personenauswahl practice —
// empirical from Bürgerrat verfahren in DE/AT (sortition-foundation, "Es
// geht LOS"), and applicable to comparable selection processes (delegation,
// internal panels) with similar anonymous-outreach characteristics.
//
// Rationale (research/03-legal-framework-and-best-practices.md, Bürgerrat-
// Praxis as the empirical baseline):
//   - mail-only: 5–10 % response (avg 7 %) — Sortition Foundation, kommunale
//     Bürgerräte AT.
//   - mail-plus-phone: 30–50 % (avg 40 %) — Bürgerrat-Praxis with active
//     phone outreach. This is the realistic default for serious processes.
//   - safetyFactor 1.5 covers Stage 3 drop-outs after self-disclosure.
//
// Formula (from RESEARCH.md):
//   range_min   = ceil(panelSize / rateMax)                       (optimistic)
//   range_max   = ceil(panelSize / rateMin × safetyFactor)        (conservative)
//   recommended = round(panelSize / rateAvg × safetyFactor / 10) × 10
//
// All values returned are integers. The pure function never throws — invalid
// inputs (panelSize < 0, custom rates out of (0,1] or min > max) yield `null`
// so the UI can render a validation hint without an exception path.

/** Outreach modes the Stage 1 sample-size calculator supports. */
export type OutreachMode = 'mail-only' | 'mail-plus-phone' | 'custom';

/** Default (rateMin, rateMax, rateAvg) per built-in outreach mode. */
export interface OutreachRates {
  /** Pessimistic response rate (lower bound of empirical range). */
  rateMin: number;
  /** Optimistic response rate (upper bound of empirical range). */
  rateMax: number;
  /** Working point used for the `recommended` value. */
  rateAvg: number;
  /** German label for UI display. */
  label: string;
}

/**
 * Built-in outreach defaults. The `custom` slot intentionally has no defaults
 * — when `mode === 'custom'`, callers must pass `customRates`.
 */
export const OUTREACH_DEFAULTS: Record<
  Exclude<OutreachMode, 'custom'>,
  OutreachRates
> = {
  'mail-only': {
    rateMin: 0.05,
    rateMax: 0.1,
    rateAvg: 0.07,
    label: 'Nur Briefe',
  },
  'mail-plus-phone': {
    rateMin: 0.3,
    rateMax: 0.5,
    rateAvg: 0.4,
    label: 'Briefe + Telefon-Nachfasser',
  },
};

/** Default safety factor used when callers do not override it. */
export const DEFAULT_SAFETY_FACTOR = 1.5;

/** Result of {@link suggestSampleSize}. */
export interface SampleSizeProposal {
  /** Suggested N (rounded to nearest 10 for an honest, non-spurious figure). */
  recommended: number;
  /** Range [optimistic, conservative]. Both bounds are integers. */
  range: [number, number];
  /** The rate values that were actually used to compute the proposal. */
  rateUsed: { min: number; max: number; avg: number };
  /** Outreach mode that produced this proposal. */
  outreach: OutreachMode;
  /** Safety factor applied (default 1.5). */
  safetyFactor: number;
  /** Panel size the proposal is keyed on (echoed for audit / display). */
  panelSize: number;
}

/** User-supplied rates for `mode === 'custom'`. Avg is derived as the midpoint. */
export interface CustomRates {
  min: number;
  max: number;
}

function isFiniteRate(x: number): boolean {
  // Strict: rate must be > 0 (zero would mean "nobody answers" → division by
  // zero). Upper bound 1 — anything beyond a 100 % response rate is nonsense.
  return Number.isFinite(x) && x > 0 && x <= 1;
}

/**
 * Compute a sample-size proposal from `panelSize` + outreach mode.
 *
 * Returns `null` when inputs are invalid (negative panel size, custom rates
 * outside (0,1], or min > max). Callers should treat null as "no suggestion
 * possible — surface a hint instead of crashing".
 *
 * `panelSize === 0` is a valid input (e.g. caller hasn't entered yet) and
 * yields a zero-everything proposal — keeps the UI's reactive memo simple.
 */
export function suggestSampleSize(
  panelSize: number,
  mode: OutreachMode,
  customRates?: CustomRates,
  safetyFactor: number = DEFAULT_SAFETY_FACTOR,
): SampleSizeProposal | null {
  if (!Number.isFinite(panelSize) || panelSize < 0) return null;
  if (!Number.isFinite(safetyFactor) || safetyFactor <= 0) return null;
  // Reject non-integer panel sizes — UI uses Math.floor on input but a stray
  // call from elsewhere shouldn't accidentally pass 30.5.
  const panel = Math.floor(panelSize);
  if (panel !== panelSize && panelSize !== Math.floor(panelSize)) {
    // panelSize was non-integer
    return null;
  }

  let rates: OutreachRates;
  if (mode === 'custom') {
    if (!customRates) return null;
    if (!isFiniteRate(customRates.min) || !isFiniteRate(customRates.max)) return null;
    if (customRates.min > customRates.max) return null;
    rates = {
      rateMin: customRates.min,
      rateMax: customRates.max,
      // Midpoint as working point — same intuition as the built-in modes.
      rateAvg: (customRates.min + customRates.max) / 2,
      label: 'Eigene Rücklaufquote',
    };
  } else {
    const defaults = OUTREACH_DEFAULTS[mode];
    if (!defaults) return null;
    rates = defaults;
  }

  // Edge: panelSize 0 → all zeros, valid proposal, no UI break.
  if (panel === 0) {
    return {
      recommended: 0,
      range: [0, 0],
      rateUsed: { min: rates.rateMin, max: rates.rateMax, avg: rates.rateAvg },
      outreach: mode,
      safetyFactor,
      panelSize: 0,
    };
  }

  const rangeMin = Math.ceil(panel / rates.rateMax);
  const rangeMax = Math.ceil((panel / rates.rateMin) * safetyFactor);
  // Recommended: nearest-10 rounding so the displayed value is honest about
  // its precision. Math.round on the unscaled value avoids "spurious" 643.
  const recommended = Math.round((panel / rates.rateAvg) * safetyFactor / 10) * 10;

  return {
    recommended,
    range: [rangeMin, rangeMax],
    rateUsed: { min: rates.rateMin, max: rates.rateMax, avg: rates.rateAvg },
    outreach: mode,
    safetyFactor,
    panelSize: panel,
  };
}
