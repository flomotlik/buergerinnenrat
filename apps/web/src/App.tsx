import {
  createMemo,
  createSignal,
  lazy,
  onCleanup,
  onMount,
  Show,
  Suspense,
} from 'solid-js';
import type { Component } from 'solid-js';
import { CsvImport } from './csv/CsvImport';
import { applyMapping } from './csv/parse';
import type { ColumnMapping, ParsedCsv } from './csv/parse';
import { QuotaEditor } from './quotas/QuotaEditor';
import type { CategoryQuota, QuotaConfig } from './quotas/model';
import { validateQuotas } from './quotas/model';
import { RunPanel } from './run/RunPanel';
import { Stage1Panel } from './stage1/Stage1Panel';
import type { Pool, Quotas as EngineQuotas } from '@sortition/engine-contract';

// Docs-Hub is the only docs entry point exposed at the App-level. Every docs
// subpage is loaded lazily from inside DocsHub itself, so the docs route only
// pulls its bundle when the user actually navigates to the Dokumentation tab.
const DocsHub = lazy(() => import('./docs/DocsHub'));

interface ImportedPool {
  parsed: ParsedCsv;
  mapping: ColumnMapping;
  rows: Record<string, string>[];
}

function toEnginePool(rows: Record<string, string>[]): Pool {
  return {
    id: 'imported',
    people: rows.map((r) => ({ ...r, person_id: r['person_id'] ?? '' })),
  };
}

function toEngineQuotas(cfg: QuotaConfig): EngineQuotas {
  return {
    panel_size: cfg.panel_size,
    categories: cfg.categories.map((c: CategoryQuota) => ({
      column: c.column,
      bounds: c.bounds,
    })),
  };
}

type AppMode = 'stage1' | 'stage3' | 'docs';

// Allowed docs routes. The docs hub itself is route 'hub'; every other value
// corresponds to a subpage component lazy-loaded by DocsHub.
export type DocsRoute =
  | 'hub'
  | 'algorithmus'
  | 'technik'
  | 'verifikation'
  | 'glossar'
  | 'bmg46'
  | 'limitationen'
  | 'beispiele';

const DOCS_ROUTES: ReadonlySet<DocsRoute> = new Set<DocsRoute>([
  'hub',
  'algorithmus',
  'technik',
  'verifikation',
  'glossar',
  'bmg46',
  'limitationen',
  'beispiele',
]);

interface ParsedHash {
  mode: AppMode;
  docsRoute: DocsRoute;
}

/**
 * Parse a URL hash into a (mode, docsRoute) pair. Unknown hashes fall back to
 * the default landing tab (stage3) without crashing — silently ignoring stray
 * fragments such as `#some-anchor` or `#/foobar` keeps the app robust against
 * old bookmarks.
 */
function parseHash(hash: string): ParsedHash {
  if (!hash || hash === '#' || hash === '#/') {
    return { mode: 'stage3', docsRoute: 'hub' };
  }
  const stripped = hash.replace(/^#\/?/, '');
  const parts = stripped.split('/');
  const head = parts[0];
  if (head === 'stage1') return { mode: 'stage1', docsRoute: 'hub' };
  if (head === 'stage3') return { mode: 'stage3', docsRoute: 'hub' };
  if (head === 'docs') {
    const sub = parts[1] ?? 'hub';
    if (DOCS_ROUTES.has(sub as DocsRoute)) {
      return { mode: 'docs', docsRoute: sub as DocsRoute };
    }
    return { mode: 'docs', docsRoute: 'hub' };
  }
  return { mode: 'stage3', docsRoute: 'hub' };
}

function hashFor(mode: AppMode, docsRoute: DocsRoute): string {
  if (mode === 'stage1') return '#/stage1';
  if (mode === 'stage3') return '#/stage3';
  return docsRoute === 'hub' ? '#/docs' : `#/docs/${docsRoute}`;
}

export const App: Component = () => {
  // Default mode is stage3 so existing Stage-3 workflow remains the landing
  // page (issue acceptance: "Bestehende Stage-3-Funktionalität bleibt
  // unverändert nutzbar"). State trees of the two modes are intentionally
  // disjoint — a Stage 1 import does not feed Stage 3 and vice versa.
  const [mode, setMode] = createSignal<AppMode>('stage3');
  const [docsRoute, setDocsRoute] = createSignal<DocsRoute>('hub');

  const [pool, setPool] = createSignal<ImportedPool | null>(null);
  const [quotas, setQuotas] = createSignal<QuotaConfig | null>(null);

  const enginePool = createMemo(() => {
    const p = pool();
    return p ? toEnginePool(p.rows) : null;
  });

  const engineQuotas = createMemo(() => {
    const q = quotas();
    return q ? toEngineQuotas(q) : null;
  });

  const quotaValid = createMemo(() => {
    const p = pool();
    const q = quotas();
    if (!p || !q) return false;
    return validateQuotas(p.rows, q).ok;
  });

  // URL-Hash <-> Solid signal sync. We read the initial hash on mount and
  // subscribe to hashchange events so external navigation (back/forward,
  // bookmark, manual edit, link click) always wins. Tab clicks write the hash
  // and rely on the listener to flip the signals — this keeps the source of
  // truth in one place.
  function applyFromHash() {
    const parsed = parseHash(window.location.hash);
    if (parsed.mode !== mode()) setMode(parsed.mode);
    if (parsed.docsRoute !== docsRoute()) setDocsRoute(parsed.docsRoute);
  }

  onMount(() => {
    applyFromHash();
    window.addEventListener('hashchange', applyFromHash);
    onCleanup(() => window.removeEventListener('hashchange', applyFromHash));
  });

  function navigateMode(next: AppMode) {
    // Writing the hash triggers `hashchange`, which flips the signals via
    // applyFromHash() — single update path keeps mode + URL in lockstep.
    window.location.hash = hashFor(next, next === 'docs' ? docsRoute() : 'hub');
  }

  function navigateDocsRoute(next: DocsRoute) {
    window.location.hash = hashFor('docs', next);
  }

  return (
    <main class="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <header class="space-y-5 pb-6 border-b border-slate-200">
        {/* Brand block: logo + headings. Mobile stacks vertically; ≥sm goes
            horizontal so the logo sits next to the title on desktop. */}
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {/* Inline-SVG logo: assembly icon (one filled circle surrounded by
              six smaller circles). Same shape as favicon for brand recognition. */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-12 w-12 text-brand-accent shrink-0"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <circle cx="12" cy="3" r="1.5" />
            <circle cx="20" cy="7.5" r="1.5" />
            <circle cx="20" cy="16.5" r="1.5" />
            <circle cx="12" cy="21" r="1.5" />
            <circle cx="4" cy="16.5" r="1.5" />
            <circle cx="4" cy="7.5" r="1.5" />
          </svg>
          <div>
            <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-brand">
              Bürger:innenrat
            </h1>
            <p class="mt-1 text-base text-slate-600">
              Versand-Liste &amp; Panel-Auswahl
            </p>
          </div>
        </div>
        <p class="text-base text-slate-700 max-w-2xl leading-relaxed">
          Open-Source-Werkzeug für Verwaltungen — stratifizierte Auswahl ohne Backend,
          ohne Datenversand.
        </p>
      </header>

      {/* Top navigation: pill-button tab bar. On mobile the bar becomes a
          horizontal scroll container (overflow-x-auto + scroll-snap) so the
          pills stay on a single line instead of wrapping. Subtitles moved
          out of the visual DOM into title attributes so they remain available
          for screen readers / hover tooltips on desktop. */}
      <nav
        class="flex gap-2 overflow-x-auto pb-2 sm:pb-0 [scroll-snap-type:x_mandatory] -mx-4 px-4 sm:mx-0 sm:px-0"
        role="tablist"
        data-testid="main-nav"
      >
        <button
          type="button"
          role="tab"
          aria-current={mode() === 'stage1' ? 'page' : undefined}
          aria-selected={mode() === 'stage1'}
          title="Stage 1 — Versand-Liste aus Melderegister"
          class="pill-tab [scroll-snap-align:start]"
          classList={{
            'pill-tab-active': mode() === 'stage1',
            'pill-tab-inactive': mode() !== 'stage1',
          }}
          onClick={() => navigateMode('stage1')}
          data-testid="tab-stage1"
        >
          Stage 1 / Versand-Liste
        </button>
        <button
          type="button"
          role="tab"
          aria-current={mode() === 'docs' ? 'page' : undefined}
          aria-selected={mode() === 'docs'}
          title="Dokumentation — Algorithmus, Technik, Verifikation"
          class="pill-tab [scroll-snap-align:start]"
          classList={{
            'pill-tab-active': mode() === 'docs',
            'pill-tab-inactive': mode() !== 'docs',
          }}
          onClick={() => navigateMode('docs')}
          data-testid="tab-docs"
        >
          Dokumentation
        </button>
        <button
          type="button"
          role="tab"
          aria-current={mode() === 'stage3' ? 'page' : undefined}
          aria-selected={mode() === 'stage3'}
          title="Stage 3 — Panel ziehen aus Antwortenden"
          class="pill-tab [scroll-snap-align:start]"
          classList={{
            'pill-tab-active': mode() === 'stage3',
            'pill-tab-inactive': mode() !== 'stage3',
          }}
          onClick={() => navigateMode('stage3')}
          data-testid="tab-stage3"
        >
          Stage 3 / Panel ziehen
        </button>
      </nav>

      <Show when={mode() === 'stage1'}>
        <Stage1Panel />
      </Show>

      <Show when={mode() === 'docs'}>
        <Suspense fallback={<p>Lade…</p>}>
          <DocsHub docsRoute={docsRoute} setDocsRoute={navigateDocsRoute} />
        </Suspense>
      </Show>

      <Show when={mode() === 'stage3'}>
        <div class="space-y-8">
          <section>
            <h2 class="text-xl font-semibold mb-3">1. Pool importieren</h2>
            <CsvImport
              onLoaded={({ parsed, mapping }) => {
                setPool({ parsed, mapping, rows: applyMapping(parsed.rows, mapping) });
                setQuotas(null);
              }}
            />
          </section>

          <Show when={pool()}>
            {(p) => (
              <section>
                <h2 class="text-xl font-semibold mb-3">2. Quoten konfigurieren</h2>
                <p class="text-sm text-slate-600 mb-3" data-testid="pool-summary">
                  {p().rows.length} Personen importiert.
                </p>
                <QuotaEditor
                  rows={p().rows}
                  candidateColumns={Object.keys(p().rows[0] ?? {}).filter((c) => c !== 'person_id')}
                  onChange={(cfg) => setQuotas(cfg)}
                />
              </section>
            )}
          </Show>

          <Show when={quotaValid() && enginePool() && engineQuotas()}>
            <section>
              <h2 class="text-xl font-semibold mb-3">3. Lauf starten</h2>
              <RunPanel pool={enginePool()!} quotas={engineQuotas()!} />
            </section>
          </Show>

          <Show when={pool() && quotas() && !quotaValid()}>
            <section>
              <p class="text-sm text-slate-500" data-testid="run-stub">
                Quoten-Konfiguration noch nicht gültig — bitte Eingaben prüfen.
              </p>
            </section>
          </Show>
        </div>
      </Show>
    </main>
  );
};
