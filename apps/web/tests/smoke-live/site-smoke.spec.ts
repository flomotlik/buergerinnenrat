import { test, expect } from '@playwright/test';

// Live-site smoke. Five aspects only — each test verifies one observable
// surface of the deployed app. Selectors prefer data-testid (stable across
// CSS refactors) and fall back to role/text matchers for content owned by
// markdown-style copy that may shift between releases.
//
// Post-#65: pill-tabs (`tab-stage1` / `tab-docs` / `tab-stage3`) are visible
// only at <md (375-767px). At desktop (md+) the sidebar replaces them and the
// pill-tabs render `display: none`. The default Playwright project viewport
// is desktop, so navigation here uses `window.location.hash =` (the hash
// listener at App.tsx:135-145 is the canonical navigation surface and is
// viewport-agnostic). Keep the pill-tab `data-testid` contract intact for
// mobile-touch-targets specs in the e2e suite.
async function gotoRoute(page: import('@playwright/test').Page, hash: string) {
  await page.goto('./');
  await page.evaluate((h) => {
    window.location.hash = h;
  }, hash);
}

test.describe('Live Site Smoke', () => {
  test('Hauptseite lädt mit korrektem Title', async ({ page }) => {
    const response = await page.goto('./');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Bürger|Sortition|Buergerinnenrat/i);
  });

  test('Tab-Navigation: Stage 1 / Doku / Stage 3 alle erreichbar', async ({ page }) => {
    await gotoRoute(page, '#/stage1');
    await expect(page.getByTestId('stage1-panel')).toBeVisible();
    await gotoRoute(page, '#/docs');
    await expect(page.getByTestId('docs-hub')).toBeVisible();
    await gotoRoute(page, '#/stage3');
    // Stage 3 has no single panel testid; assert the heading instead.
    await expect(page.getByRole('heading', { name: /Pool importieren/i })).toBeVisible();
  });

  test('Stage 1 zeigt CSV-Upload-Feld', async ({ page }) => {
    await gotoRoute(page, '#/stage1');
    const fileInput = page.getByTestId('stage1-csv-upload');
    await expect(fileInput).toBeAttached();
  });

  test('Doku-Hub zeigt mindestens 5 Karten', async ({ page }) => {
    await gotoRoute(page, '#/docs');
    await expect(page.getByTestId('docs-hub')).toBeVisible();
    const tiles = page.locator('[data-testid^="docs-tile-"]');
    await expect(tiles.first()).toBeVisible();
    const count = await tiles.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('Algorithmus-Doku-Seite lädt mit SVG', async ({ page }) => {
    await gotoRoute(page, '#/docs/algorithmus');
    // The Hamilton toy-example SVG from issue #54.
    await expect(page.getByTestId('hamilton-svg')).toBeVisible();
  });

  test('Doku-Beispiele lädt mit Download-Link', async ({ page }) => {
    // Issue #57 — verify the downloadable example file is present and the
    // server delivers a 200 for the underlying static asset.
    await gotoRoute(page, '#/docs/beispiele');
    await expect(page.getByTestId('docs-page-beispiele')).toBeVisible();
    const link = page.getByTestId('download-herzogenburg-melderegister-8000');
    const href = await link.getAttribute('href');
    expect(href).not.toBeNull();
    expect(href!).toMatch(/beispiele\/herzogenburg-melderegister-8000\.csv$/);
    // HEAD-check the static asset (lightweight: no actual download).
    const url = new URL(href!, page.url()).toString();
    const resp = await page.request.head(url);
    expect(resp.status()).toBe(200);
  });
});
