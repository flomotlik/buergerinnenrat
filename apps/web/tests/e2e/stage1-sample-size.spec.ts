import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Issue #64: Sample-size calculator e2e tests.
//
// These tests cover only the new behavior introduced by the calculator —
// existing Stage 1 tests still drive `stage1-target-n` directly and must keep
// passing (the calculator is OPTIONAL).

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_500 = resolve(
  HERE,
  '../../../../tests/fixtures/synthetic-pools/kleinstadt-bezirkshauptort-n500-s42-t070.csv',
);
const FIXTURE_100 = resolve(
  HERE,
  '../../../../tests/fixtures/synthetic-pools/kleinstadt-bezirkshauptort-n100-s42-t070.csv',
);

test.describe.configure({ mode: 'serial' });

async function uploadFixture(page: import('@playwright/test').Page, fixture: string) {
  await page.goto('/');
  // #65: pill-tabs are md:hidden at desktop viewport — drive route via URL hash.
  await page.evaluate(() => {
    window.location.hash = '#/stage1';
  });
  await page.locator('[data-testid="stage1-file-upload"]').setInputFiles({
    name: 'pool.csv',
    mimeType: 'text/csv',
    buffer: readFileSync(fixture),
  });
  await expect(page.getByTestId('stage1-pool-summary')).toBeVisible();
}

test('calculator: default mode mail-plus-phone, panel 30 → vorschlag 110, range 60-150', async ({
  page,
}) => {
  await uploadFixture(page, FIXTURE_500);

  // Section is visible and has the section testid.
  await expect(page.getByTestId('stage1-sample-size-section')).toBeVisible();

  // Default panel size is 30, default outreach is mail-plus-phone.
  await expect(page.getByTestId('stage1-panel-size')).toHaveValue('30');
  await expect(page.getByTestId('stage1-outreach-mail-plus-phone')).toBeChecked();

  // Custom inputs are hidden when mode != custom.
  await expect(page.getByTestId('stage1-custom-rate-min')).toHaveCount(0);

  // Suggestion box reflects the formula.
  const suggestion = page.getByTestId('stage1-sample-suggestion');
  await expect(suggestion).toContainText('110');
  await expect(suggestion).toContainText('60');
  await expect(suggestion).toContainText('150');
});

test('calculator: accept button writes recommended into stage1-target-n', async ({ page }) => {
  await uploadFixture(page, FIXTURE_500);
  await page.getByTestId('stage1-accept-suggestion').click();

  // The targetN input below must now show 110.
  await expect(page.getByTestId('stage1-target-n')).toHaveValue('110');
});

test('calculator: switching to custom mode reveals min/max inputs and updates suggestion', async ({
  page,
}) => {
  await uploadFixture(page, FIXTURE_500);
  await page.getByTestId('stage1-outreach-custom').check();

  // Custom rate inputs become visible with default 15 / 25.
  await expect(page.getByTestId('stage1-custom-rate-min')).toBeVisible();
  await expect(page.getByTestId('stage1-custom-rate-max')).toBeVisible();
  await expect(page.getByTestId('stage1-custom-rate-min')).toHaveValue('15');
  await expect(page.getByTestId('stage1-custom-rate-max')).toHaveValue('25');

  // Default 15..25 % with panel 30, factor 1.5 → recommended 230.
  // round(30 / 0.20 × 1.5 / 10) × 10 = 230, range_min ⌈30/0.25⌉=120, range_max ⌈30/0.15×1.5⌉=300
  const suggestion = page.getByTestId('stage1-sample-suggestion');
  await expect(suggestion).toContainText('230');
  await expect(suggestion).toContainText('120');
  await expect(suggestion).toContainText('300');
});

test('calculator: pool-too-small warning appears when recommended > pool', async ({ page }) => {
  // n=100 fixture + mail-only at panel 30 → recommended 640 > 100 pool.
  await uploadFixture(page, FIXTURE_100);
  await page.getByTestId('stage1-outreach-mail-only').check();
  // Wait for the suggestion to update (panel default 30, mail-only avg 7 % → ~640).
  await expect(page.getByTestId('stage1-sample-suggestion')).toContainText('640');
  await expect(page.getByTestId('stage1-pool-too-small-warning')).toBeVisible();
  await expect(page.getByTestId('stage1-pool-too-small-warning')).toContainText('100');
  await expect(page.getByTestId('stage1-pool-too-small-warning')).toContainText('640');
});

test('audit footer: shows Bemessung section when suggestion was accepted', async ({ page }) => {
  await uploadFixture(page, FIXTURE_500);
  await page.getByTestId('stage1-accept-suggestion').click();
  await expect(page.getByTestId('stage1-target-n')).toHaveValue('110');

  // Run with the accepted N.
  await page.getByTestId('stage1-run').click();
  await expect(page.getByTestId('stage1-result')).toBeVisible({ timeout: 10_000 });

  const footer = page.getByTestId('audit-footer-sample-size');
  await expect(footer).toBeVisible();
  await expect(footer).toContainText('Panelgröße: 30');
  await expect(footer).toContainText('Briefe + Telefon-Nachfasser');
  await expect(footer).toContainText('Vorschlag übernommen');
  await expect(footer).not.toContainText('manuell überschrieben');
});

test('audit footer: shows manual override when user changes N after accept', async ({ page }) => {
  await uploadFixture(page, FIXTURE_500);
  await page.getByTestId('stage1-accept-suggestion').click();
  await expect(page.getByTestId('stage1-target-n')).toHaveValue('110');

  // Now manually change N to 200.
  await page.getByTestId('stage1-target-n').fill('200');
  await expect(page.getByTestId('stage1-target-n')).toHaveValue('200');

  await page.getByTestId('stage1-run').click();
  await expect(page.getByTestId('stage1-result')).toBeVisible({ timeout: 10_000 });

  const footer = page.getByTestId('audit-footer-sample-size');
  await expect(footer).toBeVisible();
  await expect(footer).toContainText('manuell überschrieben');
  await expect(footer).toContainText('110'); // the original suggestion
  await expect(footer).toContainText('200'); // the actually-used N
});

test('audit JSON: schema_version 0.4 + algorithm_version stage1@1.2.0 + sample_size_proposal field', async ({
  page,
}) => {
  await uploadFixture(page, FIXTURE_500);
  await page.getByTestId('stage1-accept-suggestion').click();
  await page.getByTestId('stage1-run').click();
  await expect(page.getByTestId('stage1-result')).toBeVisible({ timeout: 10_000 });

  // Download the audit JSON and verify the schema/proposal payload.
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('stage1-download-audit').click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  const fs = await import('node:fs');
  const json = JSON.parse(fs.readFileSync(path!, 'utf8')) as Record<string, unknown>;

  expect(json.schema_version).toBe('0.4');
  expect(json.algorithm_version).toBe('stage1@1.2.0');
  const proposal = json.sample_size_proposal as Record<string, unknown> | undefined;
  expect(proposal).toBeTruthy();
  expect(proposal!.panel_size).toBe(30);
  expect(proposal!.outreach).toBe('mail-plus-phone');
  expect(proposal!.recommended).toBe(110);
  expect(proposal!.range).toEqual([60, 150]);
  expect(proposal!.manually_overridden).toBe(false);
});

test('existing direct-N flow keeps working (calculator is optional)', async ({ page }) => {
  await uploadFixture(page, FIXTURE_500);

  // Skip the calculator entirely — fill targetN directly.
  await page.getByTestId('stage1-target-n').fill('50');
  await page.getByTestId('stage1-run').click();
  await expect(page.getByTestId('stage1-result')).toBeVisible({ timeout: 10_000 });

  // Audit doc must NOT carry a sample_size_proposal (user didn't use the calc).
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('stage1-download-audit').click();
  const download = await downloadPromise;
  const path = await download.path();
  const fs = await import('node:fs');
  const json = JSON.parse(fs.readFileSync(path!, 'utf8')) as Record<string, unknown>;
  expect(json.schema_version).toBe('0.4');
  expect(json.sample_size_proposal).toBeUndefined();

  // The audit footer must NOT carry the Bemessung row in this case.
  await expect(page.getByTestId('audit-footer-sample-size')).toHaveCount(0);
});
