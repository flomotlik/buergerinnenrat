import { Component, createSignal, For, Show, createMemo } from 'solid-js';
import {
  emptyCategory,
  quotaConfigFromJson,
  quotaConfigToJson,
  uniqueValues,
  validateQuotas,
  valueCounts,
} from './model';
import type { QuotaConfig } from './model';

export interface QuotaEditorProps {
  rows: Record<string, string>[];
  candidateColumns: string[];
  onChange: (config: QuotaConfig) => void;
}

export const QuotaEditor: Component<QuotaEditorProps> = (props) => {
  const [config, setConfig] = createSignal<QuotaConfig>({
    panel_size: 30,
    categories: [],
  });

  const validation = createMemo(() => validateQuotas(props.rows, config()));

  function emit(next: QuotaConfig) {
    setConfig(next);
    props.onChange(next);
  }

  function setPanelSize(n: number) {
    emit({ ...config(), panel_size: n });
  }

  function addCategory(col: string) {
    if (!col) return;
    if (config().categories.some((c) => c.column === col)) return;
    const values = uniqueValues(props.rows, col);
    emit({
      ...config(),
      categories: [...config().categories, emptyCategory(col, values, config().panel_size)],
    });
  }

  function removeCategory(col: string) {
    emit({ ...config(), categories: config().categories.filter((c) => c.column !== col) });
  }

  function setBound(col: string, val: string, key: 'min' | 'max', n: number) {
    emit({
      ...config(),
      categories: config().categories.map((c) =>
        c.column !== col ? c : {
          ...c,
          bounds: {
            ...c.bounds,
            [val]: { ...c.bounds[val]!, [key]: n },
          },
        },
      ),
    });
  }

  function exportJson() {
    const blob = new Blob([quotaConfigToJson(config())], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quotas.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        emit(quotaConfigFromJson(reader.result as string));
      } catch (err) {
        // we surface the error via console; UI is bare-bones in iteration 1
        console.error(err);
      }
    };
    reader.readAsText(file);
  }

  return (
    <section class="space-y-4" data-testid="quota-editor">
      <div class="flex items-center gap-2">
        <label class="text-sm">Panel-Größe</label>
        <input
          type="number"
          min={10}
          max={props.rows.length}
          value={config().panel_size}
          onInput={(e) => setPanelSize(Number(e.currentTarget.value))}
          class="border rounded px-2 py-1 w-24 text-sm"
          data-testid="quota-panel-size"
        />
      </div>

      <div class="flex items-center gap-2">
        <label class="text-sm">Kategorie hinzufügen</label>
        <select
          class="text-sm border rounded px-2 py-1"
          onChange={(e) => {
            addCategory(e.currentTarget.value);
            e.currentTarget.value = '';
          }}
          data-testid="quota-add-category"
        >
          <option value="">— wählen —</option>
          <For each={props.candidateColumns}>
            {(c) => <option value={c}>{c}</option>}
          </For>
        </select>
        <button class="text-sm border rounded px-2 py-1 bg-white" onClick={exportJson} data-testid="quota-export">
          JSON exportieren
        </button>
        <input
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            if (f) importJson(f);
          }}
          class="text-xs"
          data-testid="quota-import"
        />
      </div>

      <For each={config().categories}>
        {(cat) => {
          const counts = valueCounts(props.rows, cat.column);
          const valVal = validation().per_category.find((v) => v.column === cat.column);
          return (
            <div class="border rounded p-3 bg-white" data-testid={`quota-cat-${cat.column}`}>
              <div class="flex justify-between items-center mb-2">
                <h3 class="font-semibold text-sm">{cat.column}</h3>
                <button class="text-xs text-red-600" onClick={() => removeCategory(cat.column)}>
                  entfernen
                </button>
              </div>
              <table class="w-full text-xs">
                <thead>
                  <tr class="text-left">
                    <th class="py-1">Wert</th>
                    <th class="py-1">im Pool</th>
                    <th class="py-1">min</th>
                    <th class="py-1">max</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={Object.keys(cat.bounds).sort()}>
                    {(val) => (
                      <tr>
                        <td class="py-1 pr-2">{val}</td>
                        <td class="py-1 pr-2 tabular-nums text-slate-500">{counts[val] ?? 0}</td>
                        <td class="py-1 pr-2">
                          <input
                            type="number"
                            class="border rounded px-1 w-16"
                            value={cat.bounds[val]!.min}
                            min={0}
                            onInput={(e) =>
                              setBound(cat.column, val, 'min', Number(e.currentTarget.value))
                            }
                            data-testid={`quota-${cat.column}-${val}-min`}
                          />
                        </td>
                        <td class="py-1 pr-2">
                          <input
                            type="number"
                            class="border rounded px-1 w-16"
                            value={cat.bounds[val]!.max}
                            min={0}
                            onInput={(e) =>
                              setBound(cat.column, val, 'max', Number(e.currentTarget.value))
                            }
                            data-testid={`quota-${cat.column}-${val}-max`}
                          />
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
              <Show when={valVal && (valVal.errors.length > 0 || valVal.warnings.length > 0)}>
                <div class="mt-2 text-xs">
                  <For each={valVal!.errors}>{(e) => <p class="text-red-700">{e}</p>}</For>
                  <For each={valVal!.warnings}>{(w) => <p class="text-amber-700">{w}</p>}</For>
                </div>
              </Show>
            </div>
          );
        }}
      </For>

      <Show when={validation().panel_errors.length}>
        <div class="text-xs text-red-700" data-testid="quota-panel-errors">
          <For each={validation().panel_errors}>{(e) => <p>{e}</p>}</For>
        </div>
      </Show>

      <p class="text-xs text-slate-600" data-testid="quota-status">
        {validation().ok ? 'Quoten gültig.' : 'Quoten haben Fehler.'}
      </p>
    </section>
  );
};
