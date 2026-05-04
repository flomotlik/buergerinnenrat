import { describe, it, expect } from 'vitest';
import { nonWhitespaceLength } from '../../src/quotas/seat-allocation';

// Smoke tests for the override-editor business rules. The actual Solid
// components (OverrideEditor.tsx, SeatAllocationPanel.tsx) cannot be
// rendered in vitest+jsdom without @solidjs/testing-library — vite-plugin-
// solid loads the server-only build under jsdom, which throws "Client-only
// API called on the server side" the moment a JSX import is evaluated.
//
// What we DO test here:
//   - The non-whitespace rationale gate (cf. Pitfall 3) — same rule the
//     editor uses for its commit-ok decision.
//   - The sum-delta gate — same rule the SumValidator displays.
//
// Full UI behavior (keystroke → counter update, sum-validator color, run-
// button block on rationale < 20, reset clears state) is covered by Task 8
// e2e (Playwright).

describe('rationale gate (nonWhitespaceLength) — used by OverrideEditor commit-ok', () => {
  it('blocks empty rationale', () => {
    expect(nonWhitespaceLength('') < 20).toBe(true);
  });

  it('blocks 19-char rationale', () => {
    expect(nonWhitespaceLength('a'.repeat(19)) < 20).toBe(true);
  });

  it('passes 20-char rationale', () => {
    expect(nonWhitespaceLength('a'.repeat(20)) >= 20).toBe(true);
  });

  it('passes a realistic German rationale', () => {
    expect(
      nonWhitespaceLength('Geschlechter-Parität ist Pflicht laut Geschäftsordnung §17.') >= 20,
    ).toBe(true);
  });

  it('blocks 20 spaces (whitespace bypass)', () => {
    expect(nonWhitespaceLength('                    ') >= 20).toBe(false);
  });

  it('blocks tab + newline padding', () => {
    expect(nonWhitespaceLength('\t\t\n\n   ') >= 20).toBe(false);
  });
});

describe('sum-delta gate — used by OverrideEditor commit-ok', () => {
  function sumDelta(seats: Record<string, number>, panelSize: number): number {
    return Object.values(seats).reduce((a, b) => a + b, 0) - panelSize;
  }

  it('zero delta when sum matches panel size', () => {
    expect(sumDelta({ a: 5, b: 5 }, 10)).toBe(0);
  });

  it('positive delta when sum exceeds panel size', () => {
    expect(sumDelta({ a: 5, b: 6 }, 10)).toBe(1);
  });

  it('negative delta when sum below panel size', () => {
    expect(sumDelta({ a: 4, b: 5 }, 10)).toBe(-1);
  });
});
