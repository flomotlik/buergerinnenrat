/**
 * Sidebar navigation contract — covers Sidebar.tsx (#65). Tests the actual
 * data-testid set and aria attributes the executor read from source:
 *   nav-overview, nav-stage1, nav-stage3, nav-docs, nav-beispiele (active links)
 *   nav-stage2, nav-stage4 (disabled — aria-disabled="true" + title)
 * Sidebar is `hidden md:flex` so a desktop-default viewport (≥md) renders it,
 * while <md viewports must hide it (the pill-tabs in main-nav are the
 * mobile-compat shim).
 */
import { test, expect } from '@playwright/test';

const NAV_ROUTES: Array<{ testid: string; expectedHash: string; mode: string }> = [
  { testid: 'nav-overview', expectedHash: '#/overview', mode: 'overview' },
  { testid: 'nav-stage1', expectedHash: '#/stage1', mode: 'stage1' },
  { testid: 'nav-stage3', expectedHash: '#/stage3', mode: 'stage3' },
  { testid: 'nav-docs', expectedHash: '#/docs', mode: 'docs' },
  { testid: 'nav-beispiele', expectedHash: '#/docs/beispiele', mode: 'docs' /* sub-route */ },
];

const DISABLED_NAV_ITEMS: Array<{ testid: string }> = [
  { testid: 'nav-stage2' },
  { testid: 'nav-stage4' },
];

test.describe('Sidebar navigation (≥md)', () => {
  test('sidebar is visible at desktop viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('sidebar')).toBeVisible();
    await expect(page.getByTestId('primary-nav')).toBeVisible();
  });

  for (const { testid, expectedHash } of NAV_ROUTES) {
    test(`${testid} click → URL hash flips to ${expectedHash}`, async ({ page }) => {
      await page.goto('/');
      await page.getByTestId(testid).click();
      // hashchange + signal sync + re-render are synchronous in Solid; a
      // short polling assertion handles any microtask scheduling.
      await expect.poll(() => page.evaluate(() => window.location.hash)).toBe(expectedHash);
    });
  }

  for (const { testid, expectedHash, mode } of NAV_ROUTES) {
    // Skip the sub-route nav-beispiele aria-current check: Sidebar.tsx:107-109
    // intentionally hard-codes active=false because the docs sub-routes keep
    // the nav-docs top-level item active. Verify that semantics instead.
    if (testid === 'nav-beispiele') continue;

    test(`${testid} sets aria-current="page" when route active`, async ({ page }) => {
      await page.goto('/');
      // Set hash directly so we can assert the resulting active item without
      // relying on a click side-effect (already covered above).
      await page.evaluate((h) => {
        window.location.hash = h;
      }, expectedHash);
      // Wait for Solid to re-render the aria-current attribute.
      await expect.poll(async () => page.getByTestId(testid).getAttribute('aria-current')).toBe('page');
      void mode;
    });
  }

  test('nav-beispiele keeps nav-docs as the active top-level when on docs sub-route', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.location.hash = '#/docs/beispiele';
    });
    await expect.poll(async () => page.getByTestId('nav-docs').getAttribute('aria-current')).toBe('page');
    // Sub-route link itself is intentionally NOT marked active per Sidebar.tsx:108.
    const beispieleAria = await page.getByTestId('nav-beispiele').getAttribute('aria-current');
    expect(beispieleAria).toBeNull();
  });

  for (const { testid } of DISABLED_NAV_ITEMS) {
    test(`${testid} is rendered as aria-disabled with a title tooltip`, async ({ page }) => {
      await page.goto('/');
      const item = page.getByTestId(testid);
      await expect(item).toBeVisible();
      await expect(item).toHaveAttribute('aria-disabled', 'true');
      const title = await item.getAttribute('title');
      expect(title).toBeTruthy();
      expect((title ?? '').length).toBeGreaterThan(10);
    });
  }
});

test.describe('Sidebar at <md viewport', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('sidebar is hidden, pill-tabs (main-nav) are visible', async ({ page }) => {
    await page.goto('/');
    // The sidebar element exists in the DOM but `hidden md:flex` resolves to
    // display:none at <md, which Playwright's toBeHidden treats correctly.
    await expect(page.getByTestId('sidebar')).toBeHidden();
    await expect(page.getByTestId('main-nav')).toBeVisible();
  });
});
