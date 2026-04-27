// Profile + person model for the synthetic Meldedaten generator. Type-only
// module — no runtime dependencies. Validation is done via the isProfile()
// type guard at the bottom; we deliberately avoid Zod here to keep this
// scripts/ tree free of any new runtime dep.

export type ClusterId = 'at-de' | 'tr' | 'ex-yu' | 'osteuropa' | 'sonstige';

export const AGE_BAND_KEYS = [
  '0-9',
  '10-19',
  '20-29',
  '30-39',
  '40-49',
  '50-59',
  '60-69',
  '70-79',
  '80+',
] as const;
export type AgeBandKey = (typeof AGE_BAND_KEYS)[number];

export type AgeBandWeights = Record<AgeBandKey, number>;

export interface GenderDistribution {
  weiblich: number;
  maennlich: number;
  divers: number;
}

export interface CitizenshipDistribution {
  austria: number;
  eu_other: number;
  third_country: number;
  // ISO 3166-1 alpha-2 country codes pool. The generator picks uniformly
  // from this list when assigning a non-AT citizenship.
  eu_countries: string[];
  third_country_countries: string[];
}

export interface NameClusterMix {
  'at-de': number;
  tr: number;
  'ex-yu': number;
  osteuropa: number;
  sonstige: number;
}

export interface HouseholdDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  6: number;
}

export interface KatastralgemeindeDef {
  id: string;
  name: string;
  populationShare: number;
  // Optional list of sprengel IDs that belong to this KG. If omitted, the
  // first sprengel from `Profile.sprengel` whose `katastralgemeindeId`
  // matches is used as the default.
  sprengelIds?: string[];
}

export interface SprengelDef {
  id: string;
  name: string;
  katastralgemeindeId: string;
  // Optional explicit share within the KG. If omitted, the population is
  // distributed uniformly across all sprengel of the same KG.
  populationShare?: number;
}

export interface KgOverride {
  ageDistribution?: Partial<AgeBandWeights>;
  clusterMix?: Partial<NameClusterMix>;
  citizenshipDistribution?: Partial<CitizenshipDistribution>;
}

export interface Profile {
  name: string;
  idPrefix: string;
  totalPopulation: number;
  cityName: string;
  bundesland: string;
  katastralgemeinden: KatastralgemeindeDef[];
  sprengel?: SprengelDef[];
  ageDistribution: AgeBandWeights;
  genderDistribution: GenderDistribution;
  citizenshipDistribution: CitizenshipDistribution;
  nameClusterMix: NameClusterMix;
  householdDistribution: HouseholdDistribution;
  familiesWithChildren: number;
  threeGenerationShare: number;
  crossClusterMixProbability: number;
  perKgOverrides?: Record<string, KgOverride>;
}

export interface Person {
  person_id: string;
  vorname: string;
  nachname: string;
  geburtsjahr: number;
  geschlecht: 'weiblich' | 'maennlich' | 'divers';
  staatsbuergerschaft: string;
  sprengel: string;
  katastralgemeinde: string;
  haushaltsnummer: string;
  bildung?: string;
  migrationshintergrund?: string;
}

export interface GeneratorOptions {
  profile: Profile;
  seed: number;
  bom?: boolean;
  extraFields?: 'none' | 'self-report';
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

const SUM_TOLERANCE = 0.01;

function approxOne(sum: number): boolean {
  return Math.abs(sum - 1) <= SUM_TOLERANCE;
}

function fail(path: string, msg: string): never {
  throw new TypeError(`${path}: ${msg}`);
}

function assertNumber(v: unknown, path: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    fail(path, `expected finite number, got ${typeof v} (${String(v)})`);
  }
  return v;
}

function assertString(v: unknown, path: string): string {
  if (typeof v !== 'string') fail(path, `expected string, got ${typeof v}`);
  return v;
}

function assertObject(v: unknown, path: string): Record<string, unknown> {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) {
    fail(path, `expected object, got ${Array.isArray(v) ? 'array' : typeof v}`);
  }
  return v as Record<string, unknown>;
}

function assertArray(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) fail(path, `expected array, got ${typeof v}`);
  return v;
}

function assertDistribution(
  rec: Record<string, unknown>,
  keys: readonly string[],
  path: string,
): void {
  let sum = 0;
  for (const k of keys) {
    const n = assertNumber(rec[k], `${path}.${k}`);
    if (n < 0) fail(`${path}.${k}`, `negative value ${n}`);
    sum += n;
  }
  if (!approxOne(sum)) {
    fail(path, `sums to ${sum.toFixed(4)}, expected 1.0 ±${SUM_TOLERANCE}`);
  }
}

/**
 * Validate that an arbitrary parsed JSON object conforms to the Profile shape.
 * Throws TypeError with a concrete path on the first mismatch found.
 */
export function isProfile(x: unknown): x is Profile {
  const p = assertObject(x, 'profile');
  assertString(p.name, 'profile.name');
  assertString(p.idPrefix, 'profile.idPrefix');
  const total = assertNumber(p.totalPopulation, 'profile.totalPopulation');
  if (total <= 0 || !Number.isInteger(total)) {
    fail('profile.totalPopulation', `expected positive integer, got ${total}`);
  }
  assertString(p.cityName, 'profile.cityName');
  assertString(p.bundesland, 'profile.bundesland');

  const kgs = assertArray(p.katastralgemeinden, 'profile.katastralgemeinden');
  if (kgs.length === 0) fail('profile.katastralgemeinden', 'must not be empty');
  let kgShareSum = 0;
  for (let i = 0; i < kgs.length; i++) {
    const kg = assertObject(kgs[i], `profile.katastralgemeinden[${i}]`);
    assertString(kg.id, `profile.katastralgemeinden[${i}].id`);
    assertString(kg.name, `profile.katastralgemeinden[${i}].name`);
    const share = assertNumber(
      kg.populationShare,
      `profile.katastralgemeinden[${i}].populationShare`,
    );
    if (share < 0) {
      fail(
        `profile.katastralgemeinden[${i}].populationShare`,
        `negative value ${share}`,
      );
    }
    kgShareSum += share;
  }
  if (!approxOne(kgShareSum)) {
    fail(
      'profile.katastralgemeinden',
      `populationShare sum ${kgShareSum.toFixed(4)}, expected 1.0 ±${SUM_TOLERANCE}`,
    );
  }

  if (p.sprengel !== undefined) {
    const sprengel = assertArray(p.sprengel, 'profile.sprengel');
    for (let i = 0; i < sprengel.length; i++) {
      const s = assertObject(sprengel[i], `profile.sprengel[${i}]`);
      assertString(s.id, `profile.sprengel[${i}].id`);
      assertString(s.name, `profile.sprengel[${i}].name`);
      assertString(
        s.katastralgemeindeId,
        `profile.sprengel[${i}].katastralgemeindeId`,
      );
    }
  }

  const age = assertObject(p.ageDistribution, 'profile.ageDistribution');
  assertDistribution(age, AGE_BAND_KEYS, 'profile.ageDistribution');

  const gender = assertObject(p.genderDistribution, 'profile.genderDistribution');
  assertDistribution(
    gender,
    ['weiblich', 'maennlich', 'divers'],
    'profile.genderDistribution',
  );

  const cit = assertObject(
    p.citizenshipDistribution,
    'profile.citizenshipDistribution',
  );
  assertDistribution(
    cit,
    ['austria', 'eu_other', 'third_country'],
    'profile.citizenshipDistribution',
  );
  const euCountries = assertArray(
    cit.eu_countries,
    'profile.citizenshipDistribution.eu_countries',
  );
  const tcCountries = assertArray(
    cit.third_country_countries,
    'profile.citizenshipDistribution.third_country_countries',
  );
  for (let i = 0; i < euCountries.length; i++) {
    assertString(
      euCountries[i],
      `profile.citizenshipDistribution.eu_countries[${i}]`,
    );
  }
  for (let i = 0; i < tcCountries.length; i++) {
    assertString(
      tcCountries[i],
      `profile.citizenshipDistribution.third_country_countries[${i}]`,
    );
  }

  const mix = assertObject(p.nameClusterMix, 'profile.nameClusterMix');
  assertDistribution(
    mix,
    ['at-de', 'tr', 'ex-yu', 'osteuropa', 'sonstige'],
    'profile.nameClusterMix',
  );

  const hh = assertObject(p.householdDistribution, 'profile.householdDistribution');
  assertDistribution(
    hh,
    ['1', '2', '3', '4', '5', '6'],
    'profile.householdDistribution',
  );

  assertNumber(p.familiesWithChildren, 'profile.familiesWithChildren');
  assertNumber(p.threeGenerationShare, 'profile.threeGenerationShare');
  assertNumber(p.crossClusterMixProbability, 'profile.crossClusterMixProbability');

  if (p.perKgOverrides !== undefined) {
    assertObject(p.perKgOverrides, 'profile.perKgOverrides');
  }

  return true;
}
