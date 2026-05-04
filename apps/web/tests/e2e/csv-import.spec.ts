import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(
  HERE,
  '../../../../tests/fixtures/synthetic-pools/kleinstadt-bezirkshauptort-n100-s42-t070.csv',
);

test('imports a synthetic pool fixture and shows preview', async ({ page }) => {
  await page.goto('/');
  // Brand wordmark — testid-selector for immunity against future rebrands.
  await expect(page.getByTestId('brand')).toBeVisible();

  // Use the file input rather than drag-and-drop for reliability.
  const input = page.locator('input[type="file"]').first();
  const csv = readFileSync(FIXTURE);
  await input.setInputFiles({ name: 'pool.csv', mimeType: 'text/csv', buffer: csv });

  await expect(page.getByTestId('file-preview')).toBeVisible();
  await expect(page.getByTestId('file-validation-ok')).toBeVisible();

  await page.getByTestId('file-commit').click();
  await expect(page.getByTestId('pool-summary')).toContainText('100 Personen');
});

test('configures quotas and reaches the run-stub', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('input[type="file"]').first();
  const csv = readFileSync(FIXTURE);
  await input.setInputFiles({ name: 'pool.csv', mimeType: 'text/csv', buffer: csv });
  await page.getByTestId('file-commit').click();

  await expect(page.getByTestId('quota-editor')).toBeVisible();
  await page.getByTestId('quota-panel-size').fill('20');
  await page.getByTestId('quota-add-category').selectOption('gender');

  // With valid quotas the RunPanel takes over (issue 10 wires the engine).
  await expect(page.getByTestId('run-panel')).toBeVisible();
});
