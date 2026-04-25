import { Component, For } from 'solid-js';

export interface AxisPickerProps {
  /** All CSV column headers in original order. */
  headers: string[];
  /** Headers that the heuristic recommends as default axes. */
  defaultAxes: string[];
  /** Currently selected axes (controlled by the parent). */
  selected: () => string[];
  /** Called when a checkbox is toggled. */
  onToggle: (header: string) => void;
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

  return (
    <fieldset class="space-y-1" data-testid="stage1-axis-picker">
      <legend class="text-sm font-semibold mb-2">Stratifikations-Achsen</legend>
      <For each={props.headers}>
        {(h) => (
          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isSelected(h)}
              onChange={() => props.onToggle(h)}
              data-testid={`axis-checkbox-${h}`}
            />
            <span class={isSelected(h) ? 'font-medium' : ''}>{h}</span>
            {isDefault(h) ? (
              <span class="ml-1 px-1.5 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-800">
                vorgeschlagen
              </span>
            ) : null}
          </label>
        )}
      </For>
    </fieldset>
  );
};
