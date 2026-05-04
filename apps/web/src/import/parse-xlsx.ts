// XLSX parsing via SheetJS Community Edition.
//
// SheetJS is loaded lazily via dynamic import so the ~430 KB chunk only ships
// to users who actually open an .xlsx file — CSV-only users pay nothing.
// Top-level `import * as XLSX from 'xlsx'` is forbidden here (cf. CONTEXT.md
// "Lazy-load via await import('xlsx') ist Pflicht") because Vite would then
// pull SheetJS into the main bundle synchronously.

import type { ParsedTable } from './parse-csv';
import { DEFAULT_AGE_BANDS, deriveAltersgruppe } from './derive';

// Loose typings for SheetJS interop without forcing a top-level type-import
// from 'xlsx'. We narrow only the surface we touch.
interface XlsxCell {
  // 'f' marks a formula cell — SheetJS surfaces the cached value otherwise.
  f?: string;
  v?: unknown;
  t?: string;
}

interface XlsxWorkbook {
  SheetNames: string[];
  Sheets: Record<string, Record<string, unknown>>;
}

function isCellObject(v: unknown): v is XlsxCell {
  return typeof v === 'object' && v !== null;
}

function convertCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    // Date-only ISO 8601 (YYYY-MM-DD) — compatible with derive.ts geburtsjahr.
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    // String() avoids the .0 suffix that toFixed() would add for integers.
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'string') {
    return value;
  }
  return String(value);
}

export async function parseXlsxFile(file: File, refYear?: number): Promise<ParsedTable> {
  const buf = await file.arrayBuffer();
  return parseXlsxBuffer(buf, refYear);
}

export async function parseXlsxBuffer(buf: ArrayBuffer, refYear?: number): Promise<ParsedTable> {
  // Lazy import — SheetJS chunk ships only when this function is actually
  // called (i.e. user uploaded .xlsx).
  const XLSX = await import('xlsx');

  let wb: XlsxWorkbook;
  try {
    wb = XLSX.read(buf, { type: 'array', cellDates: true }) as unknown as XlsxWorkbook;
  } catch (e) {
    const msg = e instanceof Error ? e.message.toLowerCase() : '';
    // SheetJS throws different exceptions for password-protected vs malformed
    // files; we surface clearer German messages either way.
    if (msg.includes('password') || msg.includes('encrypt')) {
      throw new Error(
        'Datei ist passwortgeschützt. Bitte ohne Verschlüsselung speichern und erneut versuchen.',
      );
    }
    throw new Error(
      'Datei sieht nicht wie eine gültige Excel-Datei aus. Bitte als .csv speichern oder Datei prüfen.',
    );
  }

  const sheetCount = wb.SheetNames.length;
  if (sheetCount === 0) {
    throw new Error('Excel-Datei enthält keine Worksheets.');
  }

  const sheetName = wb.SheetNames[0]!;
  const ws = wb.Sheets[sheetName]!;

  const warnings: string[] = [];
  if (sheetCount > 1) {
    warnings.push(
      `Datei enthält ${sheetCount} Worksheets, nur das erste ('${sheetName}') wurde importiert.`,
    );
  }

  // Formula-cell detection — count cells that carry an 'f' property. SheetJS
  // already surfaces the cached value for these; we just warn the user that
  // formulas were not re-evaluated.
  let formulaCount = 0;
  for (const cell of Object.values(ws)) {
    if (isCellObject(cell) && 'f' in cell) formulaCount++;
  }
  if (formulaCount > 0) {
    warnings.push(
      `${formulaCount} Zellen enthielten Formeln. Es wurden die zuletzt berechneten Werte verwendet.`,
    );
  }

  // 2D-array form — header: 1 returns rows as arrays, raw: true gives raw
  // typed values (Date / number / string / boolean) which we then convert
  // ourselves in convertCell. Without raw: true, SheetJS would format dates
  // via the cell's number-format string (e.g. '6/15/90'), losing ISO 8601.
  // defval ensures missing cells become empty string, blankrows: false drops
  // empty trailing rows that Excel often appends.
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: true,
    defval: '',
    blankrows: false,
  });

  if (aoa.length === 0) {
    return {
      format: 'xlsx',
      headers: [],
      rows: [],
      warnings,
      derivedColumns: [],
      sheetName,
      sheetCount,
    };
  }

  const headerRow = aoa[0] ?? [];
  const headers: string[] = [];
  for (let i = 0; i < headerRow.length; i++) {
    const cell = headerRow[i];
    const text = convertCell(cell).trim();
    if (text.length === 0) {
      throw new Error(
        `Header-Zeile enthält leere Zellen (Spalte ${i + 1}). Bitte ergänzen oder entfernen.`,
      );
    }
    headers.push(text);
  }

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const dataRow = aoa[r] ?? [];
    const out: Record<string, string> = {};
    let anyValue = false;
    for (let c = 0; c < headers.length; c++) {
      const text = convertCell(dataRow[c]);
      out[headers[c]!] = text;
      if (text.length > 0) anyValue = true;
    }
    // Defensive: drop rows that came back fully empty even after blankrows:false.
    if (anyValue) rows.push(out);
  }

  // Derive altersgruppe from geburtsjahr when present and not already supplied.
  // Mirror parse.ts (CSV path) behavior for parity.
  const lowerHeaders = headers.map((h) => h.trim().toLowerCase());
  const hasGeburtsjahr = lowerHeaders.includes('geburtsjahr');
  const hasAltersgruppe = lowerHeaders.includes('altersgruppe');
  const derivedColumns: string[] = [];

  if (hasGeburtsjahr && !hasAltersgruppe) {
    const refYearResolved = refYear ?? new Date().getFullYear();
    for (const row of rows) {
      const label = deriveAltersgruppe(row.geburtsjahr ?? '', refYearResolved, DEFAULT_AGE_BANDS);
      row.altersgruppe = label ?? '';
    }
    headers.push('altersgruppe');
    derivedColumns.push('altersgruppe');
  } else if (hasGeburtsjahr && hasAltersgruppe) {
    warnings.push(
      "Datei enthält bereits 'altersgruppe' — keine automatische Berechnung aus geburtsjahr.",
    );
  }

  return {
    format: 'xlsx',
    headers,
    rows,
    warnings,
    derivedColumns,
    sheetName,
    sheetCount,
  };
}
