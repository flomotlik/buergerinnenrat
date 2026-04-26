import { test, expect } from '@playwright/test';

// Live-site smoke. Five aspects only — each test verifies one observable
// surface of the deployed app. Selectors prefer data-testid (stable across
// CSS refactors) and fall back to role/text matchers for content owned by
// markdown-style copy that may shift between releases.
test.describe('Live Site Smoke', () => {
  test('Hauptseite lädt mit korrektem Title', async ({ page }) => {
    const response = await page.goto('./');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Bürger|Sortition|Buergerinnenrat/i);
  });

  test('Tab-Navigation: Stage 1 / Doku / Stage 3 alle erreichbar', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('tab-stage1').click();
    await expect(page.getByTestId('stage1-panel')).toBeVisible();
    await page.getByTestId('tab-docs').click();
    await expect(page.getByTestId('docs-hub')).toBeVisible();
    await page.getByTestId('tab-stage3').click();
    // Stage 3 has no single panel testid; assert the heading instead.
    await expect(page.getByRole('heading', { name: /Pool importieren/i })).toBeVisible();
  });

  test('Stage 1 zeigt CSV-Upload-Feld', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('tab-stage1').click();
    const fileInput = page.getByTestId('stage1-csv-upload');
    await expect(fileInput).toBeAttached();
  });

  test('Doku-Hub zeigt mindestens 5 Karten', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('tab-docs').click();
    await expect(page.getByTestId('docs-hub')).toBeVisible();
    const tiles = page.locator('[data-testid^="docs-tile-"]');
    await expect(tiles.first()).toBeVisible();
    const count = await tiles.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('Algorithmus-Doku-Seite lädt mit SVG', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('tab-docs').click();
    await page.getByTestId('docs-tile-algorithmus').click();
    // The Hamilton toy-example SVG from issue #54.
    await expect(page.getByTestId('hamilton-svg')).toBeVisible();
  });

  test('Doku-Beispiele lädt mit Download-Link', async ({ page }) => {
    // Issue #57 — verify the downloadable example file is present and the
    // server delivers a 200 for the underlying static asset.
    await page.goto('./');
    await page.getByTestId('tab-docs').click();
    await page.getByTestId('docs-tile-beispiele').click();
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
