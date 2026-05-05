// SeatAllocationPanel orchestrates baseline display + axis picker +
// (optional) override editor for Stage-3. State for the parent (App.tsx)
// is just the SeatAllocationOverride or null; this panel manages local
// axis-selection state and forwards override commits.

import type { Component } from 'solid-js';
import { createMemo, createSignal, For, Show } from 'solid-js';
import { computeBaseline, type SeatAllocationOverride } from './seat-allocation';
import { OverrideEditor } from './OverrideEditor';

export interface SeatAllocationPanelProps {
  rows: Record<string, string>[];
  panelSize: number;
  /** Candidate axes (CSV columns minus person_id). One axis at a time. */
  axes: string[];
  /** Fired with the override (commit-ready) or null (cleared / mid-edit). */
  onChange: (override: SeatAllocationOverride | null) => void;
}

export const SeatAllocationPanel: Component<SeatAllocationPanelProps> = (props) => {
  const [selectedAxis, setSelectedAxis] = createSignal<string | null>(null);

  const baseline = createMemo(() => computeBaseline(props.rows, props.panelSize, props.axes));
  const sortedAxes = createMemo(() => [...props.axes].sort());

  function clearAxis(): void {
    setSelectedAxis(null);
    props.onChange(null);
  }

  function pickAxis(axis: string): void {
    if (axis === '') {
      clearAxis();
      return;
    }
    setSelectedAxis(axis);
  }

  return (
    <section class="space-y-4 border rounded p-4 bg-white" data-testid="seat-allocation-panel">
      <header class="flex items-baseline justify-between">
        <h3 class="text-base font-semibold">Sitz-Allokation</h3>
        <span class="text-xs text-slate-500">
          Statistische Baseline + optionales 1-D Achsen-Override
        </span>
      </header>

      <div class="border rounded" data-testid="seat-allocation-baseline">
        <table class="w-full text-xs">
          <thead class="bg-slate-50">
            <tr>
              <th class="text-left p-1">Achse</th>
              <th class="text-left p-1">Wert</th>
              <th class="text-right p-1">Sitze (Baseline)</th>
            </tr>
          </thead>
          <tbody>
            <For each={sortedAxes()}>
              {(axis) => {
                const axisBase = (): Record<string, number> => baseline()[axis] ?? {};
                return (
                  <For each={Object.keys(axisBase()).sort()}>
                    {(value) => (
                      <tr>
                        <td class="p-1 font-mono text-slate-600">{axis}</td>
                        <td class="p-1">{value}</td>
                        <td class="p-1 text-right tabular-nums">{axisBase()[value]}</td>
                      </tr>
                    )}
                  </For>
                );
              }}
            </For>
          </tbody>
        </table>
      </div>

      <div class="flex items-center gap-2">
        <label class="text-sm">Override aktivieren für:</label>
        <select
          class="text-sm border rounded px-2 py-1"
          value={selectedAxis() ?? ''}
          onChange={(e) => pickAxis(e.currentTarget.value)}
          data-testid="seat-allocation-axis-picker"
        >
          <option value="">— keine Achse (Baseline verwenden) —</option>
          <For each={sortedAxes()}>{(a) => <option value={a}>{a}</option>}</For>
        </select>
      </div>

      <Show when={selectedAxis()}>
        {(axis) => (
          <OverrideEditor
            axis={axis()}
            baseline={baseline()[axis()] ?? {}}
            rows={props.rows}
            panelSize={props.panelSize}
            onChange={props.onChange}
            onReset={clearAxis}
          />
        )}
      </Show>
    </section>
  );
};
