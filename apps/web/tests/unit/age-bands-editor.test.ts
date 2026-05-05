import { describe, it, expect } from 'vitest';
// Import from the pure helpers module — the .tsx file pulls in Solid's
// client runtime which throws when evaluated outside a renderer context.
import { addBandTo, removeBandAt, resetToDefaults } from '../../src/stage1/age-bands-helpers';
import type { AgeBand } from '../../src/import/derive';

describe('addBandTo', () => {
  it('appends a new band starting one above the prior closed max', () => {
    const before: AgeBand[] = [{ min: 0, max: 9, label: 'a', mode: 'selection' }];
    const after = addBandTo(before);
    expect(after).toHaveLength(2);
    expect(after[1]).toEqual({ min: 10, max: 19, label: 'neu', mode: 'selection' });
  });

  it('closes a final open band before appending', () => {
    const before: AgeBand[] = [
      { min: 0, max: 14, label: 'a', mode: 'selection' },
      { min: 15, max: null, label: 'b-open', mode: 'selection' },
    ];
    const after = addBandTo(before);
    expect(after).toHaveLength(3);
    // The previously-open band closes at min+9 = 24.
    expect(after[1]?.max).toBe(24);
    expect(after[2]).toEqual({ min: 25, max: 34, label: 'neu', mode: 'selection' });
  });

  it('produces a fresh array and fresh entries (no aliasing)', () => {
    const before: AgeBand[] = [{ min: 0, max: 9, label: 'a', mode: 'selection' }];
    const after = addBandTo(before);
    expect(after).not.toBe(before);
    expect(after[0]).not.toBe(before[0]);
  });
});

describe('removeBandAt', () => {
  it('drops the band at the given index', () => {
    const before: AgeBand[] = [
      { min: 0, max: 9, label: 'a', mode: 'selection' },
      { min: 10, max: 19, label: 'b', mode: 'selection' },
      { min: 20, max: 29, label: 'c', mode: 'selection' },
    ];
    const after = removeBandAt(before, 1);
    expect(after.map((b) => b.label)).toEqual(['a', 'c']);
  });

  it('returns a clone unchanged when input has only one band', () => {
    const before: AgeBand[] = [{ min: 0, max: 9, label: 'only', mode: 'selection' }];
    const after = removeBandAt(before, 0);
    expect(after).toHaveLength(1);
    expect(after).not.toBe(before);
    expect(after[0]).toEqual(before[0]);
  });
});

describe('resetToDefaults', () => {
  it('returns a fresh 5-band array with the documented mode pattern', () => {
    const r = resetToDefaults();
    expect(r).toHaveLength(5);
    expect(r.map((b) => b.mode)).toEqual([
      'display-only',
      'selection',
      'selection',
      'selection',
      'selection',
    ]);
    expect(r.map((b) => b.label)).toEqual(['unter-16', '16-24', '25-44', '45-64', '65+']);
  });

  it('returns fresh entries that consumers can safely mutate', () => {
    const r1 = resetToDefaults();
    const r2 = resetToDefaults();
    expect(r1).not.toBe(r2);
    expect(r1[0]).not.toBe(r2[0]);
  });
});
