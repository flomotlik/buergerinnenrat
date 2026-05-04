/**
 * AuditFooter schema-0.4 parity (#68 P1 #4). Drives a full Stage 1 draw,
 * downloads the audit JSON, then iterates every mandatory schema-0.4 field
 * and asserts the rendered footer (data-testid="stage1-audit-footer")
 * contains the value in some form. Every assertion is scoped to the footer
 * locator so unrelated text on the page (page title, pool summary, axis
 * checkboxes) cannot false-positive.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(
  HERE,
  '../../../../tests/fixtures/synthetic-pools/kleinstadt-bezirkshauptort-n500-s42-t070.csv',
);

interface Stage1Audit {
  schema_version: string;
  operation: string;
  algorithm_version: string;
  prng: string;
  tie_break_rule: string;
  key_encoding: string;
  stratum_sort: string;
  seed: number;
  seed_source: string;
  input_csv_sha256: string;
  input_csv_filename: string;
  input_csv_size_bytes: number;
  pool_size: number;
  target_n: number;
  actual_n: number;
  stratification_axes: string[];
  selected_indices: number[];
  strata: Array<{ key: Record<string, string> }>;
  warnings: string[];
  duration_ms: number;
  timestamp_iso: string;
  derived_columns?: Record<string, unknown>;
  forced_zero_strata?: string[];
  sample_size_proposal?: unknown;
}

test.describe.configure({ mode: 'serial' });

test('audit-footer parity: every mandatory schema-0.4 field is rendered', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await page.evaluate(() => {
    window.location.hash = '#/stage1';
  });
  await expect(page.getByTestId('stage1-panel')).toBeVisible();

  // Upload, set N, run.
  await page.locator('[data-testid="stage1-csv-upload"]').setInputFiles({
    name: 'pool.csv',
    mimeType: 'text/csv',
    buffer: readFileSync(FIXTURE),
  });
  await expect(page.getByTestId('stage1-pool-summary')).toContainText('500');
  await page.getByTestId('stage1-target-n').fill('50');
  await page.getByTestId('stage1-run').click();
  await expect(page.getByTestId('stage1-result')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('stage1-audit-footer')).toBeVisible();

  // Download the audit JSON and parse it. The download path comes from
  // stage1-download-audit; suggestedFilename matches /^versand-audit-/.
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('stage1-download-audit').click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const audit = JSON.parse(readFileSync(path!, 'utf8')) as Stage1Audit;

  const footer = page.getByTestId('stage1-audit-footer');

  // ----- Mandatory string/enum fields rendered verbatim -----
  for (const value of [
    audit.schema_version,
    audit.operation,
    audit.algorithm_version,
    audit.prng,
    audit.tie_break_rule,
    audit.key_encoding,
    audit.stratum_sort,
    audit.seed_source,
    audit.input_csv_filename,
    audit.timestamp_iso,
  ]) {
    await expect(footer, `footer must contain "${value}"`).toContainText(String(value));
  }

  // ----- Numeric / count fields -----
  for (const value of [
    audit.seed,
    audit.pool_size,
    audit.target_n,
    audit.actual_n,
    audit.strata.length,
    audit.warnings.length,
    audit.duration_ms,
  ]) {
    await expect(footer, `footer must contain numeric ${value}`).toContainText(String(value));
  }

  // ----- input_csv_size_bytes is rendered with DE locale separator (1.234) -----
  // fmtBytes() in AuditFooter.tsx applies toLocaleString('de-DE'). Either form
  // (raw or DE-formatted) should be present somewhere in the footer.
  const sizeRaw = String(audit.input_csv_size_bytes);
  const sizeDeLocale = audit.input_csv_size_bytes.toLocaleString('de-DE');
  const footerHtml = (await footer.innerHTML()) ?? '';
  expect(
    footerHtml.includes(sizeRaw) || footerHtml.includes(sizeDeLocale),
    `footer must contain input_csv_size_bytes (${sizeRaw} or ${sizeDeLocale})`,
  ).toBe(true);

  // ----- input_csv_sha256: full hex string is rendered (audit-footer-hash testid) -----
  await expect(footer.getByTestId('audit-footer-hash')).toContainText(audit.input_csv_sha256);

  // ----- stratification_axes: joined with ", " in the dd cell -----
  await expect(footer).toContainText(audit.stratification_axes.join(', '));

  // ----- selected_indices: rendered inside <details>; summary count == actual_n -----
  const summary = footer.locator('details > summary');
  await expect(summary).toContainText(String(audit.selected_indices.length));
  expect(audit.selected_indices.length).toBe(audit.actual_n);

  // ----- Signature triplet (sig-algo + sig + PK abbreviation present) -----
  await expect(footer.getByTestId('audit-footer-sig-algo')).not.toContainText('noch nicht signiert');
  await expect(footer.getByTestId('audit-footer-sig')).toBeVisible();
  // public_key is rendered as a "PK: <abbrev>" span with the full key in
  // the title attribute (AuditFooter.tsx:213-217). Assert both:
  //   - the visible "PK:" prefix is rendered
  //   - the full base64 public key is exposed via title attribute
  const pkSpan = footer.locator('span[title]').filter({ hasText: 'PK:' });
  await expect(pkSpan).toBeVisible();
  // We download the audit and the JSON contains the full public_key —
  // verify it round-trips into the title attribute on the rendered span.
  const auditWithSig = JSON.parse(readFileSync(path!, 'utf8')) as Stage1Audit & {
    public_key?: string;
  };
  if (auditWithSig.public_key) {
    await expect(pkSpan).toHaveAttribute('title', auditWithSig.public_key);
  }

  // ----- Optional fields when present -----
  // The 500-row fixture carries `age_band` directly so there should be no
  // derived column. Assert the testid is absent in that case.
  if (audit.derived_columns && Object.keys(audit.derived_columns).length > 0) {
    await expect(footer.getByTestId('audit-footer-derived')).toBeVisible();
  } else {
    await expect(footer.getByTestId('audit-footer-derived')).toHaveCount(0);
  }
  if (audit.forced_zero_strata && audit.forced_zero_strata.length > 0) {
    await expect(footer.getByTestId('audit-footer-forced-zero')).toBeVisible();
  } else {
    await expect(footer.getByTestId('audit-footer-forced-zero')).toHaveCount(0);
  }
  if (audit.sample_size_proposal !== undefined) {
    await expect(footer.getByTestId('audit-footer-sample-size')).toBeVisible();
  } else {
    await expect(footer.getByTestId('audit-footer-sample-size')).toHaveCount(0);
  }
});
