// Override editor for a single axis. Renders a 4-column table (value,
// pool, baseline, override input + diff), a live sum validator, the
// mandatory rationale textarea with a non-whitespace counter, and a
// reset button.
//
// onChange contract: the editor fires onChange(override) only when the
// editor's commit conditions are met (Σ override == panel_size AND
// rationale ≥ 20 non-whitespace chars). When the user is mid-edit and
// the conditions do not hold, the editor fires onChange(null) so the
// parent disables the run button.
//
// All UI strings are German (CLAUDE.md "Sprache der Dokumente: Deutsch").
// Code comments are English (CLAUDE.md "Kommentare im Code: Englisch").

import type { Component } from 'solid-js';
import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import { nonWhitespaceLength, type SeatAllocationOverride } from './seat-allocation';
import { valueCounts } from './model';

export interface OverrideEditorProps {
  axis: string;
  baseline: Record<string, number>;
  rows: Record<string, string>[];
  panelSize: number;
  onChange: (override: SeatAllocationOverride | null) => void;
  /** Reset button calls this; parent clears axis selection + override. */
  onReset: () => void;
}

const RATIONALE_MIN = 20;

export const OverrideEditor: Component<OverrideEditorProps> = (props) => {
  // Editor-local state. Pre-fill seats from baseline so the user starts
  // at the proportional allocation and "tweaks from there".
  const [seats, setSeats] = createSignal<Record<string, number>>({ ...props.baseline });
  const [rationale, setRationale] = createSignal<string>('');

  const counts = createMemo(() => valueCounts(props.rows, props.axis));
  const sortedValues = createMemo(() => Object.keys(props.baseline).sort());

  const sumOverride = createMemo(() =>
    Object.values(seats()).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0),
  );
  const sumDelta = createMemo(() => sumOverride() - props.panelSize);
  const rationaleLen = createMemo(() => nonWhitespaceLength(rationale()));

  const commitOk = createMemo(() => sumDelta() === 0 && rationaleLen() >= RATIONALE_MIN);

  // Fire onChange whenever the editor flips between commit-ok and commit-not.
  // We always emit (override or null) so the parent's run-button disabled
  // state stays in sync as the user edits.
  createEffect(() => {
    if (commitOk()) {
      const override: SeatAllocationOverride = {
        axis: props.axis,
        seats: { ...seats() },
        rationale: rationale(),
        timestamp_iso: new Date().toISOString(),
      };
      props.onChange(override);
    } else {
      props.onChange(null);
    }
  });

  function setSeat(value: string, n: number): void {
    setSeats({ ...seats(), [value]: Number.isFinite(n) ? n : 0 });
  }

  function reset(): void {
    setSeats({ ...props.baseline });
    setRationale('');
    props.onReset();
  }

  return (
    <div
      class="space-y-4 border rounded p-4 bg-amber-50/40"
      data-testid="seat-allocation-override-editor"
    >
      <p
        class="text-sm border-l-4 border-amber-500 bg-amber-50 p-2 rounded"
        data-testid="seat-allocation-override-warning"
      >
        Du weichst von der proportionalen Bevölkerungs-Verteilung ab. Diese Entscheidung wird im
        Audit dokumentiert.
      </p>

      <table class="w-full text-xs" data-testid="seat-allocation-override-table">
        <thead class="bg-slate-100">
          <tr>
            <th class="text-left p-1">Wert</th>
            <th class="text-right p-1">im Pool</th>
            <th class="text-right p-1">Baseline</th>
            <th class="text-right p-1">Override</th>
            <th class="text-right p-1">Diff</th>
          </tr>
        </thead>
        <tbody>
          <For each={sortedValues()}>
            {(value) => {
              const baselineVal = (): number => props.baseline[value] ?? 0;
              const overrideVal = (): number => seats()[value] ?? 0;
              const delta = (): number => overrideVal() - baselineVal();
              return (
                <tr>
                  <td class="p-1">{value}</td>
                  <td class="p-1 text-right tabular-nums text-slate-500">{counts()[value] ?? 0}</td>
                  <td class="p-1 text-right tabular-nums">{baselineVal()}</td>
                  <td class="p-1 text-right">
                    <input
                      type="number"
                      class="border rounded px-1 py-0.5 w-16 text-right tabular-nums"
                      value={overrideVal()}
                      min={0}
                      onInput={(e) => setSeat(value, Number(e.currentTarget.value))}
                      data-testid={`override-input-${props.axis}-${value}`}
                    />
                  </td>
                  <td
                    class="p-1 text-right tabular-nums"
                    classList={{
                      'text-red-700': delta() < 0,
                      'text-emerald-700': delta() > 0,
                      'text-slate-500': delta() === 0,
                    }}
                  >
                    {delta() > 0 ? '+' : ''}
                    {delta()}
                  </td>
                </tr>
              );
            }}
          </For>
        </tbody>
      </table>

      <div
        class="text-sm tabular-nums"
        data-testid="seat-allocation-sum-validator"
        classList={{
          'text-red-700': sumDelta() !== 0,
          'text-emerald-700': sumDelta() === 0,
        }}
      >
        Σ Override = {sumOverride()} / Panel-Größe = {props.panelSize}
        <Show when={sumDelta() !== 0}>
          <>
            {' '}
            — noch{' '}
            <strong>
              {sumDelta() > 0 ? '−' : '+'}
              {Math.abs(sumDelta())}
            </strong>{' '}
            zu verteilen
          </>
        </Show>
      </div>

      <div class="space-y-1">
        <label class="text-sm font-medium" for={`rationale-${props.axis}`}>
          Begründung (Pflicht, mindestens {RATIONALE_MIN} Zeichen)
        </label>
        <textarea
          id={`rationale-${props.axis}`}
          class="w-full border rounded px-2 py-1 text-sm h-24"
          value={rationale()}
          onInput={(e) => setRationale(e.currentTarget.value)}
          placeholder="Warum wird vom proportionalen Vorschlag abgewichen?"
          data-testid="seat-allocation-rationale"
        />
        <div
          class="text-xs"
          data-testid="seat-allocation-rationale-counter"
          classList={{
            'text-red-700': rationaleLen() < RATIONALE_MIN,
            'text-emerald-700': rationaleLen() >= RATIONALE_MIN,
          }}
        >
          {rationaleLen()}/{RATIONALE_MIN} Zeichen — Pflicht-Begründung
        </div>
      </div>

      <div class="flex justify-between items-center">
        <button
          type="button"
          class="text-xs underline text-slate-600"
          onClick={reset}
          data-testid="seat-allocation-reset"
        >
          Zurück zur statistischen Baseline
        </button>
        <span
          class="status-pill"
          classList={{
            'status-pill-ok': commitOk(),
            'status-pill-warn': !commitOk(),
          }}
          data-testid="seat-allocation-commit-status"
        >
          {commitOk() ? 'bereit zum Speichern' : 'noch nicht bereit'}
        </span>
      </div>
    </div>
  );
};
