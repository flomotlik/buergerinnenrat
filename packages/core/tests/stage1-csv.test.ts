import { describe, it, expect } from 'vitest';
import { rfc4180Quote, stage1ResultToCsv } from '../src';

// ---------------------------------------------------------------------------
// Local minimal RFC-4180 parser used for round-trip verification only.
// We do not import papaparse here because @sortition/core does not depend on
// the web layer. The parser is intentionally narrow: comma-separated, optional
// CRLF/LF line endings, double-quote quoting with `""` escape.
// ---------------------------------------------------------------------------
function parseCsvMinimal(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      i++;
      continue;
    }
    if (ch === '\r' && text[i + 1] === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i += 2;
      continue;
    }
    if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
      continue;
    }
    cell += ch;
    i++;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

describe('rfc4180Quote', () => {
  it('leaves plain values unquoted', () => {
    expect(rfc4180Quote('plain')).toBe('plain');
    expect(rfc4180Quote('123')).toBe('123');
    expect(rfc4180Quote('')).toBe('');
  });

  it('quotes values containing a comma', () => {
    expect(rfc4180Quote('a,b')).toBe('"a,b"');
  });

  it('quotes values containing a semicolon', () => {
    // Semicolon is the de-Excel default separator — protect downstream tools.
    expect(rfc4180Quote('a;b')).toBe('"a;b"');
  });

  it('quotes values containing a double-quote and escapes it', () => {
    expect(rfc4180Quote('she said "hi"')).toBe('"she said ""hi"""');
  });

  it('quotes values containing newlines', () => {
    expect(rfc4180Quote('line1\nline2')).toBe('"line1\nline2"');
    expect(rfc4180Quote('line1\r\nline2')).toBe('"line1\r\nline2"');
  });
});

describe('stage1ResultToCsv', () => {
  it('preserves all original headers in original order', () => {
    const headers = ['person_id', 'gender', 'age_band', 'district', 'extra'];
    const rows = [
      { person_id: '1', gender: 'female', age_band: '25-34', district: 'd1', extra: 'x' },
      { person_id: '2', gender: 'male', age_band: '35-44', district: 'd2', extra: 'y' },
    ];
    const { csv, warnings } = stage1ResultToCsv(headers, rows, [0, 1]);
    expect(warnings).toEqual([]);
    const parsed = parseCsvMinimal(csv);
    expect(parsed[0]).toEqual(headers);
    expect(parsed[1]).toEqual(['1', 'female', '25-34', 'd1', 'x']);
  });

  it('outputs rows in selected[] order (not original-row order)', () => {
    const headers = ['person_id'];
    const rows = [
      { person_id: 'a' },
      { person_id: 'b' },
      { person_id: 'c' },
      { person_id: 'd' },
    ];
    const { csv } = stage1ResultToCsv(headers, rows, [3, 0, 2]);
    const parsed = parseCsvMinimal(csv);
    expect(parsed.slice(1).map((r) => r[0])).toEqual(['d', 'a', 'c']);
  });

  it('quotes fields containing comma, quote, or newline per RFC-4180', () => {
    const headers = ['person_id', 'district', 'name', 'address'];
    const rows = [
      {
        person_id: '1',
        district: 'Hamburg-Mitte, Innen',
        name: 'Anna "die Große" Müller',
        address: 'Musterweg 5\nD-12345 Stadt',
      },
    ];
    const { csv } = stage1ResultToCsv(headers, rows, [0]);
    const parsed = parseCsvMinimal(csv);
    expect(parsed[1]).toEqual([
      '1',
      'Hamburg-Mitte, Innen',
      'Anna "die Große" Müller',
      'Musterweg 5\nD-12345 Stadt',
    ]);
  });

  it('round-trips through the minimal parser preserving cell values', () => {
    const headers = ['a', 'b', 'c'];
    const rows = [
      { a: 'x,y', b: '"q"', c: 'plain' },
      { a: 'line\nbreak', b: '', c: 'utf-8 äöü' },
    ];
    const { csv } = stage1ResultToCsv(headers, rows, [0, 1]);
    const parsed = parseCsvMinimal(csv);
    expect(parsed[0]).toEqual(headers);
    expect(parsed[1]).toEqual(['x,y', '"q"', 'plain']);
    expect(parsed[2]).toEqual(['line\nbreak', '', 'utf-8 äöü']);
  });

  it('uses CRLF line endings (RFC-4180 default)', () => {
    const headers = ['a'];
    const rows = [{ a: '1' }, { a: '2' }];
    const { csv } = stage1ResultToCsv(headers, rows, [0, 1]);
    expect(csv).toBe('a\r\n1\r\n2\r\n');
  });

  it('appends gezogen column when option enabled and no conflict', () => {
    const headers = ['person_id', 'district'];
    const rows = [{ person_id: '1', district: 'a' }];
    const { csv, warnings } = stage1ResultToCsv(headers, rows, [0], {
      includeGezogenColumn: true,
    });
    expect(warnings).toEqual([]);
    const parsed = parseCsvMinimal(csv);
    expect(parsed[0]).toEqual(['person_id', 'district', 'gezogen']);
    expect(parsed[1]).toEqual(['1', 'a', 'true']);
  });

  it('renames gezogen column to gezogen_2 on conflict and adds warning', () => {
    const headers = ['person_id', 'gezogen'];
    const rows = [{ person_id: '1', gezogen: 'pre-existing-value' }];
    const { csv, warnings } = stage1ResultToCsv(headers, rows, [0], {
      includeGezogenColumn: true,
    });
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/gezogen_2/);
    const parsed = parseCsvMinimal(csv);
    expect(parsed[0]).toEqual(['person_id', 'gezogen', 'gezogen_2']);
    expect(parsed[1]).toEqual(['1', 'pre-existing-value', 'true']);
  });

  it('produces no rows for empty selected[]', () => {
    const headers = ['a'];
    const rows = [{ a: '1' }];
    const { csv } = stage1ResultToCsv(headers, rows, []);
    expect(csv).toBe('a\r\n');
  });

  it('handles missing field on a row by emitting empty string', () => {
    const headers = ['a', 'b'];
    const rows = [{ a: '1' }] as Record<string, string>[];
    const { csv } = stage1ResultToCsv(headers, rows, [0]);
    const parsed = parseCsvMinimal(csv);
    expect(parsed[1]).toEqual(['1', '']);
  });
});
