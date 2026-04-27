import { describe, it, expect } from 'vitest';
import {
  suggestSampleSize,
  OUTREACH_DEFAULTS,
  DEFAULT_SAFETY_FACTOR,
} from '../src';

describe('OUTREACH_DEFAULTS', () => {
  it('mail-only carries 5–10 % range with avg 7 %', () => {
    expect(OUTREACH_DEFAULTS['mail-only']).toEqual({
      rateMin: 0.05,
      rateMax: 0.1,
      rateAvg: 0.07,
      label: 'Nur Briefe',
    });
  });

  it('mail-plus-phone carries 30–50 % range with avg 40 %', () => {
    expect(OUTREACH_DEFAULTS['mail-plus-phone']).toEqual({
      rateMin: 0.3,
      rateMax: 0.5,
      rateAvg: 0.4,
      label: 'Briefe + Telefon-Nachfasser',
    });
  });

  it('exposes a default safety factor of 1.5', () => {
    expect(DEFAULT_SAFETY_FACTOR).toBe(1.5);
  });
});

describe('suggestSampleSize — Beispielwerte aus RESEARCH.md', () => {
  it('Panel 30, mail-plus-phone → recommended 110, range [60, 150]', () => {
    const p = suggestSampleSize(30, 'mail-plus-phone');
    expect(p).not.toBeNull();
    expect(p!.recommended).toBe(110);
    expect(p!.range).toEqual([60, 150]);
    expect(p!.rateUsed).toEqual({ min: 0.3, max: 0.5, avg: 0.4 });
    expect(p!.outreach).toBe('mail-plus-phone');
    expect(p!.safetyFactor).toBe(1.5);
    expect(p!.panelSize).toBe(30);
  });

  it('Panel 30, mail-only → recommended ~640, range covers 300..900', () => {
    const p = suggestSampleSize(30, 'mail-only');
    expect(p).not.toBeNull();
    expect(p!.recommended).toBe(640);
    // ceil(30 / 0.10) = 300, ceil(30 / 0.05 × 1.5) = 900
    expect(p!.range).toEqual([300, 900]);
  });

  it('Panel 160, mail-plus-phone → recommended 600', () => {
    const p = suggestSampleSize(160, 'mail-plus-phone');
    expect(p).not.toBeNull();
    expect(p!.recommended).toBe(600);
    // ceil(160 / 0.5) = 320, ceil(160 / 0.3 × 1.5) = 800
    expect(p!.range).toEqual([320, 800]);
  });

  it('Panel 160, mail-only → recommended ~3430', () => {
    const p = suggestSampleSize(160, 'mail-only');
    expect(p).not.toBeNull();
    // round(160 / 0.07 × 1.5 / 10) × 10 = round(342.857) × 10 = 3430
    expect(p!.recommended).toBe(3430);
  });
});

describe('suggestSampleSize — Custom mode', () => {
  it('uses provided rates and computes midpoint as avg', () => {
    const p = suggestSampleSize(30, 'custom', { min: 0.15, max: 0.25 });
    expect(p).not.toBeNull();
    expect(p!.rateUsed).toEqual({ min: 0.15, max: 0.25, avg: 0.2 });
    // round(30 / 0.20 × 1.5 / 10) × 10 = round(22.5) × 10 = 230 (round-half-to-even
    // is the default in JS; Math.round(22.5) = 23 in v8, so 230)
    expect(p!.recommended).toBe(230);
    // ceil(30 / 0.25) = 120, ceil(30 / 0.15 × 1.5) = 300
    expect(p!.range).toEqual([120, 300]);
  });

  it('returns null when customRates are missing', () => {
    expect(suggestSampleSize(30, 'custom')).toBeNull();
  });

  it('returns null when customRates.min > customRates.max', () => {
    expect(
      suggestSampleSize(30, 'custom', { min: 0.5, max: 0.1 }),
    ).toBeNull();
  });

  it('returns null on rate of 0 (would divide by zero)', () => {
    expect(suggestSampleSize(30, 'custom', { min: 0, max: 0.5 })).toBeNull();
  });

  it('returns null on rate > 1', () => {
    expect(suggestSampleSize(30, 'custom', { min: 0.5, max: 1.5 })).toBeNull();
  });

  it('accepts equal min and max (point estimate)', () => {
    const p = suggestSampleSize(40, 'custom', { min: 0.4, max: 0.4 });
    expect(p).not.toBeNull();
    expect(p!.rateUsed.avg).toBe(0.4);
    // ceil(40 / 0.4) = 100, ceil(40 / 0.4 × 1.5) = 150
    expect(p!.range).toEqual([100, 150]);
  });
});

describe('suggestSampleSize — Edge cases', () => {
  it('panelSize 0 returns zero-everything proposal', () => {
    const p = suggestSampleSize(0, 'mail-plus-phone');
    expect(p).not.toBeNull();
    expect(p!.recommended).toBe(0);
    expect(p!.range).toEqual([0, 0]);
    expect(p!.panelSize).toBe(0);
  });

  it('returns null on negative panelSize', () => {
    expect(suggestSampleSize(-1, 'mail-plus-phone')).toBeNull();
    expect(suggestSampleSize(-30, 'mail-only')).toBeNull();
  });

  it('returns null on non-finite panelSize', () => {
    expect(suggestSampleSize(Number.NaN, 'mail-plus-phone')).toBeNull();
    expect(suggestSampleSize(Number.POSITIVE_INFINITY, 'mail-plus-phone')).toBeNull();
  });

  it('returns null on non-integer panelSize', () => {
    expect(suggestSampleSize(30.5, 'mail-plus-phone')).toBeNull();
  });

  it('returns null on safetyFactor <= 0', () => {
    expect(suggestSampleSize(30, 'mail-plus-phone', undefined, 0)).toBeNull();
    expect(suggestSampleSize(30, 'mail-plus-phone', undefined, -1)).toBeNull();
  });

  it('honors a custom safetyFactor', () => {
    const p = suggestSampleSize(30, 'mail-plus-phone', undefined, 1.0);
    expect(p).not.toBeNull();
    // round(30 / 0.4 × 1.0 / 10) × 10 = round(7.5) × 10 = 80 (Math.round 7.5 → 8)
    expect(p!.recommended).toBe(80);
    expect(p!.safetyFactor).toBe(1.0);
    // ceil(30 / 0.5) = 60, ceil(30 / 0.3 × 1.0) = 100
    expect(p!.range).toEqual([60, 100]);
  });
});
