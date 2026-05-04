// Derived-column helpers for the CSV upload pipeline.
//
// Real-world German/Austrian Melderegister exports carry `geburtsjahr`
// (birth year as integer), not a pre-bucketed age band. We compute the
// `altersgruppe` column at parse time so downstream stratification can use
// it as a regular axis. Computation is pure: same (geburtsjahr, refYear,
// bands) → same label.

import type { AgeBand } from '@sortition/core';

// Single source of truth for the AgeBand type lives in @sortition/core; we
// re-export here so consumers in apps/web do not need a deep import path.
export type { AgeBand } from '@sortition/core';

/**
 * Default age bands for citizen-assembly use cases (DE/AT context).
 *
 * Pattern: `unter-16` is **display-only** by default (minors stay visible in
 * the pool but receive n_h_target=0); the four older bands are selection.
 *
 * Five entries by design — adding more bands is fine, fewer makes the cell
 * table degenerate. Marked readonly so accidental mutation across imports
 * cannot leak.
 */
export const DEFAULT_AGE_BANDS: readonly AgeBand[] = [
  { min: 0, max: 15, label: 'unter-16', mode: 'display-only' },
  { min: 16, max: 24, label: '16-24', mode: 'selection' },
  { min: 25, max: 44, label: '25-44', mode: 'selection' },
  { min: 45, max: 64, label: '45-64', mode: 'selection' },
  { min: 65, max: null, label: '65+', mode: 'selection' },
] as const;

/**
 * Map a `geburtsjahr` string + reference year to a band label.
 *
 * Returns `null` (the empty-cell sentinel) when:
 *   - input is empty or whitespace
 *   - input is non-integer / non-finite / negative
 *   - geburtsjahr > refYear (impossible birth year; treat as missing)
 *   - age does not fall into any band
 *
 * Bands are scanned in given order — the first match wins. Callers that
 * pass overlapping bands get deterministic but possibly surprising results;
 * use `validateBands()` to reject overlaps before deriving.
 */
export function deriveAltersgruppe(
  geburtsjahr: string,
  refYear: number,
  bands: readonly AgeBand[],
): string | null {
  const trimmed = geburtsjahr.trim();
  if (trimmed.length === 0) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  if (n > refYear) return null;
  const age = refYear - n;
  for (const band of bands) {
    if (age >= band.min && (band.max === null || age <= band.max)) {
      return band.label;
    }
  }
  return null;
}

/**
 * Validate a band configuration. Returns a German user-facing error string
 * on failure, or `null` when the configuration is valid.
 *
 * Rules:
 *   - at least one band
 *   - integer min/max in [0, 120]
 *   - min <= max for closed bands
 *   - bands ascending by min
 *   - no gaps and no overlaps between adjacent closed bands
 *   - only the LAST band may have max=null (open-ended)
 */
export function validateBands(bands: readonly AgeBand[]): string | null {
  if (bands.length < 1) {
    return 'Mindestens ein Band ist erforderlich.';
  }

  for (const b of bands) {
    if (
      !Number.isInteger(b.min) ||
      b.min < 0 ||
      b.min > 120 ||
      (b.max !== null && (!Number.isInteger(b.max) || b.max < 0 || b.max > 120))
    ) {
      return `Band ${b.label}: min/max muss eine ganze Zahl zwischen 0 und 120 sein.`;
    }
    if (b.max !== null && b.min > b.max) {
      return `Band ${b.label}: min (${b.min}) darf nicht größer als max (${b.max}) sein.`;
    }
  }

  // Only the last band may be open.
  for (let i = 0; i < bands.length - 1; i++) {
    if (bands[i]!.max === null) {
      return "Nur das letzte Band darf 'offen' (max leer) sein.";
    }
  }

  // Ascending by min — easier to detect a descending step than to re-sort.
  for (let i = 1; i < bands.length; i++) {
    if (bands[i]!.min < bands[i - 1]!.min) {
      return 'Bänder müssen aufsteigend sortiert sein.';
    }
  }

  // No overlaps / gaps between adjacent closed bands.
  for (let i = 0; i < bands.length - 1; i++) {
    const a = bands[i]!;
    const b = bands[i + 1]!;
    // a is not the last band, so a.max !== null (checked above).
    const aMax = a.max as number;
    if (b.min <= aMax) {
      return `Bänder dürfen sich nicht überlappen (${a.label} und ${b.label}).`;
    }
    if (b.min > aMax + 1) {
      return `Lücke zwischen Band ${a.label} und Band ${b.label} (${aMax + 1}..${b.min - 1} fehlt).`;
    }
  }

  return null;
}

/**
 * Recompute the `altersgruppe` cell on every row given current bands.
 *
 * Pure: returns a fresh array of fresh row objects; the input is never
 * mutated. Rows whose `geburtsjahr` is missing or invalid get an empty
 * `altersgruppe` cell (consistent with the parser's initial assignment).
 */
export function recomputeAltersgruppe(
  rows: Record<string, string>[],
  bands: readonly AgeBand[],
  refYear: number,
): Record<string, string>[] {
  return rows.map((row) => {
    const next: Record<string, string> = { ...row };
    next.altersgruppe = deriveAltersgruppe(row.geburtsjahr ?? '', refYear, bands) ?? '';
    return next;
  });
}
