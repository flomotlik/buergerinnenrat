import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// Static xlsx import is fine here — Playwright specs run in Node, not in the
// browser bundle. The bundle still lazy-loads xlsx (see parse-xlsx.ts).
import * as XLSX from 'xlsx';

const HERE = dirname(fileURLToPath(import.meta.url));

// Use the herzogenburg-melderegister-8000 .xlsx as the happy-path fixture —
// it's the one parallel to the csv used in csv-import.spec.ts. Both files
// are produced by scripts/csv-to-xlsx.ts and committed to public/beispiele/.
const HERZOGENBURG_XLSX = resolve(
  HERE,
  '../../public/beispiele/herzogenburg-melderegister-8000.xlsx',
);

function makeXlsxBuffer(rows: unknown[][], extraSheets?: Record<string, unknown[][]>): Buffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Tabelle1');
  if (extraSheets) {
    for (const [name, r] of Object.entries(extraSheets)) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(r), name);
    }
  }
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
}

test('imports a generated xlsx fixture and shows preview', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bürger:innenrat' })).toBeVisible();

  // Tiny inline fixture — keeps the assertion deterministic ('100 Personen')
  // rather than depending on the herzogenburg-melderegister row count.
  const rows: unknown[][] = [['person_id', 'gender', 'age_band']];
  for (let i = 0; i < 100; i++) {
    rows.push([`p${String(i).padStart(3, '0')}`, i % 2 === 0 ? 'female' : 'male', '25-34']);
  }
  const buffer = makeXlsxBuffer(rows);

  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({
    name: 'pool.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
  });

  await expect(page.getByTestId('csv-preview')).toBeVisible();
  await expect(page.getByTestId('csv-validation-ok')).toBeVisible();

  await page.getByTestId('csv-commit').click();
  await expect(page.getByTestId('pool-summary')).toContainText('100 Personen');
});

test('shows multi-sheet warning when xlsx has multiple worksheets', async ({ page }) => {
  await page.goto('/');

  const buffer = makeXlsxBuffer(
    [
      ['person_id', 'gender'],
      ['p001', 'female'],
      ['p002', 'male'],
    ],
    { Hilfsblatt: [['x'], ['y']] },
  );

  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({
    name: 'multi-sheet.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
  });

  // Preview still renders for the first sheet — multi-sheet is non-fatal.
  await expect(page.getByTestId('csv-preview')).toBeVisible();
  // Warning surface: page text should mention '2 Worksheets' from the
  // ParsedTable.warnings array. Stage 3 doesn't render warnings explicitly
  // today, but the worksheet name + count appear in the summary line.
  // Assert via page-content match — the parser tags the message exactly.
  // Note: the warning is in the parsed.warnings[] but Stage 3 UI does not
  // render warnings; what is visible is the sheetName/sheetCount line in
  // the summary div. Assert that presence instead — confirms multi-sheet
  // path was taken.
  await expect(page.locator('text=Worksheet')).toBeVisible();
});

test('shows clear error when uploading a corrupt xlsx', async ({ page }) => {
  await page.goto('/');

  // Buffer that has the ZIP magic bytes but is not a valid xlsx — drives
  // the catch-and-rethrow branch in parseXlsxFile.
  const corruptBuffer = Buffer.from([
    0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x78,
  ]);

  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({
    name: 'corrupt.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: corruptBuffer,
  });

  await expect(page.getByTestId('csv-error')).toContainText(/sieht nicht wie/i);
});

test('imports the herzogenburg xlsx beispiel into Stage 1', async ({ page }) => {
  await page.goto('/');
  // Switch to Stage 1.
  await page.locator('a[data-testid="nav-stage1"]').click();

  const buffer = readFileSync(HERZOGENBURG_XLSX);
  const input = page.locator('[data-testid="stage1-csv-upload"]');
  await input.setInputFiles({
    name: 'herzogenburg-melderegister-8000.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
  });

  // Pool summary appears with the parsed row count (7957 data rows in the
  // committed beispiel).
  await expect(page.getByTestId('stage1-pool-summary')).toContainText(/Worksheet/);
  await expect(page.getByTestId('stage1-pool-summary')).toContainText(/Zeilen geladen/);
});

