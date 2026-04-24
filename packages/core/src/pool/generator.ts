import { Mulberry32 } from './mulberry32';

export type Gender = 'female' | 'male' | 'diverse';
export type AgeBand = '16-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65-74' | '75+';
export type Education = 'compulsory' | 'vocational' | 'matura' | 'tertiary';
export type Migration = 'none' | 'second_gen' | 'first_gen';

export const GENDER_VALUES: readonly Gender[] = ['female', 'male', 'diverse'] as const;
export const AGE_BANDS: readonly AgeBand[] = [
  '16-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65-74',
  '75+',
] as const;
export const EDUCATION_VALUES: readonly Education[] = [
  'compulsory',
  'vocational',
  'matura',
  'tertiary',
] as const;
export const MIGRATION_VALUES: readonly Migration[] = [
  'none',
  'second_gen',
  'first_gen',
] as const;

export interface CommunityProfile {
  readonly code: string;
  readonly description: string;
  readonly typical_size: number;
  readonly gender: Record<Gender, number>;
  readonly age_band: Record<AgeBand, number>;
  readonly education: Record<Education, number>;
  readonly migration_background: Record<Migration, number>;
  readonly districts: Record<string, number>;
}

export interface PoolRow {
  person_id: string;
  gender: Gender;
  age_band: AgeBand;
  education: Education;
  migration_background: Migration;
  district: string;
}

export const PROFILES: Record<string, CommunityProfile> = {
  'innenstadt-gross': {
    code: 'innenstadt-gross',
    description:
      'Großstadtkern (Wien-Innere Stadt-artig): jung, hochgebildet, hoher Migrationsanteil.',
    typical_size: 1500,
    gender: { female: 0.5, male: 0.49, diverse: 0.01 },
    age_band: {
      '16-24': 0.13,
      '25-34': 0.24,
      '35-44': 0.2,
      '45-54': 0.15,
      '55-64': 0.12,
      '65-74': 0.09,
      '75+': 0.07,
    },
    education: { compulsory: 0.12, vocational: 0.28, matura: 0.22, tertiary: 0.38 },
    migration_background: { none: 0.5, second_gen: 0.2, first_gen: 0.3 },
    districts: { '01-zentrum': 0.3, '02-uni': 0.25, '03-markt': 0.25, '04-bahnhof': 0.2 },
  },
  'aussenbezirk-mittelgross': {
    code: 'aussenbezirk-mittelgross',
    description:
      'Großstädtischer Außenbezirk (Wien-Floridsdorf-artig): familiengeprägt, mittlere Bildung.',
    typical_size: 1000,
    gender: { female: 0.51, male: 0.485, diverse: 0.005 },
    age_band: {
      '16-24': 0.11,
      '25-34': 0.16,
      '35-44': 0.18,
      '45-54': 0.18,
      '55-64': 0.15,
      '65-74': 0.13,
      '75+': 0.09,
    },
    education: { compulsory: 0.2, vocational: 0.4, matura: 0.22, tertiary: 0.18 },
    migration_background: { none: 0.62, second_gen: 0.22, first_gen: 0.16 },
    districts: {
      '01-altsiedlung': 0.35,
      '02-neubau': 0.3,
      '03-gewerbe': 0.2,
      '04-wohnring': 0.15,
    },
  },
  'kleinstadt-bezirkshauptort': {
    code: 'kleinstadt-bezirkshauptort',
    description:
      'Bezirkshauptort einer ländlichen Region (Tulln-artig): mittleres Alter, mittlere Bildung.',
    typical_size: 600,
    gender: { female: 0.51, male: 0.485, diverse: 0.005 },
    age_band: {
      '16-24': 0.1,
      '25-34': 0.13,
      '35-44': 0.14,
      '45-54': 0.17,
      '55-64': 0.18,
      '65-74': 0.16,
      '75+': 0.12,
    },
    education: { compulsory: 0.22, vocational: 0.45, matura: 0.2, tertiary: 0.13 },
    migration_background: { none: 0.78, second_gen: 0.13, first_gen: 0.09 },
    districts: { '01-stadtkern': 0.4, '02-katastral-nord': 0.3, '03-katastral-sued': 0.3 },
  },
  'bergdorf-tourismus': {
    code: 'bergdorf-tourismus',
    description:
      'Bergdorf mit Tourismus (Sankt Anton-artig): klein, älter, niedrige formale Bildung im Schnitt.',
    typical_size: 250,
    gender: { female: 0.49, male: 0.51, diverse: 0.0 },
    age_band: {
      '16-24': 0.08,
      '25-34': 0.1,
      '35-44': 0.11,
      '45-54': 0.16,
      '55-64': 0.2,
      '65-74': 0.2,
      '75+': 0.15,
    },
    education: { compulsory: 0.3, vocational: 0.5, matura: 0.13, tertiary: 0.07 },
    migration_background: { none: 0.85, second_gen: 0.08, first_gen: 0.07 },
    districts: { '01-dorfkern': 0.55, '02-streusiedlung': 0.45 },
  },
  'wachstumsgemeinde-umland': {
    code: 'wachstumsgemeinde-umland',
    description:
      'Wachstumsgemeinde im Speckgürtel (Mödling-artig): jung-familiär, hochgebildet.',
    typical_size: 500,
    gender: { female: 0.505, male: 0.49, diverse: 0.005 },
    age_band: {
      '16-24': 0.11,
      '25-34': 0.18,
      '35-44': 0.22,
      '45-54': 0.18,
      '55-64': 0.13,
      '65-74': 0.1,
      '75+': 0.08,
    },
    education: { compulsory: 0.1, vocational: 0.3, matura: 0.25, tertiary: 0.35 },
    migration_background: { none: 0.72, second_gen: 0.18, first_gen: 0.1 },
    districts: {
      '01-altort': 0.3,
      '02-neubaugebiet': 0.4,
      '03-streusiedlung': 0.2,
      '04-bahnhof': 0.1,
    },
  },
  'industriestadt-klein': {
    code: 'industriestadt-klein',
    description:
      'Kleine Industriestadt (Steyr-Stadtteil-artig): älter, niedrigere Bildung, mittlerer Migrationsanteil.',
    typical_size: 400,
    gender: { female: 0.5, male: 0.495, diverse: 0.005 },
    age_band: {
      '16-24': 0.1,
      '25-34': 0.13,
      '35-44': 0.13,
      '45-54': 0.16,
      '55-64': 0.18,
      '65-74': 0.17,
      '75+': 0.13,
    },
    education: { compulsory: 0.25, vocational: 0.5, matura: 0.15, tertiary: 0.1 },
    migration_background: { none: 0.65, second_gen: 0.2, first_gen: 0.15 },
    districts: { '01-werkssiedlung': 0.45, '02-zentrum': 0.3, '03-randlage': 0.25 },
  },
};

function blend(weights: Record<string, number>, tightness: number): Record<string, number> {
  const keys = Object.keys(weights);
  const uniform = 1 / keys.length;
  const out: Record<string, number> = {};
  for (const k of keys) {
    out[k] = tightness * (weights[k] ?? 0) + (1 - tightness) * uniform;
  }
  return out;
}

function sampleCategorical<T extends string>(
  rng: Mulberry32,
  weights: Record<string, number>,
  orderedKeys: readonly T[],
): T {
  const u = rng.nextFloat();
  let acc = 0;
  for (const k of orderedKeys) {
    acc += weights[k] ?? 0;
    if (u < acc) return k;
  }
  return orderedKeys[orderedKeys.length - 1] as T;
}

export interface GenerateOpts {
  profile: CommunityProfile;
  size: number;
  seed: number;
  tightness: number;
}

export function generatePool(opts: GenerateOpts): PoolRow[] {
  const { profile, size, seed, tightness } = opts;
  const rng = new Mulberry32(seed);
  const g = blend(profile.gender, tightness);
  const a = blend(profile.age_band, tightness);
  const e = blend(profile.education, tightness);
  const m = blend(profile.migration_background, tightness);
  const d = blend(profile.districts, tightness);
  const districtKeys = Object.keys(profile.districts);

  const width = Math.max(4, String(size).length);
  const rows: PoolRow[] = [];
  for (let i = 0; i < size; i++) {
    const personId = `${profile.code}-${String(i + 1).padStart(width, '0')}`;
    rows.push({
      person_id: personId,
      gender: sampleCategorical(rng, g, GENDER_VALUES),
      age_band: sampleCategorical(rng, a, AGE_BANDS),
      education: sampleCategorical(rng, e, EDUCATION_VALUES),
      migration_background: sampleCategorical(rng, m, MIGRATION_VALUES),
      district: sampleCategorical(rng, d, districtKeys),
    });
  }
  rows.sort((x, y) => (x.person_id < y.person_id ? -1 : x.person_id > y.person_id ? 1 : 0));
  return rows;
}

export function rowsToCsv(rows: PoolRow[]): string {
  const fields: (keyof PoolRow)[] = [
    'person_id',
    'gender',
    'age_band',
    'education',
    'migration_background',
    'district',
  ];
  const lines = [fields.join(',')];
  for (const r of rows) lines.push(fields.map((f) => r[f]).join(','));
  return lines.join('\n') + '\n';
}
