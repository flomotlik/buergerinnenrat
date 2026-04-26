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

  // Pre-run preview should appear once N is set with axes selected.
  // It contains an axis breakdown for each selected axis (preview mode).
  await expect(page.getByTestId('stage1-preview')).toBeVisible();
  await expect(page.getByTestId('stage1-axis-breakdown-district')).toBeVisible();

  // Seed-confirmation gate (issue #53 C, variant 1): the run button is
  // disabled until the user explicitly confirms the auto-default or types
  // a new value. We accept the default here.
  await expect(page.getByTestId('stage1-run')).toBeDisabled();
  await page.getByTestId('stage1-seed-confirm').click();
  await expect(page.getByTestId('stage1-run')).toBeEnabled();

  // Click "ziehen" — Stage 1 is sub-second, no progress bar needed.
  await page.getByTestId('stage1-run').click();

  // Result section appears.
  await expect(page.getByTestId('stage1-result')).toBeVisible({ timeout: 5_000 });

  // Top summary cards: total drawn, coverage, underfill.
  await expect(page.getByTestId('stage1-summary-cards')).toBeVisible();
  await expect(page.getByTestId('stage1-coverage-card')).toBeVisible();
  await expect(page.getByTestId('stage1-underfill-card')).toBeVisible();

  // Per-axis breakdowns are present in the result.
  await expect(page.getByTestId('stage1-axis-breakdowns')).toBeVisible();

  // Detailed strata table is collapsed by default — toggle to expand.
  await expect(page.getByTestId('stage1-strata-toggle')).toBeVisible();
  await page.getByTestId('stage1-strata-toggle').click();
  await expect(page.getByTestId('stage1-strata-table')).toBeVisible();

  // Audit/provenance footer (B) must be visible in the result view, with
  // the SHA-256 hash and signature algorithm exposed. Full values are in
  // the JSON download; the footer just shows abbreviated tokens.
  await expect(page.getByTestId('stage1-audit-footer')).toBeVisible();
  await expect(page.getByTestId('stage1-audit-footer')).toContainText('Protokoll / Audit');
  await expect(page.getByTestId('stage1-audit-footer')).toContainText('SHA-256');
  await expect(page.getByTestId('audit-footer-sig-algo')).not.toContainText('noch nicht signiert');

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

  // Markdown report download.
  const mdDownloadPromise = page.waitForEvent('download');
  await page.getByTestId('stage1-download-md').click();
  const mdDownload = await mdDownloadPromise;
  expect(mdDownload.suggestedFilename()).toMatch(/^versand-bericht-.*\.md$/);

  // Sanity log to surface browser id in test output.
  console.log(`stage1 e2e ok on ${browserName}`);
});

test('stage 1: Stichprobengröße-Input ist via Label erreichbar (a11y)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tab-stage1').click();
  await page.locator('[data-testid="stage1-csv-upload"]').setInputFiles({
    name: 'pool.csv',
    mimeType: 'text/csv',
    buffer: readFileSync(FIXTURE),
  });
  // The label/for binding should make `getByLabel` resolve to the same input
  // node that data-testid does — this verifies K (label association).
  const byLabel = page.getByLabel('Stichprobengröße N');
  await expect(byLabel).toBeVisible();
  await byLabel.fill('25');
  await expect(page.getByTestId('stage1-target-n')).toHaveValue('25');
});

test('stage 1: Stale Result wird gecleart wenn N nach Run geändert wird (H)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tab-stage1').click();
  await page.locator('[data-testid="stage1-csv-upload"]').setInputFiles({
    name: 'pool.csv',
    mimeType: 'text/csv',
    buffer: readFileSync(FIXTURE),
  });
  await expect(page.getByTestId('stage1-pool-summary')).toContainText('500');

  await page.getByTestId('stage1-target-n').fill('40');
  // Seed must be confirmed (issue #53 C) before run is enabled.
  await page.getByTestId('stage1-seed-confirm').click();

  await page.getByTestId('stage1-run').click();
  await expect(page.getByTestId('stage1-result')).toBeVisible({ timeout: 5_000 });

  // Now change N — the result should disappear (stale clear).
  await page.getByTestId('stage1-target-n').fill('80');
  await expect(page.getByTestId('stage1-result')).toBeHidden();
});

test('stage 1: Run-Button bleibt disabled bis Seed bestätigt oder editiert wurde (C)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tab-stage1').click();
  await page.locator('[data-testid="stage1-csv-upload"]').setInputFiles({
    name: 'pool.csv',
    mimeType: 'text/csv',
    buffer: readFileSync(FIXTURE),
  });
  await page.getByTestId('stage1-target-n').fill('30');

  // Initial state: seed shows the "bitte vereinbaren" warning, run is disabled.
  await expect(page.getByTestId('stage1-seed-source')).toContainText('bitte gemeinsam vereinbaren');
  await expect(page.getByTestId('stage1-run')).toBeDisabled();

  // Path A: clicking "Default-Seed übernehmen" enables the button.
  await page.getByTestId('stage1-seed-confirm').click();
  await expect(page.getByTestId('stage1-seed-source')).toContainText('bestätigt');
  await expect(page.getByTestId('stage1-run')).toBeEnabled();
  // Confirm button disappears once confirmation is given.
  await expect(page.getByTestId('stage1-seed-confirm')).toHaveCount(0);

  // Path B: requesting a fresh default re-disables until next confirmation;
  // editing the seed value counts as confirmation directly.
  await page.getByText('Neuer Default-Seed').click();
  await expect(page.getByTestId('stage1-run')).toBeDisabled();
  await page.getByTestId('stage1-seed').fill('123456');
  await expect(page.getByTestId('stage1-seed-source')).toContainText('manuell');
  await expect(page.getByTestId('stage1-run')).toBeEnabled();
});

test('stage 1: Run-Button ist sticky positioniert (D)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tab-stage1').click();
  await page.locator('[data-testid="stage1-csv-upload"]').setInputFiles({
    name: 'pool.csv',
    mimeType: 'text/csv',
    buffer: readFileSync(FIXTURE),
  });
  await page.getByTestId('stage1-target-n').fill('30');
  // Run button itself stays inline; the wrapping container has the sticky
  // class. Asserting CSS on the wrapper avoids tying the test to a Tailwind
  // utility class change.
  const wrapper = page.locator('[data-testid="stage1-run"]').locator('..');
  await expect(wrapper).toHaveCSS('position', 'sticky');
});

test('stage 1: SVG-Bars haben title-Children und Pattern-Defs (E, a11y)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tab-stage1').click();
  await page.locator('[data-testid="stage1-csv-upload"]').setInputFiles({
    name: 'pool.csv',
    mimeType: 'text/csv',
    buffer: readFileSync(FIXTURE),
  });
  await page.getByTestId('stage1-target-n').fill('40');
  await page.getByTestId('stage1-seed-confirm').click();
  await page.getByTestId('stage1-run').click();
  await expect(page.getByTestId('stage1-result')).toBeVisible({ timeout: 5_000 });

  // Pattern <defs> entry exists for at least one axis (district is in the
  // fixture's recommended set). Pre-run preview and post-run result each
  // render their own AxisBreakdown for district, with mode-suffixed IDs to
  // avoid SVG <defs> collisions.
  await expect(page.locator('#stripes-district-result')).toHaveCount(1);
  // At least one Soll bar uses the result-mode pattern fill.
  await expect(
    page.locator('rect[fill="url(#stripes-district-result)"]').first(),
  ).toBeVisible();
  // At least one rect carries a <title> describing Soll or Ist.
  const firstTitle = await page
    .locator('[data-testid="stage1-axis-breakdown-district"] rect title')
    .first()
    .textContent();
  expect(firstTitle ?? '').toMatch(/Soll:|Ist:/);
  // SVG <desc> aggregate summary present.
  const desc = await page
    .locator('[data-testid="stage1-axis-breakdown-district"] svg desc')
    .first()
    .textContent();
  expect(desc ?? '').toContain('Merkmal district');
});

test('stage 1: CSV-Vorschau-Tabelle erscheint nach Upload (I)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tab-stage1').click();
  await page.locator('[data-testid="stage1-csv-upload"]').setInputFiles({
    name: 'pool.csv',
    mimeType: 'text/csv',
    buffer: readFileSync(FIXTURE),
  });
  // Stage 1 uses the new shared <CsvPreview>; default 5 data rows.
  await expect(page.getByTestId('csv-preview-table')).toBeVisible();
  const dataRows = page
    .locator('[data-testid="csv-preview-table"] tbody tr');
  expect(await dataRows.count()).toBe(5);
});

test('stage 1: Tabs tragen Untertitel als Tooltip + Schritt-Header (F)', async ({ page }) => {
  await page.goto('/');
  // After the pill-tab redesign (#56) the subtitles moved from visible DOM
  // to title attributes (still available to screen readers / on hover) so
  // mobile no longer wraps. Assert against the title attribute now.
  await expect(page.getByTestId('tab-stage1')).toHaveAttribute(
    'title',
    /Melderegister/,
  );
  await expect(page.getByTestId('tab-stage3')).toHaveAttribute(
    'title',
    /Antwortenden/,
  );
  await page.getByTestId('tab-stage1').click();
  await expect(page.getByTestId('stage1-step-header')).toContainText(
    'Schritt 1 von 3',
  );
});
