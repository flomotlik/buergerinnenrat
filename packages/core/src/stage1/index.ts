export { stratify, bucketize, largestRemainderAllocation } from './stratify';
export { sha256Hex, buildStage1Audit, canonicalStage1Json } from './audit-builder';
export { rfc4180Quote, stage1ResultToCsv } from './csv-export';
export { stage1ResultToXlsx } from './xlsx-export';
export {
  marginalAggregates,
  coverageMetric,
  infoOnlyBandsReport,
  previewAllocation,
  sortUnderfillsByGap,
  stage1ToMarkdownReport,
} from './reporting';
export type {
  Stratum,
  StratifyOpts,
  StratifyResult,
  StratumResult,
  Stage1AuditDoc,
  Stage1SeedSource,
  Stage1SampleSizeProposalAudit,
  BuildStage1AuditArgs,
} from './types';
export type { Stage1CsvOptions, Stage1CsvResult } from './csv-export';
export type { Stage1XlsxResult } from './xlsx-export';
export {
  suggestSampleSize,
  OUTREACH_DEFAULTS,
  DEFAULT_SAFETY_FACTOR,
} from './sample-size';
export type {
  OutreachMode,
  OutreachRates,
  SampleSizeProposal,
  CustomRates,
} from './sample-size';
export type {
  MarginalBucket,
  MarginalsForAxis,
  CoverageMetric,
  InfoOnlyBandsReportRow,
  PreviewRow,
  AllocationPreview,
} from './reporting';
export type { AgeBand } from './age-bands';
