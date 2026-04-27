// @vitest-environment node
// Loads name lists from the repo via node:fs — jsdom env externalizes node:*
// imports and breaks the cluster-pool module.
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import {
  applyFemaleSurnameSuffix,
  loadClusterPools,
  pickCluster,
  pickName,
} from '../../../../scripts/synthetic-meldedaten/cluster-pool';
import { Mulberry32 } from '../../../../packages/core/src/pool/mulberry32';
import type { NameClusterMix } from '../../../../scripts/synthetic-meldedaten/types';

// Vitest runs with cwd = apps/web. Repo root is two levels up.
const NAMES_DIR = resolve(process.cwd(), '../../scripts/synthetic-meldedaten/names');

describe('applyFemaleSurnameSuffix', () => {
  // Polish -ski / -cki rules.
  it('Polish -ski → -ska', () => {
    expect(applyFemaleSurnameSuffix('Kowalski', 'osteuropa')).toBe('Kowalska');
    expect(applyFemaleSurnameSuffix('Wiśniewski', 'osteuropa')).toBe('Wiśniewska');
    expect(applyFemaleSurnameSuffix('Lewandowski', 'osteuropa')).toBe('Lewandowska');
  });

  it('Czech -ý → -á (Novák → Nováková via append ová)', () => {
    // Novák ends with k, not ý. So default rule applies: append ová.
    expect(applyFemaleSurnameSuffix('Novák', 'osteuropa')).toBe('Nováková');
  });

  it('Czech -cký → -cká', () => {
    expect(applyFemaleSurnameSuffix('Novotnický', 'osteuropa')).toBe('Novotnická');
  });

  it('Czech default surname → append ová', () => {
    expect(applyFemaleSurnameSuffix('Svoboda', 'osteuropa')).toBe('Svobodaová');
    // Hájek → Hájeková (we use simple append; real Czech grammar would do
    // Hájková, but the synthetic generator uses a simple rule).
    expect(applyFemaleSurnameSuffix('Hájek', 'osteuropa')).toBe('Hájeková');
  });

  it('Polish neutral surnames (Nowak, Wójcik, Mazur) → no change', () => {
    expect(applyFemaleSurnameSuffix('Nowak', 'osteuropa')).toBe('Nowak');
    expect(applyFemaleSurnameSuffix('Mazur', 'osteuropa')).toBe('Mazur');
    expect(applyFemaleSurnameSuffix('Wójcik', 'osteuropa')).toBe('Wójcik');
  });

  it('Hungarian surnames → no change', () => {
    expect(applyFemaleSurnameSuffix('Nagy', 'osteuropa')).toBe('Nagy');
    expect(applyFemaleSurnameSuffix('Kovács', 'osteuropa')).toBe('Kovács');
    expect(applyFemaleSurnameSuffix('Tóth', 'osteuropa')).toBe('Tóth');
    expect(applyFemaleSurnameSuffix('Szabó', 'osteuropa')).toBe('Szabó');
  });

  it('Romanian surnames → no change', () => {
    expect(applyFemaleSurnameSuffix('Popa', 'osteuropa')).toBe('Popa');
    expect(applyFemaleSurnameSuffix('Popescu', 'osteuropa')).toBe('Popescu');
    expect(applyFemaleSurnameSuffix('Ionescu', 'osteuropa')).toBe('Ionescu');
  });

  it('Serbo-Croatian -ić → no change', () => {
    expect(applyFemaleSurnameSuffix('Petrović', 'ex-yu')).toBe('Petrović');
    expect(applyFemaleSurnameSuffix('Đorđević', 'ex-yu')).toBe('Đorđević');
    expect(applyFemaleSurnameSuffix('Hodžić', 'ex-yu')).toBe('Hodžić');
  });

  it('at-de, tr surnames → no change', () => {
    expect(applyFemaleSurnameSuffix('Müller', 'at-de')).toBe('Müller');
    expect(applyFemaleSurnameSuffix('Yılmaz', 'tr')).toBe('Yılmaz');
  });
});

describe('loadClusterPools', () => {
  const pools = loadClusterPools(NAMES_DIR);

  it('loads all four primary clusters', () => {
    for (const cluster of ['at-de', 'tr', 'ex-yu', 'osteuropa'] as const) {
      expect(pools[cluster].vornamen_w.length).toBeGreaterThanOrEqual(50);
      expect(pools[cluster].vornamen_m.length).toBeGreaterThanOrEqual(50);
      expect(pools[cluster].nachnamen.length).toBeGreaterThanOrEqual(50);
    }
  });

  it('preserves Diakritika', () => {
    expect(pools.tr.nachnamen).toContain('Şahin');
    expect(pools['ex-yu'].nachnamen).toContain('Đorđević');
    expect(pools.osteuropa.nachnamen).toContain('Wiśniewski');
    expect(pools['at-de'].nachnamen).toContain('Müller');
  });

  it('"sonstige" falls back to at-de pool', () => {
    expect(pools.sonstige).toBe(pools['at-de']);
  });
});

describe('pickName', () => {
  it('returns an element of the list', () => {
    const list = ['Anna', 'Berta', 'Clara'];
    const rng = new Mulberry32(4711);
    for (let i = 0; i < 50; i++) {
      const v = pickName(rng, list);
      expect(list).toContain(v);
    }
  });

  it('throws on empty list', () => {
    expect(() => pickName(new Mulberry32(1), [])).toThrow();
  });
});

describe('pickCluster', () => {
  const herzogenburgMix: NameClusterMix = {
    'at-de': 0.85,
    tr: 0.05,
    'ex-yu': 0.03,
    osteuropa: 0.03,
    sonstige: 0.04,
  };

  it('produces statistically plausible weighted samples', () => {
    const rng = new Mulberry32(4711);
    const counts: Record<string, number> = {
      'at-de': 0,
      tr: 0,
      'ex-yu': 0,
      osteuropa: 0,
      sonstige: 0,
    };
    const N = 10000;
    for (let i = 0; i < N; i++) {
      counts[pickCluster(rng, herzogenburgMix)]!++;
    }
    expect(counts['at-de']! / N).toBeGreaterThan(0.82);
    expect(counts['at-de']! / N).toBeLessThan(0.88);
    expect(counts.tr! / N).toBeGreaterThan(0.035);
    expect(counts.tr! / N).toBeLessThan(0.065);
    expect(counts['ex-yu']! / N).toBeGreaterThan(0.02);
    expect(counts['ex-yu']! / N).toBeLessThan(0.04);
    expect(counts.osteuropa! / N).toBeGreaterThan(0.02);
    expect(counts.osteuropa! / N).toBeLessThan(0.04);
  });

  it('is deterministic for the same seed', () => {
    const a = new Mulberry32(4711);
    const b = new Mulberry32(4711);
    for (let i = 0; i < 100; i++) {
      expect(pickCluster(a, herzogenburgMix)).toBe(pickCluster(b, herzogenburgMix));
    }
  });

  it('throws when mix sums to zero', () => {
    expect(() =>
      pickCluster(new Mulberry32(1), {
        'at-de': 0,
        tr: 0,
        'ex-yu': 0,
        osteuropa: 0,
        sonstige: 0,
      }),
    ).toThrow();
  });
});
