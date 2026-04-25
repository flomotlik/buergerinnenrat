import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// n=500 kleinstadt-bezirkshauptort fixture has district/age_band/gender columns,
// which is enough for the auto-axis recommendation to fire.
const FIXTURE = resolve(
  HERE,
  '../../../../tests/fixtures/synthetic-pools/kleinstadt-bezirkshauptort-n500-s42-t070.csv',
);

test.describe.configure({ mode: 'serial' });

test('stage 1: upload → defaults → ziehen → download', async ({ page, browserName }) => {
  await page.goto('/');

  // Switch to the Stage 1 tab.
  await page.getByTestId('tab-stage1').click();
  await expect(page.getByTestId('stage1-panel')).toBeVisible();

  // Upload the fixture CSV.
  await page.locator('[data-testid="stage1-csv-upload"]').setInputFiles({
    name: 'pool.csv',
    mimeType: 'text/csv',
    buffer: readFileSync(FIXTURE),
  });

  // Pool summary appears once parsing finishes.
  await expect(page.getByTestId('stage1-pool-summary')).toContainText('500');

  // BMG §46 hint must be visible after upload.
  await expect(page.getByTestId('stage1-bmg-hint')).toBeVisible();

  // At least one of the recommended axes should be preselected.
  // generator.ts emits headers `district`, `age_band`, `gender` literally.
  await expect(page.getByTestId('axis-checkbox-district')).toBeChecked();
  await expect(page.getByTestId('axis-checkbox-age_band')).toBeChecked();
  await expect(page.getByTestId('axis-checkbox-gender')).toBeChecked();

  // Set the target sample size.
  await page.getByTestId('stage1-target-n').fill('50');

  // Click "ziehen" — Stage 1 is sub-second, no progress bar needed.
  await page.getByTestId('stage1-run').click();

  // Result section appears.
  await expect(page.getByTestId('stage1-result')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('stage1-strata-table')).toBeVisible();

  // CSV download.
  const csvDownloadPromise = page.waitForEvent('download');
  await page.getByTestId('stage1-download-csv').click();
  const csvDownload = await csvDownloadPromise;
  expect(csvDownload.suggestedFilename()).toMatch(/^versand-.*\.csv$/);

  // Audit JSON download. Both Chromium and Firefox support either Ed25519
  // (Firefox 130+, Chromium 113+) or the ECDSA fallback — both browsers
  // should be able to produce *some* signed audit. Skip only if a future
  // runtime regression breaks Web Crypto entirely.
  const auditDownloadPromise = page.waitForEvent('download');
  await page.getByTestId('stage1-download-audit').click();
  const auditDownload = await auditDownloadPromise;
  expect(auditDownload.suggestedFilename()).toMatch(/^versand-audit-.*\.json$/);

  // Sanity log to surface browser id in test output.
  console.log(`stage1 e2e ok on ${browserName}`);
});
