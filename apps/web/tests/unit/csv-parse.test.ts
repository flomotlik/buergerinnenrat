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
  it('ignores unknown headers', () => {
    const m = autoGuessMapping(['xyzzy']);
    expect(m['xyzzy']).toBe('__ignore__');
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
