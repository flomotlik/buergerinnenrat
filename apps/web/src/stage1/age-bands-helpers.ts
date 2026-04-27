// Pure helpers for the AgeBandsEditor component.
//
// Lives in a .ts file (no JSX, no Solid runtime) so it is safely importable
// from Vitest's jsdom env without pulling in solid-js/web's client-only
// surface — see notes in tests/unit/hamilton-svg.test.ts for the same
// pattern.

import { DEFAULT_AGE_BANDS, type AgeBand } from '../csv/derive';

/** Append a new band after the existing list. Closes a final open band first. */
export function addBandTo(bands: AgeBand[]): AgeBand[] {
  const next = bands.map((b) => ({ ...b }));
  const last = next[next.length - 1];
  let lastClosedMax = -1;
  if (last) {
    if (last.max === null) {
      // Close the prior open band so the new band can have a contiguous min.
      last.max = last.min + 9;
    }
    lastClosedMax = last.max;
  }
  next.push({
    min: lastClosedMax + 1,
    max: lastClosedMax + 10,
    label: 'neu',
    mode: 'selection',
  });
  return next;
}

/** Remove the band at the given index — single-band input is returned unchanged. */
export function removeBandAt(bands: AgeBand[], index: number): AgeBand[] {
  if (bands.length <= 1) return bands.map((b) => ({ ...b }));
  return bands.filter((_, i) => i !== index).map((b) => ({ ...b }));
}

/** Fresh clone of DEFAULT_AGE_BANDS — defensively copy each entry. */
export function resetToDefaults(): AgeBand[] {
  return DEFAULT_AGE_BANDS.map((b) => ({ ...b }));
}
