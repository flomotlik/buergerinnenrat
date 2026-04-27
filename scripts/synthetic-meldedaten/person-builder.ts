// Person builder: turns RNG + cluster + profile into a fully populated
// Person row. Citizenship is correlated with cluster (model assumption,
// see RESEARCH.md §A) — e.g. a Turkish-named person is more often than not
// already an Austrian citizen because the third-generation immigrant
// community in NÖ is largely naturalized.

import { Mulberry32 } from '../../packages/core/src/pool/mulberry32';
import type {
  AgeBandKey,
  AgeBandWeights,
  CitizenshipDistribution,
  ClusterId,
  GenderDistribution,
  Person,
  Profile,
} from './types';
import { AGE_BAND_KEYS } from './types';
import {
  applyFemaleSurnameSuffix,
  pickName,
  type ClusterPools,
} from './cluster-pool';

// MODEL ASSUMPTION — see RESEARCH.md §A.
// Cluster-specific Austrian-citizenship rates. These reflect the
// generations-deep nature of the named cohorts: classic at-de names are
// nearly all AT citizens, Turkish-named cohorts in NÖ are majority-AT
// (3rd generation), Polish/Czech/etc. is a younger EU-mobility wave.
const CITIZENSHIP_AT_RATE: Record<ClusterId, number> = {
  'at-de': 0.95,
  tr: 0.6,
  'ex-yu': 0.5,
  osteuropa: 0.3,
  // For 'sonstige' the AT rate is taken from the profile distribution.
  sonstige: 0,
};

// Country pools per cluster when the person is non-AT. Constants here so
// tests can verify them; live-tweakable via a future extension if needed.
const NON_AT_COUNTRIES: Record<Exclude<ClusterId, 'sonstige'>, string[]> = {
  'at-de': ['DE'],
  tr: ['TR'],
  'ex-yu': ['RS', 'BA', 'HR', 'MK'],
  osteuropa: ['PL', 'CZ', 'SK', 'HU', 'RO'],
};

// ---------------------------------------------------------------------------
// Gender / age / citizenship pickers
// ---------------------------------------------------------------------------

export function pickGender(
  rng: Mulberry32,
  dist: GenderDistribution,
): 'weiblich' | 'maennlich' | 'divers' {
  const r = rng.nextFloat();
  if (r < dist.weiblich) return 'weiblich';
  if (r < dist.weiblich + dist.maennlich) return 'maennlich';
  return 'divers';
}

export function pickAgeBand(rng: Mulberry32, dist: AgeBandWeights): AgeBandKey {
  let total = 0;
  for (const k of AGE_BAND_KEYS) total += dist[k];
  const r = rng.nextFloat() * total;
  let acc = 0;
  for (const k of AGE_BAND_KEYS) {
    acc += dist[k];
    if (r < acc) return k;
  }
  return AGE_BAND_KEYS[AGE_BAND_KEYS.length - 1]!;
}

/**
 * Map an age band like "30-39" to a uniform random birth year. The "80+"
 * band is interpreted as 80..95 to keep the upper tail bounded. The
 * referenceYear is the "current" year used to compute the age range — it
 * should match the dataset's intended snapshot date.
 */
export function pickGeburtsjahrFromBand(
  rng: Mulberry32,
  band: AgeBandKey,
  referenceYear: number,
): number {
  let minAge: number;
  let maxAge: number;
  if (band === '80+') {
    minAge = 80;
    maxAge = 95;
  } else {
    const [lo, hi] = band.split('-').map((s) => Number.parseInt(s, 10)) as [
      number,
      number,
    ];
    minAge = lo;
    maxAge = hi;
  }
  const ageSpan = maxAge - minAge + 1;
  const age = minAge + Math.floor(rng.nextFloat() * ageSpan);
  return referenceYear - age;
}

/**
 * Pick a citizenship for a person using the cluster-correlated AT rate plus
 * the profile's country pools for fallback. The generated string is an ISO
 * 3166-1 alpha-2 code such as 'AT', 'DE', 'TR', or 'RS'.
 */
export function pickCitizenship(
  rng: Mulberry32,
  cluster: ClusterId,
  dist: CitizenshipDistribution,
): string {
  if (cluster === 'sonstige') {
    // Use the profile-wide distribution.
    const r = rng.nextFloat();
    if (r < dist.austria) return 'AT';
    if (r < dist.austria + dist.eu_other) {
      return pickFromPool(rng, dist.eu_countries) ?? 'AT';
    }
    return pickFromPool(rng, dist.third_country_countries) ?? 'AT';
  }

  const atRate = CITIZENSHIP_AT_RATE[cluster];
  if (rng.nextFloat() < atRate) return 'AT';

  // Non-AT: cluster-specific country pool, then fall back to profile pools.
  const pool = NON_AT_COUNTRIES[cluster];
  const fromCluster = pickFromPool(rng, pool);
  if (fromCluster) return fromCluster;

  // Fallback: pool determined by EU vs third-country share for the cluster.
  const inEu = cluster === 'osteuropa' || cluster === 'at-de';
  const fallbackPool = inEu ? dist.eu_countries : dist.third_country_countries;
  return pickFromPool(rng, fallbackPool) ?? 'AT';
}

function pickFromPool(rng: Mulberry32, pool: string[]): string | undefined {
  if (pool.length === 0) return undefined;
  return pool[Math.floor(rng.nextFloat() * pool.length)];
}

// ---------------------------------------------------------------------------
// Person builder
// ---------------------------------------------------------------------------

export interface BuildPersonParams {
  profile: Profile;
  pools: ClusterPools;
  cluster: ClusterId;
  /** Surname shared across the household (already in male form). */
  householdSurname: string;
  ageBand?: AgeBandKey;
  /**
   * Explicit birth year override. When set, takes precedence over ageBand —
   * household-builder uses this to enforce parent-child age constraints
   * exactly, without re-randomization inside the band.
   */
  geburtsjahr?: number;
  gender?: 'weiblich' | 'maennlich' | 'divers';
  /**
   * Explicit citizenship override. When set, the cluster-correlated
   * `pickCitizenship` draw is bypassed. Used by the household-builder so
   * that children inherit the household-level citizenship (jus sanguinis,
   * §7 StbG) instead of independently rolling a citizenship that can be
   * inconsistent with their parents.
   */
  staatsbuergerschaft?: string;
  sprengel: string;
  katastralgemeinde: string;
  haushaltsnummer: string;
  person_id: string;
  referenceYear?: number;
}

export function buildPerson(rng: Mulberry32, params: BuildPersonParams): Person {
  const refYear = params.referenceYear ?? 2026;
  const gender = params.gender ?? pickGender(rng, params.profile.genderDistribution);
  let geburtsjahr: number;
  if (params.geburtsjahr !== undefined) {
    geburtsjahr = params.geburtsjahr;
  } else {
    const ageBand = params.ageBand ?? pickAgeBand(rng, params.profile.ageDistribution);
    geburtsjahr = pickGeburtsjahrFromBand(rng, ageBand, refYear);
  }

  const pool = params.pools[params.cluster];
  const vornameList =
    gender === 'weiblich'
      ? pool.vornamen_w
      : gender === 'maennlich'
        ? pool.vornamen_m
        : // For 'divers' we draw from male-list to keep deterministic
          // uniform behaviour without requiring a third namelist; the
          // proportion is ~0.1% so this barely affects realism.
          pool.vornamen_m;
  const vorname = pickName(rng, vornameList);

  const nachname =
    gender === 'weiblich'
      ? applyFemaleSurnameSuffix(params.householdSurname, params.cluster)
      : params.householdSurname;

  // Explicit override (children inheriting from the household) wins over
  // the cluster-correlated draw. We still consume the RNG when no override
  // is provided so seed-stability across calls is preserved for callers
  // that don't pass the override.
  const staatsbuergerschaft =
    params.staatsbuergerschaft ??
    pickCitizenship(rng, params.cluster, params.profile.citizenshipDistribution);

  return {
    person_id: params.person_id,
    vorname,
    nachname,
    geburtsjahr,
    geschlecht: gender,
    staatsbuergerschaft,
    sprengel: params.sprengel,
    katastralgemeinde: params.katastralgemeinde,
    haushaltsnummer: params.haushaltsnummer,
  };
}
