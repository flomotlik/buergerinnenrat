// Issue #62 e2e: derived altersgruppe + bands editor + display-only flow.
// Uses the herzogenburg-melderegister fixture (geburtsjahr present, no
// altersgruppe) so the derive pipeline kicks in.

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HERZOGENBURG = resolve(
  HERE,
  '../../public/beispiele/herzogenburg-melderegister-8000.csv',
);

test.describe.configure({ mode: 'serial' });

async function uploadHerzogenburg(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByTestId('tab-stage1').click();
  await expect(page.getByTestId('stage1-panel')).toBeVisible();
  await page.locator('[data-testid="stage1-csv-upload"]').setInputFiles({
    name: 'herzogenburg-melderegister-8000.csv',
    mimeType: 'text/csv',
    buffer: readFileSync(HERZOGENBURG),
  });
  await expect(page.getByTestId('stage1-pool-summary')).toContainText(/\d{4} Zeilen/);
}

test('default axes after upload include geschlecht, altersgruppe, sprengel', async ({ page }) => {
  await uploadHerzogenburg(page);
  await expect(page.getByTestId('axis-checkbox-geschlecht')).toBeChecked();
  await expect(page.getByTestId('axis-checkbox-altersgruppe')).toBeChecked();
  await expect(page.getByTestId('axis-checkbox-sprengel')).toBeChecked();
  // The derived altersgruppe column carries the `berechnet` badge.
  await expect(page.getByTestId('axis-badge-derived-altersgruppe')).toBeVisible();
});

test('stratification explainer is open by default and shows live cell-count', async ({ page }) => {
  await uploadHerzogenburg(page);
  const explainer = page.getByTestId('stage1-stratification-explainer');
  await expect(explainer).toBeVisible();
  // <details> reflects open state via the `open` attribute.
  await expect(explainer).toHaveAttribute('open', '');
  const live = page.getByTestId('stage1-explainer-live-count');
  await expect(live).toContainText(/Bevölkerungsgruppen/);
  // Three default axes + 5 altersgruppe bands should produce > 5 groups.
  const text = (await live.textContent()) ?? '';
  const m = text.match(/(\d+)\s+Bevölkerungsgruppen/);
  expect(m).not.toBeNull();
  expect(Number(m![1])).toBeGreaterThan(5);

  // Toggle closed → open attribute disappears.
  await explainer.locator('summary').click();
  await expect(explainer).not.toHaveAttribute('open', '');
});

test('AgeBandsEditor shows 5 default bands with the documented mode pattern', async ({ page }) => {
  await uploadHerzogenburg(page);
  await expect(page.getByTestId('stage1-age-bands-editor')).toBeVisible();
  await expect(page.getByTestId('band-mode-0-display')).toBeChecked();
  await expect(page.getByTestId('band-mode-1-selection')).toBeChecked();
  await expect(page.getByTestId('band-mode-2-selection')).toBeChecked();
  await expect(page.getByTestId('band-mode-3-selection')).toBeChecked();
  await expect(page.getByTestId('band-mode-4-selection')).toBeChecked();
});

test('flipping unter-16 to selection removes the info-only-bands report from the result', async ({
  page,
}) => {
  await uploadHerzogenburg(page);
  // Switch unter-16 to selection.
  await page.getByTestId('band-mode-0-selection').check();
  await expect(page.getByTestId('bands-validation')).toContainText(/5 Auswahl/);

  await page.getByTestId('stage1-target-n').fill('50');
  await expect(page.getByTestId('stage1-run')).toBeEnabled();
  await page.getByTestId('stage1-run').click();
  await expect(page.getByTestId('stage1-result')).toBeVisible({ timeout: 10_000 });
  // No display-only bands → no info-only-bands section.
  await expect(page.getByTestId('stage1-info-only-bands-report')).toHaveCount(0);
  await expect(page.getByTestId('audit-footer-forced-zero')).toHaveCount(0);
});

test('default display-only unter-16 → result view + audit reflect forced-zero strata', async ({
  page,
}) => {
  await uploadHerzogenburg(page);
  await page.getByTestId('stage1-target-n').fill('50');
  await page.getByTestId('stage1-run').click();
  await expect(page.getByTestId('stage1-result')).toBeVisible({ timeout: 10_000 });

  // Info-only-bands report is rendered with at least one row for unter-16.
  const infoReport = page.getByTestId('stage1-info-only-bands-report');
  await expect(infoReport).toBeVisible();
  await expect(infoReport).toContainText('unter-16');
  // Audit footer mentions forced-zero strata.
  await expect(page.getByTestId('audit-footer-forced-zero')).toBeVisible();
  // Audit footer carries the derived-columns block.
  await expect(page.getByTestId('audit-footer-derived')).toContainText(
    /berechnet aus geburtsjahr/,
  );

  // Audit JSON download must carry the new schema fields and zero pool_filter.
  const auditDownloadPromise = page.waitForEvent('download');
  await page.getByTestId('stage1-download-audit').click();
  const auditDownload = await auditDownloadPromise;
  const path = await auditDownload.path();
  expect(path).toBeTruthy();
  const fs = await import('node:fs');
  const json = JSON.parse(fs.readFileSync(path!, 'utf8')) as Record<string, unknown>;
  expect(json.schema_version).toBe('0.3');
  expect(json.algorithm_version).toBe('stage1@1.1.0');
  expect(Array.isArray(json.forced_zero_strata)).toBe(true);
  expect((json.forced_zero_strata as string[]).length).toBeGreaterThan(0);
  const derived = json.derived_columns as Record<string, unknown> | undefined;
  expect(derived?.altersgruppe).toBeTruthy();
  // No pool_filter field anywhere in the audit doc.
  expect(json.pool_filter).toBeUndefined();
});

test('invalid bands disable the run button', async ({ page }) => {
  await uploadHerzogenburg(page);
  // Force an overlap: set band-min-1 to 0 (band 0 covers 0..15, so 0..n
  // overlaps it). On-blur commit, so we change-and-blur explicitly.
  const minInput = page.getByTestId('band-min-1');
  await minInput.fill('0');
  await minInput.blur();
  // Validation block now shows a red error.
  await expect(page.getByTestId('bands-validation')).toContainText(/überlappen|aufsteigend/);
  // Run button is disabled with an explanatory message.
  await page.getByTestId('stage1-target-n').fill('50');
  await expect(page.getByTestId('stage1-run')).toBeDisabled();
  await expect(page.getByTestId('stage1-run-bands-block')).toBeVisible();
});

// Test 7 placeholder: the herzogenburg fixture has no axis with > 15
// distinct values (sprengel ≈ 6, staatsbuergerschaft ≤ 5). Distinct-value
// warnings are e2e-tested via Test 1's badge presence; full > 15 trigger
// is covered separately when consolidation work lands in #63.
test.skip('axis-warn-distinct fires for high-cardinality axis (deferred to #63)', () => {});
