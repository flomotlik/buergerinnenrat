import type { Component } from 'solid-js';
import { createSignal, For, Show } from 'solid-js';
import type { Pool, Quotas } from '@sortition/engine-contract';
import { runEngineA, type RunOutcome } from './runEngine';
import {
  buildAudit,
  downloadBinaryBlob,
  downloadBlob,
  selectedToCsv,
  selectedToXlsx,
  signAudit,
} from './audit';

export interface RunPanelProps {
  pool: Pool;
  quotas: Quotas;
}

export const RunPanel: Component<RunPanelProps> = (props) => {
  const [seed, setSeed] = createSignal<number>(Math.floor(Math.random() * 0x7fffffff));
  const [running, setRunning] = createSignal(false);
  const [progress, setProgress] = createSignal<{ msg: string; fraction?: number }>({ msg: '' });
  const [logs, setLogs] = createSignal<string[]>([]);
  const [outcome, setOutcome] = createSignal<RunOutcome | null>(null);
  const [aborter, setAborter] = createSignal<AbortController | null>(null);

  async function start() {
    setOutcome(null);
    setLogs([]);
    setProgress({ msg: 'starting...' });
    setRunning(true);
    const ctrl = new AbortController();
    setAborter(ctrl);
    try {
      const r = await runEngineA(
        {
          pool: props.pool,
          quotas: props.quotas,
          seed: seed(),
          onProgress: (msg, fraction) =>
            setProgress({ msg, ...(fraction !== undefined ? { fraction } : {}) }),
          onLog: (msg) => setLogs((xs) => [...xs.slice(-50), msg]),
        },
        ctrl.signal,
      );
      setOutcome(r);
    } finally {
      setRunning(false);
      setAborter(null);
    }
  }

  function cancel() {
    aborter()?.abort();
  }

  async function exportPanelCsv() {
    const r = outcome()?.result;
    if (!r) return;
    downloadBlob(`panel-${seed()}.csv`, selectedToCsv(props.pool, r.selected), 'text/csv');
  }

  async function exportPanelXlsx() {
    const r = outcome()?.result;
    if (!r) return;
    const buffer = await selectedToXlsx(props.pool, r.selected);
    downloadBinaryBlob(
      `panel-${seed()}.xlsx`,
      buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  }

  async function exportAuditJson() {
    const o = outcome();
    if (!o?.result) return;
    const audit = await buildAudit({
      pool: props.pool,
      quotas: props.quotas,
      seed: seed(),
      result: o.result,
      duration_ms: o.duration_ms,
    });
    const signed = await signAudit(audit);
    downloadBlob(`audit-${seed()}.json`, JSON.stringify(signed.doc, null, 2), 'application/json');
  }

  return (
    <div class="space-y-4" data-testid="run-panel">
      <div class="flex items-center gap-3">
        <label class="text-sm">Seed</label>
        <input
          type="number"
          class="border rounded px-2 py-1 w-32 text-sm tabular-nums"
          value={seed()}
          onInput={(e) => setSeed(Number(e.currentTarget.value))}
          disabled={running()}
          data-testid="run-seed"
        />
        <button
          type="button"
          class="text-xs underline text-slate-500"
          onClick={() => setSeed(Math.floor(Math.random() * 0x7fffffff))}
          disabled={running()}
        >
          Neuer Seed
        </button>
        <Show when={!running()}>
          <button
            type="button"
            class="ml-4 px-4 py-1.5 bg-slate-900 text-white rounded text-sm"
            onClick={start}
            data-testid="run-start"
          >
            Lauf starten
          </button>
        </Show>
        <Show when={running()}>
          <button
            type="button"
            class="ml-4 px-4 py-1.5 bg-red-700 text-white rounded text-sm"
            onClick={cancel}
            data-testid="run-cancel"
          >
            Abbrechen
          </button>
        </Show>
      </div>

      <Show when={running() || progress().msg}>
        <div class="space-y-1">
          <div class="text-xs text-slate-700" data-testid="run-progress">
            {progress().msg}
          </div>
          <Show when={progress().fraction !== undefined}>
            <div class="h-2 bg-slate-200 rounded overflow-hidden">
              <div
                class="h-full bg-slate-700 transition-all"
                style={`width: ${Math.round((progress().fraction ?? 0) * 100)}%`}
              />
            </div>
          </Show>
        </div>
      </Show>

      <Show when={logs().length > 0}>
        <details class="text-xs">
          <summary class="cursor-pointer text-slate-500">Logs</summary>
          <pre class="bg-slate-100 p-2 rounded max-h-40 overflow-auto" data-testid="run-logs">
            {logs().join('\n')}
          </pre>
        </details>
      </Show>

      <Show when={outcome() && !outcome()!.ok}>
        <div
          class="border-l-4 border-red-600 bg-red-50 p-3 rounded text-sm"
          data-testid="run-error"
        >
          <p class="font-semibold text-red-800">Lauf fehlgeschlagen</p>
          <p class="text-red-800">
            {outcome()!.error?.code}: {outcome()!.error?.message}
          </p>
          <Show when={outcome()!.error?.code === 'infeasible_quotas'}>
            <p class="text-xs mt-2 text-red-700">
              Tipp: Eine Kategorie ist im Pool zu knapp besetzt für die geforderten Min-Werte. Senke
              `min` oder erweitere den Pool.
            </p>
          </Show>
        </div>
      </Show>

      <Show when={outcome() && outcome()!.ok && outcome()!.result}>
        {(() => {
          const r = outcome()!.result!;
          return (
            <div class="space-y-4" data-testid="run-result">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-slate-500">Laufzeit:</span>{' '}
                  <span class="tabular-nums">{Math.round(outcome()!.duration_ms)} ms</span>
                </div>
                <div>
                  <span class="text-slate-500">Komitees:</span>{' '}
                  <span class="tabular-nums">{r.timing.num_committees}</span>
                </div>
                <div>
                  <span class="text-slate-500">Engine:</span> {r.engine_meta.engine_id}@
                  {r.engine_meta.engine_version}
                </div>
                <div>
                  <span class="text-slate-500">Solver:</span> {r.engine_meta.solver}
                </div>
                <div>
                  <span class="text-slate-500">Min-Marginale:</span>{' '}
                  <span class="tabular-nums">
                    {Math.min(...Object.values(r.marginals)).toFixed(4)}
                  </span>
                </div>
                <div>
                  <span class="text-slate-500">Max-Marginale:</span>{' '}
                  <span class="tabular-nums">
                    {Math.max(...Object.values(r.marginals)).toFixed(4)}
                  </span>
                </div>
              </div>

              <div class="border rounded">
                <h3 class="text-sm font-semibold p-2 bg-slate-100">Quoten-Erfüllung</h3>
                <table class="w-full text-xs">
                  <thead class="bg-slate-50">
                    <tr>
                      <th class="text-left p-1">Kategorie</th>
                      <th class="text-left p-1">Wert</th>
                      <th class="text-right p-1">Ist</th>
                      <th class="text-right p-1">min</th>
                      <th class="text-right p-1">max</th>
                      <th class="text-center p-1">ok</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={r.quota_fulfillment}>
                      {(q) => (
                        <tr class={q.ok ? '' : 'bg-red-50'}>
                          <td class="p-1">{q.column}</td>
                          <td class="p-1">{q.value}</td>
                          <td class="p-1 text-right tabular-nums">{q.selected}</td>
                          <td class="p-1 text-right tabular-nums">{q.bound_min}</td>
                          <td class="p-1 text-right tabular-nums">{q.bound_max}</td>
                          <td class="p-1 text-center">{q.ok ? '✓' : '✗'}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>

              <div class="border rounded">
                <h3 class="text-sm font-semibold p-2 bg-slate-100">
                  Ausgewähltes Panel ({r.selected.length})
                </h3>
                <table class="w-full text-xs">
                  <thead class="bg-slate-50">
                    <tr>
                      <th class="text-left p-1">person_id</th>
                      <th class="text-right p-1">π_i</th>
                      <For
                        each={Object.keys(props.pool.people[0] ?? {}).filter(
                          (k) => k !== 'person_id',
                        )}
                      >
                        {(k) => <th class="text-left p-1">{k}</th>}
                      </For>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={r.selected}>
                      {(id) => {
                        const person = props.pool.people.find((p) => p.person_id === id);
                        return (
                          <tr>
                            <td class="p-1 font-mono">{id}</td>
                            <td class="p-1 text-right tabular-nums">
                              {(r.marginals[id] ?? 0).toFixed(4)}
                            </td>
                            <For
                              each={Object.keys(props.pool.people[0] ?? {}).filter(
                                (k) => k !== 'person_id',
                              )}
                            >
                              {(k) => <td class="p-1">{String(person?.[k] ?? '')}</td>}
                            </For>
                          </tr>
                        );
                      }}
                    </For>
                  </tbody>
                </table>
              </div>

              <div class="flex gap-2">
                <button
                  class="px-3 py-1.5 border bg-white text-sm rounded"
                  onClick={exportPanelCsv}
                  data-testid="run-export-csv"
                >
                  Panel-CSV exportieren
                </button>
                <button
                  class="px-3 py-1.5 border bg-white text-sm rounded"
                  onClick={exportPanelXlsx}
                  data-testid="run-export-xlsx"
                >
                  Panel-Excel exportieren
                </button>
                <button
                  class="px-3 py-1.5 border bg-white text-sm rounded"
                  onClick={exportAuditJson}
                  data-testid="run-export-audit"
                >
                  Audit-JSON exportieren (Ed25519)
                </button>
              </div>
            </div>
          );
        })()}
      </Show>
    </div>
  );
};
