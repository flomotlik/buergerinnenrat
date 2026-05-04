// Quality metrics for a sortition RunResult. Twin of scripts/quality_metrics.py.
// Both implementations must produce numerically identical output up to a
// 1e-9 FP tolerance (verified by cross-language comparison test).

import type { RunResult } from '@sortition/engine-contract';

export { seatAllocationDrift, type SeatAllocationDrift } from './seat-allocation-drift';

export interface QualityMetrics {
  min_pi: number;
  min_pi_2: number;
  min_pi_3: number;
  variance_pi: number;
  gini: number;
  count_below_epsilon: number;
  epsilon: number;
  quota_slack_per_category: QuotaSlack[];
  reproducibility_hash: string;
}

export interface QuotaSlack {
  column: string;
  value: string;
  selected: number;
  bound_min: number;
  bound_max: number;
  slack_min: number; // selected - bound_min (positive ≥ 0; how far above floor)
  slack_max: number; // bound_max - selected (positive ≥ 0; how far below ceiling)
}

export interface MultiRunMetrics {
  num_runs: number;
  panel_frequency: Record<string, number>; // person_id -> count of times in selected
  panel_signature_count: number;
  most_frequent: string[]; // top-K person_ids by frequency
  least_frequent: string[];
}

const DEFAULT_EPSILON = 0.01;

export async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function gini(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  let cum = 0;
  for (let i = 0; i < n; i++) cum += (i + 1) * sorted[i]!;
  return (2 * cum) / (n * sum) - (n + 1) / n;
}

function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
}

export async function computeMetrics(
  result: RunResult,
  epsilon: number = DEFAULT_EPSILON,
): Promise<QualityMetrics> {
  const pis = Object.values(result.marginals);
  const sorted = [...pis].sort((a, b) => a - b);

  const slack: QuotaSlack[] = result.quota_fulfillment.map((q) => ({
    column: q.column,
    value: q.value,
    selected: q.selected,
    bound_min: q.bound_min,
    bound_max: q.bound_max,
    slack_min: q.selected - q.bound_min,
    slack_max: q.bound_max - q.selected,
  }));

  const idsSorted = [...result.selected].sort();
  // Canonical formatter: round to 9 digits then format with toFixed(9) and
  // strip trailing zeros down to one digit after the decimal (so 0.0 stays
  // "0.0", 0.3333 → "0.333300000" → "0.3333", same as Python's f"{round(v,9)}").
  function fmt(v: number): string {
    const r = Math.round(v * 1e9) / 1e9;
    let s = r.toFixed(9);
    s = s.replace(/0+$/, '');
    if (s.endsWith('.')) s += '0';
    return s;
  }
  const marginalsCanonical = Object.entries(result.marginals)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${fmt(v)}`)
    .join(',');
  const reproHash = await sha256Hex(idsSorted.join(',') + '|' + marginalsCanonical);

  return {
    min_pi: sorted[0] ?? 0,
    min_pi_2: sorted[1] ?? 0,
    min_pi_3: sorted[2] ?? 0,
    variance_pi: variance(pis),
    gini: gini(pis),
    count_below_epsilon: pis.filter((v) => v < epsilon).length,
    epsilon,
    quota_slack_per_category: slack,
    reproducibility_hash: reproHash,
  };
}

export function aggregateMultiRun(results: RunResult[], topK = 5): MultiRunMetrics {
  const freq: Record<string, number> = {};
  const signatures = new Set<string>();
  for (const r of results) {
    for (const id of r.selected) freq[id] = (freq[id] ?? 0) + 1;
    signatures.add([...r.selected].sort().join(','));
  }
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  return {
    num_runs: results.length,
    panel_frequency: freq,
    panel_signature_count: signatures.size,
    most_frequent: sorted.slice(0, topK).map(([id]) => id),
    least_frequent: sorted.slice(-topK).map(([id]) => id).reverse(),
  };
}
