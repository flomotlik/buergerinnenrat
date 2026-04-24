// Helper that runs the TS metrics on a sample RunResult JSON and prints
// the result as JSON to stdout. Called from the cross-language test via
// `node --import tsx _run_ts_metrics.cjs <sample>`.
//
// We avoid require()'ing tsx programmatically (the API moved between
// versions) and let the caller pass `--import tsx` instead.

const path = require('path');
const fs = require('fs');

const repoRoot = path.resolve(__dirname, '..', '..');
const samplePath = process.argv[2];
const sample = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));

(async () => {
  process.chdir(repoRoot);
  const { computeMetrics } = await import(
    'file://' + path.resolve(repoRoot, 'packages', 'metrics', 'src', 'index.ts')
  );
  const m = await computeMetrics(sample);
  process.stdout.write(JSON.stringify(m));
})();
