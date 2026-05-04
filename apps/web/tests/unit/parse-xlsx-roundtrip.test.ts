import { describe, it, expect } from 'vitest';
import { stage1ResultToXlsx } from '@sortition/core';
import { parseXlsxBuffer } from '../../src/csv/parse-xlsx';

// Round-trip proves Acceptance-Criteria #91: every generated export file is
// re-importable via the upload path. We synthesize a Stage 1 result, write
// it to xlsx via stage1ResultToXlsx, then parse the buffer with the import-
// path parseXlsxBuffer. Headers, row counts, row contents and the optional
// 'gezogen' column must all survive the round trip intact.

describe('xlsx round-trip: stage1ResultToXlsx -> parseXlsxBuffer', () => {
  const headers = ['person_id', 'gender', 'age_band', 'district'];
  const rows = [
    { person_id: 'p1', gender: 'm', age_band: '30-44', district: 'A' },
    { person_id: 'p2', gender: 'w', age_band: '45-59', district: 'B' },
    { person_id: 'p3', gender: 'd', age_band: '18-29', district: 'A' },
    { person_id: 'p4', gender: 'm', age_band: '60+', district: 'C' },
  ];

  it('round-trips selected rows with headers preserved', async () => {
    const selected = [0, 2];
    const { buffer } = await stage1ResultToXlsx(headers, rows, selected);
    const parsed = await parseXlsxBuffer(buffer);

    expect(parsed.format).toBe('xlsx');
    expect(parsed.headers).toEqual(headers);
    expect(parsed.rows).toHaveLength(selected.length);
    expect(parsed.rows[0]).toEqual(rows[0]);
    expect(parsed.rows[1]).toEqual(rows[2]);
  });

  it("round-trips with includeGezogenColumn — every emitted row carries gezogen='true'", async () => {
    const selected = [1, 3];
    const { buffer } = await stage1ResultToXlsx(headers, rows, selected, {
      includeGezogenColumn: true,
    });
    const parsed = await parseXlsxBuffer(buffer);

    expect(parsed.headers).toEqual([...headers, 'gezogen']);
    expect(parsed.rows).toHaveLength(2);
    for (const row of parsed.rows) {
      expect(row.gezogen).toBe('true');
    }
    // Spot-check that the original columns survived alongside gezogen.
    expect(parsed.rows[0]).toMatchObject(rows[1]!);
    expect(parsed.rows[1]).toMatchObject(rows[3]!);
  });

  it('round-trips an empty selection — header row only, no data', async () => {
    const { buffer } = await stage1ResultToXlsx(headers, rows, []);
    const parsed = await parseXlsxBuffer(buffer);

    expect(parsed.headers).toEqual(headers);
    expect(parsed.rows).toHaveLength(0);
  });

  it('round-trips special characters (quotes, semicolons, newlines)', async () => {
    const trickyHeaders = ['person_id', 'note'];
    const trickyRows = [
      { person_id: 'p1', note: 'has "quotes"' },
      { person_id: 'p2', note: 'has;semicolons,and,commas' },
      { person_id: 'p3', note: 'has\nnewline' },
    ];
    const { buffer } = await stage1ResultToXlsx(trickyHeaders, trickyRows, [0, 1, 2]);
    const parsed = await parseXlsxBuffer(buffer);

    expect(parsed.rows[0]?.note).toBe('has "quotes"');
    expect(parsed.rows[1]?.note).toBe('has;semicolons,and,commas');
    expect(parsed.rows[2]?.note).toBe('has\nnewline');
  });
});
