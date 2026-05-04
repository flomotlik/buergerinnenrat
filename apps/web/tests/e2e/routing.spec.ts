/**
 * Hash routing — covers App.tsx parseHash() (#65 routing surface). Asserts
 * that:
 *   - empty / '#' / '#/' → default landing #/stage3 (per CONTEXT.md L21)
 *   - unknown top-level → catch-all to stage3
 *   - unknown docs sub-route → falls back to docs/hub
 *   - #/docs/glossar/<slug> deep-links to the matching dt id
 */
import { test, expect } from '@playwright/test';

async function setHashAndWait(page: import('@playwright/test').Page, hash: string): Promise<void> {
  await page.evaluate((h) => {
    window.location.hash = h;
  }, hash);
}

test.describe('Routing — default landing & catch-alls', () => {
  for (const hash of ['', '#', '#/']) {
    test(`empty hash "${hash}" lands on Stage 3 (default)`, async ({ page }) => {
      // Navigate fresh; setting empty hash via evaluate would not trigger a
      // hashchange when current hash is also empty, so we go to the bare URL.
      const url = hash === '' ? '/' : `/${hash}`;
      await page.goto(url);
      // Stage 3 mounts the "Pool importieren" h2 heading.
      await expect(page.getByRole('heading', { name: '1. Pool importieren' })).toBeVisible();
    });
  }

  test('unknown top-level hash "#/foobar" falls through to Stage 3', async ({ page }) => {
    await page.goto('/');
    await setHashAndWait(page, '#/foobar');
    await expect(page.getByRole('heading', { name: '1. Pool importieren' })).toBeVisible();
  });

  test('unknown docs sub-route "#/docs/notARoute" falls back to docs/hub', async ({ page }) => {
    await page.goto('/');
    await setHashAndWait(page, '#/docs/notARoute');
    // DocsHub renders data-testid="docs-hub"; it is the canonical hub view.
    await expect(page.getByTestId('docs-hub')).toBeVisible();
  });

  test('valid docs sub-route "#/docs/algorithmus" mounts the algorithmus page', async ({ page }) => {
    await page.goto('/');
    await setHashAndWait(page, '#/docs/algorithmus');
    // Each docs subpage is mounted by DocsHub; the back-link is a stable
    // marker of "we are NOT on the hub anymore".
    await expect(page.getByTestId('docs-back-to-hub')).toBeVisible();
  });
});

test.describe('Routing — Glossar deep-link (Glossar.tsx:26-36)', () => {
  test('#/docs/glossar/<slug> mounts page-glossar and scrolls to the matching dt', async ({ page }) => {
    await page.goto('/');
    // 'stratum' is the first slug in glossar.json — using a real slug from
    // the existing dataset keeps the test stable against unrelated edits.
    await setHashAndWait(page, '#/docs/glossar/stratum');
    await expect(page.getByTestId('docs-page-glossar')).toBeVisible();
    // The dt id matches the slug (Glossar.tsx:62 — id={entry.slug}).
    const dt = page.locator('dt#stratum');
    await expect(dt).toBeVisible();
  });
});
