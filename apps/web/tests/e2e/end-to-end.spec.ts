import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(
  HERE,
  '../../../../tests/fixtures/synthetic-pools/kleinstadt-bezirkshauptort-n100-s42-t070.csv',
);

test.describe.configure({ mode: 'serial' });

test('end-to-end: import → quotas → run → results', async ({ page, browserName }) => {
  test.setTimeout(60_000);
  await page.goto('/');

  // Step 1: import
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({
    name: 'pool.csv',
    mimeType: 'text/csv',
    buffer: readFileSync(FIXTURE),
  });
  await page.getByTestId('file-commit').click();
  await expect(page.getByTestId('pool-summary')).toContainText('100 Personen');

  // Step 2: quotas — set panel size and add a category
  await page.getByTestId('quota-panel-size').fill('20');
  await page.getByTestId('quota-add-category').selectOption('gender');
  // Default bounds (min=0, max=20) are valid

  // Step 3: run
  await expect(page.getByTestId('run-panel')).toBeVisible();
  await page.getByTestId('run-seed').fill('42');
  await page.getByTestId('run-start').click();

  // Wait for result
  await expect(page.getByTestId('run-result')).toBeVisible({ timeout: 45_000 });

  // Verify panel content
  const rows = page.locator('[data-testid="run-result"] tbody tr');
  // First table is quota fulfillment, second is the panel — we want the panel
  // (~20 rows). Rather than parse, just check that the result exists and has
  // the export buttons.
  await expect(page.getByTestId('run-export-csv')).toBeVisible();
  await expect(page.getByTestId('run-export-audit')).toBeVisible();

  // sanity: row count should be > 5 (we have quota table + 20-person panel)
  expect(await rows.count()).toBeGreaterThan(5);

  // Browser-specific: skip Ed25519 check on Firefox if it doesn't support it
  if (browserName === 'chromium') {
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('run-export-audit').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^audit-.*\.json$/);
  }
});
