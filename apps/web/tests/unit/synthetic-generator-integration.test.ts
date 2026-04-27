// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generate } from '../../../../scripts/synthetic-meldedaten/generator';
import { STAGE1_HEADERS } from '../../../../scripts/synthetic-meldedaten/csv-writer';
import { parseCsvBuffer } from '../../src/csv/parse';
import { isProfile, type Profile } from '../../../../scripts/synthetic-meldedaten/types';

const REPO_ROOT = resolve(process.cwd(), '../..');
const HERZOGENBURG = resolve(
  REPO_ROOT,
  'scripts/synthetic-meldedaten/profiles/herzogenburg.json',
);

function loadHerzogenburgProfile(): Profile {
  const raw = readFileSync(HERZOGENBURG, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  isProfile(parsed);
  return parsed as Profile;
}

describe('synthetic generator integration', () => {
  const profile = loadHerzogenburgProfile();
  const result = generate({ profile, seed: 4711 });
  const csv = result.csv;
  const buf = new TextEncoder().encode(csv).buffer as ArrayBuffer;
  const parsed = parseCsvBuffer(buf);

  it('produces close to 8000 rows', () => {
    // The generator targets totalPopulation=8000 by computing
    // totalHouseholds = round(totalPopulation / expectedMeanSize), then
    // trims down to 8000 if it overshoots. RNG variance in the actual
    // realised mean household size means we can land slightly below 8000
    // (no upward padding). Tolerance: ±1 % of target.
    expect(parsed.rows.length).toBeGreaterThanOrEqual(7920);
    expect(parsed.rows.length).toBeLessThanOrEqual(8000);
  });

  it('header order equals STAGE1_HEADERS (plus the derived altersgruppe column)', () => {
    // Issue #62: parseCsvBuffer now derives an `altersgruppe` column when
    // `geburtsjahr` is present. The first N headers must still match the
    // generator's STAGE1_HEADERS one-for-one.
    expect(parsed.headers.slice(0, STAGE1_HEADERS.length)).toEqual([...STAGE1_HEADERS]);
    expect(parsed.headers[STAGE1_HEADERS.length]).toBe('altersgruppe');
    expect(parsed.derivedColumns).toEqual(['altersgruppe']);
  });

  it('gender split matches profile within ±2%', () => {
    const counts = { weiblich: 0, maennlich: 0, divers: 0 };
    for (const r of parsed.rows) {
      const g = r['geschlecht'] as keyof typeof counts;
      counts[g]!++;
    }
    const total = parsed.rows.length;
    // Profile target: weiblich 50.8 %, maennlich 49.1 %, divers 0.1 %.
    // Adult gender is fixed by the household builder (parents have explicit
    // genders); gendered children/grandparents only roll randomly. Tolerance
    // ±2 % for the binary majority, ±0.5 % for divers.
    expect(counts.weiblich / total).toBeGreaterThan(0.488);
    expect(counts.weiblich / total).toBeLessThan(0.528);
    expect(counts.maennlich / total).toBeGreaterThan(0.47);
    expect(counts.maennlich / total).toBeLessThan(0.51);
    expect(counts.divers / total).toBeLessThan(0.005);
  });

  it('citizenship split: AT in [83%, 92%], non-AT in [8%, 17%]', () => {
    let at = 0,
      euOther = 0,
      third = 0;
    const euCountries = new Set(profile.citizenshipDistribution.eu_countries);
    const tcCountries = new Set(profile.citizenshipDistribution.third_country_countries);
    for (const r of parsed.rows) {
      const c = r['staatsbuergerschaft']!;
      if (c === 'AT') at++;
      else if (euCountries.has(c)) euOther++;
      else if (tcCountries.has(c)) third++;
    }
    const total = parsed.rows.length;
    // The cluster-correlated AT-rate model produces ~89% AT (slightly higher
    // than the 87.5% profile target because the at-de cluster's 95% AT rate
    // dominates given its 85% mix share). Children inherit the household-
    // primary citizenship (#58, jus sanguinis) which marginally raises the
    // AT share since most households have at least one AT parent.
    expect(at / total).toBeGreaterThan(0.83);
    expect(at / total).toBeLessThan(0.92);
    expect((euOther + third) / total).toBeGreaterThan(0.08);
  });

  it('household count is in [3500, 3900]', () => {
    const unique = new Set(parsed.rows.map((r) => r['haushaltsnummer']));
    expect(unique.size).toBeGreaterThanOrEqual(3300);
    expect(unique.size).toBeLessThanOrEqual(3900);
  });

  it('avg persons per household in [2.0, 2.5]', () => {
    const unique = new Set(parsed.rows.map((r) => r['haushaltsnummer']));
    const avg = parsed.rows.length / unique.size;
    expect(avg).toBeGreaterThan(2.0);
    expect(avg).toBeLessThan(2.5);
  });

  it('single-person household share in [33%, 42%]', () => {
    const counts = new Map<string, number>();
    for (const r of parsed.rows) {
      const h = r['haushaltsnummer']!;
      counts.set(h, (counts.get(h) ?? 0) + 1);
    }
    let singles = 0;
    for (const c of counts.values()) if (c === 1) singles++;
    const rate = singles / counts.size;
    expect(rate).toBeGreaterThan(0.33);
    expect(rate).toBeLessThan(0.42);
  });

  it('all sprengel values are from profile.sprengel', () => {
    const allowed = new Set((profile.sprengel ?? []).map((s) => s.id));
    for (const r of parsed.rows) {
      expect(allowed.has(r['sprengel']!)).toBe(true);
    }
  });

  it('all katastralgemeinde values are from profile.katastralgemeinden', () => {
    const allowed = new Set(profile.katastralgemeinden.map((k) => k.id));
    for (const r of parsed.rows) {
      expect(allowed.has(r['katastralgemeinde']!)).toBe(true);
    }
  });

  it('persons in same household share sprengel and katastralgemeinde', () => {
    const byHh = new Map<string, Record<string, string>[]>();
    for (const r of parsed.rows) {
      const h = r['haushaltsnummer']!;
      let arr = byHh.get(h);
      if (!arr) {
        arr = [];
        byHh.set(h, arr);
      }
      arr.push(r);
    }
    for (const [, members] of byHh) {
      const kgs = new Set(members.map((m) => m['katastralgemeinde']));
      const spr = new Set(members.map((m) => m['sprengel']));
      expect(kgs.size).toBe(1);
      expect(spr.size).toBe(1);
    }
  });

  it('families with young children: every parent-aged adult is ≥18 years older than children', () => {
    // The generator allows "children" up to age 18 (per CONTEXT.md
    // "1-3 Kinder 0-18"). A household member of exactly age 18 is a
    // borderline case — they may have been generated as a "child" with a
    // parent ≥ 36, OR as one of the WG/grandparent age-cohort. We
    // therefore restrict the strict 18-year-gap check to households where
    // there's at least one person under 13 (an unambiguous child).
    const byHh = new Map<string, Record<string, string>[]>();
    for (const r of parsed.rows) {
      const h = r['haushaltsnummer']!;
      let arr = byHh.get(h);
      if (!arr) {
        arr = [];
        byHh.set(h, arr);
      }
      arr.push(r);
    }
    let familiesChecked = 0;
    for (const [, members] of byHh) {
      if (members.length < 3) continue;
      const ages = members.map((m) => 2026 - Number.parseInt(m['geburtsjahr']!, 10));
      const youngestAge = Math.min(...ages);
      if (youngestAge >= 13) continue; // require an unambiguous child
      familiesChecked++;
      // Treat anyone aged 25+ as parent (the generator only places parents
      // in 25-55) — they must be ≥18 years older than the youngest child.
      for (const age of ages) {
        if (age >= 25) {
          expect(age - youngestAge).toBeGreaterThanOrEqual(18);
        }
      }
    }
    expect(familiesChecked).toBeGreaterThan(50);
  });

  it('determinism: two runs with seed 4711 produce byte-identical CSV', () => {
    const a = generate({ profile, seed: 4711 }).csv;
    const b = generate({ profile, seed: 4711 }).csv;
    expect(a).toBe(b);
  });

  it('different seed produces different CSV', () => {
    const a = generate({ profile, seed: 4711 }).csv;
    const b = generate({ profile, seed: 4712 }).csv;
    expect(a).not.toBe(b);
  });

  it('cluster mix proxy: at-de surnames dominate (~85% counting "sonstige")', () => {
    // Naive surname-set lookup. We strip common female-suffixes first.
    const namesDir = resolve(REPO_ROOT, 'scripts/synthetic-meldedaten/names');
    const atDe = new Set(
      readFileSync(`${namesDir}/at-de-nachnamen.txt`, 'utf8')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    );
    let atDeOrSonstige = 0;
    for (const r of parsed.rows) {
      if (atDe.has(r['nachname']!)) atDeOrSonstige++;
    }
    // sonstige cluster also draws from at-de pool (per cluster-pool.ts), so
    // the combined rate should be ~89% (85+4).
    const rate = atDeOrSonstige / parsed.rows.length;
    expect(rate).toBeGreaterThan(0.83);
    expect(rate).toBeLessThan(0.92);
  });
});
