// Stage 1 glue layer: orchestrates parse -> stratify -> audit -> sign -> CSV.
// Pure async function (no JSX) so it stays testable on its own.

import {
  buildStage1Audit,
  stage1ResultToCsv,
  stratify,
  type Stage1AuditDoc,
  type Stage1SeedSource,
  type StratifyResult,
} from '@sortition/core';
import type { ParsedCsv } from '../csv/parse';
import { signStage1Audit, type SignedStage1Audit } from './audit-sign';

export interface RunStage1Input {
  file: File;
  parsed: ParsedCsv;
  axes: string[];
  targetN: number;
  seed: number;
  seedSource: Stage1SeedSource;
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

  // Stratify (synchronous, pure). May throw on pool-too-small.
  const result = stratify(input.parsed.rows, {
    axes: input.axes,
    targetN: input.targetN,
    seed: input.seed,
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
