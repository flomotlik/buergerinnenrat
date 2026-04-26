import { test, expect } from '@playwright/test';

test.describe('TrustStrip in Stage 1', () => {
  test('zeigt 3 Karten direkt unter dem Stage-1-Header', async ({ page }) => {
    await page.goto('/#/stage1');
    await expect(page.getByTestId('stage1-trust-strip')).toBeVisible();
    await expect(page.getByTestId('trust-card-algorithmus')).toBeVisible();
    await expect(page.getByTestId('trust-card-verifikation')).toBeVisible();
    await expect(page.getByTestId('trust-card-audit')).toBeVisible();
  });

  test('Klick auf Karte öffnet die passende Doku-Seite', async ({ page }) => {
    await page.goto('/#/stage1');
    await page.getByTestId('trust-card-algorithmus').click();
    await expect(page).toHaveURL(/#\/docs\/algorithmus$/);
    await expect(page.getByTestId('docs-page-algorithmus')).toBeVisible();
  });
});
