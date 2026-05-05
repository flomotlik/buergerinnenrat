import { describe, it, expect } from 'vitest';
import {
  DEFAULT_AGE_BANDS,
  deriveAltersgruppe,
  recomputeAltersgruppe,
  validateBands,
  type AgeBand,
} from '../../src/import/derive';

describe('deriveAltersgruppe (refYear=2026)', () => {
  const refYear = 2026;
  const bands = DEFAULT_AGE_BANDS;

  it('maps a 2010-born to 16-24', () => {
    expect(deriveAltersgruppe('2010', refYear, bands)).toBe('16-24');
  });
  it('maps a 2024-born to unter-16', () => {
    expect(deriveAltersgruppe('2024', refYear, bands)).toBe('unter-16');
  });
  it('maps a 1940-born to 65+', () => {
    expect(deriveAltersgruppe('1940', refYear, bands)).toBe('65+');
  });
  it('maps a 1961-born (age 65) to 65+', () => {
    expect(deriveAltersgruppe('1961', refYear, bands)).toBe('65+');
  });
  it('maps a 1962-born (age 64) to 45-64', () => {
    expect(deriveAltersgruppe('1962', refYear, bands)).toBe('45-64');
  });
  it('returns null on empty/whitespace input', () => {
    expect(deriveAltersgruppe('', refYear, bands)).toBeNull();
    expect(deriveAltersgruppe('  ', refYear, bands)).toBeNull();
  });
  it('returns null on non-numeric input', () => {
    expect(deriveAltersgruppe('abc', refYear, bands)).toBeNull();
  });
  it('returns null on a future birth year', () => {
    expect(deriveAltersgruppe('2027', refYear, bands)).toBeNull();
  });
  it('returns null on a negative number', () => {
    expect(deriveAltersgruppe('-5', refYear, bands)).toBeNull();
  });
  it('returns null on a non-integer number', () => {
    expect(deriveAltersgruppe('2010.5', refYear, bands)).toBeNull();
  });

  it('honors a custom one-band configuration', () => {
    const single: AgeBand[] = [{ min: 0, max: 99, label: 'all', mode: 'selection' }];
    expect(deriveAltersgruppe('2000', refYear, single)).toBe('all');
  });
});

describe('validateBands', () => {
  it('accepts the default configuration', () => {
    expect(validateBands(DEFAULT_AGE_BANDS)).toBeNull();
  });
  it('rejects an empty configuration', () => {
    expect(validateBands([])).toMatch(/Mindestens ein Band/);
  });
  it('rejects a min > max band', () => {
    const bands: AgeBand[] = [{ min: 30, max: 20, label: 'x', mode: 'selection' }];
    expect(validateBands(bands)).toMatch(/min \(30\) darf nicht größer als max \(20\)/);
  });
  it('rejects out-of-range bounds', () => {
    const bands: AgeBand[] = [{ min: 0, max: 130, label: 'x', mode: 'selection' }];
    expect(validateBands(bands)).toMatch(/zwischen 0 und 120/);
  });
  it('rejects non-integer bounds', () => {
    const bands: AgeBand[] = [{ min: 0, max: 5.5, label: 'x', mode: 'selection' }];
    expect(validateBands(bands)).toMatch(/ganze Zahl/);
  });
  it('rejects descending bands', () => {
    const bands: AgeBand[] = [
      { min: 30, max: 39, label: 'b', mode: 'selection' },
      { min: 20, max: 29, label: 'a', mode: 'selection' },
    ];
    expect(validateBands(bands)).toMatch(/aufsteigend sortiert/);
  });
  it('rejects overlapping adjacent bands', () => {
    const bands: AgeBand[] = [
      { min: 0, max: 20, label: 'a', mode: 'selection' },
      { min: 15, max: 30, label: 'b', mode: 'selection' },
    ];
    expect(validateBands(bands)).toMatch(/überlappen/);
  });
  it('rejects a gap between adjacent bands', () => {
    const bands: AgeBand[] = [
      { min: 0, max: 10, label: 'a', mode: 'selection' },
      { min: 20, max: 30, label: 'b', mode: 'selection' },
    ];
    expect(validateBands(bands)).toMatch(/Lücke zwischen Band a/);
  });
  it('rejects a non-final open band', () => {
    const bands: AgeBand[] = [
      { min: 0, max: null, label: 'a', mode: 'selection' },
      { min: 1, max: 10, label: 'b', mode: 'selection' },
    ];
    expect(validateBands(bands)).toMatch(/Nur das letzte Band/);
  });
});

describe('recomputeAltersgruppe', () => {
  const refYear = 2026;

  it('injects altersgruppe into a fresh row copy', () => {
    const rows = [{ geburtsjahr: '1990', name: 'X' }];
    const out = recomputeAltersgruppe(rows, DEFAULT_AGE_BANDS, refYear);
    expect(out[0]).toEqual({ geburtsjahr: '1990', name: 'X', altersgruppe: '25-44' });
  });

  it('does NOT mutate the input rows', () => {
    const rows = [{ geburtsjahr: '1990', name: 'X' }];
    const snapshot = JSON.parse(JSON.stringify(rows));
    recomputeAltersgruppe(rows, DEFAULT_AGE_BANDS, refYear);
    expect(rows).toEqual(snapshot);
  });

  it('writes empty string for unparseable geburtsjahr', () => {
    const rows = [{ geburtsjahr: 'abc', name: 'X' }];
    const out = recomputeAltersgruppe(rows, DEFAULT_AGE_BANDS, refYear);
    expect(out[0]?.altersgruppe).toBe('');
  });

  it('overwrites a prior altersgruppe value', () => {
    const rows = [{ geburtsjahr: '1990', altersgruppe: 'stale-value' }];
    const out = recomputeAltersgruppe(rows, DEFAULT_AGE_BANDS, refYear);
    expect(out[0]?.altersgruppe).toBe('25-44');
  });
});
