/**
 * Mobile touch-target audit (issue #56 Task 7).
 *
 * Asserts that every interactive element listed below renders with a
 * bounding box ≥44×44 CSS pixels on a 375×812 mobile viewport. 44px is
 * the Apple HIG / Material Design minimum for tap-friendly targets.
 *
 * If a target is below 44, the test fails with a clear message listing the
 * actual size — fix the offending class string (typically increase padding
 * or font size) and re-run. Documented failures move to BUNDLE_DELTA.md
 * "Bekannte A11y-Punkte" with test.fixme().
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

const MOBILE = { width: 375, height: 812 };
const MIN_TARGET = 44;

interface TargetCheck {
  testid: string;
  /** Optional human label for diagnostics. */
  label?: string;
}

async function assertTouchTarget(
  el: import('@playwright/test').Locator,
  testid: string,
) {
  await el.waitFor({ state: 'visible', timeout: 5_000 });
  const box = await el.boundingBox();
  if (!box) {
    throw new Error(`Touch-target [${testid}] has no bounding box`);
  }
  expect(
    box.width >= MIN_TARGET && box.height >= MIN_TARGET,
    `Touch-target [${testid}] is ${Math.round(box.width)}×${Math.round(box.height)}, expected ≥${MIN_TARGET}×${MIN_TARGET}`,
  ).toBe(true);
}

test.use({ viewport: MOBILE });

test('mobile: top-nav pill tabs are ≥44×44', async ({ page }) => {
  await page.goto('/');
  const tabs: TargetCheck[] = [
    { testid: 'tab-stage1' },
    { testid: 'tab-docs' },
    { testid: 'tab-stage3' },
  ];
  for (const t of tabs) {
    await assertTouchTarget(page.getByTestId(t.testid), t.testid);
  }
});

test('mobile: docs-hub tiles are ≥44×44', async ({ page }) => {
  await page.goto('/#/docs');
  const slugs = [
    'algorithmus',
    'technik',
    'verifikation',
    'glossar',
    'bmg46',
    'limitationen',
  ];
  for (const s of slugs) {
    await assertTouchTarget(
      page.getByTestId(`docs-tile-${s}`),
      `docs-tile-${s}`,
    );
  }
});

test('mobile: docs back-link is ≥44×44', async ({ page }) => {
  await page.goto('/#/docs/algorithmus');
  await assertTouchTarget(
    page.getByTestId('docs-back-to-hub'),
    'docs-back-to-hub',
  );
});

test('mobile: stage 1 trust-strip cards are ≥44×44', async ({ page }) => {
  await page.goto('/#/stage1');
  for (const id of [
    'trust-card-algorithmus',
    'trust-card-verifikation',
    'trust-card-audit',
  ]) {
    await assertTouchTarget(page.getByTestId(id), id);
  }
});

test('mobile: stage 1 inputs and run-button are ≥44×44 after CSV load', async ({
  page,
}) => {
  await page.goto('/#/stage1');
  // Upload a fixture so the inputs + run-button render.
  await page.locator('[data-testid="stage1-csv-upload"]').setInputFiles({
    name: 'pool.csv',
    mimeType: 'text/csv',
    buffer: readFileSync(FIXTURE),
  });
  await page.getByTestId('stage1-pool-summary').waitFor({ state: 'visible' });
  await page.getByTestId('stage1-target-n').fill('50');
  await page.getByTestId('stage1-seed-confirm').click();

  for (const id of [
    'stage1-target-n',
    'stage1-seed',
    'stage1-run',
    // The dropzone label itself wraps the upload — the label is the visible
    // tap surface (input is sr-only). Use the dropzone container test-id.
    'stage1-csv-dropzone',
  ]) {
    await assertTouchTarget(page.getByTestId(id), id);
  }
});

test('mobile: stage 1 strata table container has horizontal scroll', async ({
  page,
}) => {
  await page.goto('/#/stage1');
  await page.locator('[data-testid="stage1-csv-upload"]').setInputFiles({
    name: 'pool.csv',
    mimeType: 'text/csv',
    buffer: readFileSync(FIXTURE),
  });
  await page.getByTestId('stage1-pool-summary').waitFor({ state: 'visible' });
  await page.getByTestId('stage1-target-n').fill('50');
  await page.getByTestId('stage1-seed-confirm').click();
  await page.getByTestId('stage1-run').click();
  await page.getByTestId('stage1-result').waitFor({ state: 'visible' });
  await page.getByTestId('stage1-strata-toggle').click();
  await page.getByTestId('stage1-strata-table').waitFor({ state: 'visible' });

  // The table is wrapped in an overflow-x-auto container so it scrolls
  // horizontally on mobile when the content is wider than the viewport.
  const table = page.getByTestId('stage1-strata-table');
  const parent = table.locator('xpath=..');
  const overflow = await parent.evaluate(
    (el) => getComputedStyle(el as HTMLElement).overflowX,
  );
  expect(overflow).toBe('auto');
});

test('mobile: sticky run button uses safe-area-inset-bottom', async ({
  page,
}) => {
  await page.goto('/#/stage1');
  await page.locator('[data-testid="stage1-csv-upload"]').setInputFiles({
    name: 'pool.csv',
    mimeType: 'text/csv',
    buffer: readFileSync(FIXTURE),
  });
  await page.getByTestId('stage1-pool-summary').waitFor({ state: 'visible' });
  await page.getByTestId('stage1-target-n').fill('50');
  await page.getByTestId('stage1-seed-confirm').click();
  const wrapper = page.getByTestId('stage1-run').locator('xpath=..');
  // Use computed style: env(safe-area-inset-bottom) resolves to 0px on a
  // browser without a notch, but the underlying CSS bottom rule must be
  // set so iOS Safari with a home-indicator picks it up. We check the
  // raw inline/stylesheet-applied rule contains "env(safe-area-inset".
  const html = await wrapper.evaluate((el) => (el as HTMLElement).outerHTML);
  expect(html).toMatch(/safe-area-inset-bottom/);
});
