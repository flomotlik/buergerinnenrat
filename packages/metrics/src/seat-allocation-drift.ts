// Quality metric: seat-allocation drift between proportional baseline
// and a manual override. Reports L1 (sum of absolute deviations) and
// max-value-drift, both as raw seat counts and as a fraction of panel_size.
//
// Why L1 is NOT halved (RESEARCH.md L625):
//   By construction, Σ override == Σ baseline == panel_size. Every "won"
//   seat for some value v is matched by an equally large "lost" seat at
//   another value v'. So L1 = 2 × (actual seats reshuffled). We expose the
//   raw L1 anyway because:
//     (a) it is the textbook "Σ |Δ|" metric, no surprise factor of two;
//     (b) "actual seats moved" can always be derived as L1 / 2 if needed.
//   The accompanying display string in the UI says "X of N seats moved"
//   based on L1 / 2 — see RunPanel.tsx for the rendering choice.

export interface SeatAllocationDrift {
  axis: string;
  /** Σ |override[v] - baseline[v]|, in raw seat counts. */
  l1_drift: number;
  /** l1_drift / panel_size; 0 when panel_size == 0. */
  l1_drift_pct: number;
  /** max |override[v] - baseline[v]|, in raw seat counts. */
  max_value_drift: number;
  /** max_value_drift / panel_size; 0 when panel_size == 0. */
  max_value_drift_pct: number;
}

/**
 * Compute drift between baseline and override for one axis.
 *
 * Robust to asymmetric key sets: a value present in baseline but not in
 * override (or vice versa) is treated as 0 on the missing side. This makes
 * the metric usable mid-edit, where the user might have only filled in
 * some override values.
 */
export function seatAllocationDrift(
  axis: string,
  baseline: Record<string, number>,
  override: Record<string, number>,
  panelSize: number,
): SeatAllocationDrift {
  const allValues = new Set<string>([...Object.keys(baseline), ...Object.keys(override)]);
  let l1 = 0;
  let max = 0;
  for (const v of allValues) {
    const b = baseline[v] ?? 0;
    const o = override[v] ?? 0;
    const delta = Math.abs(o - b);
    l1 += delta;
    if (delta > max) max = delta;
  }
  const safeDivide = (n: number, d: number): number => (d === 0 ? 0 : n / d);
  return {
    axis,
    l1_drift: l1,
    l1_drift_pct: safeDivide(l1, panelSize),
    max_value_drift: max,
    max_value_drift_pct: safeDivide(max, panelSize),
  };
}
