import { test, expect } from '@playwright/test';

test.describe('docs hub + subpages', () => {
  test('Tab-Switch funktioniert und setzt URL-Hash', async ({ page }) => {
    await page.goto('/');
    // #65: pill-tabs are md:hidden at desktop viewport — drive route via URL hash.
    await page.evaluate(() => {
      window.location.hash = '#/docs';
    });
    await expect(page).toHaveURL(/#\/docs$/);
    // Hub itself, before drilling into a subpage.
    await expect(page.getByTestId('docs-hub')).toBeVisible();
  });

  test('Hub zeigt 8 Tile-Karten und tile-click navigiert', async ({ page }) => {
    await page.goto('/#/docs');
    const tiles = page.locator('[data-testid^="docs-tile-"]');
    // Issue #57 added the "Beispiel-Daten" tile; #70 added the
    // "Anwendungsfälle" tile.
    await expect(tiles).toHaveCount(8);
    await page.getByTestId('docs-tile-algorithmus').click();
    await expect(page).toHaveURL(/#\/docs\/algorithmus$/);
    await expect(page.getByTestId('docs-page-algorithmus')).toBeVisible();
  });

  test('Algorithmus-Seite zeigt Toy-Beispiel-SVG', async ({ page }) => {
    await page.goto('/#/docs/algorithmus');
    await expect(page.getByTestId('hamilton-svg')).toBeVisible();
  });

  test('Tech-Seite zeigt mind. 5 Library-Zeilen', async ({ page }) => {
    await page.goto('/#/docs/technik');
    // Wait for the lazy chunk to land before counting rows.
    await expect(page.getByTestId('docs-page-technik')).toBeVisible();
    const rows = page.locator('[data-testid="tech-table-libs"] tbody tr');
    expect(await rows.count()).toBeGreaterThanOrEqual(5);
  });

  test('Verifikations-Seite zeigt copy-paste-Code-Snippets', async ({ page }) => {
    await page.goto('/#/docs/verifikation');
    await expect(page.getByTestId('docs-page-verifikation')).toBeVisible();
    const buttons = page.locator('[data-testid^="copy-snippet-"]');
    expect(await buttons.count()).toBeGreaterThanOrEqual(2);
  });

  test('Hash-direkt-Navigation lädt Glossar', async ({ page }) => {
    await page.goto('/#/docs/glossar');
    await expect(page.getByTestId('docs-page-glossar')).toBeVisible();
  });

  test('Zurück-zum-Hub aus Subseite', async ({ page }) => {
    await page.goto('/#/docs/algorithmus');
    await page.getByTestId('docs-back-to-hub').click();
    await expect(page).toHaveURL(/#\/docs$/);
    await expect(page.getByTestId('docs-hub')).toBeVisible();
  });

  test('BMG46-Seite zeigt zulässige Felder', async ({ page }) => {
    await page.goto('/#/docs/bmg46');
    await expect(page.getByTestId('docs-page-bmg46')).toBeVisible();
    await expect(page.getByTestId('docs-page-bmg46')).toContainText('Familienname');
  });
});
