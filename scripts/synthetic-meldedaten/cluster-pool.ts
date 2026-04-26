// Cluster pool: loads the 12 .txt name lists from disk and provides
// helpers to draw from them deterministically using Mulberry32. Also
// implements the slawische Frauennamen-Endungs-Logik for surname
// gendering in PL/CZ/SK clusters.
//
// Pure Node module — uses node:fs synchronously. Do NOT import this from
// browser code.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Mulberry32 } from '../../packages/core/src/pool/mulberry32';
import type { ClusterId, NameClusterMix } from './types';

export interface ClusterNamePool {
  vornamen_w: string[];
  vornamen_m: string[];
  nachnamen: string[];
}

export type ClusterPools = Record<ClusterId, ClusterNamePool>;

// Hungarian surnames are gender-neutral in modern usage. Listed as a
// conservative no-op set so we never accidentally ová-suffix them.
export const HUNGARIAN_SURNAMES = [
  'Nagy',
  'Kovács',
  'Tóth',
  'Szabó',
  'Horváth',
  'Varga',
  'Kiss',
  'Molnár',
  'Németh',
  'Farkas',
  'Balogh',
  'Papp',
  'Takács',
  'Juhász',
  'Mészáros',
] as const;

// Romanian surnames also do not take a feminine suffix in everyday use.
export const ROMANIAN_SURNAMES = [
  'Popa',
  'Popescu',
  'Ionescu',
  'Constantinescu',
  'Stoica',
] as const;

// Polish non-adjectival surnames (no -ski/-cki suffix). These don't decline
// for gender — e.g. "Pani Nowak" is fine, no "Nowaka".
export const POLISH_NEUTRAL_SURNAMES = [
  'Nowak',
  'Wójcik',
  'Kowalczyk',
  'Mazur',
  'Krawczyk',
] as const;

const HUNGARIAN_SET = new Set<string>(HUNGARIAN_SURNAMES);
const ROMANIAN_SET = new Set<string>(ROMANIAN_SURNAMES);
const POLISH_NEUTRAL_SET = new Set<string>(POLISH_NEUTRAL_SURNAMES);

const CLUSTER_FILES: Record<ClusterId, ClusterNamePool | null> = {
  'at-de': null,
  tr: null,
  'ex-yu': null,
  osteuropa: null,
  // 'sonstige' has no own pool — falls back to a mix of the others.
  sonstige: null,
};

function readList(dir: string, file: string): string[] {
  const raw = readFileSync(join(dir, file), 'utf8');
  return raw
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Load all four cluster pools from a names directory. The 'sonstige' cluster
 * uses the at-de pool by default (its citizenships are randomized in
 * person-builder, but its names look German-sounding which is realistic for
 * the residual category).
 */
export function loadClusterPools(namesDir: string): ClusterPools {
  const atDe: ClusterNamePool = {
    vornamen_w: readList(namesDir, 'at-de-vornamen-weiblich.txt'),
    vornamen_m: readList(namesDir, 'at-de-vornamen-maennlich.txt'),
    nachnamen: readList(namesDir, 'at-de-nachnamen.txt'),
  };
  const tr: ClusterNamePool = {
    vornamen_w: readList(namesDir, 'tr-vornamen-weiblich.txt'),
    vornamen_m: readList(namesDir, 'tr-vornamen-maennlich.txt'),
    nachnamen: readList(namesDir, 'tr-nachnamen.txt'),
  };
  const exYu: ClusterNamePool = {
    vornamen_w: readList(namesDir, 'ex-yu-vornamen-weiblich.txt'),
    vornamen_m: readList(namesDir, 'ex-yu-vornamen-maennlich.txt'),
    nachnamen: readList(namesDir, 'ex-yu-nachnamen.txt'),
  };
  const ost: ClusterNamePool = {
    vornamen_w: readList(namesDir, 'osteuropa-vornamen-weiblich.txt'),
    vornamen_m: readList(namesDir, 'osteuropa-vornamen-maennlich.txt'),
    nachnamen: readList(namesDir, 'osteuropa-nachnamen.txt'),
  };
  const pools: ClusterPools = {
    'at-de': atDe,
    tr: tr,
    'ex-yu': exYu,
    osteuropa: ost,
    sonstige: atDe,
  };
  // Suppress unused warning for the ambient cache stub.
  void CLUSTER_FILES;
  return pools;
}

/** Uniform pick from a name list. */
export function pickName(rng: Mulberry32, list: string[]): string {
  if (list.length === 0) {
    throw new Error('pickName: empty list');
  }
  const idx = Math.floor(rng.nextFloat() * list.length);
  return list[idx]!;
}

/**
 * Return the feminine form of a male surname based on the Slavic suffix rules
 * documented in research/names-extracted.md. For unsupported clusters, or
 * surnames that do not decline, the input is returned unchanged.
 */
export function applyFemaleSurnameSuffix(
  surname: string,
  cluster: ClusterId,
): string {
  if (cluster === 'osteuropa') {
    // Polish -ski / -cki / -dzki families.
    if (surname.endsWith('ski')) return surname.slice(0, -3) + 'ska';
    if (surname.endsWith('cki')) return surname.slice(0, -3) + 'cka';
    if (surname.endsWith('dzki')) return surname.slice(0, -4) + 'dzka';

    // Czech / Slovak -cký / -ský adjectival families.
    if (surname.endsWith('cký')) return surname.slice(0, -3) + 'cká';
    if (surname.endsWith('ský')) return surname.slice(0, -3) + 'ská';

    // Hungarian, Romanian, Polish-neutral exceptions: no change.
    if (HUNGARIAN_SET.has(surname)) return surname;
    if (ROMANIAN_SET.has(surname)) return surname;
    if (POLISH_NEUTRAL_SET.has(surname)) return surname;

    // Czech generic -ý → -á + ová suffix (special case: Novák stem).
    // Rule: replace trailing á-stems "ák/ák" → "áková". For names ending
    // in -ý that are not -cký/-ský (already handled above), drop the
    // accent and append ová.
    if (surname.endsWith('ý')) return surname.slice(0, -1) + 'á';

    // Default Czech / Slovak: append ová. Special case Novák → Nováková
    // (k → ková).
    return surname + 'ová';
  }

  if (cluster === 'ex-yu') {
    // Serbian / Croatian / Bosnian surnames are gender-invariant in modern
    // German records (we don't decline -ić → -ićeva for a synthetic test
    // dataset).
    return surname;
  }

  // at-de, tr, sonstige: no change.
  return surname;
}

/**
 * Weighted roulette selection over the cluster mix. Returns a ClusterId.
 * Throws if the mix is empty (sums to 0).
 */
export function pickCluster(
  rng: Mulberry32,
  mix: NameClusterMix,
): ClusterId {
  // Sorted iteration so the result is deterministic regardless of insertion
  // order in the source object.
  const entries: [ClusterId, number][] = [
    ['at-de', mix['at-de']],
    ['ex-yu', mix['ex-yu']],
    ['osteuropa', mix.osteuropa],
    ['sonstige', mix.sonstige],
    ['tr', mix.tr],
  ];
  let total = 0;
  for (const [, w] of entries) total += w;
  if (total <= 0) throw new Error('pickCluster: mix sums to 0');

  const r = rng.nextFloat() * total;
  let acc = 0;
  for (const [id, w] of entries) {
    acc += w;
    if (r < acc) return id;
  }
  // Floating-point fallback — return last bucket.
  return entries[entries.length - 1]![0];
}
