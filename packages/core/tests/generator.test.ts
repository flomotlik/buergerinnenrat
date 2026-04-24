import { describe, it, expect } from 'vitest';
import { generatePool, rowsToCsv, PROFILES, Mulberry32 } from '../src';

const FIRST_PROFILE = PROFILES['kleinstadt-bezirkshauptort']!;

describe('Mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const a = new Mulberry32(42);
    const b = new Mulberry32(42);
    for (let i = 0; i < 1000; i++) expect(a.nextU32()).toBe(b.nextU32());
  });

  it('diverges for different seeds', () => {
    const a = new Mulberry32(42);
    const b = new Mulberry32(43);
    let same = 0;
    for (let i = 0; i < 100; i++) if (a.nextU32() === b.nextU32()) same++;
    expect(same).toBeLessThan(5);
  });
});

describe('generatePool', () => {
  it('produces reproducible CSV bytes for same seed', () => {
    const a = generatePool({ profile: FIRST_PROFILE, size: 200, seed: 42, tightness: 0.7 });
    const b = generatePool({ profile: FIRST_PROFILE, size: 200, seed: 42, tightness: 0.7 });
    expect(rowsToCsv(a)).toBe(rowsToCsv(b));
  });

  it('produces unique person_ids', () => {
    const rows = generatePool({ profile: FIRST_PROFILE, size: 500, seed: 1, tightness: 0.7 });
    const ids = new Set(rows.map((r) => r.person_id));
    expect(ids.size).toBe(500);
  });

  it('respects size argument', () => {
    const rows = generatePool({ profile: FIRST_PROFILE, size: 137, seed: 1, tightness: 0.7 });
    expect(rows).toHaveLength(137);
  });

  it('runs for every profile', () => {
    for (const p of Object.values(PROFILES)) {
      const rows = generatePool({ profile: p, size: 50, seed: 99, tightness: 0.6 });
      expect(rows).toHaveLength(50);
      expect(rows.every((r) => r.person_id.startsWith(`${p.code}-`))).toBe(true);
    }
  });
});
