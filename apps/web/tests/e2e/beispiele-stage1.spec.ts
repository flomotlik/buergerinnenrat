import { test, expect } from '@playwright/test';

// End-to-end smoke for the Issue #57 download → re-upload → run loop.
// Verifies the on-ramp for a user without their own CSV: discover the
// example file from Stage 1, download it, upload it, run a Stage 1
// stratification on it.
test.describe.configure({ mode: 'serial' });

test('beispiele: download from /docs → upload into Stage 1 → run', async ({ page }) => {
  await page.goto('/');

  // Switch to Stage 1, click the new "Beispiel-Datei verwenden" hint link.
  await page.getByTestId('tab-stage1').click();
  await expect(page.getByTestId('stage1-panel')).toBeVisible();
  await page.getByTestId('stage1-beispiele-link').click();

  // Should land on /docs/beispiele.
  await expect(page).toHaveURL(/#\/docs\/beispiele$/);
  await expect(page.getByTestId('docs-page-beispiele')).toBeVisible();

  // Download the 8000-melderegister CSV via the dedicated link.
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('download-herzogenburg-melderegister-8000').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('herzogenburg-melderegister-8000.csv');

  // Persist + measure: the downloaded file must have 8001 lines (header + 8000).
  const path = await download.path();
  expect(path).toBeTruthy();
  const fs = await import('node:fs');
  const buf = fs.readFileSync(path!);
  const text = buf.toString('utf8');
  const lines = text.split('\n').filter((l) => l.length > 0);
  // Generator rounds household sizes via the distribution, so the actual
  // person count varies slightly from the profile's nominal totalPopulation.
  // Verify within ~1 % tolerance instead of asserting an exact 8000+1.
  expect(lines.length).toBeGreaterThanOrEqual(7900);
  expect(lines.length).toBeLessThanOrEqual(8100);

  // Navigate back to Stage 1 and upload the freshly-downloaded file.
  await page.getByTestId('tab-stage1').click();
  await expect(page.getByTestId('stage1-panel')).toBeVisible();
  await page.locator('[data-testid="stage1-csv-upload"]').setInputFiles({
    name: 'herzogenburg-melderegister-8000.csv',
    mimeType: 'text/csv',
    buffer: buf,
  });

  // Sampler should detect the sprengel column automatically. Pool summary
  // shows the actual row count (~8000 ±1 % per generator household rounding).
  await expect(page.getByTestId('stage1-pool-summary')).toContainText(/\d{4} Zeilen/);
  await expect(page.getByTestId('axis-checkbox-sprengel')).toBeChecked();

  // Set N=300 and confirm the seed default, then run.
  await page.getByTestId('stage1-target-n').fill('300');
  await expect(page.getByTestId('stage1-run')).toBeEnabled();
  await page.getByTestId('stage1-run').click();

  await expect(page.getByTestId('stage1-result')).toBeVisible({ timeout: 10_000 });

  // Output download should have 301 lines (header + 300 samples).
  const csvDownloadPromise = page.waitForEvent('download');
  await page.getByTestId('stage1-download-csv').click();
  const csvDownload = await csvDownloadPromise;
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csvText = fs.readFileSync(csvPath!, 'utf8');
  const csvLines = csvText.split('\n').filter((l) => l.length > 0);
  expect(csvLines).toHaveLength(301);
});
