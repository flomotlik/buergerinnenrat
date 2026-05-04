import { test, expect } from '@playwright/test';

test('app renders heading', async ({ page }) => {
  await page.goto('/');
  // Brand wordmark — testid-selector for immunity against future rebrands.
  await expect(page.getByTestId('brand')).toContainText('Personenauswahl');
});
