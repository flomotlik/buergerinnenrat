import { For } from 'solid-js';
import type { Component } from 'solid-js';
import {
  computeHamiltonAllocation,
  TOY_STRATA,
  TOY_TARGET_N,
  TOY_TOTAL_POOL,
} from './hamilton';

// Re-export so callers (and tests) can import either the math or the SVG
// from the same place; keeps consumers from caring about the internal split.
export {
  computeHamiltonAllocation,
  TOY_STRATA,
  TOY_TARGET_N,
  TOY_TOTAL_POOL,
};
export type { HamiltonRow, ToyStratum } from './hamilton';

/** SVG layout constants; tweak together to keep boxes evenly spaced. */
const BOX_W = 140;
const BOX_H = 130;
const BOX_GAP = 8;
const PADDING_X = 8;

/**
 * Hamilton-Apportionment toy walkthrough as native SVG. One box per stratum,
 * each box shows pool → quote → floor + bonus → final as a 5-line mini-table.
 * Bonus boxes get an amber border so the leftover-seat flow is visually
 * traceable. Visual style matches `apps/web/src/stage1/AxisBreakdown.tsx`.
 */
const HamiltonSvg: Component = () => {
  const rows = computeHamiltonAllocation(TOY_STRATA, TOY_TARGET_N, TOY_TOTAL_POOL);
  const totalWidth = PADDING_X * 2 + rows.length * BOX_W + (rows.length - 1) * BOX_GAP;

  return (
    <div
      class="overflow-x-auto border rounded p-3 bg-white"
      data-testid="hamilton-svg-container"
    >
      <svg
        viewBox={`0 0 ${totalWidth} ${BOX_H + 24}`}
        width={totalWidth}
        height={BOX_H + 24}
        class="text-xs"
        role="img"
        aria-label="Hamilton-Allokation Toy-Beispiel: 100 Personen, 10 ziehen, 6 Bevölkerungsgruppen"
        data-testid="hamilton-svg"
      >
        <desc>
          Toy-Beispiel: Pool 100 Personen, Ziel 10 Personen, 6 Bevölkerungsgruppen
          (Bezirk A/B/C × Geschlecht w/m). Hamilton-Verfahren: Soll = Pool/Gesamt
          × Ziel. Ganzzahl-Anteil (Floor) wird vergeben; die größten Brüche
          (Remainder) bekommen die übrigen Sitze.
        </desc>
        <For each={rows}>
          {(r, i) => {
            const x = PADDING_X + i() * (BOX_W + BOX_GAP);
            const isBonus = r.bonus > 0;
            return (
              <g>
                <rect
                  x={x}
                  y={6}
                  width={BOX_W}
                  height={BOX_H}
                  fill={isBonus ? '#fef3c7' : '#f8fafc'}
                  stroke={isBonus ? '#f59e0b' : '#cbd5e1'}
                  stroke-width={isBonus ? 1.5 : 1}
                  rx={4}
                />
                <text
                  x={x + 8}
                  y={24}
                  font-weight="600"
                  fill="#0f172a"
                  font-size="11"
                >
                  {r.label}
                </text>
                <text x={x + 8} y={42} fill="#1e293b" font-size="10">
                  Pool: {r.pool}
                </text>
                <text x={x + 8} y={58} fill="#1e293b" font-size="10">
                  Soll: {r.pool}/100·10 = {r.quote.toFixed(1)}
                </text>
                <text x={x + 8} y={74} fill="#1e293b" font-size="10">
                  Floor: {r.floor}, Bruch: {r.remainder.toFixed(1)}
                </text>
                <text x={x + 8} y={90} fill="#1e293b" font-size="10">
                  Bonus: {r.bonus} (Rang {r.remainderRank})
                </text>
                <text
                  x={x + 8}
                  y={114}
                  font-weight="700"
                  fill={isBonus ? '#92400e' : '#0f172a'}
                  font-size="13"
                >
                  Final: {r.final}
                </text>
              </g>
            );
          }}
        </For>
      </svg>
      <p class="text-xs text-slate-600 mt-2">
        Summe Floor: {rows.reduce((a, r) => a + r.floor, 0)} ·{' '}
        Bonus-Sitze: {rows.reduce((a, r) => a + r.bonus, 0)} ·{' '}
        Final: {rows.reduce((a, r) => a + r.final, 0)}
      </p>
    </div>
  );
};

export default HamiltonSvg;
