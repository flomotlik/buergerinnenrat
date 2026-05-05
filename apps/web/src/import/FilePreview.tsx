import type { Component } from 'solid-js';
import { For } from 'solid-js';

// Shared file preview table — first N rows visible after upload. Used in
// Stage 1 (always) and could replace the inline preview in Stage 3 in a
// follow-up refactor (issue #53 I); kept generic so the same component
// works for both call sites without prop drilling. Format-agnostic: works
// for both CSV and XLSX uploads (consumer normalizes via ParsedTable).

export interface FilePreviewProps {
  headers: string[];
  rows: Record<string, string>[];
  /** Default 5; capped to rows.length. */
  maxRows?: number;
}

export const FilePreview: Component<FilePreviewProps> = (props) => {
  const limit = () => Math.min(props.maxRows ?? 5, props.rows.length);
  const visibleRows = () => props.rows.slice(0, limit());

  return (
    <div class="overflow-x-auto" data-testid="file-preview-wrap">
      <table class="w-full text-xs border-collapse" data-testid="file-preview-table">
        <thead>
          <tr class="bg-slate-100">
            <For each={props.headers}>{(h) => <th class="border px-2 py-1 text-left">{h}</th>}</For>
          </tr>
        </thead>
        <tbody>
          <For each={visibleRows()}>
            {(row, i) => (
              <tr class={i() % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <For each={props.headers}>
                  {(h) => <td class="border px-2 py-1">{row[h] ?? ''}</td>}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
      <p class="text-xs text-slate-500 mt-1">
        Vorschau: erste {limit()} von {props.rows.length} Zeilen.
      </p>
    </div>
  );
};
