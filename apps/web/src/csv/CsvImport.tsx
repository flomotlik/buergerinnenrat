import { Component, createSignal, For, Show } from 'solid-js';
import { autoGuessMapping, parseCsvFile, SEMANTIC_FIELDS, validateMapping } from './parse';
import type { ColumnMapping, ParsedCsv, SemanticField } from './parse';

export interface CsvImportProps {
  onLoaded: (data: { parsed: ParsedCsv; mapping: ColumnMapping }) => void;
}

export const CsvImport: Component<CsvImportProps> = (props) => {
  const [parsed, setParsed] = createSignal<ParsedCsv | null>(null);
  const [mapping, setMapping] = createSignal<ColumnMapping>({});
  const [error, setError] = createSignal<string | null>(null);

  async function handleFile(file: File) {
    try {
      const p = await parseCsvFile(file);
      const m = autoGuessMapping(p.headers);
      setParsed(p);
      setMapping(m);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function onDrop(ev: DragEvent) {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0];
    if (file) void handleFile(file);
  }

  function setColumn(col: string, target: SemanticField | '__ignore__') {
    setMapping({ ...mapping(), [col]: target });
  }

  function commit() {
    const p = parsed();
    if (!p) return;
    const v = validateMapping(p.rows, mapping());
    if (!v.ok) {
      setError(v.errors.join(' '));
      return;
    }
    props.onLoaded({ parsed: p, mapping: mapping() });
  }

  const validation = () => {
    const p = parsed();
    if (!p) return null;
    return validateMapping(p.rows, mapping());
  };

  return (
    <section class="space-y-4">
      <div
        data-testid="csv-dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        class="border-2 border-dashed border-slate-300 rounded-md p-6 text-center bg-white"
      >
        <p class="text-sm text-slate-600">CSV hier hineinziehen oder Datei wählen.</p>
        <input
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          class="mt-2"
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </div>

      <Show when={error()}>
        <p class="text-sm text-red-700" data-testid="csv-error">{error()}</p>
      </Show>

      <Show when={parsed()}>
        {(p) => (
          <div class="space-y-4">
            <div class="text-sm text-slate-700">
              {p().rows.length} Zeilen, Trenner <code>{p().separator === '\t' ? 'TAB' : p().separator}</code>,
              Encoding <code>{p().encoding}</code>
            </div>

            <table class="w-full text-xs border-collapse" data-testid="csv-preview">
              <thead>
                <tr>
                  <For each={p().headers}>{(h) => <th class="border px-2 py-1 bg-slate-100 text-left">{h}</th>}</For>
                </tr>
                <tr>
                  <For each={p().headers}>
                    {(h) => (
                      <td class="border px-1 py-1">
                        <select
                          class="w-full text-xs"
                          value={mapping()[h] ?? '__ignore__'}
                          onChange={(e) => setColumn(h, e.currentTarget.value as SemanticField | '__ignore__')}
                          data-testid={`csv-map-${h}`}
                        >
                          <option value="__ignore__">(ignorieren)</option>
                          <For each={SEMANTIC_FIELDS}>
                            {(f) => <option value={f}>{f}</option>}
                          </For>
                        </select>
                      </td>
                    )}
                  </For>
                </tr>
              </thead>
              <tbody>
                <For each={p().rows.slice(0, 10)}>
                  {(row) => (
                    <tr>
                      <For each={p().headers}>
                        {(h) => <td class="border px-2 py-1">{row[h] ?? ''}</td>}
                      </For>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>

            <Show when={validation()}>
              {(v) => (
                <div class="space-y-1 text-sm">
                  <Show when={!v().ok}>
                    <p class="text-red-700" data-testid="csv-validation-error">
                      <For each={v().errors}>{(err) => <span>{err} </span>}</For>
                    </p>
                  </Show>
                  <Show when={v().ok}>
                    <p class="text-green-700" data-testid="csv-validation-ok">
                      Mapping ok — {p().rows.length} Personen, {Object.values(mapping()).filter((m) => m !== '__ignore__').length} Felder.
                    </p>
                  </Show>
                </div>
              )}
            </Show>

            <button
              type="button"
              class="px-3 py-1.5 bg-slate-900 text-white rounded text-sm disabled:opacity-50"
              disabled={!validation()?.ok}
              onClick={commit}
              data-testid="csv-commit"
            >
              Pool übernehmen
            </button>
          </div>
        )}
      </Show>
    </section>
  );
};
