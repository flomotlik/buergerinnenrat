import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { stage1ResultToXlsx } from '../src/stage1/xlsx-export';

// Round-trip helper: reads a buffer back via SheetJS and returns the
// normalized 2D array (header row first, data rows after) so we can assert
// against the original input shape without dealing with SheetJS WorkSheet
// internals.
function readBuffer(buffer: ArrayBuffer): string[][] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  expect(wb.SheetNames).toContain('Versand');
  const ws = wb.Sheets['Versand']!;
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  return aoa.map((row) => row.map((c) => String(c ?? '')));
}

describe('stage1ResultToXlsx', () => {
  const headers = ['person_id', 'gender', 'age_band'];
  const rows: Record<string, string>[] = [
    { person_id: 'p01', gender: 'female', age_band: '25-34' },
    { person_id: 'p02', gender: 'male', age_band: '55-64' },
    { person_id: 'p03', gender: 'female', age_band: '35-44' },
  ];

  it('round-trips a basic selection through SheetJS', async () => {
    const { buffer, warnings } = await stage1ResultToXlsx(headers, rows, [0, 2]);
    expect(warnings).toEqual([]);
    const aoa = readBuffer(buffer);
    expect(aoa[0]).toEqual(headers);
    expect(aoa[1]).toEqual(['p01', 'female', '25-34']);
    expect(aoa[2]).toEqual(['p03', 'female', '35-44']);
    expect(aoa).toHaveLength(3);
  });

  it("appends a 'gezogen' column tagged 'true' for every selected row", async () => {
    const { buffer } = await stage1ResultToXlsx(headers, rows, [0], {
      includeGezogenColumn: true,
    });
    const aoa = readBuffer(buffer);
    expect(aoa[0]).toEqual([...headers, 'gezogen']);
    expect(aoa[1]).toEqual(['p01', 'female', '25-34', 'true']);
  });

  it('escapes special characters via SheetJS without losing fidelity', async () => {
    const tricky: Record<string, string>[] = [
      { person_id: 'p01', name: '"quoted, comma; semi\nnewline' },
    ];
    const trickyHeaders = ['person_id', 'name'];
    const { buffer } = await stage1ResultToXlsx(trickyHeaders, tricky, [0]);
    const aoa = readBuffer(buffer);
    expect(aoa[1]).toEqual(['p01', '"quoted, comma; semi\nnewline']);
  });

  it('emits header-only buffer when nothing is selected', async () => {
    const { buffer } = await stage1ResultToXlsx(headers, rows, [], {
      includeGezogenColumn: true,
    });
    const aoa = readBuffer(buffer);
    expect(aoa[0]).toEqual([...headers, 'gezogen']);
    expect(aoa).toHaveLength(1);
  });

  it("renames the gezogen column to gezogen_2 when 'gezogen' already exists", async () => {
    const headersWithGezogen = ['person_id', 'gezogen'];
    const rowsWithGezogen: Record<string, string>[] = [{ person_id: 'p01', gezogen: 'orig' }];
    const { buffer, warnings } = await stage1ResultToXlsx(
      headersWithGezogen,
      rowsWithGezogen,
      [0],
      { includeGezogenColumn: true },
    );
    expect(warnings).toContain(
      "Spalte 'gezogen' existiert bereits, neue Spalte als 'gezogen_2' angehängt.",
    );
    const aoa = readBuffer(buffer);
    expect(aoa[0]).toEqual(['person_id', 'gezogen', 'gezogen_2']);
    expect(aoa[1]).toEqual(['p01', 'orig', 'true']);
  });
});
