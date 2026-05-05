import { describe, it, expect } from 'vitest';
import { parseXlsxBuffer } from '../../src/import/parse-xlsx';

// Build a synthetic .xlsx ArrayBuffer via SheetJS itself, lazily imported per
// test helper. We assert against the buffer-form of the parser; parseXlsxFile
// is a thin wrapper that just calls file.arrayBuffer() and forwards.
//
// jsdom's File doesn't implement arrayBuffer(), so testing the wrapper would
// add a polyfill dependency for no extra coverage.
async function makeXlsxBuffer(
  rows: unknown[][],
  sheetName = 'Tabelle1',
  extraSheets?: Record<string, unknown[][]>,
  opts?: { addFormulaCell?: boolean },
): Promise<ArrayBuffer> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  if (opts?.addFormulaCell) {
    // Inject a formula cell at B2 so the formula-detection branch fires.
    // Cached value '99' lives in 'v'; SheetJS surfaces that on read.
    (ws as Record<string, unknown>)['B2'] = { t: 'n', v: 99, f: '=A2*1' };
  }
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  if (extraSheets) {
    for (const [name, r] of Object.entries(extraSheets)) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(r), name);
    }
  }
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

describe('parseXlsxBuffer', () => {
  it('parses a simple xlsx with headers + 2 rows', async () => {
    const buf = await makeXlsxBuffer([
      ['person_id', 'gender', 'age_band'],
      ['p01', 'female', '25-34'],
      ['p02', 'male', '55-64'],
    ]);
    const r = await parseXlsxBuffer(buf);
    expect(r.format).toBe('xlsx');
    expect(r.headers).toEqual(['person_id', 'gender', 'age_band']);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toEqual({ person_id: 'p01', gender: 'female', age_band: '25-34' });
    expect(r.warnings).toEqual([]);
    expect(r.sheetName).toBe('Tabelle1');
    expect(r.sheetCount).toBe(1);
  });

  it('warns when multiple worksheets are present', async () => {
    const buf = await makeXlsxBuffer(
      [
        ['a', 'b'],
        ['1', '2'],
      ],
      'First',
      { Second: [['x'], ['y']] },
    );
    const r = await parseXlsxBuffer(buf);
    expect(r.sheetCount).toBe(2);
    expect(r.sheetName).toBe('First');
    expect(r.warnings.some((w) => /2 Worksheets/.test(w))).toBe(true);
    // Only first sheet's rows are parsed.
    expect(r.rows).toEqual([{ a: '1', b: '2' }]);
  });

  it('converts Date cells to ISO 8601 (YYYY-MM-DD)', async () => {
    const buf = await makeXlsxBuffer([
      ['name', 'birthdate'],
      ['Alice', new Date(1990, 5, 15)],
    ]);
    const r = await parseXlsxBuffer(buf);
    expect(r.rows[0]).toEqual({ name: 'Alice', birthdate: '1990-06-15' });
  });

  it('converts Number cells to plain string without .0 suffix', async () => {
    const buf = await makeXlsxBuffer([
      ['name', 'year'],
      ['Bob', 2024],
    ]);
    const r = await parseXlsxBuffer(buf);
    expect(r.rows[0]).toEqual({ name: 'Bob', year: '2024' });
  });

  it('drops empty trailing rows', async () => {
    const buf = await makeXlsxBuffer([
      ['a'],
      ['x1'],
      ['x2'],
      ['x3'],
      [''],
      [''],
      [''],
    ]);
    const r = await parseXlsxBuffer(buf);
    expect(r.rows).toHaveLength(3);
    expect(r.rows.map((row) => row.a)).toEqual(['x1', 'x2', 'x3']);
  });

  it('throws on empty header cell', async () => {
    const buf = await makeXlsxBuffer([
      ['name', '', 'age'],
      ['x', 'y', '30'],
    ]);
    await expect(parseXlsxBuffer(buf)).rejects.toThrow(/Header.*leer/i);
  });

  // Note (per Plan Task 4 Case 7): the SheetNames.length === 0 branch in
  // parseXlsxBuffer is defensive — SheetJS XLSX.write throws 'Workbook is
  // empty' when serializing a 0-sheet workbook, so we cannot construct a
  // real xlsx buffer that would trigger the branch. The branch is preserved
  // in production code as a guard against unusual third-party-generated
  // .xlsx files; it is not testable from the public surface.

  it('warns when cells contain formulas', async () => {
    const buf = await makeXlsxBuffer(
      [
        ['name', 'value'],
        ['x', 1],
      ],
      'Tabelle1',
      undefined,
      { addFormulaCell: true },
    );
    const r = await parseXlsxBuffer(buf);
    expect(r.warnings.some((w) => /Zellen.*Formeln/.test(w))).toBe(true);
  });

  it('throws on a buffer that looks like a ZIP but is not a valid xlsx', async () => {
    // SheetJS is intentionally permissive: short binary inputs and HTML-like
    // strings are coerced into empty CSVs. The reliable way to drive the
    // catch-and-rethrow branch is a buffer that starts with the ZIP magic
    // (PK\x03\x04) — SheetJS commits to ZIP-parsing, finds no central
    // directory, and throws. This represents real-world corruption: a
    // truncated or partial-download .xlsx upload.
    const zipMagicCorrupt = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, // ZIP local file header signature
      0x14, 0x00, 0x00, 0x00, // version, flags
      0x00, 0x00, 0x00, 0x00, // compression, mtime
      0x00, 0x00, 0x00, 0x00, // crc32
      0x01, 0x00, 0x00, 0x00, // compressed size
      0x01, 0x00, 0x00, 0x00, // uncompressed size
      0x01, 0x00, 0x00, 0x00, // filename + extra length
      0x78, // 'x' filename, then truncated
    ]).buffer as ArrayBuffer;
    await expect(parseXlsxBuffer(zipMagicCorrupt)).rejects.toThrow(
      /sieht nicht wie.*Excel/i,
    );
    // Note: password-protected files take the same try/catch branch but
    // require an encrypted fixture to test. Coverage here proves the catch
    // path; the exact German message-routing is exercised by reading the
    // implementation.
  });

  it('derives altersgruppe from geburtsjahr when present', async () => {
    const buf = await makeXlsxBuffer([
      ['person_id', 'geburtsjahr'],
      ['p01', 1980],
      ['p02', 1995],
      ['p03', 2010],
    ]);
    const refYear = 2025;
    const r = await parseXlsxBuffer(buf, refYear);
    expect(r.derivedColumns).toContain('altersgruppe');
    expect(r.headers).toContain('altersgruppe');
    // 1980 → 45, falls in 45-64; 1995 → 30, falls in 25-44; 2010 → 15, falls in unter-16.
    expect(r.rows[0]!.altersgruppe).toBe('45-64');
    expect(r.rows[1]!.altersgruppe).toBe('25-44');
    expect(r.rows[2]!.altersgruppe).toBe('unter-16');
  });
});
