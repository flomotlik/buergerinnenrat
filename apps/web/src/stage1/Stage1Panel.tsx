import type { Component } from 'solid-js';
import { createEffect, createMemo, createSignal, For, on, Show } from 'solid-js';
import { autoGuessMapping, parseCsvFile } from '../csv/parse';
import type { ParsedCsv } from '../csv/parse';
import { downloadBlob } from '../run/audit';
import { runStage1 } from './runStage1';
import type { RunStage1Output } from './runStage1';
import { AxisPicker } from './AxisPicker';
import { AxisBreakdown } from './AxisBreakdown';
import { AuditFooter } from './AuditFooter';
import TrustStrip from './TrustStrip';
import { CsvPreview } from '../csv/CsvPreview';
import {
  coverageMetric,
  marginalAggregates,
  previewAllocation,
  sortUnderfillsByGap,
  stage1ToMarkdownReport,
} from '@sortition/core';
import type {
  AllocationPreview,
  CoverageMetric as CoverageStat,
  MarginalsForAxis,
  Stage1SeedSource,
} from '@sortition/core';

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
  // Issue #61: removed the seed-confirmation gate from #53. The default seed
  // is immediately usable; the inline notice next to the seed input tells the
  // user it is editable. Group-meeting workflow mitigates seed-grinding
  // socially (see CLAUDE.md and audit footer for transparency).
  const [running, setRunning] = createSignal(false);
  const [output, setOutput] = createSignal<RunStage1Output | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [strataExpanded, setStrataExpanded] = createSignal(false);

  // Cheap pre-run preview: cross-product allocation without RNG / shuffle.
  // Recomputed reactively when CSV, axes, or N change. We keep it inside a
  // try/catch so an invalid (e.g. N > pool) state surfaces inline.
  const preview = createMemo<{ result: AllocationPreview | null; error: string | null }>(() => {
    const p = parsed();
    const n = targetN();
    if (!p || n === null || n <= 0) return { result: null, error: null };
    try {
      return { result: previewAllocation(p.rows, selectedAxes(), n), error: null };
    } catch (e) {
      return { result: null, error: e instanceof Error ? e.message : String(e) };
    }
  });

  /** Pre-run marginal aggregates: built off the preview (Soll only, no Ist). */
  const previewMarginals = createMemo<MarginalsForAxis[]>(() => {
    const pv = preview().result;
    if (!pv) return [];
    // Convert PreviewRow[] → StratumResult-shape for marginalAggregates().
    const stratumLike = pv.rows.map((r) => ({
      key: r.key,
      n_h_pool: r.n_h_pool,
      n_h_target: r.n_h_target,
      n_h_actual: 0, // unknown pre-draw
      underfilled: r.wouldUnderfill,
    }));
    return marginalAggregates(stratumLike, selectedAxes());
  });

  /** Post-run marginals (with both Soll and Ist). */
  const resultMarginals = createMemo<MarginalsForAxis[]>(() => {
    const o = output();
    if (!o) return [];
    return marginalAggregates(o.result.strata, selectedAxes());
  });

  /** Post-run coverage metric. */
  const coverage = createMemo<CoverageStat | null>(() => {
    const o = output();
    if (!o) return null;
    return coverageMetric(o.result.strata);
  });

  /** Underfilled strata ranked by (target - actual) descending — biggest gaps first. */
  const underfills = createMemo(() => {
    const o = output();
    if (!o) return [];
    return sortUnderfillsByGap(o.result.strata.filter((s) => s.underfilled));
  });

  // Clear stale result when any input parameter changes after a successful
  // run. `defer: true` prevents mount-time fire which would wipe state on
  // first render. Only setOutput(null) when output() is non-null to avoid
  // unnecessary re-renders.
  createEffect(
    on(
      [targetN, selectedAxes, seed, parsed],
      () => {
        if (output() !== null) setOutput(null);
      },
      { defer: true },
    ),
  );

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

  function exportMarkdownReport() {
    const out = output();
    if (!out) return;
    const md = stage1ToMarkdownReport(out.signedAudit.doc);
    downloadBlob(`versand-bericht-${seed()}.md`, md, 'text/markdown;charset=utf-8');
  }

  return (
    <div class="space-y-6" data-testid="stage1-panel">
      {/* Workflow context for the operator (issue #53 F): the page is one
          step of a three-stage process; the prefix orients the operator
          before the upload section. */}
      <header data-testid="stage1-step-header">
        <p class="text-xs uppercase tracking-wide text-slate-500">
          Schritt 1 von 3 — Versand-Liste ziehen
        </p>
      </header>

      {/* Trust-signal strip (issue #54): three cards visible before the
          upload so the operator sees the "why trust this" context first. */}
      <TrustStrip />

      {/* Step 1: file upload — visual drop-zone wraps the (sr-only) native
          file input. Clicking the label triggers the picker; tests still
          target the input via [data-testid="stage1-csv-upload"]. Drag-drop
          functionality is out of scope (tracked separately). */}
      <section>
        <h2 class="text-xl font-semibold mb-3">1. Melderegister-CSV hochladen</h2>
        <label class="dropzone" data-testid="stage1-csv-dropzone">
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
          <span class="dropzone-label">Melderegister-CSV hochladen oder hier ablegen</span>
          <span class="dropzone-hint">CSV mit Header-Zeile, UTF-8 oder Latin-1</span>
          <Show when={file()}>
            {(f) => (
              <span class="text-xs text-brand-accent-strong font-medium mt-1">
                Geladen: {f().name}
              </span>
            )}
          </Show>
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            class="sr-only"
            data-testid="stage1-csv-upload"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </label>
        {/* Issue #57: low-friction onramp for users without their own CSV.
            Hash-routing handles the click — App.tsx hashchange listener
            navigates to the new docs subpage. */}
        <p class="mt-2 text-sm text-slate-600">
          Keine eigenen Daten?{' '}
          <a
            href="#/docs/beispiele"
            class="underline text-brand-accent-strong hover:text-brand"
            data-testid="stage1-beispiele-link"
          >
            Beispiel-Datei verwenden →
          </a>
        </p>
        <Show when={parsed()}>
          {(p) => (
            <>
              <p class="mt-2 text-sm text-slate-700" data-testid="stage1-pool-summary">
                {p().rows.length} Zeilen geladen ({p().headers.length} Spalten,{' '}
                {p().separator === '\t' ? 'TAB' : p().separator}-getrennt, Encoding{' '}
                <code>{p().encoding}</code>).
              </p>
              {/* CSV preview (issue #53 I): first 5 rows so the operator can
                  visually confirm the upload before configuring axes. */}
              <div class="mt-3">
                <CsvPreview headers={p().headers} rows={p().rows} />
              </div>
            </>
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
            Melderegister enthalten sind. Bildung, Migrationshintergrund, Beruf sind nicht im
            Melderegister — diese kommen erst nach Selbstauskunft hinzu.
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
            {' | '}
            <a href="#/docs/bmg46" class="underline">
              Mehr im Glossar zu § 46 BMG
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
          {/* Inputs grid: 2 columns on ≥sm, stacked on mobile. Both inputs
              share the .input-base style so they render at identical height. */}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="input-label" for="stage1-target-n">
                Stichprobengröße N
              </label>
              <input
                id="stage1-target-n"
                type="number"
                min="1"
                class="input-base tabular-nums"
                data-testid="stage1-target-n"
                value={targetN() ?? ''}
                onInput={(e) => {
                  const v = Number(e.currentTarget.value);
                  setTargetN(Number.isFinite(v) && v > 0 ? Math.floor(v) : null);
                }}
                disabled={running()}
              />
            </div>
            <div>
              <label class="input-label" for="stage1-seed">
                Seed (deterministisch)
              </label>
              <input
                id="stage1-seed"
                type="number"
                class="input-base tabular-nums"
                data-testid="stage1-seed"
                value={seed()}
                onInput={(e) => changeSeed(Number(e.currentTarget.value))}
                disabled={running()}
              />
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="text-xs underline text-slate-500 hover:text-slate-700"
              onClick={newDefaultSeed}
              disabled={running()}
            >
              Neuer Default-Seed (Unix-Sekunde)
            </button>
            <span class="text-xs text-slate-500" data-testid="stage1-seed-source">
              {seedSource() === 'user' ? '(manuell)' : '(Default — editierbar)'}
            </span>
          </div>
          <aside
            class="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-3"
            data-testid="stage1-seed-hint"
          >
            <strong>Hinweis zum Seed:</strong> Der Default-Seed ist sofort einsatzbereit — Sie
            können ihn übernehmen oder mit einem gemeinsam vereinbarten Wert (z.B. Lottozahlen,
            Datum, Würfelwurf) überschreiben. Der gewählte Seed steht im signierten Audit-Protokoll
            und macht den Lauf reproduzierbar.
          </aside>
          <Show when={preview().error}>
            <p class="text-sm text-red-700" data-testid="stage1-preview-error">
              {preview().error}
            </p>
          </Show>
          <Show when={preview().result !== null}>
            <div class="border rounded p-3 bg-slate-50 space-y-3" data-testid="stage1-preview">
              <div class="flex items-baseline justify-between">
                <h3 class="text-sm font-semibold">Vorschau (vor dem Lauf)</h3>
                <span class="text-xs text-slate-500">
                  {preview().result?.rows.length ?? 0} Bevölkerungsgruppen, Soll-Summe{' '}
                  {preview().result?.totalTarget ?? 0}
                </span>
              </div>
              <Show
                when={
                  (preview().result?.zeroAllocationStrata ?? 0) > 0 ||
                  (preview().result?.underfillStrata ?? 0) > 0
                }
              >
                <div class="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 space-y-2">
                  <Show when={(preview().result?.zeroAllocationStrata ?? 0) > 0}>
                    {(() => {
                      const zeros = (preview().result?.rows ?? []).filter(
                        (r) => r.n_h_target === 0,
                      );
                      const head = zeros.slice(0, 5);
                      const tail = zeros.slice(5);
                      return (
                        <div data-testid="stage1-preview-zero-list">
                          <p>
                            <strong>{zeros.length}</strong> Bevölkerungsgruppen bekommen nach
                            proportionaler Allokation <strong>0 Personen</strong>. Sind das Gruppen,
                            die bewusst leer bleiben sollen, oder zu viele/zu feine Merkmale?
                          </p>
                          <ul class="font-mono mt-1 space-y-0.5">
                            <For each={head}>
                              {(r) => (
                                <li>
                                  {Object.entries(r.key)
                                    .map(([k, v]) => `${k}=${v}`)
                                    .join(', ')}
                                  : Pool {r.n_h_pool}, Soll {r.n_h_target}
                                </li>
                              )}
                            </For>
                          </ul>
                          <Show when={tail.length > 0}>
                            <details class="mt-1">
                              <summary class="cursor-pointer underline">
                                weitere {tail.length} anzeigen
                              </summary>
                              <ul class="font-mono mt-1 space-y-0.5">
                                <For each={tail}>
                                  {(r) => (
                                    <li>
                                      {Object.entries(r.key)
                                        .map(([k, v]) => `${k}=${v}`)
                                        .join(', ')}
                                      : Pool {r.n_h_pool}, Soll {r.n_h_target}
                                    </li>
                                  )}
                                </For>
                              </ul>
                            </details>
                          </Show>
                        </div>
                      );
                    })()}
                  </Show>
                  <Show when={(preview().result?.underfillStrata ?? 0) > 0}>
                    {(() => {
                      const unders = (preview().result?.rows ?? []).filter((r) => r.wouldUnderfill);
                      const head = unders.slice(0, 5);
                      const tail = unders.slice(5);
                      return (
                        <div data-testid="stage1-preview-underfill-list">
                          <p>
                            <strong>{unders.length}</strong> Bevölkerungsgruppen werden unterbesetzt
                            sein (Pool zu klein für Soll).
                          </p>
                          <ul class="font-mono mt-1 space-y-0.5">
                            <For each={head}>
                              {(r) => (
                                <li>
                                  {Object.entries(r.key)
                                    .map(([k, v]) => `${k}=${v}`)
                                    .join(', ')}
                                  : Pool {r.n_h_pool}, Soll {r.n_h_target}
                                </li>
                              )}
                            </For>
                          </ul>
                          <Show when={tail.length > 0}>
                            <details class="mt-1">
                              <summary class="cursor-pointer underline">
                                weitere {tail.length} anzeigen
                              </summary>
                              <ul class="font-mono mt-1 space-y-0.5">
                                <For each={tail}>
                                  {(r) => (
                                    <li>
                                      {Object.entries(r.key)
                                        .map(([k, v]) => `${k}=${v}`)
                                        .join(', ')}
                                      : Pool {r.n_h_pool}, Soll {r.n_h_target}
                                    </li>
                                  )}
                                </For>
                              </ul>
                            </details>
                          </Show>
                        </div>
                      );
                    })()}
                  </Show>
                </div>
              </Show>
              <Show when={previewMarginals().length > 0}>
                <div class="space-y-2">
                  <For each={previewMarginals()}>
                    {(m) => <AxisBreakdown marginals={m} previewMode />}
                  </For>
                </div>
              </Show>
            </div>
          </Show>
          {/* Sticky run-button footer (issue #53 D, variant 1; iOS safe-area
              from #56). bottom uses env(safe-area-inset-bottom) so on iOS
              with home-indicator the button isn't covered. The negative
              margin + padding pair compensates parent section padding so the
              white background spans the full section width. Print drops
              sticky and renders statically so the button does not float at
              the bottom of every printed page. */}
          <div class="sticky [bottom:env(safe-area-inset-bottom,0)] -mx-4 px-4 pt-3 pb-3 bg-white border-t border-slate-200 z-10 print:static print:border-0 print:p-0 print:bg-transparent">
            <button
              type="button"
              class="btn-primary w-full sm:w-auto"
              data-testid="stage1-run"
              disabled={!canRun()}
              onClick={start}
            >
              <span>{running() ? 'Ziehe…' : 'Versand-Liste ziehen'}</span>
              {/* Right-arrow icon — clear visual call-to-action affordance. */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-5 w-5"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </section>
      </Show>

      <Show when={output()}>
        {(out) => (
          <section class="space-y-4 stage1-report" data-testid="stage1-result">
            <h2 class="text-xl font-semibold">4. Ergebnis</h2>

            {/* Top-line summary cards: hero "Gezogen" card spans 2 cols on
                md+, secondary coverage + underfill cards each span 1.
                Mobile stacks all three. Brand-accent left border + larger
                display type elevate the hero. */}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3" data-testid="stage1-summary-cards">
              <div class="card md:col-span-3 border-l-4 border-l-brand-accent flex flex-col sm:flex-row sm:items-baseline sm:gap-6">
                <div class="flex-1">
                  <div class="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                    Gezogen
                  </div>
                  <div class="text-4xl font-bold tabular-nums text-brand mt-1">
                    {out().result.selected.length}
                  </div>
                </div>
                <div class="text-sm text-slate-600">von {parsed()?.rows.length ?? 0} im Pool</div>
              </div>
              <Show when={coverage()}>
                {(c) => (
                  <div class="card" data-testid="stage1-coverage-card">
                    <div class="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                      Gruppen-Abdeckung
                    </div>
                    <div class="text-2xl font-semibold tabular-nums text-slate-900 mt-1">
                      {c().coveredStrata}{' '}
                      <span class="text-base text-slate-500">/ {c().totalStrata}</span>
                    </div>
                    <div class="text-xs text-slate-500 mt-1">
                      {Number.isNaN(c().coverageRatio)
                        ? '–'
                        : `${(c().coverageRatio * 100).toFixed(1)} % der Bevölkerungsgruppen mit mind. 1 gezogener Person`}
                    </div>
                  </div>
                )}
              </Show>
              <div
                class={`card md:col-span-2 ${
                  (coverage()?.underfilledStrata ?? 0) > 0 ? 'bg-amber-50 border-amber-300' : ''
                }`}
                data-testid="stage1-underfill-card"
              >
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                    Unterbesetzt
                  </span>
                  <Show when={(coverage()?.underfilledStrata ?? 0) > 0}>
                    <span class="status-pill-warn">Hinweis</span>
                  </Show>
                  <Show when={(coverage()?.underfilledStrata ?? 0) === 0}>
                    <span class="status-pill-ok">OK</span>
                  </Show>
                </div>
                <div class="text-2xl font-semibold tabular-nums text-slate-900 mt-1">
                  {coverage()?.underfilledStrata ?? 0}
                </div>
                <div class="text-xs text-slate-500 mt-1">
                  Bevölkerungsgruppen mit weniger Personen als angefragt
                </div>
              </div>
            </div>

            <p class="text-xs text-slate-500">
              Laufzeit: <span class="tabular-nums">{Math.round(out().durationMs)} ms</span>
              {' · '}Seed: <span class="font-mono">{out().signedAudit.doc.seed}</span>
            </p>

            <Show when={underfills().length > 0}>
              <section
                class="border-l-4 border-amber-500 bg-amber-50 p-3 rounded space-y-2"
                data-testid="stage1-underfill-list"
              >
                <h3 class="font-semibold text-amber-900 text-sm">
                  Unterbesetzte Bevölkerungsgruppen
                </h3>
                <p class="text-xs text-amber-900">
                  Diese Bevölkerungsgruppen bekamen weniger Personen als die proportionale
                  Allokation vorgesehen hat — Pool zu klein. Im echten Verfahren bedeutet das: bei
                  diesen Gruppen wurden alle verfügbaren Personen angeschrieben.
                </p>
                <ul class="text-xs text-amber-900 space-y-1">
                  <For each={underfills()}>
                    {(s) => (
                      <li class="font-mono">
                        {Object.entries(s.key)
                          .map(([k, v]) => `${k}=${v}`)
                          .join(', ')}{' '}
                        — Soll {s.n_h_target}, Ist {s.n_h_actual} (Pool nur {s.n_h_pool})
                      </li>
                    )}
                  </For>
                </ul>
              </section>
            </Show>

            <Show when={out().result.warnings.length > 0 && underfills().length === 0}>
              <div class="border-l-4 border-red-600 bg-red-50 p-3 text-sm rounded">
                <p class="font-semibold text-red-800">Weitere Warnungen:</p>
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

            <Show when={resultMarginals().length > 0}>
              <section class="space-y-2" data-testid="stage1-axis-breakdowns">
                <h3 class="text-sm font-semibold">Verteilung pro Merkmal</h3>
                <For each={resultMarginals()}>{(m) => <AxisBreakdown marginals={m} />}</For>
              </section>
            </Show>

            {/* Detailed cross-product strata table — collapsible to keep the
                results view readable for groups; "alle Detail-Strata" reveals it.
                UI-facing strings use plain-language German per CONTEXT.md
                glossary (Bevölkerungsgruppe instead of Stratum); statistics
                terms appear in parentheses for auditors. */}
            <details
              class="border rounded"
              open={strataExpanded()}
              onToggle={(e) => setStrataExpanded((e.currentTarget as HTMLDetailsElement).open)}
            >
              <summary
                class="text-sm font-semibold p-2 bg-slate-100 cursor-pointer select-none"
                data-testid="stage1-strata-toggle"
              >
                Detail-Tabelle (Bevölkerungsgruppen, {out().result.strata.length} Zeilen)
              </summary>
              {/* Mobile: horizontal scroll container so the table doesn't
                  break into wrap-salat. Desktop: inline. */}
              <div class="overflow-x-auto">
                <table class="min-w-full text-xs" data-testid="stage1-strata-table">
                  <thead class="bg-slate-100">
                    <tr>
                      <th class="text-left px-3 py-2 font-semibold text-slate-700 uppercase tracking-wide text-[11px]">
                        Bevölkerungsgruppe (Stratum)
                      </th>
                      <th class="text-right px-3 py-2 font-semibold text-slate-700 uppercase tracking-wide text-[11px]">
                        Pool
                      </th>
                      <th class="text-right px-3 py-2 font-semibold text-slate-700 uppercase tracking-wide text-[11px]">
                        Soll
                      </th>
                      <th class="text-right px-3 py-2 font-semibold text-slate-700 uppercase tracking-wide text-[11px]">
                        Ist
                      </th>
                      <th class="text-center px-3 py-2 font-semibold text-slate-700 uppercase tracking-wide text-[11px]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={out().result.strata}>
                      {(s, i) => (
                        <tr
                          class={s.underfilled ? 'bg-amber-50' : i() % 2 === 0 ? '' : 'bg-slate-50'}
                        >
                          <td class="px-3 py-2 font-mono whitespace-nowrap">
                            {Object.entries(s.key).length === 0
                              ? '(gesamt)'
                              : Object.entries(s.key)
                                  .map(([k, v]) => `${k}=${v}`)
                                  .join(', ')}
                          </td>
                          <td class="px-3 py-2 text-right tabular-nums">{s.n_h_pool}</td>
                          <td class="px-3 py-2 text-right tabular-nums">{s.n_h_target}</td>
                          <td class="px-3 py-2 text-right tabular-nums">{s.n_h_actual}</td>
                          <td class="px-3 py-2 text-center">
                            <span class={s.underfilled ? 'status-pill-warn' : 'status-pill-ok'}>
                              {s.underfilled ? 'unterbesetzt' : 'ok'}
                            </span>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </details>

            {/* Visible audit/provenance footer (B). Stays on print so the
                signed report carries the full trail. */}
            <AuditFooter doc={out().signedAudit.doc} />

            <div class="flex flex-wrap gap-2 print:hidden">
              <button
                type="button"
                class="btn-secondary"
                onClick={exportCsv}
                data-testid="stage1-download-csv"
              >
                CSV herunterladen
              </button>
              <button
                type="button"
                class="btn-secondary"
                onClick={exportAuditJson}
                data-testid="stage1-download-audit"
              >
                Audit-JSON herunterladen
              </button>
              <button
                type="button"
                class="btn-secondary"
                onClick={exportMarkdownReport}
                data-testid="stage1-download-md"
              >
                Bericht (Markdown) herunterladen
              </button>
              <button
                type="button"
                class="btn-secondary"
                onClick={() => window.print()}
                data-testid="stage1-print"
              >
                Drucken
              </button>
            </div>
          </section>
        )}
      </Show>
    </div>
  );
};
