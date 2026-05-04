// Stage 1 glue layer: orchestrates parse -> stratify -> audit -> sign -> CSV.
// Pure async function (no JSX) so it stays testable on its own.

import {
  buildStage1Audit,
  bucketize,
  stage1ResultToCsv,
  stratify,
  type AgeBand,
  type Stage1AuditDoc,
  type Stage1SampleSizeProposalAudit,
  type Stage1SeedSource,
  type StratifyResult,
} from '@sortition/core';
import type { ParsedTable } from '../import/parse-csv';
import { signStage1Audit, type SignedStage1Audit } from './audit-sign';

export interface RunStage1Input {
  file: File;
  parsed: ParsedTable;
  axes: string[];
  targetN: number;
  seed: number;
  seedSource: Stage1SeedSource;
  /**
   * Optional (Issue #62): user-edited age-band configuration. Bands flagged
   * `mode: 'display-only'` are translated into a forced-zero stratum-key set
   * so the allocator never assigns to them. Pool stays as-is.
   */
  bands?: readonly AgeBand[];
  /** Header name carrying the band label (typically `'altersgruppe'`). */
  ageBandColumn?: string;
  /** Reference year used when the bands were applied — for audit metadata. */
  bandsRefYear?: number;
  /**
   * Optional (Issue #64): the SampleSizeCalculator's last accepted proposal
   * plus a `manuallyOverridden` flag captured at run-time. Threaded straight
   * through to the audit doc — runStage1 itself doesn't interpret it.
   */
  sampleSizeProposal?: Stage1SampleSizeProposalAudit;
}

export interface RunStage1Output {
  result: StratifyResult;
  signedAudit: SignedStage1Audit;
  csv: string;
  csvWarnings: string[];
  durationMs: number;
}

/**
 * Run the full Stage 1 pipeline. May throw if `targetN > parsed.rows.length`
 * (caught by the caller and surfaced as a UI error).
 */
export async function runStage1(input: RunStage1Input): Promise<RunStage1Output> {
  const t0 = performance.now();
  const buf = await input.file.arrayBuffer();

  // Issue #62: derive forced-zero stratum-keys from display-only bands when
  // (a) the user supplied a band configuration, (b) the band column is
  // among the active axes. We compute the keys up-front so they reach both
  // the allocator and the audit document.
  let forcedZeroStrataKeys: ReadonlySet<string> | undefined;
  let forcedZeroStrataList: string[] | undefined;
  let derivedColumnsForAudit: Stage1AuditDoc['derived_columns'] | undefined;

  if (
    input.bands &&
    input.bands.length > 0 &&
    input.ageBandColumn &&
    input.axes.includes(input.ageBandColumn)
  ) {
    const displayOnlyLabels = new Set(
      input.bands.filter((b) => b.mode === 'display-only').map((b) => b.label),
    );
    if (displayOnlyLabels.size > 0) {
      const buckets = bucketize(input.parsed.rows, input.axes);
      const matching = new Set<string>();
      for (const key of buckets.keys()) {
        // bucketize emits each key as JSON.stringify([[axis, value], ...]).
        const pairs = JSON.parse(key) as [string, string][];
        const cell = pairs.find(([a]) => a === input.ageBandColumn);
        if (cell && displayOnlyLabels.has(cell[1])) {
          matching.add(key);
        }
      }
      if (matching.size > 0) {
        forcedZeroStrataKeys = matching;
        forcedZeroStrataList = [...matching].sort();
      }
    }
    const refYear = input.bandsRefYear ?? new Date().getFullYear();
    const bandSummary = input.bands.map((b) => `${b.label}(${b.mode})`).join(', ');
    derivedColumnsForAudit = {
      [input.ageBandColumn]: {
        source: 'geburtsjahr',
        description: `berechnet aus geburtsjahr; Stichtag ${refYear}; Bänder: ${bandSummary}`,
        bands: [...input.bands],
      },
    };
  }

  // Stratify (synchronous, pure). May throw on pool-too-small.
  const result = stratify(input.parsed.rows, {
    axes: input.axes,
    targetN: input.targetN,
    seed: input.seed,
    ...(forcedZeroStrataKeys ? { forcedZeroStrataKeys } : {}),
  });

  const durationMs = performance.now() - t0;

  const auditDoc: Stage1AuditDoc = await buildStage1Audit({
    inputBytes: new Uint8Array(buf),
    filename: input.file.name,
    sizeBytes: input.file.size,
    axes: input.axes,
    targetN: input.targetN,
    seed: input.seed,
    seedSource: input.seedSource,
    poolSize: input.parsed.rows.length,
    result,
    durationMs,
    ...(derivedColumnsForAudit ? { derivedColumns: derivedColumnsForAudit } : {}),
    ...(forcedZeroStrataList ? { forcedZeroStrata: forcedZeroStrataList } : {}),
    ...(input.sampleSizeProposal ? { sampleSizeProposal: input.sampleSizeProposal } : {}),
  });

  const signedAudit = await signStage1Audit(auditDoc);

  const { csv, warnings: csvWarnings } = stage1ResultToCsv(
    input.parsed.headers,
    input.parsed.rows,
    result.selected,
    { includeGezogenColumn: false },
  );

  return { result, signedAudit, csv, csvWarnings, durationMs };
}
