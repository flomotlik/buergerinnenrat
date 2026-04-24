// One-shot TS runner: read a RunResult JSON path from argv[2], print
// QualityMetrics JSON to stdout. Used by test_metrics_cross_lang.py.

import { readFileSync } from 'node:fs';
import { computeMetrics } from '../../packages/metrics/src/index';

const samplePath = process.argv[2];
if (!samplePath) throw new Error('usage: _run_ts_metrics.ts <sample.json>');

(async () => {
  const sample = JSON.parse(readFileSync(samplePath, 'utf-8'));
  const m = await computeMetrics(sample);
  process.stdout.write(JSON.stringify(m));
})();
