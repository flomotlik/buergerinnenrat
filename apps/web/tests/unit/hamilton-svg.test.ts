import { describe, it, expect } from 'vitest';
// Import the pure math module — the SVG component imports Solid's `For`,
// which throws when evaluated outside a browser-renderer context. The math
// is what we need to verify here anyway.
import { computeHamiltonAllocation, TOY_STRATA } from '../../src/docs/hamilton';

describe('computeHamiltonAllocation (Toy 100 → 10, 6 strata)', () => {
  const result = computeHamiltonAllocation(TOY_STRATA, 10, 100);
  const byKey = (k: string) => result.find((r) => r.key === k)!;

  it('Quoten korrekt', () => {
    expect(byKey('A / w').quote).toBeCloseTo(1.8, 9);
    expect(byKey('A / m').quote).toBeCloseTo(1.2, 9);
    expect(byKey('B / w').quote).toBeCloseTo(2.2, 9);
    expect(byKey('B / m').quote).toBeCloseTo(1.3, 9);
    expect(byKey('C / w').quote).toBeCloseTo(2.0, 9);
    expect(byKey('C / m').quote).toBeCloseTo(1.5, 9);
  });

  it('Floors korrekt', () => {
    const sumFloors = result.reduce((a, r) => a + r.floor, 0);
    expect(sumFloors).toBe(8);
  });

  it('Remainder-Ranking korrekt (höchster Remainder = Rang 1)', () => {
    expect(byKey('A / w').remainderRank).toBe(1); // remainder 0.8
    expect(byKey('C / m').remainderRank).toBe(2); // remainder 0.5
  });

  it('Bonus-Verteilung: A/w und C/m bekommen +1, alle anderen 0', () => {
    expect(byKey('A / w').bonus).toBe(1);
    expect(byKey('C / m').bonus).toBe(1);
    expect(byKey('A / m').bonus).toBe(0);
    expect(byKey('B / w').bonus).toBe(0);
    expect(byKey('B / m').bonus).toBe(0);
    expect(byKey('C / w').bonus).toBe(0);
  });

  it('Final-Summe = 10', () => {
    const sumFinal = result.reduce((a, r) => a + r.final, 0);
    expect(sumFinal).toBe(10);
  });

  it('Final-Werte: A/w=2, A/m=1, B/w=2, B/m=1, C/w=2, C/m=2', () => {
    expect(byKey('A / w').final).toBe(2);
    expect(byKey('A / m').final).toBe(1);
    expect(byKey('B / w').final).toBe(2);
    expect(byKey('B / m').final).toBe(1);
    expect(byKey('C / w').final).toBe(2);
    expect(byKey('C / m').final).toBe(2);
  });

  it('Tie-Break alphabetisch nach key', () => {
    // Two strata with identical remainder 0.5; only one bonus left.
    // Alphabetically lower key wins: 'a' < 'b'.
    const tied = computeHamiltonAllocation(
      [
        { key: 'b', pool: 1, label: 'b' },
        { key: 'a', pool: 1, label: 'a' },
      ],
      1,
      2,
    );
    const a = tied.find((r) => r.key === 'a')!;
    const b = tied.find((r) => r.key === 'b')!;
    // Both have quote 0.5, floor 0, remainder 0.5; one of them must get the bonus.
    expect(a.remainder).toBe(0.5);
    expect(b.remainder).toBe(0.5);
    // alphabetical tie-break → 'a' wins.
    expect(a.bonus + b.bonus).toBe(1);
    expect(a.remainderRank).toBe(1);
  });
});
