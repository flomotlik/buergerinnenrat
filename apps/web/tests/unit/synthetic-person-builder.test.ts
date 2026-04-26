// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import {
  buildPerson,
  pickCitizenship,
  pickGender,
  pickGeburtsjahrFromBand,
} from '../../../../scripts/synthetic-meldedaten/person-builder';
import { loadClusterPools } from '../../../../scripts/synthetic-meldedaten/cluster-pool';
import { Mulberry32 } from '../../../../packages/core/src/pool/mulberry32';
import type {
  CitizenshipDistribution,
  GenderDistribution,
  Profile,
} from '../../../../scripts/synthetic-meldedaten/types';

const NAMES_DIR = resolve(process.cwd(), '../../scripts/synthetic-meldedaten/names');
const POOLS = loadClusterPools(NAMES_DIR);

const GENDER_DIST: GenderDistribution = {
  weiblich: 0.508,
  maennlich: 0.491,
  divers: 0.001,
};

const CIT_DIST: CitizenshipDistribution = {
  austria: 0.875,
  eu_other: 0.069,
  third_country: 0.056,
  eu_countries: ['DE', 'RO', 'HU', 'PL', 'SK', 'CZ', 'IT', 'HR'],
  third_country_countries: ['TR', 'RS', 'BA', 'UA', 'MK'],
};

function makeProfile(): Profile {
  return {
    name: 'test',
    idPrefix: 't',
    totalPopulation: 100,
    cityName: 'Test',
    bundesland: 'NÖ',
    katastralgemeinden: [{ id: 'kg1', name: 'KG1', populationShare: 1 }],
    ageDistribution: {
      '0-9': 0.09,
      '10-19': 0.1,
      '20-29': 0.11,
      '30-39': 0.13,
      '40-49': 0.14,
      '50-59': 0.15,
      '60-69': 0.13,
      '70-79': 0.1,
      '80+': 0.05,
    },
    genderDistribution: GENDER_DIST,
    citizenshipDistribution: CIT_DIST,
    nameClusterMix: {
      'at-de': 0.85,
      tr: 0.05,
      'ex-yu': 0.03,
      osteuropa: 0.03,
      sonstige: 0.04,
    },
    householdDistribution: {
      1: 0.382,
      2: 0.278,
      3: 0.14,
      4: 0.13,
      5: 0.045,
      6: 0.025,
    },
    familiesWithChildren: 0.4,
    threeGenerationShare: 0.01,
    crossClusterMixProbability: 0.12,
  };
}

describe('pickGender', () => {
  it('matches the configured distribution within ±1.5%', () => {
    const rng = new Mulberry32(4711);
    const counts = { weiblich: 0, maennlich: 0, divers: 0 };
    const N = 10000;
    for (let i = 0; i < N; i++) {
      counts[pickGender(rng, GENDER_DIST)]++;
    }
    expect(Math.abs(counts.weiblich / N - 0.508)).toBeLessThan(0.015);
    expect(Math.abs(counts.maennlich / N - 0.491)).toBeLessThan(0.015);
    // Divers ≤ 0.5%.
    expect(counts.divers / N).toBeLessThan(0.005);
  });
});

describe('pickGeburtsjahrFromBand', () => {
  it('returns a year inside the band given referenceYear 2026', () => {
    const rng = new Mulberry32(1);
    for (let i = 0; i < 100; i++) {
      const y = pickGeburtsjahrFromBand(rng, '30-39', 2026);
      expect(y).toBeGreaterThanOrEqual(1987);
      expect(y).toBeLessThanOrEqual(1996);
    }
  });

  it('handles 80+ as 80..95', () => {
    const rng = new Mulberry32(2);
    for (let i = 0; i < 100; i++) {
      const y = pickGeburtsjahrFromBand(rng, '80+', 2026);
      // Age 80..95 → year 1931..1946.
      expect(y).toBeGreaterThanOrEqual(1931);
      expect(y).toBeLessThanOrEqual(1946);
    }
  });
});

describe('pickCitizenship', () => {
  it('is deterministic for identical seeds', () => {
    const a = new Mulberry32(4711);
    const b = new Mulberry32(4711);
    for (let i = 0; i < 50; i++) {
      expect(pickCitizenship(a, 'tr', CIT_DIST)).toBe(
        pickCitizenship(b, 'tr', CIT_DIST),
      );
    }
  });

  it('Turkish-cluster: AT-rate around 60% over 1000 draws', () => {
    const rng = new Mulberry32(4711);
    let atCount = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      if (pickCitizenship(rng, 'tr', CIT_DIST) === 'AT') atCount++;
    }
    // Plan calls for "around 60%" with ±5% tolerance for N=1000.
    expect(atCount / N).toBeGreaterThan(0.54);
    expect(atCount / N).toBeLessThan(0.66);
  });

  it('at-de-cluster: AT-rate around 95% over 1000 draws', () => {
    const rng = new Mulberry32(4712);
    let atCount = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      if (pickCitizenship(rng, 'at-de', CIT_DIST) === 'AT') atCount++;
    }
    expect(atCount / N).toBeGreaterThan(0.92);
    expect(atCount / N).toBeLessThan(0.98);
  });
});

describe('buildPerson', () => {
  it('applies female surname suffix for the osteuropa cluster', () => {
    const rng = new Mulberry32(1);
    const p = buildPerson(rng, {
      profile: makeProfile(),
      pools: POOLS,
      cluster: 'osteuropa',
      householdSurname: 'Kowalski',
      gender: 'weiblich',
      ageBand: '30-39',
      sprengel: 'S1',
      katastralgemeinde: 'kg1',
      haushaltsnummer: 'h1',
      person_id: 't-00001',
    });
    expect(p.nachname).toBe('Kowalska');
  });

  it('keeps surname unchanged for males', () => {
    const rng = new Mulberry32(1);
    const p = buildPerson(rng, {
      profile: makeProfile(),
      pools: POOLS,
      cluster: 'osteuropa',
      householdSurname: 'Kowalski',
      gender: 'maennlich',
      ageBand: '30-39',
      sprengel: 'S1',
      katastralgemeinde: 'kg1',
      haushaltsnummer: 'h1',
      person_id: 't-00001',
    });
    expect(p.nachname).toBe('Kowalski');
  });

  it('Turkish cluster: vornamen drawn from the tr name list', () => {
    const rng = new Mulberry32(4711);
    const trVornamenW = new Set(POOLS.tr.vornamen_w);
    const trVornamenM = new Set(POOLS.tr.vornamen_m);
    for (let i = 0; i < 100; i++) {
      const p = buildPerson(rng, {
        profile: makeProfile(),
        pools: POOLS,
        cluster: 'tr',
        householdSurname: 'Yılmaz',
        sprengel: 'S1',
        katastralgemeinde: 'kg1',
        haushaltsnummer: 'h1',
        person_id: `t-${i}`,
      });
      const isInPool =
        p.geschlecht === 'weiblich'
          ? trVornamenW.has(p.vorname)
          : trVornamenM.has(p.vorname);
      expect(isInPool).toBe(true);
    }
  });

  it('Turkish cluster: ≥55% Austrian citizenship over 1000 persons', () => {
    const rng = new Mulberry32(4713);
    let atCount = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const p = buildPerson(rng, {
        profile: makeProfile(),
        pools: POOLS,
        cluster: 'tr',
        householdSurname: 'Yılmaz',
        sprengel: 'S1',
        katastralgemeinde: 'kg1',
        haushaltsnummer: 'h1',
        person_id: `t-${i}`,
      });
      if (p.staatsbuergerschaft === 'AT') atCount++;
    }
    // Plan: "≥55%". Underlying rate is 60% — generous floor for N=1000.
    expect(atCount / N).toBeGreaterThanOrEqual(0.54);
  });

  it('respects explicit ageBand and gender overrides', () => {
    const rng = new Mulberry32(99);
    const p = buildPerson(rng, {
      profile: makeProfile(),
      pools: POOLS,
      cluster: 'at-de',
      householdSurname: 'Müller',
      gender: 'weiblich',
      ageBand: '70-79',
      sprengel: 'S1',
      katastralgemeinde: 'kg1',
      haushaltsnummer: 'h1',
      person_id: 't-00001',
    });
    expect(p.geschlecht).toBe('weiblich');
    expect(p.geburtsjahr).toBeGreaterThanOrEqual(1947);
    expect(p.geburtsjahr).toBeLessThanOrEqual(1956);
  });
});
