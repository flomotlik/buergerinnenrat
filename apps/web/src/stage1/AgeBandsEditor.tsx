import type { Component } from 'solid-js';
import { For, Show } from 'solid-js';
import { validateBands, type AgeBand } from '../csv/derive';
import { addBandTo, removeBandAt, resetToDefaults } from './age-bands-helpers';

// Editor for the altersgruppe band configuration (selection vs display-only).
//
// Behavior contract:
//   - Controlled: bands signal lives in the parent; this component only
//     emits onBandsChange(next) with a freshly-cloned array.
//   - Inputs commit on `change` (i.e. blur), NOT on `input` — typing "1"
//     intending "10" must not trigger a re-derivation mid-stroke.
//   - Validation runs on every change; errors are German user-facing
//     messages from validateBands().
//
// Pure helpers (addBandTo / removeBandAt / resetToDefaults) live in a
// sibling .ts module so unit tests can import them without dragging in
// Solid's client runtime.

export interface AgeBandsEditorProps {
  bands: () => AgeBand[];
  onBandsChange: (next: AgeBand[]) => void;
  refYear: number;
}

// Re-export so consumers needing the helpers can keep a single import site.
export { addBandTo, removeBandAt, resetToDefaults } from './age-bands-helpers';

export const AgeBandsEditor: Component<AgeBandsEditorProps> = (props) => {
  function commit(next: AgeBand[]): void {
    props.onBandsChange(next);
  }

  function setBandField<K extends keyof AgeBand>(
    index: number,
    key: K,
    value: AgeBand[K],
  ): void {
    const next = props.bands().map((b, i) => (i === index ? { ...b, [key]: value } : { ...b }));
    commit(next);
  }

  function setOpen(index: number, open: boolean): void {
    const cur = props.bands()[index];
    if (!cur) return;
    if (open) {
      setBandField(index, 'max', null);
    } else {
      // Re-close: pick the previous numeric max if we have one, else min+9.
      const fallback = cur.min + 9;
      setBandField(index, 'max', fallback);
    }
  }

  function parseIntCell(raw: string): number {
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    return Math.trunc(n);
  }

  const validationMsg = (): string | null => validateBands(props.bands());

  const summary = () => {
    const bs = props.bands();
    const sel = bs.filter((b) => b.mode === 'selection').length;
    const dis = bs.filter((b) => b.mode === 'display-only').length;
    return `Bänder gültig — ${bs.length} Bänder, davon ${sel} Auswahl, ${dis} nur Anzeige.`;
  };

  return (
    <fieldset
      class="border rounded p-3 space-y-2"
      data-testid="stage1-age-bands-editor"
    >
      <legend class="text-sm font-semibold px-1">
        Altersgruppen-Bänder (berechnet aus geburtsjahr)
      </legend>
      <p class="text-xs text-slate-600">
        Stichtag: {props.refYear}. Bänder mit Modus 'nur Anzeige' werden nicht in die Auswahl
        gezogen — die Personen bleiben aber im Pool.
      </p>
      <ul class="space-y-2">
        <For each={props.bands()}>
          {(b, i) => (
            <li class="flex flex-wrap items-center gap-2 text-sm">
              <label class="inline-flex items-center gap-1">
                <span class="text-xs text-slate-500">Min</span>
                <input
                  type="number"
                  min="0"
                  max="120"
                  step="1"
                  class="input-base w-20 tabular-nums"
                  data-testid={`band-min-${i()}`}
                  value={b.min}
                  onChange={(e) => setBandField(i(), 'min', parseIntCell(e.currentTarget.value))}
                />
              </label>
              <label class="inline-flex items-center gap-1">
                <span class="text-xs text-slate-500">Max</span>
                <input
                  type="number"
                  min="0"
                  max="120"
                  step="1"
                  class="input-base w-20 tabular-nums"
                  data-testid={`band-max-${i()}`}
                  value={b.max ?? ''}
                  disabled={b.max === null}
                  onChange={(e) => setBandField(i(), 'max', parseIntCell(e.currentTarget.value))}
                />
              </label>
              <label class="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  data-testid={`band-open-${i()}`}
                  checked={b.max === null}
                  onChange={(e) => setOpen(i(), e.currentTarget.checked)}
                />
                <span class="text-xs text-slate-500">offen</span>
              </label>
              <label class="inline-flex items-center gap-1">
                <span class="text-xs text-slate-500">Label</span>
                <input
                  type="text"
                  class="input-base w-32"
                  data-testid={`band-label-${i()}`}
                  value={b.label}
                  onChange={(e) => setBandField(i(), 'label', e.currentTarget.value)}
                />
              </label>
              <fieldset class="inline-flex items-center gap-3 ml-2">
                <label class="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    name={`band-mode-${i()}`}
                    data-testid={`band-mode-${i()}-selection`}
                    checked={b.mode === 'selection'}
                    onChange={() => setBandField(i(), 'mode', 'selection')}
                  />
                  <span class="text-xs">Auswahl</span>
                </label>
                <label class="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    name={`band-mode-${i()}`}
                    data-testid={`band-mode-${i()}-display`}
                    checked={b.mode === 'display-only'}
                    onChange={() => setBandField(i(), 'mode', 'display-only')}
                  />
                  <span class="text-xs">nur Anzeige</span>
                </label>
              </fieldset>
              <button
                type="button"
                class="btn-secondary text-xs ml-auto"
                data-testid={`band-remove-${i()}`}
                disabled={props.bands().length <= 1}
                onClick={() => commit(removeBandAt(props.bands(), i()))}
              >
                Entfernen
              </button>
            </li>
          )}
        </For>
      </ul>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="btn-secondary text-xs"
          data-testid="bands-add"
          onClick={() => commit(addBandTo(props.bands()))}
        >
          Band hinzufügen
        </button>
        <button
          type="button"
          class="btn-secondary text-xs"
          data-testid="bands-reset"
          onClick={() => commit(resetToDefaults())}
        >
          Vorschlag wiederherstellen
        </button>
      </div>
      <div data-testid="bands-validation">
        <Show when={validationMsg() !== null}>
          <p class="text-sm text-red-700">{validationMsg()}</p>
        </Show>
        <Show when={validationMsg() === null}>
          <p class="text-sm text-emerald-700">{summary()}</p>
        </Show>
      </div>
    </fieldset>
  );
};
