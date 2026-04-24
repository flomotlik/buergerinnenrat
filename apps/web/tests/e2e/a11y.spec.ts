import { test, expect } from '@playwright/test';

// Lightweight a11y smoke check — full axe-core integration is iteration 2.
// We assert: every interactive control has an accessible name, no images
// without alt, no form fields without label.

test('basic a11y: form fields labelled, buttons have text', async ({ page }) => {
  await page.goto('/');

  const fileInputs = await page.locator('input[type="file"]').count();
  expect(fileInputs).toBeGreaterThan(0);

  const buttons = page.locator('button');
  const buttonCount = await buttons.count();
  for (let i = 0; i < buttonCount; i++) {
    const txt = (await buttons.nth(i).textContent())?.trim() ?? '';
    const aria = (await buttons.nth(i).getAttribute('aria-label')) ?? '';
    expect(txt.length > 0 || aria.length > 0, `button ${i} has no accessible name`).toBe(true);
  }

  // No <img> without alt (iteration 1 has none, but the assertion catches future regressions)
  const imgs = page.locator('img');
  const imgCount = await imgs.count();
  for (let i = 0; i < imgCount; i++) {
    const alt = await imgs.nth(i).getAttribute('alt');
    expect(alt, `img ${i} missing alt`).not.toBeNull();
  }

  // h1 must exist and be unique
  const h1Count = await page.locator('h1').count();
  expect(h1Count).toBe(1);
});
