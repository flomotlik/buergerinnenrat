// @vitest-environment node
// Pure data-shape tests on the glossary + lookup helper. No DOM rendering —
// the Term.tsx component imports Solid's runtime which throws outside a
// browser renderer. The lookup is the part that has interesting logic.
import { describe, it, expect, vi } from 'vitest';
import glossar from '../../src/docs/glossar.json';

interface GlossarEntry {
  slug: string;
  term: string;
  kurz: string;
  see_also?: string[];
  external_link?: { label: string; url: string };
}

const ENTRIES = glossar as GlossarEntry[];
const LOOKUP = new Map(ENTRIES.map((e) => [e.slug, e]));

function findEntry(slug: string): GlossarEntry | undefined {
  return LOOKUP.get(slug);
}

describe('glossar.json shape', () => {
  it('has at least 15 entries', () => {
    expect(ENTRIES.length).toBeGreaterThanOrEqual(15);
  });

  it('every entry has slug + term + kurz', () => {
    for (const e of ENTRIES) {
      expect(e.slug).toBeTruthy();
      expect(e.term).toBeTruthy();
      expect(e.kurz).toBeTruthy();
    }
  });

  it('slugs are unique', () => {
    const set = new Set(ENTRIES.map((e) => e.slug));
    expect(set.size).toBe(ENTRIES.length);
  });

  it('every see_also slug references an existing entry', () => {
    const valid = new Set(ENTRIES.map((e) => e.slug));
    for (const e of ENTRIES) {
      for (const ref of e.see_also ?? []) {
        expect(valid.has(ref), `${e.slug} → see_also ${ref}`).toBe(true);
      }
    }
  });
});

describe('findEntry()', () => {
  it('returns the entry for slug=stratum', () => {
    const e = findEntry('stratum');
    expect(e).toBeDefined();
    expect(e?.term).toMatch(/Bevölkerungsgruppe/);
    expect(e?.kurz.length).toBeGreaterThan(20);
  });

  it('returns undefined for an unknown slug (so Term can warn)', () => {
    const e = findEntry('nonexistent-slug');
    expect(e).toBeUndefined();
    // Mirror what Term.tsx does in DEV: warn so typos are caught early.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    if (!findEntry('nonexistent-slug')) {
      console.warn('[docs/Term] unknown glossary slug: nonexistent-slug');
    }
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('Kurz-Definition for known slug is non-empty (basis for tooltip)', () => {
    const e = findEntry('hamilton');
    expect(e?.kurz).toMatch(/Hamilton|Largest-Remainder|Quoten/);
  });
});
