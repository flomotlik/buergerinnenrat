/**
 * Overview landing route — covers Overview.tsx (#65). Tests the actual
 * data-testid set: overview-page (root), overview-card-stage1, overview-
 * card-stage3, overview-stages-2-4-note, overview-principles, plus the
 * principle cards (overview-principle-* derived from TRUST_PRINCIPLES).
 */
import { test, expect } from '@playwright/test';

test.describe('Overview landing (#/overview)', () => {
  test('renders hero h1 with brand text', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.location.hash = '#/overview';
    });
    await expect(page.getByTestId('overview-page')).toBeVisible();
    // h1 lives inside the overview hero; assert exactly one h1 visible on this route.
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText('Bürger:innenrat');
  });

  test('renders both workflow cards (Stage 1 + Stage 3)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.location.hash = '#/overview';
    });
    await expect(page.getByTestId('overview-card-stage1')).toBeVisible();
    await expect(page.getByTestId('overview-card-stage3')).toBeVisible();
    // Each card carries its stage status pill — sanity-check labels.
    await expect(page.getByTestId('overview-card-stage1')).toContainText('Stage 1');
    await expect(page.getByTestId('overview-card-stage3')).toContainText('Stage 3');
  });

  test('renders 3 principle cards in the principles grid', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.location.hash = '#/overview';
    });
    const grid = page.getByTestId('overview-principles');
    await expect(grid).toBeVisible();
    // Principle cards use overview-principle-<slug> testids — assert exactly 3.
    const cards = grid.locator('[data-testid^="overview-principle-"]');
    await expect(cards).toHaveCount(3);
  });

  test('renders Stage-2/4 outside-tool banner with explanatory text', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.location.hash = '#/overview';
    });
    const banner = page.getByTestId('overview-stages-2-4-note');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('außerhalb');
    await expect(banner).toContainText('Stage 2');
    await expect(banner).toContainText('Stage 4');
  });

  test('clicking workflow card flips the URL hash to its stage route', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.location.hash = '#/overview';
    });
    await page.getByTestId('overview-card-stage1').click();
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('#/stage1');

    // Navigate back via hash and click the other card.
    await page.evaluate(() => {
      window.location.hash = '#/overview';
    });
    await page.getByTestId('overview-card-stage3').click();
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('#/stage3');
  });
});
