import { describe, it, expect } from 'vitest';
import {
  parseCsvBuffer,
  autoGuessMapping,
  validateMapping,
  applyMapping,
} from '../../src/csv/parse';

function buf(s: string, enc: 'utf-8' | 'windows-1252' = 'utf-8'): ArrayBuffer {
  if (enc === 'utf-8') return new TextEncoder().encode(s).buffer as ArrayBuffer;
  // windows-1252 emulation: pack low-byte chars
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out.buffer;
}

describe('parseCsvBuffer', () => {
  it('parses comma-separated UTF-8', () => {
    const csv = 'person_id,gender,age_band\np01,female,25-34\np02,male,55-64\n';
    const r = parseCsvBuffer(buf(csv));
    expect(r.separator).toBe(',');
    expect(r.encoding).toBe('utf-8');
    expect(r.headers).toEqual(['person_id', 'gender', 'age_band']);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toEqual({ person_id: 'p01', gender: 'female', age_band: '25-34' });
  });

  it('parses semicolon-separated', () => {
    const csv = 'a;b;c\n1;2;3\n';
    const r = parseCsvBuffer(buf(csv));
    expect(r.separator).toBe(';');
    expect(r.headers).toEqual(['a', 'b', 'c']);
  });

  it('strips UTF-8 BOM', () => {
    const csv = '﻿person_id,gender\np01,female\n';
    const r = parseCsvBuffer(buf(csv));
    expect(r.headers[0]).toBe('person_id');
  });

  it('handles CRLF', () => {
    const csv = 'a,b\r\n1,2\r\n3,4\r\n';
    const r = parseCsvBuffer(buf(csv));
    expect(r.rows).toHaveLength(2);
  });

  it('falls back to windows-1252 for non-utf8 bytes', () => {
    // 0xE4 = ä in win-1252 / iso-8859-1
    const win1252 = new Uint8Array([
      0x6e, 0x61, 0x6d, 0x65, 0x0a, // "name\n"
      0x68, 0xe4, 0x6e, 0x73, 0x0a, // "häns\n"
    ]).buffer;
    const r = parseCsvBuffer(win1252);
    expect(r.encoding).toBe('windows-1252');
    expect(r.rows[0]?.['name']).toBe('häns');
  });
});

describe('autoGuessMapping', () => {
  it('maps known headers', () => {
    const m = autoGuessMapping(['person_id', 'Geschlecht', 'Alter', 'Bezirk']);
    expect(m['person_id']).toBe('person_id');
    expect(m['Geschlecht']).toBe('gender');
    expect(m['Alter']).toBe('age_band');
    expect(m['Bezirk']).toBe('district');
  });
  it('maps altersgruppe (derived) to age_band', () => {
    const m = autoGuessMapping(['altersgruppe']);
    expect(m['altersgruppe']).toBe('age_band');
  });
  it('ignores unknown headers', () => {
    const m = autoGuessMapping(['xyzzy']);
    expect(m['xyzzy']).toBe('__ignore__');
  });
});

describe('parseCsvBuffer — derive altersgruppe from geburtsjahr', () => {
  it('appends altersgruppe column when geburtsjahr is present', () => {
    const csv = 'person_id,geburtsjahr\np01,1990\np02,2020\np03,1955\n';
    const r = parseCsvBuffer(buf(csv), 2026);
    expect(r.headers).toEqual(['person_id', 'geburtsjahr', 'altersgruppe']);
    expect(r.derivedColumns).toEqual(['altersgruppe']);
    expect(r.rows[0]?.altersgruppe).toBe('25-44'); // 1990 → age 36
    expect(r.rows[1]?.altersgruppe).toBe('unter-16'); // 2020 → age 6
    expect(r.rows[2]?.altersgruppe).toBe('65+'); // 1955 → age 71
  });

  it('writes the correct band for an age-65 row', () => {
    // 2026 - 1961 = 65 → '65+'.
    const csv = 'person_id,geburtsjahr\np01,1961\n';
    const r = parseCsvBuffer(buf(csv), 2026);
    expect(r.rows[0]?.altersgruppe).toBe('65+');
  });

  it('leaves derivedColumns empty when geburtsjahr is missing', () => {
    const csv = 'person_id,gender\np01,female\n';
    const r = parseCsvBuffer(buf(csv), 2026);
    expect(r.derivedColumns).toEqual([]);
    expect(r.headers).toEqual(['person_id', 'gender']);
    expect(r.rows[0]).toEqual({ person_id: 'p01', gender: 'female' });
  });

  it('preserves an existing altersgruppe column and emits a warning', () => {
    const csv = 'person_id,geburtsjahr,altersgruppe\np01,1990,custom-band\n';
    const r = parseCsvBuffer(buf(csv), 2026);
    expect(r.derivedColumns).toEqual([]);
    expect(r.rows[0]?.altersgruppe).toBe('custom-band');
    expect(r.warnings.some((w) => w.includes('bereits'))).toBe(true);
  });

  it('uses current year as default refYear when none is passed', () => {
    // Use a birth year far in the past so the result is stable across years:
    // 1900 → 65+ regardless of current year.
    const csv = 'person_id,geburtsjahr\np01,1900\n';
    const r = parseCsvBuffer(buf(csv));
    expect(r.derivedColumns).toEqual(['altersgruppe']);
    expect(r.rows[0]?.altersgruppe).toBe('65+');
  });
});

describe('validateMapping', () => {
  it('flags missing person_id', () => {
    const v = validateMapping([{ a: '1' }], { a: '__ignore__' });
    expect(v.ok).toBe(false);
    expect(v.errors[0]).toContain('person_id');
  });
  it('detects duplicate ids', () => {
    const v = validateMapping(
      [{ id: 'p1' }, { id: 'p1' }, { id: 'p2' }],
      { id: 'person_id' },
    );
    expect(v.ok).toBe(false);
    expect(v.duplicate_person_ids).toEqual(['p1']);
  });
  it('passes a clean mapping', () => {
    const v = validateMapping([{ id: 'p1' }, { id: 'p2' }], { id: 'person_id' });
    expect(v.ok).toBe(true);
  });
});

describe('applyMapping', () => {
  it('renames columns and drops ignored', () => {
    const out = applyMapping(
      [{ ID: 'x', Junk: 'y', Geschlecht: 'female' }],
      { ID: 'person_id', Junk: '__ignore__', Geschlecht: 'gender' },
    );
    expect(out[0]).toEqual({ person_id: 'x', gender: 'female' });
  });
});
