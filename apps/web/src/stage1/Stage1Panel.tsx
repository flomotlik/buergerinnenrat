import type { Component } from 'solid-js';
import { createEffect, createMemo, createSignal, For, on, Show } from 'solid-js';
import { autoGuessMapping, parseCsvFile } from '../csv/parse';
import type { ParsedCsv, ParsedTable } from '../csv/parse';
import { parseXlsxFile } from '../csv/parse-xlsx';
import {
  DEFAULT_AGE_BANDS,
  recomputeAltersgruppe,
  validateBands,
  type AgeBand,
} from '../csv/derive';
import { downloadBinaryBlob, downloadBlob } from '../run/audit';
import { runStage1 } from './runStage1';
import type { RunStage1Output } from './runStage1';
import { AxisPicker } from './AxisPicker';
import { AgeBandsEditor } from './AgeBandsEditor';
import { AxisBreakdown } from './AxisBreakdown';
import { AuditFooter } from './AuditFooter';
import { StratificationExplainer } from './StratificationExplainer';
import { SampleSizeCalculator } from './SampleSizeCalculator';
import TrustStrip from './TrustStrip';
import { CsvPreview } from '../csv/CsvPreview';
import {
  coverageMetric,
  infoOnlyBandsReport,
  marginalAggregates,
  previewAllocation,
  sortUnderfillsByGap,
  stage1ToMarkdownReport,
} from '@sortition/core';
import type {
  AllocationPreview,
  CoverageMetric as CoverageStat,
  MarginalsForAxis,
  SampleSizeProposal,
  Stage1SeedSource,
} from '@sortition/core';

// German per-axis tooltips. Headers without an entry render no info icon.
const AXIS_DESCRIPTIONS: Record<string, string> = {
  geschlecht:
    'Geschlecht (m/w/d laut Melderegister) — Standard-Stratifikation in jeder Bürgerrats-Methodik.',
  gender:
    'Geschlecht (m/w/d laut Melderegister) — Standard-Stratifikation in jeder Bürgerrats-Methodik.',
  altersgruppe:
    'Altersgruppe (berechnet aus geburtsjahr) — kontrolliert Generationen-Repräsentation.',
  age_band: 'Altersgruppe — kontrolliert Generationen-Repräsentation.',
  sprengel: 'Geographische Untergliederung — sichert lokale Vielfalt.',
  bezirk: 'Geographische Untergliederung — sichert lokale Vielfalt.',
  district: 'Geographische Untergliederung — sichert lokale Vielfalt.',
};

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
  const [parsed, setParsed] = createSignal<ParsedTable | null>(null);
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
  // Age-band configuration (Issue #62). Bands live only in-session — not
  // persisted across reloads. Each new upload resets to DEFAULT_AGE_BANDS.
  const [bands, setBands] = createSignal<AgeBand[]>([...DEFAULT_AGE_BANDS]);
  const refYear = new Date().getFullYear();
  const [explainerOpen, setExplainerOpen] = createSignal(true);
  // Issue #64: sample-size proposal state. Tracks the last accepted proposal
  // and whether the user subsequently overrode N to a value that diverges.
  // Both fields are optional in the audit doc (schema_version 0.4).
  const [sampleSizeProposal, setSampleSizeProposal] = createSignal<SampleSizeProposal | null>(null);
  const [sampleSizeManuallyOverridden, setSampleSizeManuallyOverridden] =
    createSignal<boolean>(false);

  // Distinct-value counts for the currently selected axes only — counting
  // every header would be wasteful on 8000-row pools.
  const distinctValueCounts = createMemo<Record<string, number>>(() => {
    const p = parsed();
    const out: Record<string, number> = {};
    if (!p) return out;
    for (const axis of selectedAxes()) {
      const seen = new Set<string>();
      for (const r of p.rows) seen.add(r[axis] ?? '');
      out[axis] = seen.size;
    }
    return out;
  });

  // When the user edits the bands, re-derive the altersgruppe column on the
  // parsed rows. `defer: true` avoids firing on mount before the user
  // touched anything. We bail out when no altersgruppe column was derived
  // (e.g. CSV had no geburtsjahr).
  createEffect(
    on(
      bands,
      (b) => {
        const p = parsed();
        if (!p || !p.derivedColumns.includes('altersgruppe')) return;
        const newRows = recomputeAltersgruppe(p.rows, b, refYear);
        setParsed({ ...p, rows: newRows });
      },
      { defer: true },
    ),
  );

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

  /**
   * Issue #65: 6-step rail above the page header. The current step is a
   * cheap derived signal off the existing state — purely visual hint, no
   * gating logic depends on it.
   *   1 Eingabe         — no parsed CSV yet
   *   2 Bemessung       — parsed but no sample-size proposal accepted
   *   3 Achsen          — proposal accepted (or skipped) but no axes
   *   4 Parameter       — axes chosen but never run
   *   5 Ziehen          — currently running
   *   6 Audit & Export  — output() exists
   */
  const currentStep = createMemo<number>(() => {
    if (!parsed()) return 1;
    if (!sampleSizeProposal() && targetN() === null) return 2;
    if (selectedAxes().length === 0) return 3;
    if (running()) return 5;
    if (output()) return 6;
    return 4;
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
      // Extension-based routing — locked decision in CONTEXT.md (kein
      // Magic-Bytes-Check). SheetJS throws bubbled to the existing error slot.
      const ext = f.name.toLowerCase().split('.').pop();
      const p = ext === 'xlsx' ? await parseXlsxFile(f) : csvToTable(await parseCsvFile(f));
      const recs = recommendedAxes(p.headers);
      setFile(f);
      setParsed(p);
      setDefaultAxes(recs);
      setSelectedAxes(recs);
      // Each upload restarts band configuration from scratch — keeps the
      // editor in sync with the per-file derived altersgruppe column and
      // avoids stale bands from a previous session bleeding over.
      setBands([...DEFAULT_AGE_BANDS]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // Wrap a ParsedCsv as ParsedTable for the format-agnostic state shape;
  // dropped in Phase E when parseCsvFile starts returning ParsedTable directly.
  function csvToTable(p: ParsedCsv): ParsedTable {
    return {
      format: 'csv',
      headers: p.headers,
      rows: p.rows,
      warnings: p.warnings,
      derivedColumns: p.derivedColumns,
      separator: p.separator,
      encoding: p.encoding,
    };
  }

  function toggleAxis(header: string) {
    const cur = selectedAxes();
    setSelectedAxes(cur.includes(header) ? cur.filter((h) => h !== header) : [...cur, header]);
  }

  // Issue #64: SampleSizeCalculator → Stage1Panel handshake.
  //
  // - Clicking "Vorschlag übernehmen" sets targetN, stores the proposal for
  //   the audit doc, and clears the manualOverride flag.
  // - Subsequent manual edits to targetN flip the override flag if the new
  //   value diverges from the stored proposal's `recommended`. Re-typing the
  //   exact recommended value clears the flag again — so the audit reflects
  //   the user's final intent, not a transient mid-edit state.
  function handleSampleSizeAccept(recommended: number, proposal: SampleSizeProposal) {
    setTargetN(recommended);
    setSampleSizeProposal(proposal);
    setSampleSizeManuallyOverridden(false);
  }

  function handleTargetNInput(rawValue: string) {
    const v = Number(rawValue);
    const next = Number.isFinite(v) && v > 0 ? Math.floor(v) : null;
    setTargetN(next);
    const p = sampleSizeProposal();
    if (p === null) return;
    setSampleSizeManuallyOverridden(next !== p.recommended);
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
    parsed() !== null &&
    targetN() !== null &&
    (targetN() ?? 0) > 0 &&
    !running() &&
    validateBands(bands()) === null;

  async function start() {
    const p = parsed();
    const f = file();
    const n = targetN();
    if (!p || !f || n === null) return;
    setError(null);
    setOutput(null);
    setRunning(true);
    try {
      // Issue #62: only pass bands when an altersgruppe column was derived
      // AND the user actually selected it as an axis. Otherwise the bands
      // are inert (no allocator effect, no audit metadata).
      const passBands =
        p.derivedColumns.includes('altersgruppe') && selectedAxes().includes('altersgruppe');
      // Issue #64: thread the sample-size proposal (if any) through to the
      // audit doc. `manually_overridden` is computed on the fly so the audit
      // reflects the user's CURRENT N at run-time (not the value at accept-
      // time). This matters when the user accepted, then edited N before
      // pressing Run. The audit field uses snake_case to match the JSON
      // schema; the in-memory SampleSizeProposal uses camelCase.
      const proposal = sampleSizeProposal();
      const auditProposal = proposal
        ? {
            panel_size: proposal.panelSize,
            outreach: proposal.outreach,
            response_rate_min: proposal.rateUsed.min,
            response_rate_max: proposal.rateUsed.max,
            safety_factor: proposal.safetyFactor,
            recommended: proposal.recommended,
            range: proposal.range,
            manually_overridden: sampleSizeManuallyOverridden(),
          }
        : undefined;
      const out = await runStage1({
        file: f,
        // runStage1 still expects ParsedCsv until Phase E migrates the type;
        // ParsedTable is a runtime-superset (CSV-only fields optional, XLSX
        // fields unused by runStage1), so the cast is safe here.
        parsed: p as unknown as ParsedCsv,
        axes: selectedAxes(),
        targetN: n,
        seed: seed(),
        seedSource: seedSource(),
        ...(passBands
          ? { bands: bands(), ageBandColumn: 'altersgruppe', bandsRefYear: refYear }
          : {}),
        ...(auditProposal ? { sampleSizeProposal: auditProposal } : {}),
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

  async function exportXlsx() {
    const out = output();
    const p = parsed();
    if (!out || !p) return;
    // Lazy import — xlsx is async-only so the SheetJS chunk is not paid for
    // by users who never click this button.
    const { stage1ResultToXlsx } = await import('@sortition/core');
    const { buffer } = await stage1ResultToXlsx(p.headers, p.rows, out.result.selected, {
      includeGezogenColumn: false,
    });
    downloadBinaryBlob(
      `versand-${seed()}.xlsx`,
      buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
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
      {/* 6-step progress rail (issue #65). Visual hint only — no gating
          logic. Resp 6→3→1 cols across breakpoints. */}
      <ol class="step-rail" aria-label="Stage-1-Schritte">
        <li
          class="step"
          classList={{ 'is-current': currentStep() === 1, 'is-done': currentStep() > 1 }}
        >
          <span class="step-num">1</span> Eingabe
        </li>
        <li
          class="step"
          classList={{ 'is-current': currentStep() === 2, 'is-done': currentStep() > 2 }}
        >
          <span class="step-num">2</span> Bemessung
        </li>
        <li
          class="step"
          classList={{ 'is-current': currentStep() === 3, 'is-done': currentStep() > 3 }}
        >
          <span class="step-num">3</span> Achsen
        </li>
        <li
          class="step"
          classList={{ 'is-current': currentStep() === 4, 'is-done': currentStep() > 4 }}
        >
          <span class="step-num">4</span> Parameter
        </li>
        <li
          class="step"
          classList={{ 'is-current': currentStep() === 5, 'is-done': currentStep() > 5 }}
        >
          <span class="step-num">5</span> Ziehen
        </li>
        <li class="step" classList={{ 'is-current': currentStep() === 6 }}>
          <span class="step-num">6</span> Audit &amp; Export
        </li>
      </ol>

      {/* Workflow context for the operator (issue #53 F): the page is one
          step of a three-stage process; the prefix orients the operator
          before the upload section. */}
      <header data-testid="stage1-step-header">
        <p class="text-xs uppercase tracking-wide text-ink-3">
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
      <section class="card">
        <div class="card-head">
          <span class="card-eyebrow">Schritt 1</span>
          <h2 class="card-title">1. Melderegister-CSV hochladen</h2>
          <p class="card-help">CSV-Datei mit Bevölkerungsdaten gemäß § 46 BMG.</p>
        </div>
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
          <span class="dropzone-label">
            Melderegister-CSV oder Excel hochladen oder hier ablegen
          </span>
          <span class="dropzone-hint">
            CSV (UTF-8/Latin-1) oder Excel (.xlsx) mit Header in Zeile 1
          </span>
          <Show when={file()}>
            {(f) => (
              <span class="text-xs text-accent-strong font-medium mt-1">Geladen: {f().name}</span>
            )}
          </Show>
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
        <p class="mt-2 text-sm text-ink-3">
          Keine eigenen Daten?{' '}
          <a
            href="#/docs/beispiele"
            class="underline text-accent hover:text-accent-strong"
            data-testid="stage1-beispiele-link"
          >
            Beispiel-Datei verwenden →
          </a>
        </p>
        <Show when={parsed()}>
          {(p) => (
            <>
              <p class="mt-2 text-sm text-ink-2" data-testid="stage1-pool-summary">
                <Show
                  when={p().format === 'csv'}
                  fallback={
                    <>
                      {p().rows.length} Zeilen geladen ({p().headers.length} Spalten, Worksheet{' '}
                      <code>{p().sheetName}</code>
                      <Show when={(p().sheetCount ?? 1) > 1}> — 1 von {p().sheetCount}</Show>
                      ).
                    </>
                  }
                >
                  {p().rows.length} Zeilen geladen ({p().headers.length} Spalten,{' '}
                  {p().separator === '\t' ? 'TAB' : p().separator}-getrennt, Encoding{' '}
                  <code>{p().encoding}</code>).
                </Show>
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
          <div class="banner err mt-3" data-testid="stage1-error">
            {error()}
          </div>
        </Show>
      </section>

      <Show when={parsed()}>
        {/* BMG §46 hint (Task 6) — informational, no hard block */}
        <aside class="banner info" data-testid="stage1-bmg-hint">
          <div>
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
          </div>
        </aside>
      </Show>

      {/* Issue #64: Bemessung der Stichprobe — optional helper that turns
          panel size + outreach method into a Versand-N suggestion. The N
          input below stays manually editable; this section just provides a
          starting point for users who don't already know N. */}
      <Show when={parsed()}>
        <section class="card space-y-3">
          <div class="card-head">
            <span class="card-eyebrow">Schritt 2</span>
            <h2 class="card-title">2. Bemessung der Stichprobe</h2>
          </div>
          <SampleSizeCalculator
            poolSize={() => parsed()?.rows.length ?? null}
            onAccept={handleSampleSizeAccept}
          />
        </section>
      </Show>

      <Show when={parsed()}>
        {(p) => (
          <section class="card space-y-3">
            <div class="card-head">
              <span class="card-eyebrow">Schritt 3</span>
              <h2 class="card-title">3. Stratifikation konfigurieren</h2>
            </div>
            <StratificationExplainer
              selectedAxes={selectedAxes}
              rows={() => parsed()?.rows ?? []}
              open={explainerOpen}
              onToggle={setExplainerOpen}
            />
            <AxisPicker
              headers={p().headers}
              defaultAxes={defaultAxes()}
              selected={selectedAxes}
              onToggle={toggleAxis}
              derivedColumns={p().derivedColumns}
              axisDescriptions={AXIS_DESCRIPTIONS}
              distinctValueCounts={distinctValueCounts()}
            />
            <Show when={p().derivedColumns.includes('altersgruppe')}>
              <AgeBandsEditor bands={bands} onBandsChange={setBands} refYear={refYear} />
            </Show>
          </section>
        )}
      </Show>

      <Show when={parsed()}>
        <section class="card space-y-3">
          <div class="card-head">
            <span class="card-eyebrow">Schritt 4</span>
            <h2 class="card-title">4. Stichprobengröße und Seed</h2>
          </div>
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
                onInput={(e) => handleTargetNInput(e.currentTarget.value)}
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
              class="text-xs underline text-ink-3 hover:text-ink"
              onClick={newDefaultSeed}
              disabled={running()}
            >
              Neuer Default-Seed (Unix-Sekunde)
            </button>
            <span class="text-xs text-ink-3" data-testid="stage1-seed-source">
              {seedSource() === 'user' ? '(manuell)' : '(Default — editierbar)'}
            </span>
          </div>
          <aside class="banner info text-xs" data-testid="stage1-seed-hint">
            <div>
              <strong>Hinweis zum Seed:</strong> Der Default-Seed ist sofort einsatzbereit — Sie
              können ihn übernehmen oder mit einem gemeinsam vereinbarten Wert (z.B. Lottozahlen,
              Datum, Würfelwurf) überschreiben. Der gewählte Seed steht im signierten
              Audit-Protokoll und macht den Lauf reproduzierbar.
            </div>
          </aside>
          <Show when={preview().error}>
            <div class="banner err" data-testid="stage1-preview-error">
              {preview().error}
            </div>
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
          {/* Sticky run-button wrapper — ALSO carries an inline
              style="padding-bottom: env(safe-area-inset-bottom)" so iOS
              Safari with home-indicator doesn't cover the button on
              scroll-bottom. mobile-touch-targets.spec asserts the regex
              /safe-area-inset-bottom/ matches the wrapper outerHTML. */}
          <div
            class="sticky [bottom:env(safe-area-inset-bottom,0)] -mx-4 px-4 pt-3 pb-3 bg-bg border-t border-line z-10 print:static print:border-0 print:p-0 print:bg-transparent"
            style="padding-bottom: env(safe-area-inset-bottom)"
          >
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
            <Show when={parsed() && validateBands(bands()) !== null}>
              <div class="banner warn mt-2 text-xs" data-testid="stage1-run-bands-block">
                Run deaktiviert: Altersgruppen-Bänder sind ungültig — siehe oben.
              </div>
            </Show>
          </div>
        </section>
      </Show>

      <Show when={output()}>
        {(out) => (
          <section class="space-y-4 stage1-report card" data-testid="stage1-result">
            <div class="card-head">
              <span class="card-eyebrow">Schritt 5–6</span>
              <h2 class="card-title">5. Ergebnis</h2>
            </div>

            {/* Top-line summary cards as a 4-cell .stats-grid (Gezogen,
                Gruppen-Abdeckung, Unterbesetzt, Dauer). Existing testids
                stage1-summary-cards / stage1-coverage-card /
                stage1-underfill-card preserved at the same DOM-nesting level
                — just visually re-laid via .stats-grid + .stat. */}
            <div class="stats-grid" data-testid="stage1-summary-cards">
              <div class="stat">
                <div class="k">Gezogen</div>
                <div class="v">{out().result.selected.length}</div>
                <div class="delta">von {parsed()?.rows.length ?? 0} im Pool</div>
              </div>
              <Show when={coverage()}>
                {(c) => (
                  <div class="stat" data-testid="stage1-coverage-card">
                    <div class="k">Gruppen-Abdeckung</div>
                    <div class="v">
                      {c().coveredStrata}{' '}
                      <span class="text-base text-ink-3">/ {c().totalStrata}</span>
                    </div>
                    <div class="delta">
                      {Number.isNaN(c().coverageRatio)
                        ? '–'
                        : `${(c().coverageRatio * 100).toFixed(1)} % mit ≥ 1 Person`}
                    </div>
                  </div>
                )}
              </Show>
              <div class="stat" data-testid="stage1-underfill-card">
                <div class="k">
                  Unterbesetzt{' '}
                  <Show when={(coverage()?.underfilledStrata ?? 0) > 0}>
                    <span class="status-pill status-pill-warn ml-1">Hinweis</span>
                  </Show>
                  <Show when={(coverage()?.underfilledStrata ?? 0) === 0}>
                    <span class="status-pill status-pill-ok ml-1">OK</span>
                  </Show>
                </div>
                <div class="v">{coverage()?.underfilledStrata ?? 0}</div>
                <div class="delta">Gruppen unter Soll</div>
              </div>
              <div class="stat">
                <div class="k">Dauer · Seed</div>
                <div class="v">{Math.round(out().durationMs)} ms</div>
                <div class="delta">Seed {out().signedAudit.doc.seed}</div>
              </div>
            </div>

            <Show when={underfills().length > 0}>
              <section class="banner warn flex-col" data-testid="stage1-underfill-list">
                <div>
                  <h3 class="font-semibold text-sm mb-1">Unterbesetzte Bevölkerungsgruppen</h3>
                  <p class="text-xs">
                    Diese Bevölkerungsgruppen bekamen weniger Personen als die proportionale
                    Allokation vorgesehen hat — Pool zu klein. Im echten Verfahren bedeutet das: bei
                    diesen Gruppen wurden alle verfügbaren Personen angeschrieben.
                  </p>
                  <ul class="text-xs space-y-1 mt-2">
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
                </div>
              </section>
            </Show>

            <Show when={out().result.warnings.length > 0 && underfills().length === 0}>
              <div class="banner err">
                <div>
                  <p class="font-semibold">Weitere Warnungen:</p>
                  <ul class="list-disc pl-5">
                    <For each={out().result.warnings}>{(w) => <li>{w}</li>}</For>
                  </ul>
                </div>
              </div>
            </Show>

            <Show when={out().csvWarnings.length > 0}>
              <div class="banner warn">
                <ul class="list-disc pl-5">
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

            {/* Issue #62: "Nicht in Auswahl einbezogen" — surfaces the pool
                presence of display-only bands without filtering them out.
                Renders only when the audit reports at least one forced-zero
                stratum, which by construction means at least one band was
                in display-only mode. */}
            <Show
              when={
                (out().signedAudit.doc.forced_zero_strata?.length ?? 0) > 0 && parsed() !== null
              }
            >
              {(() => {
                const report = infoOnlyBandsReport(
                  parsed()!.rows,
                  bands(),
                  'altersgruppe',
                  out().signedAudit.doc.target_n,
                  out().signedAudit.doc.pool_size,
                );
                return (
                  <section class="callout space-y-2" data-testid="stage1-info-only-bands-report">
                    <h3 class="text-sm font-semibold">Nicht in Auswahl einbezogen</h3>
                    <div class="overflow-x-auto">
                      <table class="tbl text-xs">
                        <thead>
                          <tr>
                            <th>Band</th>
                            <th class="text-right">Im Pool</th>
                            <th class="text-right">Hypothetisch (Soll-Proportion)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={report}>
                            {(row) => (
                              <tr>
                                <td class="tnum">{row.label}</td>
                                <td class="text-right tnum">{row.poolCount}</td>
                                <td class="text-right tnum">{row.hypotheticalSoll}</td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
                    </div>
                    <p class="text-xs italic text-ink-3">
                      Diese Personen wurden nicht gezogen — eigene Verfahrenswege denkbar (z.B.
                      Kinderrat).
                    </p>
                  </section>
                );
              })()}
            </Show>

            {/* Detailed cross-product strata table — collapsible to keep the
                results view readable for groups; "alle Detail-Strata" reveals it.
                UI-facing strings use plain-language German per CONTEXT.md
                glossary (Bevölkerungsgruppe instead of Stratum); statistics
                terms appear in parentheses for auditors. */}
            <details
              class="border border-line rounded"
              open={strataExpanded()}
              onToggle={(e) => setStrataExpanded((e.currentTarget as HTMLDetailsElement).open)}
            >
              <summary
                class="text-sm font-semibold p-2 bg-bg-sunken cursor-pointer select-none"
                data-testid="stage1-strata-toggle"
              >
                Detail-Tabelle (Bevölkerungsgruppen, {out().result.strata.length} Zeilen)
              </summary>
              {/* Mobile: horizontal scroll container so the table doesn't
                  break into wrap-salat. Desktop: inline. The parent div MUST
                  have overflow-x: auto — mobile-touch-targets.spec asserts
                  getComputedStyle(parent).overflowX === 'auto'. */}
              <div class="overflow-x-auto">
                <table class="tbl min-w-full text-xs" data-testid="stage1-strata-table">
                  <thead>
                    <tr>
                      <th>Bevölkerungsgruppe (Stratum)</th>
                      <th class="text-right">Pool</th>
                      <th class="text-right">Soll</th>
                      <th class="text-right">Ist</th>
                      <th class="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={out().result.strata}>
                      {(s) => (
                        <tr classList={{ 'bg-warn-soft': s.underfilled }}>
                          <td class="font-mono whitespace-nowrap">
                            {Object.entries(s.key).length === 0
                              ? '(gesamt)'
                              : Object.entries(s.key)
                                  .map(([k, v]) => `${k}=${v}`)
                                  .join(', ')}
                          </td>
                          <td class="text-right tnum">{s.n_h_pool}</td>
                          <td class="text-right tnum">{s.n_h_target}</td>
                          <td class="text-right tnum">{s.n_h_actual}</td>
                          <td class="text-center">
                            <span
                              class={`status-pill ${s.underfilled ? 'status-pill-warn' : 'status-pill-ok'}`}
                            >
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
                onClick={exportXlsx}
                data-testid="stage1-download-xlsx"
              >
                Excel herunterladen
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
