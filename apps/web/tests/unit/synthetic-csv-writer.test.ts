// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  STAGE1_HEADERS,
  STAGE3_HEADERS,
  writeCsv,
} from '../../../../scripts/synthetic-meldedaten/csv-writer';
import { parseCsvBuffer } from '../../src/import/parse-csv';
import type { Person } from '../../../../scripts/synthetic-meldedaten/types';

function p(over: Partial<Person> = {}): Person {
  return {
    person_id: 't-00001',
    vorname: 'Anna',
    nachname: 'Müller',
    geburtsjahr: 1990,
    geschlecht: 'weiblich',
    staatsbuergerschaft: 'AT',
    sprengel: 'S1',
    katastralgemeinde: 'kg1',
    haushaltsnummer: 'h1',
    ...over,
  };
}

describe('writeCsv', () => {
  it('header line equals STAGE1_HEADERS.join(",")', () => {
    const csv = writeCsv([p()]);
    expect(csv.split('\n')[0]).toBe(STAGE1_HEADERS.join(','));
  });

  it('quotes fields that contain a comma', () => {
    const csv = writeCsv([p({ nachname: 'von der Vogelweide, Walther' })]);
    expect(csv).toContain('"von der Vogelweide, Walther"');
  });

  it('quotes fields that contain a quote and doubles inner quotes', () => {
    const csv = writeCsv([p({ nachname: 'Mc"Donald' })]);
    expect(csv).toContain('"Mc""Donald"');
  });

  it('preserves Diakritika unchanged', () => {
    const csv = writeCsv([
      p({ vorname: 'Şahin', nachname: 'Đorđević' }),
    ]);
    expect(csv).toContain('Şahin');
    expect(csv).toContain('Đorđević');
  });

  it('emits UTF-8 BOM when options.bom is true', () => {
    const csv = writeCsv([p()], { bom: true });
    const bytes = new TextEncoder().encode(csv);
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
  });

  it('roundtrip: writeCsv → parseCsvBuffer recovers identical data', () => {
    const persons: Person[] = [
      p({ person_id: 'a-00001', vorname: 'Anna', nachname: 'Müller' }),
      p({ person_id: 'a-00002', vorname: 'Şahin', nachname: 'Yılmaz', geschlecht: 'maennlich' }),
      p({ person_id: 'a-00003', vorname: 'Đorđe', nachname: 'Petrović', geschlecht: 'maennlich' }),
    ];
    const csv = writeCsv(persons);
    const buf = new TextEncoder().encode(csv).buffer as ArrayBuffer;
    const parsed = parseCsvBuffer(buf);
    // Issue #62: parseCsvBuffer derives an `altersgruppe` column when
    // `geburtsjahr` is present. The first N headers still match
    // STAGE1_HEADERS one-for-one — derived column comes after.
    expect(parsed.headers.slice(0, STAGE1_HEADERS.length)).toEqual([...STAGE1_HEADERS]);
    expect(parsed.headers[STAGE1_HEADERS.length]).toBe('altersgruppe');
    expect(parsed.rows).toHaveLength(3);
    const ids = parsed.rows.map((r) => r['person_id']).sort();
    expect(ids).toEqual(['a-00001', 'a-00002', 'a-00003']);
    const sahin = parsed.rows.find((r) => r['person_id'] === 'a-00002');
    expect(sahin?.['vorname']).toBe('Şahin');
    expect(sahin?.['nachname']).toBe('Yılmaz');
  });

  it('Stage 3 variant adds bildung + migrationshintergrund as last two columns', () => {
    const persons = [
      p({
        person_id: 'a-00001',
        bildung: 'matura',
        migrationshintergrund: 'keiner',
      }),
    ];
    const csv = writeCsv(persons, { extraFields: 'self-report' });
    const lines = csv.split('\n');
    expect(lines[0]).toBe(STAGE3_HEADERS.join(','));
    // Stage 1 header order is preserved as a prefix.
    for (let i = 0; i < STAGE1_HEADERS.length; i++) {
      expect(STAGE3_HEADERS[i]).toBe(STAGE1_HEADERS[i]);
    }
    expect(lines[1]).toContain(',matura,keiner');
  });

  it('is deterministic for identical input', () => {
    const persons = [
      p({ person_id: 'a-00002' }),
      p({ person_id: 'a-00001' }),
    ];
    const a = writeCsv(persons);
    const b = writeCsv(persons);
    expect(a).toBe(b);
    // Sort by person_id stable: 00001 must come first.
    const lines = a.split('\n');
    expect(lines[1]).toContain('a-00001');
    expect(lines[2]).toContain('a-00002');
  });
});
