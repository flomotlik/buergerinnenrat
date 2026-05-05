import type { Component } from 'solid-js';
import { createSignal, For, Show } from 'solid-js';
import { autoGuessMapping, parseCsvFile, SEMANTIC_FIELDS, validateMapping } from './parse-csv';
import type { ColumnMapping, ParsedTable, SemanticField } from './parse-csv';
import { parseXlsxFile } from './parse-xlsx';

export interface FileImportProps {
  onLoaded: (data: { parsed: ParsedTable; mapping: ColumnMapping }) => void;
}

export const FileImport: Component<FileImportProps> = (props) => {
  const [parsed, setParsed] = createSignal<ParsedTable | null>(null);
  const [mapping, setMapping] = createSignal<ColumnMapping>({});
  const [error, setError] = createSignal<string | null>(null);

  async function handleFile(file: File) {
    try {
      // Extension-based routing — locked decision in CONTEXT.md (kein
      // Magic-Bytes-Check). SheetJS throws bubbled to the existing file-error
      // slot when the file is corrupt or password-protected.
      const ext = file.name.toLowerCase().split('.').pop();
      const p = ext === 'xlsx' ? await parseXlsxFile(file) : await parseCsvFile(file);
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
      {/* Drop-zone: visual upload target consistent with Stage 1.
          DnD wiring stays here (Stage 3 already had it pre-#56). */}
      <label
        data-testid="file-dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        class="dropzone"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="dropzone-icon"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" x2="12" y1="3" y2="15" />
        </svg>
        <span class="dropzone-label">CSV oder Excel hochladen oder hier ablegen</span>
        <span class="dropzone-hint">
          CSV (UTF-8/Latin-1) oder Excel (.xlsx) mit Header in Zeile 1
        </span>
        <input
          type="file"
          accept=".csv,.txt,text/csv,text/plain,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          class="sr-only"
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </label>

      <Show when={error()}>
        <p class="text-sm text-red-700" data-testid="file-error">
          {error()}
        </p>
      </Show>

      <Show when={parsed()}>
        {(p) => (
          <div class="space-y-4">
            <div class="text-sm text-slate-700">
              <Show
                when={p().format === 'csv'}
                fallback={
                  <>
                    {p().rows.length} Zeilen, Worksheet <code>{p().sheetName}</code>
                    <Show when={(p().sheetCount ?? 1) > 1}> (1 von {p().sheetCount})</Show>
                  </>
                }
              >
                {p().rows.length} Zeilen, Trenner{' '}
                <code>{p().separator === '\t' ? 'TAB' : p().separator}</code>, Encoding{' '}
                <code>{p().encoding}</code>
              </Show>
            </div>

            {/* TODO(#53-followup): refactor inline preview to use shared
                <FilePreview> component once we can decouple the mapping
                <select> row from the data preview rows without breaking
                file-import.spec.ts which asserts on this exact `file-preview`
                table testid. The Stage-3 mapping UI is interleaved with the
                preview rows here; lift the mapping into its own row above
                and the body becomes a drop-in <FilePreview>. */}
            <table class="w-full text-xs border-collapse" data-testid="file-preview">
              <thead>
                <tr>
                  <For each={p().headers}>
                    {(h) => <th class="border px-2 py-1 bg-slate-100 text-left">{h}</th>}
                  </For>
                </tr>
                <tr>
                  <For each={p().headers}>
                    {(h) => (
                      <td class="border px-1 py-1">
                        <select
                          class="w-full text-xs"
                          value={mapping()[h] ?? '__ignore__'}
                          onChange={(e) =>
                            setColumn(h, e.currentTarget.value as SemanticField | '__ignore__')
                          }
                          data-testid={`file-map-${h}`}
                        >
                          <option value="__ignore__">(ignorieren)</option>
                          <For each={SEMANTIC_FIELDS}>{(f) => <option value={f}>{f}</option>}</For>
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
                    <p class="text-red-700" data-testid="file-validation-error">
                      <For each={v().errors}>{(err) => <span>{err} </span>}</For>
                    </p>
                  </Show>
                  <Show when={v().ok}>
                    <p class="text-green-700" data-testid="file-validation-ok">
                      Mapping ok — {p().rows.length} Personen,{' '}
                      {Object.values(mapping()).filter((m) => m !== '__ignore__').length} Felder.
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
              data-testid="file-commit"
            >
              Pool übernehmen
            </button>
          </div>
        )}
      </Show>
    </section>
  );
};
