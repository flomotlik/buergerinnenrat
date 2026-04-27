// Household builder: turns a (size, type, cluster) tuple into a small
// internally-consistent group of Persons. Family households share a
// surname; the wife may carry a different cluster (mixed marriage) but
// takes the household surname (gendered). For WG-type adult-share
// households each occupant gets their own cluster + surname.

import { Mulberry32 } from '../../packages/core/src/pool/mulberry32';
import type {
  ClusterId,
  HouseholdDistribution,
  KgOverride,
  NameClusterMix,
  Person,
  Profile,
} from './types';
import { pickCluster, pickName, type ClusterPools } from './cluster-pool';
import { buildPerson } from './person-builder';

export type HouseholdType =
  | 'single'
  | 'paar'
  | 'familie'
  | 'dreigeneration'
  | 'wg';

const HOUSEHOLD_SIZE_KEYS = [1, 2, 3, 4, 5, 6] as const;

/** Weighted pick from the household-size distribution. */
export function pickHouseholdSize(
  rng: Mulberry32,
  dist: HouseholdDistribution,
): number {
  let total = 0;
  for (const k of HOUSEHOLD_SIZE_KEYS) total += dist[k];
  const r = rng.nextFloat() * total;
  let acc = 0;
  for (const k of HOUSEHOLD_SIZE_KEYS) {
    acc += dist[k];
    if (r < acc) return k;
  }
  return HOUSEHOLD_SIZE_KEYS[HOUSEHOLD_SIZE_KEYS.length - 1]!;
}

/**
 * Decide the household type given size + profile-level shares. The mapping
 * is:
 *   size 1            → single
 *   size 2            → paar (with small WG chance ~2%)
 *   size 3+           → familie, optionally upgraded to dreigeneration
 *                       with profile.threeGenerationShare probability
 */
export function pickHouseholdType(
  rng: Mulberry32,
  size: number,
  profile: Profile,
): HouseholdType {
  if (size === 1) return 'single';
  if (size === 2) {
    if (rng.nextFloat() < 0.02) return 'wg';
    return 'paar';
  }
  if (rng.nextFloat() < profile.threeGenerationShare) return 'dreigeneration';
  return 'familie';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mergeClusterMix(
  base: NameClusterMix,
  override?: Partial<NameClusterMix>,
): NameClusterMix {
  if (!override) return base;
  return {
    'at-de': override['at-de'] ?? base['at-de'],
    tr: override.tr ?? base.tr,
    'ex-yu': override['ex-yu'] ?? base['ex-yu'],
    osteuropa: override.osteuropa ?? base.osteuropa,
    sonstige: override.sonstige ?? base.sonstige,
  };
}

function pickClusterForKg(
  rng: Mulberry32,
  profile: Profile,
  katastralgemeindeId: string,
): ClusterId {
  const override: KgOverride | undefined =
    profile.perKgOverrides?.[katastralgemeindeId];
  const mix = mergeClusterMix(profile.nameClusterMix, override?.clusterMix);
  return pickCluster(rng, mix);
}

function makeId(idPrefix: string, idCounter: { value: number }): string {
  const v = idCounter.value++;
  return `${idPrefix}-${String(v).padStart(5, '0')}`;
}

function pickHouseholdSurname(
  rng: Mulberry32,
  pools: ClusterPools,
  cluster: ClusterId,
): string {
  return pickName(rng, pools[cluster].nachnamen);
}

function pickAgeInRange(
  rng: Mulberry32,
  minAge: number,
  maxAge: number,
): number {
  return minAge + Math.floor(rng.nextFloat() * (maxAge - minAge + 1));
}

// ---------------------------------------------------------------------------
// Household builders
// ---------------------------------------------------------------------------

export interface BuildHouseholdParams {
  profile: Profile;
  pools: ClusterPools;
  sprengel: string;
  katastralgemeinde: string;
  haushaltsnummer: string;
  idCounter: { value: number };
  idPrefix: string;
  referenceYear?: number;
}

export function buildHousehold(
  rng: Mulberry32,
  params: BuildHouseholdParams,
): Person[] {
  const refYear = params.referenceYear ?? 2026;
  const size = pickHouseholdSize(rng, params.profile.householdDistribution);
  const type = pickHouseholdType(rng, size, params.profile);
  const cluster = pickClusterForKg(rng, params.profile, params.katastralgemeinde);
  const surname = pickHouseholdSurname(rng, params.pools, cluster);
  const ctx: BuildCtx = { rng, params, refYear, cluster, surname };

  switch (type) {
    case 'single':
      return [buildSingle(ctx)];
    case 'paar':
      return buildPaar(ctx);
    case 'familie':
      return buildFamilie(ctx, size);
    case 'dreigeneration':
      return buildDreigeneration(ctx, size);
    case 'wg':
      return buildWg(ctx, size);
  }
}

interface BuildCtx {
  rng: Mulberry32;
  params: BuildHouseholdParams;
  refYear: number;
  cluster: ClusterId;
  surname: string;
}

function buildSingle(ctx: BuildCtx): Person {
  return buildPerson(ctx.rng, {
    profile: ctx.params.profile,
    pools: ctx.params.pools,
    cluster: ctx.cluster,
    householdSurname: ctx.surname,
    sprengel: ctx.params.sprengel,
    katastralgemeinde: ctx.params.katastralgemeinde,
    haushaltsnummer: ctx.params.haushaltsnummer,
    person_id: makeId(ctx.params.idPrefix, ctx.params.idCounter),
    referenceYear: ctx.refYear,
  });
}

function maybeMixCluster(ctx: BuildCtx): ClusterId {
  if (ctx.rng.nextFloat() < ctx.params.profile.crossClusterMixProbability) {
    return pickClusterForKg(
      ctx.rng,
      ctx.params.profile,
      ctx.params.katastralgemeinde,
    );
  }
  return ctx.cluster;
}

function buildPaar(ctx: BuildCtx): Person[] {
  const husbandAge = pickAgeInRange(ctx.rng, 25, 65);
  const husband = buildPerson(ctx.rng, {
    profile: ctx.params.profile,
    pools: ctx.params.pools,
    cluster: ctx.cluster,
    householdSurname: ctx.surname,
    gender: 'maennlich',
    geburtsjahr: ctx.refYear - husbandAge,
    sprengel: ctx.params.sprengel,
    katastralgemeinde: ctx.params.katastralgemeinde,
    haushaltsnummer: ctx.params.haushaltsnummer,
    person_id: makeId(ctx.params.idPrefix, ctx.params.idCounter),
    referenceYear: ctx.refYear,
  });
  const wifeCluster = maybeMixCluster(ctx);
  // Wife age within ±10 years of husband, clamped 18..95.
  const wifeMinAge = Math.max(18, husbandAge - 10);
  const wifeMaxAge = Math.min(95, husbandAge + 10);
  const wifeAge = pickAgeInRange(ctx.rng, wifeMinAge, wifeMaxAge);
  const wife = buildPerson(ctx.rng, {
    profile: ctx.params.profile,
    pools: ctx.params.pools,
    cluster: wifeCluster,
    householdSurname: ctx.surname,
    gender: 'weiblich',
    geburtsjahr: ctx.refYear - wifeAge,
    sprengel: ctx.params.sprengel,
    katastralgemeinde: ctx.params.katastralgemeinde,
    haushaltsnummer: ctx.params.haushaltsnummer,
    person_id: makeId(ctx.params.idPrefix, ctx.params.idCounter),
    referenceYear: ctx.refYear,
  });
  return [husband, wife];
}

function buildFamilie(ctx: BuildCtx, size: number): Person[] {
  // 1-2 adults (25-55) + (size - adults) children (0-18). Statistik
  // Austria reports ~18 % single-parent families across ALL family sizes
  // (not just size 3), so we apply the same probability uniformly.
  const adultsCount = ctx.rng.nextFloat() < 0.18 ? 1 : 2;
  const childrenCount = Math.max(0, size - adultsCount);

  const fatherAge = pickAgeInRange(ctx.rng, 25, 55);
  const father = buildPerson(ctx.rng, {
    profile: ctx.params.profile,
    pools: ctx.params.pools,
    cluster: ctx.cluster,
    householdSurname: ctx.surname,
    gender: 'maennlich',
    geburtsjahr: ctx.refYear - fatherAge,
    sprengel: ctx.params.sprengel,
    katastralgemeinde: ctx.params.katastralgemeinde,
    haushaltsnummer: ctx.params.haushaltsnummer,
    person_id: makeId(ctx.params.idPrefix, ctx.params.idCounter),
    referenceYear: ctx.refYear,
  });
  const adults: Person[] = [father];
  if (adultsCount === 2) {
    const motherCluster = maybeMixCluster(ctx);
    const motherMinAge = Math.max(25, fatherAge - 8);
    const motherMaxAge = Math.min(55, fatherAge + 8);
    const motherAge = pickAgeInRange(ctx.rng, motherMinAge, motherMaxAge);
    const mother = buildPerson(ctx.rng, {
      profile: ctx.params.profile,
      pools: ctx.params.pools,
      cluster: motherCluster,
      householdSurname: ctx.surname,
      gender: 'weiblich',
      geburtsjahr: ctx.refYear - motherAge,
      sprengel: ctx.params.sprengel,
      katastralgemeinde: ctx.params.katastralgemeinde,
      haushaltsnummer: ctx.params.haushaltsnummer,
      person_id: makeId(ctx.params.idPrefix, ctx.params.idCounter),
      referenceYear: ctx.refYear,
    });
    adults.push(mother);
  }

  // Children must be ≥ 18 years younger than the youngest adult.
  const youngestAdultAge = Math.min(
    ...adults.map((a) => ctx.refYear - a.geburtsjahr),
  );
  const childMinAge = 0;
  const childMaxAge = Math.min(18, Math.max(0, youngestAdultAge - 18));

  // Determine the citizenship the children will inherit. Austrian jus
  // sanguinis (§7 StbG): a child gets AT citizenship if at least one
  // parent has it. Otherwise we propagate the father's citizenship —
  // mixed-cluster mothers keep their own citizenship but the kids align
  // with the household's primary citizenship.
  const childCitizenship = inheritedChildCitizenship(adults);

  const children: Person[] = [];
  for (let i = 0; i < childrenCount; i++) {
    const childAge = pickAgeInRange(ctx.rng, childMinAge, childMaxAge);
    children.push(
      buildPerson(ctx.rng, {
        profile: ctx.params.profile,
        pools: ctx.params.pools,
        cluster: ctx.cluster,
        householdSurname: ctx.surname,
        geburtsjahr: ctx.refYear - childAge,
        staatsbuergerschaft: childCitizenship,
        sprengel: ctx.params.sprengel,
        katastralgemeinde: ctx.params.katastralgemeinde,
        haushaltsnummer: ctx.params.haushaltsnummer,
        person_id: makeId(ctx.params.idPrefix, ctx.params.idCounter),
        referenceYear: ctx.refYear,
      }),
    );
  }
  return [...adults, ...children];
}

/**
 * Resolve the citizenship that children of the given adults inherit. AT
 * has priority (jus sanguinis — §7 StbG). With no AT parent we fall back
 * to the first adult's citizenship (typically the father in `buildFamilie`).
 */
function inheritedChildCitizenship(adults: Person[]): string {
  for (const a of adults) {
    if (a.staatsbuergerschaft === 'AT') return 'AT';
  }
  return adults[0]!.staatsbuergerschaft;
}

function buildDreigeneration(ctx: BuildCtx, size: number): Person[] {
  // Three-generation household: parent generation + at least one child
  // (0-18) + at least one grandparent (60-85). The previous version
  // delegated to `buildFamilie(coreSize)` with `coreSize = max(3, size-gp)`
  // which silently produced zero grandparents for size 3 (`remaining = 0`)
  // — so 3-Gen households were structurally indistinguishable from regular
  // families. We now build the layers explicitly:
  //
  //   size 3 → 1 parent + 1 child + 1 grandparent
  //   size 4 → 2 parents + 1 child + 1 grandparent
  //   size 5 → 2 parents + 1 child + 2 grandparents (or 2 parents + 2 children + 1 gp)
  //   size 6 → 2 parents + 2 children + 2 grandparents
  //
  // Grandparents share the household surname and the household's primary
  // cluster; they keep their own (independently rolled) citizenship — only
  // children inherit, see jus sanguinis comment in `buildFamilie`.
  const grandparentsCount = size >= 5 ? 2 : 1;
  // Reserve at least 1 child + 1 parent slot. Adults can be 1 or 2; the
  // remainder are children.
  const remainingForFamily = size - grandparentsCount;
  // Need at least 2 family slots (1 parent + 1 child). Force grandparents
  // down to 1 if size is too small to host two grandparents plus a
  // minimal family.
  const adjGrandparents = remainingForFamily < 2 ? 1 : grandparentsCount;
  const familySlots = size - adjGrandparents;
  const adultsCount = familySlots >= 3 ? 2 : 1;
  const childrenCount = Math.max(1, familySlots - adultsCount);

  // Build parent layer (mirrors `buildFamilie` logic but with explicit
  // adult count so we don't re-roll the single-parent probability here).
  const fatherAge = pickAgeInRange(ctx.rng, 25, 55);
  const father = buildPerson(ctx.rng, {
    profile: ctx.params.profile,
    pools: ctx.params.pools,
    cluster: ctx.cluster,
    householdSurname: ctx.surname,
    gender: 'maennlich',
    geburtsjahr: ctx.refYear - fatherAge,
    sprengel: ctx.params.sprengel,
    katastralgemeinde: ctx.params.katastralgemeinde,
    haushaltsnummer: ctx.params.haushaltsnummer,
    person_id: makeId(ctx.params.idPrefix, ctx.params.idCounter),
    referenceYear: ctx.refYear,
  });
  const adults: Person[] = [father];
  if (adultsCount === 2) {
    const motherCluster = maybeMixCluster(ctx);
    const motherMinAge = Math.max(25, fatherAge - 8);
    const motherMaxAge = Math.min(55, fatherAge + 8);
    const motherAge = pickAgeInRange(ctx.rng, motherMinAge, motherMaxAge);
    const mother = buildPerson(ctx.rng, {
      profile: ctx.params.profile,
      pools: ctx.params.pools,
      cluster: motherCluster,
      householdSurname: ctx.surname,
      gender: 'weiblich',
      geburtsjahr: ctx.refYear - motherAge,
      sprengel: ctx.params.sprengel,
      katastralgemeinde: ctx.params.katastralgemeinde,
      haushaltsnummer: ctx.params.haushaltsnummer,
      person_id: makeId(ctx.params.idPrefix, ctx.params.idCounter),
      referenceYear: ctx.refYear,
    });
    adults.push(mother);
  }

  // Children inherit citizenship per jus sanguinis.
  const childCitizenship = inheritedChildCitizenship(adults);
  const youngestAdultAge = Math.min(
    ...adults.map((a) => ctx.refYear - a.geburtsjahr),
  );
  const childMaxAge = Math.min(18, Math.max(0, youngestAdultAge - 18));
  const children: Person[] = [];
  for (let i = 0; i < childrenCount; i++) {
    const childAge = pickAgeInRange(ctx.rng, 0, childMaxAge);
    children.push(
      buildPerson(ctx.rng, {
        profile: ctx.params.profile,
        pools: ctx.params.pools,
        cluster: ctx.cluster,
        householdSurname: ctx.surname,
        geburtsjahr: ctx.refYear - childAge,
        staatsbuergerschaft: childCitizenship,
        sprengel: ctx.params.sprengel,
        katastralgemeinde: ctx.params.katastralgemeinde,
        haushaltsnummer: ctx.params.haushaltsnummer,
        person_id: makeId(ctx.params.idPrefix, ctx.params.idCounter),
        referenceYear: ctx.refYear,
      }),
    );
  }

  // Grandparent layer: ages 60-85, but clamped to be at least 20 years
  // older than the oldest adult so the heuristic
  // (oldest>=60 && altersspanne>=35) reliably classifies these.
  const oldestAdultAge = Math.max(
    ...adults.map((a) => ctx.refYear - a.geburtsjahr),
  );
  const gpMinAge = Math.max(60, oldestAdultAge + 20);
  const gpMaxAge = Math.max(gpMinAge, 85);
  const grandparents: Person[] = [];
  for (let i = 0; i < adjGrandparents; i++) {
    const gpAge = pickAgeInRange(ctx.rng, gpMinAge, gpMaxAge);
    grandparents.push(
      buildPerson(ctx.rng, {
        profile: ctx.params.profile,
        pools: ctx.params.pools,
        cluster: ctx.cluster,
        householdSurname: ctx.surname,
        geburtsjahr: ctx.refYear - gpAge,
        sprengel: ctx.params.sprengel,
        katastralgemeinde: ctx.params.katastralgemeinde,
        haushaltsnummer: ctx.params.haushaltsnummer,
        person_id: makeId(ctx.params.idPrefix, ctx.params.idCounter),
        referenceYear: ctx.refYear,
      }),
    );
  }
  return [...adults, ...children, ...grandparents];
}

function buildWg(ctx: BuildCtx, size: number): Person[] {
  // 2-4 adults aged 20-40, each with their own cluster + surname.
  const wgSize = Math.min(4, Math.max(2, size));
  const persons: Person[] = [];
  for (let i = 0; i < wgSize; i++) {
    const cluster = pickClusterForKg(
      ctx.rng,
      ctx.params.profile,
      ctx.params.katastralgemeinde,
    );
    const surname = pickHouseholdSurname(ctx.rng, ctx.params.pools, cluster);
    const age = pickAgeInRange(ctx.rng, 20, 40);
    persons.push(
      buildPerson(ctx.rng, {
        profile: ctx.params.profile,
        pools: ctx.params.pools,
        cluster,
        householdSurname: surname,
        geburtsjahr: ctx.refYear - age,
        sprengel: ctx.params.sprengel,
        katastralgemeinde: ctx.params.katastralgemeinde,
        haushaltsnummer: ctx.params.haushaltsnummer,
        person_id: makeId(ctx.params.idPrefix, ctx.params.idCounter),
        referenceYear: ctx.refYear,
      }),
    );
  }
  return persons;
}
