import { test, expect } from '@playwright/test';

test('app renders heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sortition Iteration 1');
});
