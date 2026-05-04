// Async wrapper around SheetJS xlsx writer for Stage 1.
//
// Dynamic import keeps @sortition/core SheetJS-free at build time — only
// call sites that invoke this function trigger the lazy chunk in the web
// bundle. Synchronous `import * as XLSX from 'xlsx'` here would pull SheetJS
// into the core build and into every consumer that imports core, including
// vitest test files in packages/core/tests.

import type { Stage1CsvOptions } from './csv-export';

export interface Stage1XlsxResult {
  buffer: ArrayBuffer;
  warnings: string[];
}

/**
 * Serialize a Stage 1 result to an .xlsx ArrayBuffer.
 *
 * Mirrors stage1ResultToCsv exactly:
 *   - Preserves all `headers` in original order.
 *   - Emits one row per index in `selected[]`, in `selected[]` order.
 *   - Optional `gezogen` column appended at the end. On column-name conflict
 *     the new column is renamed to `gezogen_2` and a warning is pushed.
 *
 * SheetJS handles cell-content escaping itself — no rfc4180Quote needed.
 */
export async function stage1ResultToXlsx(
  headers: string[],
  rows: Record<string, string>[],
  selected: number[],
  opts?: Stage1CsvOptions,
): Promise<Stage1XlsxResult> {
  const XLSX = await import('xlsx');
  const includeGezogen = opts?.includeGezogenColumn === true;
  const warnings: string[] = [];

  let outHeaders = [...headers];
  let gezogenHeader: string | null = null;

  if (includeGezogen) {
    gezogenHeader = 'gezogen';
    if (headers.includes('gezogen')) {
      gezogenHeader = 'gezogen_2';
      warnings.push("Spalte 'gezogen' existiert bereits, neue Spalte als 'gezogen_2' angehängt.");
    }
    outHeaders = [...headers, gezogenHeader];
  }

  // Build 2D array — header row + selected data rows. We only emit selected
  // rows here (matches stage1ResultToCsv); the gezogen column is therefore
  // always 'true' for emitted rows. The mechanism is in place for a future
  // option that emits all rows tagged true/false.
  const aoa: string[][] = [outHeaders];
  for (const idx of selected) {
    const row = rows[idx];
    if (row === undefined) continue;
    const cells = headers.map((h) => row[h] ?? '');
    if (includeGezogen) cells.push('true');
    aoa.push(cells);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, 'Versand');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return { buffer, warnings };
}
