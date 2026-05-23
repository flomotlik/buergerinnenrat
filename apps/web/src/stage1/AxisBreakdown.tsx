import type { Component } from 'solid-js';
import { For, Show } from 'solid-js';
import type { MarginalsForAxis } from '@sortition/core';
import { GAT_CHART_INK, GAT_CHART_PALETTE } from '../lib/ds-palette';

interface Props {
  marginals: MarginalsForAxis;
  /** When true, show only Soll bars (used for pre-run preview before draw). */
  previewMode?: boolean;
}

// DS-aligned chart colours. SVG attributes can't read CSS custom
// properties cross-renderer, so we consume the mirrored constants from
// `lib/ds-palette.ts` directly. Source: `--gat-web-chart-*` /
// `--gat-web-ink-*` in `design-system.css` (issue #12).
const SOLL_STROKE = GAT_CHART_INK.hairline;
const SOLL_FILL = GAT_CHART_INK.hairlineSoft;
const IST_FILL = GAT_CHART_PALETTE.teal;
const LABEL_PRIMARY = GAT_CHART_INK.primary;
const LABEL_SECONDARY = GAT_CHART_INK.secondary;

/**
 * Per-axis bar chart: each axis-value gets one row with two side-by-side
 * bars (Soll grey, Ist blue) scaled to the largest pool count in this axis
 * for proportional comparison. Native SVG, no chart library — keeps the
 * Stage 1 bundle delta tight and is print-friendly.
 *
 * In `previewMode` (no actual values yet), only the Soll bar is shown.
 */
export const AxisBreakdown: Component<Props> = (props) => {
  const max = () =>
    Math.max(1, ...props.marginals.buckets.map((b) => Math.max(b.pool, b.target, b.actual)));

  // Layout constants in SVG-units. The bars are 200 user-units wide; scale
  // is `value / max() * 200`. Each row is 28 units tall.
  const BAR_W = 200;
  const ROW_H = 28;

  const rowCount = () => props.marginals.buckets.length;
  const svgHeight = () => rowCount() * ROW_H + 12;

  // Pattern ID must be unique per axis instance so multiple AxisBreakdowns
  // rendered side by side do not collide on a shared SVG <defs> id. Both
  // the pre-run preview AxisBreakdown and the post-run result AxisBreakdown
  // can be in the DOM at the same time for the same axis, so we suffix the
  // mode as well.
  const patternId = () =>
    `stripes-${props.marginals.axis}-${props.previewMode ? 'preview' : 'result'}`;

  // Compact aggregate description for the SVG <desc> element. Screen readers
  // pick this up alongside the per-bar <title> tooltips.
  const aggregateDesc = () => {
    const totalSoll = props.marginals.totalTarget;
    const totalIst = props.marginals.totalActual;
    const totalPool = props.marginals.buckets.reduce((a, b) => a + b.pool, 0);
    const n = props.marginals.buckets.length;
    const istPart = props.previewMode ? '' : `, Ist-Summe ${totalIst}`;
    return `Merkmal ${props.marginals.axis}: ${n} Werte, Pool-Summe ${totalPool}, Soll-Summe ${totalSoll}${istPart}.`;
  };

  return (
    <div
      class="border rounded p-3 bg-bg-card app-axis-breakdown"
      data-testid={`stage1-axis-breakdown-${props.marginals.axis}`}
    >
      <h3 class="text-sm font-semibold mb-2">
        Merkmal: <span class="font-mono">{props.marginals.axis}</span>{' '}
        <span class="text-xs text-ink-3 font-normal">
          ({props.marginals.buckets.length} Werte, gesamt Soll {props.marginals.totalTarget}
          {!props.previewMode && `, Ist ${props.marginals.totalActual}`})
        </span>
      </h3>
      <Show
        when={props.marginals.buckets.length > 0}
        fallback={<p class="text-xs text-ink-3">(keine Werte)</p>}
      >
        <div class="overflow-x-auto">
          <svg
            width={BAR_W + 250}
            height={svgHeight()}
            class="text-xs"
            role="img"
            aria-label={`Verteilung des Merkmals ${props.marginals.axis}`}
          >
            {/* SVG <desc> provides aggregate context for screen readers and
                printouts; per-bar <title> elements give per-value detail.
                Diagonal-stripe pattern on Soll bar lets greyscale prints
                distinguish Soll from Ist without colour. Pattern id is
                axis-scoped so multiple breakdowns do not collide. */}
            <desc>{aggregateDesc()}</desc>
            <defs>
              <pattern id={patternId()} patternUnits="userSpaceOnUse" width="6" height="6">
                <rect width="6" height="6" fill={SOLL_FILL} />
                <path d="M0,6 L6,0" stroke={SOLL_STROKE} stroke-width="1.5" />
              </pattern>
            </defs>
            <For each={props.marginals.buckets}>
              {(b, i) => {
                const y = i() * ROW_H + 6;
                const sollW = (b.target / max()) * BAR_W;
                const istW = (b.actual / max()) * BAR_W;
                return (
                  <g>
                    {/* Label column */}
                    <text
                      x={0}
                      y={y + 12}
                      font-family="ui-monospace, monospace"
                      font-size="11"
                      fill={LABEL_PRIMARY}
                    >
                      {b.value}
                    </text>
                    {/* Soll bar — diagonal-stripe pattern for greyscale print
                        distinguishability per WCAG 1.4.1 (use of colour). */}
                    <rect
                      x={120}
                      y={y + 2}
                      width={sollW}
                      height={9}
                      fill={`url(#${patternId()})`}
                      stroke={SOLL_STROKE}
                      stroke-width="0.5"
                    >
                      <title>{`Soll: ${b.target} Personen (Wert ${b.value}, Pool ${b.pool})`}</title>
                    </rect>
                    {/* Ist bar — DS chart palette (teal). Was bg-blue
                        (#3b82f6) before the design-system migration. */}
                    <Show when={!props.previewMode}>
                      <rect x={120} y={y + 13} width={istW} height={9} fill={IST_FILL}>
                        <title>{`Ist: ${b.actual} Personen (Wert ${b.value}, Soll ${b.target})`}</title>
                      </rect>
                    </Show>
                    {/* Value labels */}
                    <text
                      x={120 + Math.max(sollW, istW) + 6}
                      y={y + 13}
                      font-size="10"
                      fill={LABEL_SECONDARY}
                    >
                      Soll {b.target}
                      {!props.previewMode && ` · Ist ${b.actual}`} (Pool {b.pool})
                    </text>
                  </g>
                );
              }}
            </For>
          </svg>
        </div>
        <Show when={!props.previewMode}>
          <div class="flex gap-4 text-xs text-ink-3 mt-2">
            <span class="flex items-center gap-1">
              <span
                class="inline-block w-3 h-3 border border-line-strong"
                style={`background-image: linear-gradient(135deg, ${SOLL_STROKE} 25%, ${SOLL_FILL} 25%, ${SOLL_FILL} 50%, ${SOLL_STROKE} 50%, ${SOLL_STROKE} 75%, ${SOLL_FILL} 75%); background-size: 4px 4px;`}
              />{' '}
              Soll (gestreift)
            </span>
            <span class="flex items-center gap-1">
              <span class="inline-block w-3 h-3" style={`background-color: ${IST_FILL};`} /> Ist
            </span>
          </div>
        </Show>
      </Show>
    </div>
  );
};
