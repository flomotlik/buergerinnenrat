import { Component, createSignal, For, Show } from 'solid-js';
import { autoGuessMapping, parseCsvFile } from '../csv/parse';
import type { ParsedCsv } from '../csv/parse';
import { downloadBlob } from '../run/audit';
import { runStage1 } from './runStage1';
import type { RunStage1Output } from './runStage1';
import { AxisPicker } from './AxisPicker';
import type { Stage1SeedSource } from '@sortition/core';

/** Default seed factory: Unix-seconds is uint32-safe for Mulberry32 until 2106. */
function defaultSeed(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Headers from the parsed CSV that map to one of the canonical axes
 * (district, age_band, gender) per the existing autoGuessMapping heuristic.
 * These are surfaced as "recommended" defaults in the AxisPicker.
 */
function recommendedAxes(headers: string[]): string[] {
  const mapping = autoGuessMapping(headers);
  const axes: string[] = [];
  for (const h of headers) {
    const m = mapping[h];
    if (m === 'district' || m === 'age_band' || m === 'gender') {
      axes.push(h);
    }
  }
  return axes;
}

export const Stage1Panel: Component = () => {
  const [parsed, setParsed] = createSignal<ParsedCsv | null>(null);
  const [file, setFile] = createSignal<File | null>(null);
  const [defaultAxes, setDefaultAxes] = createSignal<string[]>([]);
  const [selectedAxes, setSelectedAxes] = createSignal<string[]>([]);
  const [targetN, setTargetN] = createSignal<number | null>(null);
  const [seed, setSeed] = createSignal<number>(defaultSeed());
  const [seedSource, setSeedSource] = createSignal<Stage1SeedSource>('unix-time-default');
  const [running, setRunning] = createSignal(false);
  const [output, setOutput] = createSignal<RunStage1Output | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  async function handleFile(f: File) {
    setError(null);
    setOutput(null);
    try {
      const p = await parseCsvFile(f);
      const recs = recommendedAxes(p.headers);
      setFile(f);
      setParsed(p);
      setDefaultAxes(recs);
      setSelectedAxes(recs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function toggleAxis(header: string) {
    const cur = selectedAxes();
    setSelectedAxes(cur.includes(header) ? cur.filter((h) => h !== header) : [...cur, header]);
  }

  function changeSeed(value: number) {
    setSeed(value);
    setSeedSource('user');
  }

  function newDefaultSeed() {
    setSeed(defaultSeed());
    setSeedSource('unix-time-default');
  }

  const canRun = () =>
    parsed() !== null && targetN() !== null && (targetN() ?? 0) > 0 && !running();

  async function start() {
    const p = parsed();
    const f = file();
    const n = targetN();
    if (!p || !f || n === null) return;
    setError(null);
    setOutput(null);
    setRunning(true);
    try {
      const out = await runStage1({
        file: f,
        parsed: p,
        axes: selectedAxes(),
        targetN: n,
        seed: seed(),
        seedSource: seedSource(),
      });
      setOutput(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  function exportCsv() {
    const out = output();
    if (!out) return;
    downloadBlob(`versand-${seed()}.csv`, out.csv, 'text/csv;charset=utf-8');
  }

  function exportAuditJson() {
    const out = output();
    if (!out) return;
    downloadBlob(
      `versand-audit-${seed()}.json`,
      JSON.stringify(out.signedAudit.doc, null, 2),
      'application/json',
    );
  }

  return (
    <div class="space-y-6" data-testid="stage1-panel">
      {/* Step 1: file upload */}
      <section>
        <h2 class="text-xl font-semibold mb-3">1. Melderegister-CSV hochladen</h2>
        <input
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          data-testid="stage1-csv-upload"
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <Show when={parsed()}>
          {(p) => (
            <p class="mt-2 text-sm text-slate-700" data-testid="stage1-pool-summary">
              {p().rows.length} Zeilen geladen ({p().headers.length} Spalten,{' '}
              {p().separator === '\t' ? 'TAB' : p().separator}-getrennt, Encoding{' '}
              <code>{p().encoding}</code>).
            </p>
          )}
        </Show>
        <Show when={error()}>
          <p class="mt-2 text-sm text-red-700" data-testid="stage1-error">
            {error()}
          </p>
        </Show>
      </section>

      <Show when={parsed()}>
        {/* BMG §46 hint (Task 6) — informational, no hard block */}
        <aside
          data-testid="stage1-bmg-hint"
          class="border-l-4 border-amber-500 bg-amber-50 p-3 rounded text-sm text-amber-900"
        >
          <p>
            <strong>Hinweis:</strong> Stratifikation kann nur über Felder erfolgen, die im
            Melderegister enthalten sind. Bildung, Migrationshintergrund, Beruf sind nicht
            im Melderegister — diese kommen erst nach Selbstauskunft hinzu.
          </p>
          <p class="mt-1 text-xs">
            Quelle:{' '}
            <a
              href="https://www.gesetze-im-internet.de/bmg/__46.html"
              target="_blank"
              rel="noopener noreferrer"
              class="underline"
            >
              § 46 BMG
            </a>
          </p>
        </aside>
      </Show>

      <Show when={parsed()}>
        {(p) => (
          <section>
            <h2 class="text-xl font-semibold mb-3">2. Stratifikation konfigurieren</h2>
            <AxisPicker
              headers={p().headers}
              defaultAxes={defaultAxes()}
              selected={selectedAxes}
              onToggle={toggleAxis}
            />
          </section>
        )}
      </Show>

      <Show when={parsed()}>
        <section class="space-y-3">
          <h2 class="text-xl font-semibold mb-1">3. Stichprobengröße und Seed</h2>
          <div class="flex items-center gap-3">
            <label class="text-sm w-44">Stichprobengröße N</label>
            <input
              type="number"
              min="1"
              class="border rounded px-2 py-1 w-32 text-sm tabular-nums"
              data-testid="stage1-target-n"
              value={targetN() ?? ''}
              onInput={(e) => {
                const v = Number(e.currentTarget.value);
                setTargetN(Number.isFinite(v) && v > 0 ? Math.floor(v) : null);
              }}
              disabled={running()}
            />
          </div>
          <div class="flex items-center gap-3">
            <label class="text-sm w-44">Seed (deterministisch)</label>
            <input
              type="number"
              class="border rounded px-2 py-1 w-44 text-sm tabular-nums"
              data-testid="stage1-seed"
              value={seed()}
              onInput={(e) => changeSeed(Number(e.currentTarget.value))}
              disabled={running()}
            />
            <button
              type="button"
              class="text-xs underline text-slate-500"
              onClick={newDefaultSeed}
              disabled={running()}
            >
              Neuer Default-Seed (Unix-Sekunde)
            </button>
            <span class="text-xs text-slate-500" data-testid="stage1-seed-source">
              ({seedSource() === 'user' ? 'manuell' : 'Default'})
            </span>
          </div>
          <aside
            class="text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded p-3"
            data-testid="stage1-seed-hint"
          >
            <strong>Hinweis zum Seed:</strong> Wählen Sie den Seed-Wert{' '}
            <em>gemeinsam in der Verfahrens-Sitzung</em> (z.B. eine Zahl, die alle
            Anwesenden vereinbaren — Lottozahlen, Datum, Würfelwurf). Er steht im
            Audit-Protokoll und macht den Lauf reproduzierbar. Bewusst
            öffentlich-vor-Lauf wählen verhindert, dass die Auswahl unbemerkt
            durch Probieren verschiedener Seeds beeinflusst werden kann.
          </aside>
          <div>
            <button
              type="button"
              class="px-4 py-1.5 bg-slate-900 text-white rounded text-sm disabled:opacity-50"
              data-testid="stage1-run"
              disabled={!canRun()}
              onClick={start}
            >
              {running() ? 'Ziehe…' : 'Versand-Liste ziehen'}
            </button>
          </div>
        </section>
      </Show>

      <Show when={output()}>
        {(out) => (
          <section class="space-y-4" data-testid="stage1-result">
            <h2 class="text-xl font-semibold">4. Ergebnis</h2>
            <p class="text-sm">
              {out().result.selected.length} von {parsed()?.rows.length ?? 0} Personen
              gezogen — Laufzeit{' '}
              <span class="tabular-nums">{Math.round(out().durationMs)} ms</span>.
            </p>

            <Show when={out().result.warnings.length > 0}>
              <div class="border-l-4 border-red-600 bg-red-50 p-3 text-sm rounded">
                <p class="font-semibold text-red-800">Warnungen:</p>
                <ul class="list-disc pl-5 text-red-800">
                  <For each={out().result.warnings}>{(w) => <li>{w}</li>}</For>
                </ul>
              </div>
            </Show>

            <Show when={out().csvWarnings.length > 0}>
              <div class="border-l-4 border-amber-500 bg-amber-50 p-3 text-sm rounded">
                <ul class="list-disc pl-5 text-amber-900">
                  <For each={out().csvWarnings}>{(w) => <li>{w}</li>}</For>
                </ul>
              </div>
            </Show>

            <div class="border rounded">
              <h3 class="text-sm font-semibold p-2 bg-slate-100">Stratum-Tabelle</h3>
              <table class="w-full text-xs" data-testid="stage1-strata-table">
                <thead class="bg-slate-50">
                  <tr>
                    <th class="text-left p-1">Stratum</th>
                    <th class="text-right p-1">Pool</th>
                    <th class="text-right p-1">Soll</th>
                    <th class="text-right p-1">Ist</th>
                    <th class="text-center p-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={out().result.strata}>
                    {(s) => (
                      <tr class={s.underfilled ? 'bg-red-50' : ''}>
                        <td class="p-1 font-mono">
                          {Object.entries(s.key).length === 0
                            ? '(gesamt)'
                            : Object.entries(s.key)
                                .map(([k, v]) => `${k}=${v}`)
                                .join(', ')}
                        </td>
                        <td class="p-1 text-right tabular-nums">{s.n_h_pool}</td>
                        <td class="p-1 text-right tabular-nums">{s.n_h_target}</td>
                        <td class="p-1 text-right tabular-nums">{s.n_h_actual}</td>
                        <td class="p-1 text-center">
                          {s.underfilled ? 'unterbesetzt' : 'ok'}
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>

            <div class="flex gap-2">
              <button
                type="button"
                class="px-3 py-1.5 border bg-white text-sm rounded"
                onClick={exportCsv}
                data-testid="stage1-download-csv"
              >
                CSV herunterladen
              </button>
              <button
                type="button"
                class="px-3 py-1.5 border bg-white text-sm rounded"
                onClick={exportAuditJson}
                data-testid="stage1-download-audit"
              >
                Audit herunterladen
              </button>
            </div>
          </section>
        )}
      </Show>
    </div>
  );
};
