/**
 * Local mirror of the Grüne-AT design-system chart palette.
 *
 * Source of truth is the design-system at
 * `https://grueneat.github.io/design-system/gat-charts.js` (the same
 * values surface as `--gat-web-chart-1` … `--gat-web-chart-8` in
 * `design-system.css`). We mirror them here as plain TypeScript
 * constants rather than `import`-ing the CDN ES module because:
 *
 *   1. Vite's dependency optimiser does not handle remote ES-module URLs
 *      without an explicit plugin, and pulling that in just to read eight
 *      hex strings is heavier than the current copy-and-pin approach.
 *   2. The values are stable across DS minor versions; bump this file
 *      when the DS publishes a new palette and call out the source SHA
 *      in the commit message.
 *
 * SVG `fill=` / `stroke=` cannot read CSS custom properties, so the
 * chart code in `stage1/AxisBreakdown.tsx` consumes these constants
 * directly. Anything that lives in CSS / class names should keep using
 * `var(--gat-web-chart-…)` from `design-system.css`.
 *
 * Phase 2 of issue #12 may revisit this once the OkLCH token layer is
 * retired and we can drive the SVG attributes from `getComputedStyle()`
 * lookups instead.
 */
export const GAT_CHART_PALETTE = {
  /** Revenue / primary green — `--gat-web-chart-1` */
  green: '#3f7d4f',
  /** Personnel / secondary green — `--gat-web-chart-2` */
  greenSoft: '#6ba368',
  /** Personnel / teal — `--gat-web-chart-3` */
  teal: '#4f93a0',
  /** Supplies / ochre — `--gat-web-chart-4` */
  ochre: '#c9a24b',
  /** Expenses / risk / terracotta — `--gat-web-chart-5` */
  terracotta: '#b9744f',
  /** Transfers / plum — `--gat-web-chart-6` */
  plum: '#9c5b7d',
  /** Net result / slate — `--gat-web-chart-7` */
  slate: '#5d6b8a',
  /** Other / olive-gray — `--gat-web-chart-8` */
  olive: '#8a8f7d',
} as const;

/**
 * Ordered palette tuple matching the DS `PALETTE[0]`…`PALETTE[7]` shape
 * used by `gat-charts.js`. Consumers that loop over categorical series
 * can index into this directly.
 */
export const GAT_CHART_PALETTE_ORDERED = [
  GAT_CHART_PALETTE.green,
  GAT_CHART_PALETTE.greenSoft,
  GAT_CHART_PALETTE.teal,
  GAT_CHART_PALETTE.ochre,
  GAT_CHART_PALETTE.terracotta,
  GAT_CHART_PALETTE.plum,
  GAT_CHART_PALETTE.slate,
  GAT_CHART_PALETTE.olive,
] as const;

/**
 * Greyscale / ink shades for chart support (axis labels, secondary text,
 * pattern fills). Mirrors `--gat-web-ink-*` from the DS so we can keep
 * SVG-attribute parity with the CSS layer without inline `oklch()` calls
 * that some SVG renderers still resolve inconsistently.
 */
export const GAT_CHART_INK = {
  /** Primary ink — strongest text on white */
  primary: '#1e293b',
  /** Secondary ink — labels, axis ticks */
  secondary: '#475569',
  /** Tertiary ink — hairlines, stripes, low-emphasis */
  hairline: '#94a3b8',
  /** Background tint behind striped patterns */
  hairlineSoft: '#e2e8f0',
} as const;
