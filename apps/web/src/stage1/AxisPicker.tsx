import type { Component } from 'solid-js';
import { For, Show } from 'solid-js';

export interface AxisPickerProps {
  /** All CSV column headers in original order. */
  headers: string[];
  /** Headers that the heuristic recommends as default axes. */
  defaultAxes: string[];
  /** Currently selected axes (controlled by the parent). */
  selected: () => string[];
  /** Called when a checkbox is toggled. */
  onToggle: (header: string) => void;
  /**
   * Headers synthesized by the parser (e.g. `altersgruppe`). Marked with a
   * "berechnet" badge so the operator can tell pure CSV columns apart from
   * derived ones. (Issue #62.)
   */
  derivedColumns?: string[];
  /**
   * Per-axis description used as the `title` attribute on the small `?`
   * info icon next to the axis label. Headers without an entry render no
   * icon. (Issue #62.)
   */
  axisDescriptions?: Record<string, string>;
  /**
   * Per-axis distinct-value count for the loaded CSV. When a selected axis
   * has > 15 distinct values, the picker renders an amber warning under the
   * checkbox list. (Issue #62.)
   */
  distinctValueCounts?: Record<string, number>;
}

/**
 * Solid component for picking stratification axes from the CSV's headers.
 * The parent owns the `selected[]` signal — this component is a pure view.
 *
 * Headers in `defaultAxes` are visually marked as recommended, but selection
 * is fully under user control (any header can be a stratum axis).
 */
export const AxisPicker: Component<AxisPickerProps> = (props) => {
  const isSelected = (h: string) => props.selected().includes(h);
  const isDefault = (h: string) => props.defaultAxes.includes(h);
  const isDerived = (h: string) => props.derivedColumns?.includes(h) ?? false;
  const description = (h: string) => props.axisDescriptions?.[h];

  // Issue #62: distinct-value warnings only show for axes the user has
  // currently selected — listing every header would be noise.
  const highCardinalityWarnings = () => {
    const counts = props.distinctValueCounts ?? {};
    return props
      .selected()
      .filter((h) => (counts[h] ?? 0) > 15)
      .map((h) => ({ axis: h, n: counts[h]! }));
  };

  return (
    <fieldset class="space-y-3" data-testid="stage1-axis-picker">
      <legend class="text-sm font-semibold mb-2 text-ink">
        Aufteilungs-Merkmale (Stratifikations-Achsen)
      </legend>
      {/* Chip-styled checkboxes — the underlying <input type="checkbox"> is
          preserved (axis-checkbox-<h> testid) but visually hidden via
          .sr-only; the .chip wrapper is the visible tap surface. */}
      <div class="flex flex-wrap gap-2">
        <For each={props.headers}>
          {(h) => (
            <label
              class="chip"
              classList={{ 'is-on': isSelected(h) }}
              data-testid={`stage1-axis-pill-${h}`}
            >
              <input
                type="checkbox"
                class="sr-only"
                checked={isSelected(h)}
                onChange={() => props.onToggle(h)}
                data-testid={`axis-checkbox-${h}`}
              />
              <span>{h}</span>
              <Show when={isDefault(h)}>
                <span class="ml-1 px-1.5 py-0.5 text-[10px] rounded bg-ok-soft text-ok">
                  vorgeschlagen
                </span>
              </Show>
              <Show when={isDerived(h)}>
                <span
                  class="ml-1 px-1.5 py-0.5 text-[10px] rounded bg-accent-soft text-accent-ink"
                  data-testid={`axis-badge-derived-${h}`}
                >
                  berechnet
                </span>
              </Show>
              <Show when={description(h)}>
                <span
                  class="ml-1 inline-block w-4 h-4 text-[10px] text-ink-3 cursor-help text-center"
                  title={description(h)}
                  data-testid={`axis-info-${h}`}
                >
                  ?
                </span>
              </Show>
            </label>
          )}
        </For>
      </div>
      <Show when={highCardinalityWarnings().length > 0}>
        <div class="mt-2 space-y-1">
          <For each={highCardinalityWarnings()}>
            {(w) => (
              <p data-testid={`axis-warn-distinct-${w.axis}`} class="text-xs text-warn">
                Achse `{w.axis}` hat {w.n} verschiedene Werte. Viele Strata werden 0 Personen
                erhalten. Erwägen Sie, ähnliche Werte zusammenzufassen (Feature kommt mit #63).
              </p>
            )}
          </For>
        </div>
      </Show>
    </fieldset>
  );
};
