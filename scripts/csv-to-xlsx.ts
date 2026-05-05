#!/usr/bin/env tsx
/*
 * csv-to-xlsx.ts — convert all CSV files in apps/web/public/beispiele/ to a
 * parallel .xlsx variant.
 *
 * Modes:
 *   pnpm tsx scripts/csv-to-xlsx.ts          # write/update .xlsx files
 *   pnpm tsx scripts/csv-to-xlsx.ts --check  # verify .xlsx are in sync; exit 1 on drift
 *
 * --check mode rationale: SheetJS xlsx output is NOT byte-deterministic
 * (ZIP timestamps, random internal IDs), so we cannot byte-diff. Instead
 * we re-parse the existing .xlsx via XLSX.read + sheet_to_json and compare
 * the normalized 2D-array against the one derived from the CSV. Mismatch →
 * exit 1 with row/col diff.
 *
 * CLI output is German for parity with other scripts; doc comments / log
 * tags in English.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const BEISPIELE_DIR = 'apps/web/public/beispiele';

interface ConversionTarget {
  csvPath: string;
  xlsxPath: string;
  baseName: string;
}

function findCsvFiles(): ConversionTarget[] {
  const targets: ConversionTarget[] = [];
  const entries = readdirSync(BEISPIELE_DIR);
  for (const entry of entries) {
    if (!entry.endsWith('.csv')) continue;
    const csvPath = join(BEISPIELE_DIR, entry);
    const baseName = entry.slice(0, -'.csv'.length);
    const xlsxPath = join(BEISPIELE_DIR, `${baseName}.xlsx`);
    targets.push({ csvPath, xlsxPath, baseName });
  }
  return targets.sort((a, b) => a.csvPath.localeCompare(b.csvPath));
}

function detectSeparator(headerLine: string): ',' | ';' | '\t' {
  const counts: Record<',' | ';' | '\t', number> = {
    ',': (headerLine.match(/,/g) ?? []).length,
    ';': (headerLine.match(/;/g) ?? []).length,
    '\t': (headerLine.match(/\t/g) ?? []).length,
  };
  let best: ',' | ';' | '\t' = ',';
  let bestCount = -1;
  for (const sep of [',', ';', '\t'] as const) {
    if (counts[sep] > bestCount) {
      best = sep;
      bestCount = counts[sep];
    }
  }
  return best;
}

function readCsvAs2dArray(csvPath: string): string[][] {
  const text = readFileSync(csvPath, 'utf-8');
  const stripped = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const firstNewline = stripped.indexOf('\n');
  const headerLine = firstNewline < 0 ? stripped : stripped.slice(0, firstNewline);
  const separator = detectSeparator(headerLine);
  const result = Papa.parse<string[]>(stripped, {
    header: false,
    skipEmptyLines: 'greedy',
    delimiter: separator,
  });
  // Cells normalized to plain strings (CSV is the source of truth, no types).
  return result.data.map((row) => row.map((cell) => String(cell ?? '').trim()));
}

function readXlsxAs2dArray(xlsxPath: string): string[][] {
  const buf = readFileSync(xlsxPath);
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  if (wb.SheetNames.length === 0) return [];
  const ws = wb.Sheets[wb.SheetNames[0]!]!;
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: true,
    defval: '',
    blankrows: false,
  });
  // Normalize cells the same way parse-xlsx.ts does for upload-time symmetry.
  return aoa.map((row) =>
    row.map((cell) => {
      if (cell === null || cell === undefined) return '';
      if (cell instanceof Date) return cell.toISOString().slice(0, 10);
      if (typeof cell === 'number') return String(cell);
      if (typeof cell === 'boolean') return cell ? 'true' : 'false';
      return String(cell);
    }),
  );
}

function writeXlsx(rows: string[][], xlsxPath: string, sheetName = 'Tabelle1'): void {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, xlsxPath, { bookType: 'xlsx' });
}

function arraysEqual(a: string[][], b: string[][]): { ok: true } | { ok: false; reason: string } {
  if (a.length !== b.length) {
    return { ok: false, reason: `row count differs: ${a.length} vs ${b.length}` };
  }
  for (let r = 0; r < a.length; r++) {
    const ar = a[r]!;
    const br = b[r]!;
    if (ar.length !== br.length) {
      return { ok: false, reason: `row ${r}: column count differs: ${ar.length} vs ${br.length}` };
    }
    for (let c = 0; c < ar.length; c++) {
      if (ar[c] !== br[c]) {
        return {
          ok: false,
          reason: `row ${r} col ${c}: '${ar[c]}' vs '${br[c]}'`,
        };
      }
    }
  }
  return { ok: true };
}

function main(): void {
  const checkMode = process.argv.includes('--check');
  const targets = findCsvFiles();
  if (targets.length === 0) {
    console.error(`Keine CSV-Dateien in ${BEISPIELE_DIR}/ gefunden.`);
    process.exit(1);
  }

  let exitCode = 0;
  for (const t of targets) {
    const csvRows = readCsvAs2dArray(t.csvPath);
    if (checkMode) {
      if (!existsSync(t.xlsxPath)) {
        console.error(
          `[FEHLER] ${basename(t.xlsxPath)} fehlt — bitte 'pnpm tsx scripts/csv-to-xlsx.ts' ausführen.`,
        );
        exitCode = 1;
        continue;
      }
      const xlsxRows = readXlsxAs2dArray(t.xlsxPath);
      const cmp = arraysEqual(csvRows, xlsxRows);
      if (!cmp.ok) {
        console.error(
          `[DRIFT] ${basename(t.xlsxPath)} weicht von ${basename(t.csvPath)} ab: ${cmp.reason}`,
        );
        exitCode = 1;
      } else {
        console.log(`[OK]    ${basename(t.xlsxPath)} synchron mit ${basename(t.csvPath)}`);
      }
    } else {
      writeXlsx(csvRows, t.xlsxPath);
      console.log(
        `[SCHREIBEN] ${basename(t.xlsxPath)} (${csvRows.length} Zeilen, aus ${basename(t.csvPath)})`,
      );
    }
  }

  if (checkMode && exitCode === 0) {
    console.log(`\nAlle ${targets.length} Excel-Beispiele synchron mit CSV-Quellen.`);
  }
  process.exit(exitCode);
}

main();
