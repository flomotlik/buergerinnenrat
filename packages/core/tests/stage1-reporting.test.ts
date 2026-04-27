import { describe, expect, it } from 'vitest';
import {
  buildStage1Audit,
  coverageMetric,
  infoOnlyBandsReport,
  marginalAggregates,
  previewAllocation,
  sortUnderfillsByGap,
  stage1ToMarkdownReport,
  stratify,
} from '../src/stage1';
import type { AgeBand, StratumResult } from '../src/stage1';

const enc = new TextEncoder();

function makeRows(per: Record<string, number>): Record<string, string>[] {
  // per is "district|gender|age" -> count.
  const rows: Record<string, string>[] = [];
  let id = 0;
  for (const [k, n] of Object.entries(per)) {
    const [district, gender, age] = k.split('|');
    for (let i = 0; i < n; i++) {
      rows.push({ person_id: `p${id++}`, district: district!, gender: gender!, age_band: age! });
    }
  }
  return rows;
}

describe('marginalAggregates', () => {
  it('folds cross-product strata into per-axis-value totals', () => {
    const strata: StratumResult[] = [
      { key: { district: 'a', gender: 'f' }, n_h_pool: 10, n_h_target: 3, n_h_actual: 3, underfilled: false },
      { key: { district: 'a', gender: 'm' }, n_h_pool: 10, n_h_target: 3, n_h_actual: 3, underfilled: false },
      { key: { district: 'b', gender: 'f' }, n_h_pool: 5, n_h_target: 1, n_h_actual: 1, underfilled: false },
      { key: { district: 'b', gender: 'm' }, n_h_pool: 5, n_h_target: 1, n_h_actual: 1, underfilled: false },
    ];
    const m = marginalAggregates(strata, ['district', 'gender']);
    expect(m).toHaveLength(2);

    const district = m.find((x) => x.axis === 'district')!;
    expect(district.buckets).toHaveLength(2);
    const a = district.buckets.find((b) => b.value === 'a')!;
    expect(a.pool).toBe(20);
    expect(a.target).toBe(6);
    expect(a.actual).toBe(6);

    const gender = m.find((x) => x.axis === 'gender')!;
    const f = gender.buckets.find((b) => b.value === 'f')!;
    expect(f.pool).toBe(15);
    expect(f.target).toBe(4);
    expect(f.actual).toBe(4);

    expect(district.totalPool).toBe(30);
    expect(district.totalTarget).toBe(8);
    expect(district.totalActual).toBe(8);
  });

  it('sorts buckets by codepoint (Umlaut robustness)', () => {
    const strata: StratumResult[] = [
      { key: { district: 'Wörth' }, n_h_pool: 5, n_h_target: 2, n_h_actual: 2, underfilled: false },
      { key: { district: 'Aachen' }, n_h_pool: 5, n_h_target: 2, n_h_actual: 2, underfilled: false },
      { key: { district: 'Übach' }, n_h_pool: 5, n_h_target: 1, n_h_actual: 1, underfilled: false },
    ];
    const m = marginalAggregates(strata, ['district'])[0]!;
    expect(m.buckets.map((b) => b.value)).toEqual(['Aachen', 'Wörth', 'Übach']);
  });

  it('returns empty list when axes is empty', () => {
    const strata: StratumResult[] = [
      { key: {}, n_h_pool: 10, n_h_target: 5, n_h_actual: 5, underfilled: false },
    ];
    expect(marginalAggregates(strata, [])).toEqual([]);
  });
});

describe('sortUnderfillsByGap', () => {
  it('sorts strata descending by (n_h_target - n_h_actual)', () => {
    const strata: StratumResult[] = [
      { key: { a: 'small-gap' }, n_h_pool: 5, n_h_target: 5, n_h_actual: 4, underfilled: true },
      { key: { a: 'big-gap' }, n_h_pool: 10, n_h_target: 10, n_h_actual: 2, underfilled: true },
      { key: { a: 'medium-gap' }, n_h_pool: 7, n_h_target: 7, n_h_actual: 4, underfilled: true },
    ];
    const sorted = sortUnderfillsByGap(strata);
    // Expected order: big-gap (8), medium-gap (3), small-gap (1).
    expect(sorted.map((s) => s.key.a)).toEqual(['big-gap', 'medium-gap', 'small-gap']);
  });

  it('breaks ties with codepoint-ascending key (deterministic)', () => {
    const strata: StratumResult[] = [
      { key: { d: 'b' }, n_h_pool: 3, n_h_target: 3, n_h_actual: 1, underfilled: true },
      { key: { d: 'a' }, n_h_pool: 3, n_h_target: 3, n_h_actual: 1, underfilled: true },
      { key: { d: 'c' }, n_h_pool: 3, n_h_target: 3, n_h_actual: 1, underfilled: true },
    ];
    const sorted = sortUnderfillsByGap(strata);
    // All three have gap=2 — codepoint order on the JSON key wins.
    expect(sorted.map((s) => s.key.d)).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty array unchanged', () => {
    expect(sortUnderfillsByGap([])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const strata: StratumResult[] = [
      { key: { x: '1' }, n_h_pool: 5, n_h_target: 5, n_h_actual: 4, underfilled: true },
      { key: { x: '2' }, n_h_pool: 10, n_h_target: 10, n_h_actual: 2, underfilled: true },
    ];
    const before = strata.map((s) => s.key.x);
    sortUnderfillsByGap(strata);
    expect(strata.map((s) => s.key.x)).toEqual(before);
  });
});

describe('infoOnlyBandsReport', () => {
  const bands: AgeBand[] = [
    { min: 0, max: 15, label: 'unter-16', mode: 'display-only' },
    { min: 16, max: 64, label: '16-64', mode: 'selection' },
    { min: 65, max: null, label: '65+', mode: 'selection' },
  ];

  function rowsFor(altersgruppen: string[]): Record<string, string>[] {
    return altersgruppen.map((g, i) => ({ person_id: `p${i}`, altersgruppe: g }));
  }

  it('returns one row per display-only band with pool count and hypothetical Soll', () => {
    const r = rowsFor([
      ...Array(20).fill('unter-16'),
      ...Array(70).fill('16-64'),
      ...Array(10).fill('65+'),
    ]);
    const out = infoOnlyBandsReport(r, bands, 'altersgruppe', 10, 100);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ label: 'unter-16', poolCount: 20, hypotheticalSoll: 2 });
  });

  it('emits a row even when poolCount is 0', () => {
    const r = rowsFor([...Array(50).fill('16-64'), ...Array(50).fill('65+')]);
    const out = infoOnlyBandsReport(r, bands, 'altersgruppe', 10, 100);
    expect(out).toEqual([{ label: 'unter-16', poolCount: 0, hypotheticalSoll: 0 }]);
  });

  it('does not divide by zero when totalPoolSize is 0', () => {
    const out = infoOnlyBandsReport([], bands, 'altersgruppe', 10, 0);
    expect(out).toEqual([{ label: 'unter-16', poolCount: 0, hypotheticalSoll: 0 }]);
  });

  it('emits one row per display-only band in input order with multiple displays', () => {
    const multi: AgeBand[] = [
      { min: 0, max: 15, label: 'unter-16', mode: 'display-only' },
      { min: 16, max: 17, label: '16-17', mode: 'display-only' },
      { min: 18, max: null, label: '18+', mode: 'selection' },
    ];
    const r = rowsFor([
      ...Array(10).fill('unter-16'),
      ...Array(5).fill('16-17'),
      ...Array(85).fill('18+'),
    ]);
    const out = infoOnlyBandsReport(r, multi, 'altersgruppe', 50, 100);
    expect(out.map((row) => row.label)).toEqual(['unter-16', '16-17']);
    expect(out[0]?.hypotheticalSoll).toBe(5);
    expect(out[1]?.hypotheticalSoll).toBe(3); // round(50 * 5 / 100) = 3 (banker's? Math.round = 3 here)
  });
});

describe('coverageMetric', () => {
  it('counts covered, underfilled, and total strata correctly', () => {
    const strata: StratumResult[] = [
      { key: { a: '1' }, n_h_pool: 5, n_h_target: 2, n_h_actual: 2, underfilled: false },
      { key: { a: '2' }, n_h_pool: 5, n_h_target: 0, n_h_actual: 0, underfilled: false }, // not drawn
      { key: { a: '3' }, n_h_pool: 1, n_h_target: 2, n_h_actual: 1, underfilled: true },   // underfilled
    ];
    const c = coverageMetric(strata);
    expect(c.totalStrata).toBe(3);
    expect(c.coveredStrata).toBe(2); // those with n_h_actual > 0
    expect(c.underfilledStrata).toBe(1);
    expect(c.coverageRatio).toBeCloseTo(2 / 3, 5);
  });

  it('returns NaN ratio for empty input but does not throw', () => {
    const c = coverageMetric([]);
    expect(c.totalStrata).toBe(0);
    expect(Number.isNaN(c.coverageRatio)).toBe(true);
  });
});

describe('previewAllocation', () => {
  it('matches the n_h_target of an actual stratify() run', () => {
    const rows = makeRows({
      'a|f|25-34': 8,
      'a|m|25-34': 8,
      'b|f|25-34': 4,
      'b|m|25-34': 4,
    });
    const targetN = 6;
    const preview = previewAllocation(rows, ['district', 'gender'], targetN);
    const actual = stratify(rows, { axes: ['district', 'gender'], targetN, seed: 42 });

    expect(preview.totalTarget).toBe(targetN);
    expect(preview.rows).toHaveLength(actual.strata.length);
    for (let i = 0; i < preview.rows.length; i++) {
      expect(preview.rows[i]!.key).toEqual(actual.strata[i]!.key);
      expect(preview.rows[i]!.n_h_target).toBe(actual.strata[i]!.n_h_target);
      expect(preview.rows[i]!.n_h_pool).toBe(actual.strata[i]!.n_h_pool);
    }
  });

  it('counts zero-allocation strata correctly', () => {
    // Tiny stratum that gets 0 in proportional allocation.
    const rows = makeRows({
      'big|f|25-34': 100,
      'small|f|25-34': 1,
    });
    const preview = previewAllocation(rows, ['district'], 3);
    expect(preview.totalTarget).toBe(3);
    // small should get 0 (1/101 * 3 = 0.0297, floor 0, no remainder bonus)
    const small = preview.rows.find((r) => r.key.district === 'small')!;
    expect(small.n_h_target).toBe(0);
    expect(preview.zeroAllocationStrata).toBe(1);
  });

  it('throws on targetN > rows.length (mirrors stratify())', () => {
    const rows = makeRows({ 'a|f|25-34': 5 });
    expect(() => previewAllocation(rows, ['district'], 10)).toThrow(/Pool hat nur/);
  });
});

describe('stage1ToMarkdownReport', () => {
  it('produces a non-empty Markdown report with axis sections and strata table', async () => {
    const rows = makeRows({
      'a|f|25-34': 8,
      'a|m|25-34': 8,
      'b|f|25-34': 4,
      'b|m|25-34': 4,
    });
    const result = stratify(rows, { axes: ['district', 'gender'], targetN: 6, seed: 42 });
    const audit = await buildStage1Audit({
      inputBytes: enc.encode('person_id,district,gender\np0,a,f\n'),
      filename: 'pool.csv',
      sizeBytes: 30,
      axes: ['district', 'gender'],
      targetN: 6,
      seed: 42,
      seedSource: 'user',
      poolSize: rows.length,
      result,
      durationMs: 10,
    });

    const md = stage1ToMarkdownReport(audit);
    expect(md).toContain('# Versand-Auswahl — Bericht');
    expect(md).toContain('## Parameter');
    expect(md).toContain('## Gruppen-Abdeckung');
    expect(md).toContain('## Verteilung pro Merkmal');
    expect(md).toContain('### district');
    expect(md).toContain('### gender');
    expect(md).toContain('## Detail-Tabelle (Bevölkerungsgruppen, Cross-Product)');
    expect(md).toContain('## Signatur');
    // Auditor-facing parenthetical "Stratum" must be present in the
    // detail table header for traceability per CONTEXT.md glossary.
    expect(md).toContain('Bevölkerungsgruppe (Stratum)');
    // No PII (person IDs) in the report — only aggregate counts.
    expect(md).not.toContain('p0');
  });

  it('includes signature block when audit is signed', async () => {
    const rows = makeRows({ 'a|f|25-34': 4, 'b|m|25-34': 4 });
    const result = stratify(rows, { axes: ['district'], targetN: 4, seed: 1 });
    const audit = await buildStage1Audit({
      inputBytes: enc.encode('x'),
      filename: 'p.csv',
      sizeBytes: 1,
      axes: ['district'],
      targetN: 4,
      seed: 1,
      seedSource: 'user',
      poolSize: 8,
      result,
      durationMs: 1,
    });
    audit.public_key = 'PUBKEY-HEX';
    audit.signature = 'SIG-HEX';
    audit.signature_algo = 'Ed25519';

    const md = stage1ToMarkdownReport(audit);
    expect(md).toContain('PUBKEY-HEX');
    expect(md).toContain('SIG-HEX');
    expect(md).toContain('Ed25519');
  });

  it('renders Berechnete Spalten and Nicht in Auswahl sections when audit fields are present', async () => {
    const rows = makeRows({
      'a|f|25-34': 8,
      'a|m|25-34': 8,
      'b|f|25-34': 4,
      'b|m|25-34': 4,
    });
    const result = stratify(rows, {
      axes: ['altersgruppe'] as unknown as string[],
      targetN: 4,
      seed: 1,
    });
    // Override result.strata with synthesized data so we can include a
    // forced-zero stratum without doing a full pipeline integration.
    const synthAudit = await buildStage1Audit({
      inputBytes: enc.encode('x'),
      filename: 'p.csv',
      sizeBytes: 1,
      axes: ['altersgruppe'],
      targetN: 50,
      seed: 1,
      seedSource: 'user',
      poolSize: 100,
      result: {
        selected: [0, 1, 2],
        strata: [
          {
            key: { altersgruppe: 'unter-16' },
            n_h_pool: 20,
            n_h_target: 0,
            n_h_actual: 0,
            underfilled: false,
            forced_zero: true,
          },
          {
            key: { altersgruppe: '25-44' },
            n_h_pool: 80,
            n_h_target: 50,
            n_h_actual: 50,
            underfilled: false,
          },
        ],
        warnings: [],
      },
      durationMs: 1,
      derivedColumns: {
        altersgruppe: {
          source: 'geburtsjahr',
          description: 'derived',
          bands: [
            { min: 0, max: 15, label: 'unter-16', mode: 'display-only' },
            { min: 16, max: null, label: '16+', mode: 'selection' },
          ],
        },
      },
      forcedZeroStrata: ['[["altersgruppe","unter-16"]]'],
    });
    // ensure result-snapshot suppression doesn't run; this synthesized doc
    // is what we want to render.
    void result;

    const md = stage1ToMarkdownReport(synthAudit);
    expect(md).toContain('## Berechnete Spalten');
    expect(md).toContain('### altersgruppe');
    expect(md).toContain('## Nicht in Auswahl einbezogen');
    expect(md).toContain('| Band | Im Pool');
    expect(md).toContain('Kinderrat');
    // Status column should report 'nur Anzeige' for the forced-zero stratum.
    expect(md).toContain('nur Anzeige');
  });

  it('omits Berechnete Spalten and Nicht in Auswahl sections when audit fields are absent', async () => {
    const rows = makeRows({ 'a|f|25-34': 4, 'b|m|25-34': 4 });
    const result = stratify(rows, { axes: ['district'], targetN: 4, seed: 1 });
    const audit = await buildStage1Audit({
      inputBytes: enc.encode('x'),
      filename: 'p.csv',
      sizeBytes: 1,
      axes: ['district'],
      targetN: 4,
      seed: 1,
      seedSource: 'user',
      poolSize: 8,
      result,
      durationMs: 1,
    });
    const md = stage1ToMarkdownReport(audit);
    expect(md).not.toContain('## Berechnete Spalten');
    expect(md).not.toContain('## Nicht in Auswahl einbezogen');
    expect(md).not.toContain('Kinderrat');
  });

  it('handles SRS (no axes) gracefully', async () => {
    const rows = makeRows({ '|f|25-34': 10 });
    const result = stratify(rows, { axes: [], targetN: 3, seed: 1 });
    const audit = await buildStage1Audit({
      inputBytes: enc.encode('x'),
      filename: 'p.csv',
      sizeBytes: 1,
      axes: [],
      targetN: 3,
      seed: 1,
      seedSource: 'user',
      poolSize: 10,
      result,
      durationMs: 1,
    });
    const md = stage1ToMarkdownReport(audit);
    expect(md).toContain('(keine — einfache Zufallsstichprobe)');
    expect(md).not.toContain('## Verteilung pro Merkmal'); // no axes => skip
  });
});
