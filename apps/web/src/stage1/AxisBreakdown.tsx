import { Component, For, Show } from 'solid-js';
import type { MarginalsForAxis } from '@sortition/core';

interface Props {
  marginals: MarginalsForAxis;
  /** When true, show only Soll bars (used for pre-run preview before draw). */
  previewMode?: boolean;
}

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
    Math.max(
      1,
      ...props.marginals.buckets.map((b) =>
        Math.max(b.pool, b.target, b.actual),
      ),
    );

  // Layout constants in SVG-units. The bars are 200 user-units wide; scale
  // is `value / max() * 200`. Each row is 28 units tall.
  const BAR_W = 200;
  const ROW_H = 28;

  const rowCount = () => props.marginals.buckets.length;
  const svgHeight = () => rowCount() * ROW_H + 12;

  return (
    <div
      class="border rounded p-3 bg-white"
      data-testid={`stage1-axis-breakdown-${props.marginals.axis}`}
    >
      <h3 class="text-sm font-semibold mb-2">
        Merkmal: <span class="font-mono">{props.marginals.axis}</span>{' '}
        <span class="text-xs text-slate-500 font-normal">
          ({props.marginals.buckets.length} Werte, gesamt Soll{' '}
          {props.marginals.totalTarget}
          {!props.previewMode && `, Ist ${props.marginals.totalActual}`})
        </span>
      </h3>
      <Show when={props.marginals.buckets.length > 0} fallback={<p class="text-xs text-slate-500">(keine Werte)</p>}>
        <div class="overflow-x-auto">
          <svg
            width={BAR_W + 250}
            height={svgHeight()}
            class="text-xs"
            role="img"
            aria-label={`Verteilung des Merkmals ${props.marginals.axis}`}
          >
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
                      fill="#1e293b"
                    >
                      {b.value}
                    </text>
                    {/* Soll bar (grey) */}
                    <rect
                      x={120}
                      y={y + 2}
                      width={sollW}
                      height={9}
                      fill="#94a3b8"
                    />
                    {/* Ist bar (blue) — only when not in preview mode */}
                    <Show when={!props.previewMode}>
                      <rect
                        x={120}
                        y={y + 13}
                        width={istW}
                        height={9}
                        fill="#3b82f6"
                      />
                    </Show>
                    {/* Value labels */}
                    <text
                      x={120 + Math.max(sollW, istW) + 6}
                      y={y + 13}
                      font-size="10"
                      fill="#475569"
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
          <div class="flex gap-4 text-xs text-slate-600 mt-2 print:hidden">
            <span class="flex items-center gap-1">
              <span class="inline-block w-3 h-3 bg-slate-400" /> Soll
            </span>
            <span class="flex items-center gap-1">
              <span class="inline-block w-3 h-3 bg-blue-500" /> Ist
            </span>
          </div>
        </Show>
      </Show>
    </div>
  );
};
