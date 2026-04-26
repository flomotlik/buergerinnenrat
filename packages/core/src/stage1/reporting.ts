// Reporting helpers for Stage 1: marginal aggregates per axis, coverage
// metric, allocation preview (without doing the actual draw), and Markdown
// report builder. All pure functions — testable from Node (Vitest) without
// any DOM or Solid imports.

import { bucketize, largestRemainderAllocation } from './stratify';
import type { Stage1AuditDoc, StratumResult } from './types';

// ---------------------------------------------------------------------------
// Marginal aggregates per axis
// ---------------------------------------------------------------------------

/**
 * One axis-value bucket aggregated across all cross-product strata that
 * share the same value for the chosen axis.
 *
 * Example: with axes = [district, gender], `MarginalBucket` for axis="gender"
 * value="female" sums the n_h_pool/target/actual across all
 * (district=*, gender=female) strata.
 */
export interface MarginalBucket {
  /** Axis name. */
  axis: string;
  /** Value of that axis for this bucket (e.g. 'female', '01-zentrum'). */
  value: string;
  /** Sum of n_h_pool across all strata with this axis-value. */
  pool: number;
  /** Sum of n_h_target. */
  target: number;
  /** Sum of n_h_actual. */
  actual: number;
}

/** Per-axis grouping of MarginalBuckets, codepoint-sorted by value. */
export interface MarginalsForAxis {
  axis: string;
  buckets: MarginalBucket[];
  /** Sum of pool across all buckets — equals total pool. */
  totalPool: number;
  /** Sum of target across all buckets — equals total target. */
  totalTarget: number;
  /** Sum of actual across all buckets — equals total actual. */
  totalActual: number;
}

/**
 * For each axis in the strata cross-product, fold the cross-product cells
 * into per-axis-value totals. Buckets are codepoint-sorted by value for
 * deterministic display order.
 */
export function marginalAggregates(
  strata: StratumResult[],
  axes: string[],
): MarginalsForAxis[] {
  const out: MarginalsForAxis[] = [];
  for (const axis of axes) {
    const map = new Map<string, MarginalBucket>();
    for (const s of strata) {
      const value = s.key[axis];
      if (value === undefined) continue;
      let b = map.get(value);
      if (b === undefined) {
        b = { axis, value, pool: 0, target: 0, actual: 0 };
        map.set(value, b);
      }
      b.pool += s.n_h_pool;
      b.target += s.n_h_target;
      b.actual += s.n_h_actual;
    }
    const buckets = [...map.values()].sort((a, b) =>
      a.value < b.value ? -1 : a.value > b.value ? 1 : 0,
    );
    const totalPool = buckets.reduce((a, b) => a + b.pool, 0);
    const totalTarget = buckets.reduce((a, b) => a + b.target, 0);
    const totalActual = buckets.reduce((a, b) => a + b.actual, 0);
    out.push({ axis, buckets, totalPool, totalTarget, totalActual });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Coverage metric
// ---------------------------------------------------------------------------

export interface CoverageMetric {
  /** Total number of distinct strata that exist in the input pool. */
  totalStrata: number;
  /** Number of strata with at least 1 person actually drawn. */
  coveredStrata: number;
  /** Number of strata where n_h_actual < n_h_target. */
  underfilledStrata: number;
  /** coveredStrata / totalStrata in [0,1]. NaN if totalStrata === 0. */
  coverageRatio: number;
}

export function coverageMetric(strata: StratumResult[]): CoverageMetric {
  const total = strata.length;
  let covered = 0;
  let under = 0;
  for (const s of strata) {
    if (s.n_h_actual > 0) covered++;
    if (s.underfilled) under++;
  }
  return {
    totalStrata: total,
    coveredStrata: covered,
    underfilledStrata: under,
    coverageRatio: total === 0 ? Number.NaN : covered / total,
  };
}

// ---------------------------------------------------------------------------
// Pre-run allocation preview
// ---------------------------------------------------------------------------

/**
 * One row of the pre-run preview: each occupied stratum with its
 * computed Hamilton allocation BEFORE actually drawing. No RNG, no shuffle.
 *
 * Same fields as StratumResult except n_h_actual is missing — we don't know
 * actual until we draw.
 */
export interface PreviewRow {
  key: Record<string, string>;
  n_h_pool: number;
  n_h_target: number;
  /** True iff `n_h_target > n_h_pool` would force underfill at draw time. */
  wouldUnderfill: boolean;
}

export interface AllocationPreview {
  rows: PreviewRow[];
  /** Number of strata expected to receive zero allocation. */
  zeroAllocationStrata: number;
  /** Number of strata expected to underfill (rare — only with empty cells). */
  underfillStrata: number;
  /** sum(n_h_target) — should equal targetN. */
  totalTarget: number;
}

/**
 * Compute the would-be Hamilton allocation for the given inputs WITHOUT
 * actually shuffling or drawing. Cheap (no PRNG calls); used for the
 * pre-run preview UI.
 */
export function previewAllocation(
  rows: Record<string, string>[],
  axes: string[],
  targetN: number,
): AllocationPreview {
  if (targetN < 0) {
    throw new Error('Stichprobengröße (targetN) muss >= 0 sein.');
  }
  if (targetN > rows.length) {
    throw new Error(
      `Eingangs-Pool hat nur ${rows.length} Personen, mehr als das ist nicht ziehbar (angefragt: ${targetN}).`,
    );
  }

  const buckets = bucketize(rows, axes);
  const stratumKeys = [...buckets.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const stratumIndexLists = stratumKeys.map((k) => buckets.get(k)!);
  const stratumSizes = stratumIndexLists.map((l) => l.length);
  const allocation = largestRemainderAllocation(stratumKeys, stratumSizes, targetN);

  const previewRows: PreviewRow[] = [];
  let zeros = 0;
  let unders = 0;
  for (let i = 0; i < stratumKeys.length; i++) {
    const k = stratumKeys[i]!;
    const target = allocation[i]!;
    const pool = stratumSizes[i]!;
    const wouldUnderfill = target > pool;
    if (target === 0) zeros++;
    if (wouldUnderfill) unders++;
    previewRows.push({
      key: JSON.parse(k).reduce(
        (acc: Record<string, string>, [a, v]: [string, string]) => {
          acc[a] = v;
          return acc;
        },
        {} as Record<string, string>,
      ),
      n_h_pool: pool,
      n_h_target: target,
      wouldUnderfill,
    });
  }

  return {
    rows: previewRows,
    zeroAllocationStrata: zeros,
    underfillStrata: unders,
    totalTarget: previewRows.reduce((a, b) => a + b.n_h_target, 0),
  };
}

// ---------------------------------------------------------------------------
// Markdown report builder
// ---------------------------------------------------------------------------

/**
 * Build a human-readable Markdown report from a Stage1AuditDoc.
 *
 * Contains: header (Verfahren-Name placeholder), parameters (seed, axes,
 * target, actual), coverage metric, marginal aggregates per axis, full
 * strata table, underfill list, signature footer.
 *
 * NO PII (no person IDs in the report, just aggregate group counts).
 */
export function stage1ToMarkdownReport(audit: Stage1AuditDoc): string {
  const margs = marginalAggregates(audit.strata, audit.stratification_axes);
  const cov = coverageMetric(audit.strata);

  const lines: string[] = [];
  lines.push('# Versand-Auswahl — Bericht');
  lines.push('');
  lines.push(`**Erstellt:** ${audit.timestamp_iso}`);
  lines.push(`**Eingangs-Datei:** \`${audit.input_csv_filename}\` (${audit.input_csv_size_bytes} Bytes, SHA-256 \`${audit.input_csv_sha256}\`)`);
  lines.push(`**Algorithmus:** ${audit.algorithm_version} (PRNG ${audit.prng})`);
  lines.push('');

  lines.push('## Parameter');
  lines.push('');
  lines.push(`- **Pool-Größe:** ${audit.pool_size}`);
  lines.push(`- **Ziel-Stichprobengröße:** ${audit.target_n}`);
  lines.push(`- **Tatsächlich gezogen:** ${audit.actual_n}`);
  lines.push(`- **Stratifikations-Achsen:** ${audit.stratification_axes.length === 0 ? '(keine — einfache Zufallsstichprobe)' : audit.stratification_axes.join(', ')}`);
  lines.push(`- **Seed:** \`${audit.seed}\` (${audit.seed_source === 'user' ? 'manuell vorgegeben' : 'Default Unix-Sekunde'})`);
  lines.push(`- **Laufzeit:** ${audit.duration_ms} ms`);
  lines.push('');

  lines.push('## Stratum-Abdeckung');
  lines.push('');
  const covPct = Number.isNaN(cov.coverageRatio) ? 0 : Math.round(cov.coverageRatio * 1000) / 10;
  lines.push(`**${cov.coveredStrata} von ${cov.totalStrata} Strata abgedeckt** (${covPct} %).`);
  if (cov.underfilledStrata > 0) {
    lines.push('');
    lines.push(`Davon **${cov.underfilledStrata} unterbesetzt** (Pool zu klein für die proportionale Soll-Allokation).`);
  }
  lines.push('');

  if (margs.length > 0) {
    lines.push('## Verteilung pro Achse (Marginale)');
    lines.push('');
    for (const m of margs) {
      lines.push(`### ${m.axis}`);
      lines.push('');
      lines.push('| Wert | Pool | Soll | Ist | Soll-% | Ist-% |');
      lines.push('| --- | ---: | ---: | ---: | ---: | ---: |');
      for (const b of m.buckets) {
        const sollPct = m.totalTarget === 0 ? '–' : `${((b.target / m.totalTarget) * 100).toFixed(1)} %`;
        const istPct = m.totalActual === 0 ? '–' : `${((b.actual / m.totalActual) * 100).toFixed(1)} %`;
        lines.push(`| ${b.value} | ${b.pool} | ${b.target} | ${b.actual} | ${sollPct} | ${istPct} |`);
      }
      lines.push('');
    }
  }

  lines.push('## Stratum-Detail (Cross-Product-Tabelle)');
  lines.push('');
  lines.push('| Stratum | Pool | Soll | Ist | Status |');
  lines.push('| --- | ---: | ---: | ---: | --- |');
  for (const s of audit.strata) {
    const stratumLabel = Object.keys(s.key).length === 0
      ? '(gesamt)'
      : Object.entries(s.key).map(([k, v]) => `${k}=${v}`).join(', ');
    lines.push(`| ${stratumLabel} | ${s.n_h_pool} | ${s.n_h_target} | ${s.n_h_actual} | ${s.underfilled ? 'unterbesetzt' : 'ok'} |`);
  }
  lines.push('');

  if (audit.warnings.length > 0) {
    lines.push('## Warnungen');
    lines.push('');
    for (const w of audit.warnings) {
      lines.push(`- ${w}`);
    }
    lines.push('');
  }

  lines.push('## Signatur');
  lines.push('');
  if (audit.signature && audit.public_key && audit.signature_algo) {
    lines.push(`- **Algorithmus:** ${audit.signature_algo}`);
    lines.push(`- **Öffentlicher Schlüssel:** \`${audit.public_key}\``);
    lines.push(`- **Signatur:** \`${audit.signature}\``);
    lines.push('');
    lines.push('Die Signatur deckt die canonicalisierte JSON-Form des Audit-Dokuments ab — Eingaben, Allokation, **und die `selected_indices`-Liste**. Eine Manipulation am Ergebnis macht die Signatur ungültig.');
  } else {
    lines.push('_(noch nicht signiert)_');
  }
  lines.push('');

  return lines.join('\n');
}
