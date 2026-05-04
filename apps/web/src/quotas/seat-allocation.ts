// Seat-allocation data model. Lives next to QuotaConfig but is intentionally
// separate so QuotaConfig stays a minimal "deklarative Bounds"-Konfiguration
// and SeatAllocation stays a manual-override "Operation". The two serialize
// independently — older QuotaConfig JSON exports remain unchanged.
//
// Override mechanics (see RESEARCH.md L42-46, PLAN.md interfaces block):
//   1-D axis override → for each value v on the chosen axis, the LP bound is
//   collapsed to {min: n, max: n}. Engine A's existing constraint generator
//   (packages/engine-a/src/feasible-committee.ts:84-110) accepts that without
//   any new constraint class — Σ x_i (i ∈ group) >= n AND <= n is exactly
//   "exact n seats for this value".

import type { Quotas } from '@sortition/engine-contract';
import { uniqueValues, valueCounts } from './model';

/** Per-axis override description. Exactly one axis per override at MVP. */
export interface SeatAllocationOverride {
  /** CSV column being overridden. Must exist in the imported pool rows. */
  axis: string;
  /** Per-value seat counts. Σ values must equal panel_size. Each value ≥ 0. */
  seats: Record<string, number>;
  /**
   * German free-text rationale, ≥ 20 non-whitespace characters.
   * Whitespace-only strings are explicitly rejected (see Pitfall 3).
   */
  rationale: string;
  /** ISO-8601 UTC, set at the moment the override was committed. */
  timestamp_iso: string;
}

/** Composite: read-only baseline + optional manual override. */
export interface SeatAllocation {
  /** Hamilton/largest-remainder allocation per axis; Σ per axis == panel_size. */
  baseline: Record<string, Record<string, number>>;
  /** Single override (1-D, MVP scope). null = no override active. */
  override: SeatAllocationOverride | null;
}

/** Validation result for a single override against a pool + panel size. */
export interface OverrideValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Count non-whitespace characters in a string. The 20-character minimum for
 * the rationale is checked against this (NOT raw `.length`) to prevent the
 * "20 spaces" bypass documented in RESEARCH.md Pitfall 3.
 *
 * Note: `\s` in a JavaScript regex matches Unicode whitespace categories
 * (incl.   NBSP,   line separator). The `/u` flag is not required
 * for the `\s` shorthand to behave correctly.
 */
export function nonWhitespaceLength(s: string): number {
  return s.replace(/\s+/g, '').length;
}

/**
 * Hamilton/largest-remainder allocation per axis. For each axis and each
 * value v on that axis, the integer baseline is computed as:
 *
 *   quota[v] = panel_size * count[v] / total_pool
 *
 * Floor each quota; distribute the remaining (panel_size − Σ floors) seats
 * to the values with the largest fractional remainders (ties broken by
 * value-name codepoint order — deterministic across runs).
 *
 * Σ baseline[axis][v] == panel_size for every axis (Hamilton invariant).
 */
export function computeBaseline(
  rows: Record<string, string>[],
  panelSize: number,
  axes: string[],
): SeatAllocation['baseline'] {
  const out: SeatAllocation['baseline'] = {};
  for (const axis of axes) {
    out[axis] = computeAxisBaseline(rows, panelSize, axis);
  }
  return out;
}

function computeAxisBaseline(
  rows: Record<string, string>[],
  panelSize: number,
  axis: string,
): Record<string, number> {
  const values = uniqueValues(rows, axis);
  if (values.length === 0 || rows.length === 0) {
    return {};
  }
  const counts = valueCounts(rows, axis);
  const total = values.reduce((acc, v) => acc + (counts[v] ?? 0), 0);
  if (total === 0) {
    return Object.fromEntries(values.map((v) => [v, 0]));
  }

  // Quotas with floor + remainder. Largest-remainder tie-break by value name.
  const quotas = values.map((v) => {
    const exact = (panelSize * (counts[v] ?? 0)) / total;
    const floor = Math.floor(exact);
    const remainder = exact - floor;
    return { value: v, floor, remainder };
  });

  let assigned = quotas.reduce((acc, q) => acc + q.floor, 0);
  let leftover = panelSize - assigned;

  // Sort by (remainder desc, value asc) — deterministic with codepoint order.
  const ordered = [...quotas].sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder;
    return a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
  });

  const seats: Record<string, number> = {};
  for (const q of quotas) seats[q.value] = q.floor;
  for (const q of ordered) {
    if (leftover <= 0) break;
    seats[q.value] = (seats[q.value] ?? 0) + 1;
    leftover -= 1;
    assigned += 1;
  }

  return seats;
}

/** ISO-8601 UTC regex: `YYYY-MM-DDTHH:MM:SS(.sss)?Z` — strict, no offset support. */
const ISO_8601_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;

/**
 * Pre-flight validation of an override against the pool + panel size.
 * Errors are accumulated in fixed order (axis → sum → negative → pool-cap →
 * rationale → timestamp) so error messages are deterministic for tests.
 *
 * Note on rationale check: nonWhitespaceLength catches the "20 spaces"
 * bypass that a naive `.length >= 20` would let through (Pitfall 3).
 */
export function validateOverride(
  rows: Record<string, string>[],
  panelSize: number,
  override: SeatAllocationOverride,
): OverrideValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const columns = rows.length > 0 ? Object.keys(rows[0]!) : [];
  if (!columns.includes(override.axis)) {
    errors.push(`Achse "${override.axis}" ist nicht in den importierten Spalten enthalten.`);
  }

  const sum = Object.values(override.seats).reduce((a, b) => a + b, 0);
  if (sum !== panelSize) {
    errors.push(
      `Summe der Override-Sitze (${sum}) ≠ Panel-Größe (${panelSize}). Differenz: ${sum - panelSize}.`,
    );
  }

  for (const [val, n] of Object.entries(override.seats)) {
    if (!Number.isInteger(n) || n < 0) {
      errors.push(`Override für "${val}": Sitz-Zahl muss ganzzahlig und ≥ 0 sein (war ${n}).`);
    }
  }

  // Pool-capacity check (1-D pre-flight): a value cannot receive more seats
  // than there are matching people in the pool. Catches the most common
  // infeasibility before the LP solver runs (Pitfall 2).
  if (columns.includes(override.axis)) {
    const counts = valueCounts(rows, override.axis);
    for (const [val, n] of Object.entries(override.seats)) {
      const inPool = counts[val] ?? 0;
      if (n > inPool) {
        errors.push(
          `Override für "${val}": ${n} Sitze gefordert, aber nur ${inPool} Personen im Pool.`,
        );
      }
    }
  }

  if (nonWhitespaceLength(override.rationale) < 20) {
    errors.push(
      'Begründung muss mindestens 20 nicht-Leerzeichen enthalten (Pflichtfeld für das Audit).',
    );
  }

  if (!ISO_8601_UTC_RE.test(override.timestamp_iso)) {
    errors.push(
      `Timestamp muss ISO-8601 UTC sein (z.B. 2026-05-04T12:00:00Z), war "${override.timestamp_iso}".`,
    );
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Pure composition: replace the bounds of the overridden axis with
 * `{min: n, max: n}` per value, leaving every other category untouched.
 * Returns the original quotas reference unchanged when override is null —
 * no needless object allocation, and downstream identity checks succeed.
 */
export function applyOverrideToQuotas(
  quotas: Quotas,
  override: SeatAllocationOverride | null,
): Quotas {
  if (!override) return quotas;
  return {
    panel_size: quotas.panel_size,
    categories: quotas.categories.map((cat) =>
      cat.column !== override.axis
        ? cat
        : {
            column: cat.column,
            bounds: Object.fromEntries(
              Object.entries(override.seats).map(([val, n]) => [val, { min: n, max: n }]),
            ),
          },
    ),
  };
}
