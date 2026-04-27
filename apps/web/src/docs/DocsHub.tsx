import { For, lazy, Show, Suspense } from 'solid-js';
import type { Component, JSX } from 'solid-js';
import type { DocsRoute } from '../App';
import DocsLayout from './DocsLayout';

// Each subpage is its own dynamic chunk so the docs bundle only loads what
// the user actually opens. The Hub shell itself is small and shared.
const Algorithmus = lazy(() => import('./Algorithmus'));
const Technik = lazy(() => import('./Technik'));
const Verifikation = lazy(() => import('./Verifikation'));
const Glossar = lazy(() => import('./Glossar'));
const Bmg46 = lazy(() => import('./Bmg46'));
const Limitationen = lazy(() => import('./Limitationen'));
const Beispiele = lazy(() => import('./Beispiele'));

interface Props {
  docsRoute: () => DocsRoute;
  setDocsRoute: (r: DocsRoute) => void;
}

interface TileDef {
  slug: Exclude<DocsRoute, 'hub'>;
  title: string;
  description: string;
  // Per-tile inline-SVG icon. Rendered ~28×28 above the title in
  // brand-accent. Each icon is chosen so the tile is recognisable at a
  // glance without reading the title (e.g. § for the BMG section).
  icon: JSX.Element;
}

const ICON_CLASS = 'h-7 w-7 text-brand-accent';
const SVG_BASE = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': true,
} as const;

const TILES: ReadonlyArray<TileDef> = [
  {
    slug: 'algorithmus',
    title: 'Algorithmus',
    description: 'Wie wird gezogen? Schritt für Schritt mit Toy-Beispiel.',
    // Three connected nodes: signals "schritt-für-schritt" / pipeline.
    icon: (
      <svg {...SVG_BASE} class={ICON_CLASS}>
        <circle cx="6" cy="6" r="2" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="12" cy="18" r="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="6" y1="8" x2="11" y2="16" />
        <line x1="18" y1="8" x2="13" y2="16" />
      </svg>
    ),
  },
  {
    slug: 'beispiele',
    title: 'Beispiel-Daten',
    description: 'CSV-Dateien zum Download — den ganzen Workflow direkt ausprobieren.',
    // File icon with download arrow — signals "data file / download".
    icon: (
      <svg {...SVG_BASE} class={ICON_CLASS}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <polyline points="9 15 12 18 15 15" />
      </svg>
    ),
  },
  {
    slug: 'technik',
    title: 'Technik',
    description: 'Welche Bibliotheken, in welcher Version, mit welcher Lizenz.',
    // Code brackets — signals "Tech / Implementation".
    icon: (
      <svg {...SVG_BASE} class={ICON_CLASS}>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    slug: 'verifikation',
    title: 'Verifikation',
    description: 'Lauf nachrechnen mit der Python-Referenz.',
    // Shield with check inside — signals "verified / proof".
    icon: (
      <svg {...SVG_BASE} class={ICON_CLASS}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    slug: 'glossar',
    title: 'Glossar',
    description: 'Begriffe nachschlagen.',
    // Open book — signals "reference / dictionary".
    icon: (
      <svg {...SVG_BASE} class={ICON_CLASS}>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    slug: 'bmg46',
    title: '§ 46 BMG',
    description: 'Welche Felder sind im Melderegister erlaubt.',
    // Section symbol "§" inside a circle — signals legal/paragraph.
    icon: (
      <svg {...SVG_BASE} class={ICON_CLASS}>
        <circle cx="12" cy="12" r="10" />
        <text
          x="12"
          y="16"
          text-anchor="middle"
          font-size="13"
          font-weight="bold"
          stroke="none"
          fill="currentColor"
        >
          §
        </text>
      </svg>
    ),
  },
  {
    slug: 'limitationen',
    title: 'Limitationen',
    description: 'Was dieses Tool bewusst nicht tut.',
    // Triangle with exclamation — signals "watch out / caveats".
    icon: (
      <svg {...SVG_BASE} class={ICON_CLASS}>
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" x2="12" y1="9" y2="13" />
        <line x1="12" x2="12.01" y1="17" y2="17" />
      </svg>
    ),
  },
];

const TITLES: Record<Exclude<DocsRoute, 'hub'>, string> = {
  algorithmus: 'Algorithmus',
  technik: 'Technik',
  verifikation: 'Verifikation',
  glossar: 'Glossar',
  bmg46: '§ 46 BMG',
  limitationen: 'Limitationen',
  beispiele: 'Beispiel-Daten',
};

/** Map a non-hub route to its component. */
function renderSubpage(route: Exclude<DocsRoute, 'hub'>) {
  switch (route) {
    case 'algorithmus':
      return <Algorithmus />;
    case 'technik':
      return <Technik />;
    case 'verifikation':
      return <Verifikation />;
    case 'glossar':
      return <Glossar />;
    case 'bmg46':
      return <Bmg46 />;
    case 'limitationen':
      return <Limitationen />;
    case 'beispiele':
      return <Beispiele />;
  }
}

const DocsHub: Component<Props> = (props) => {
  function openTile(slug: Exclude<DocsRoute, 'hub'>) {
    props.setDocsRoute(slug);
    // Reset scroll for newly opened subpage so the user starts at the top.
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function backToHub() {
    props.setDocsRoute('hub');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  return (
    <Show
      when={props.docsRoute() !== 'hub'}
      fallback={
        <section class="space-y-6" data-testid="docs-hub">
          <header>
            <h2 class="text-2xl font-semibold tracking-tight text-brand">Dokumentation</h2>
            <p class="text-sm text-slate-600 mt-2 max-w-2xl">
              Erklärungen zum Algorithmus, der eingesetzten Technik, dem Reproduktions-Pfad und den
              rechtlichen Grundlagen.
            </p>
          </header>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <For each={TILES}>
              {(tile) => (
                <button
                  type="button"
                  class="card card-hover text-left flex flex-col items-start gap-3 cursor-pointer"
                  onClick={() => openTile(tile.slug)}
                  data-testid={`docs-tile-${tile.slug}`}
                >
                  {tile.icon}
                  <div>
                    <div class="text-lg font-semibold text-slate-900">{tile.title}</div>
                    <div class="text-sm text-slate-600 mt-1">{tile.description}</div>
                  </div>
                </button>
              )}
            </For>
          </div>
          <footer
            class="text-xs text-slate-500 border-t pt-3 mt-8"
            data-testid="docs-build-footer-hub"
          >
            Diese Doku gehört zu Build <code class="font-mono">{__GIT_SHA__}</code> vom{' '}
            <code class="font-mono">{__BUILD_DATE__}</code>.
          </footer>
        </section>
      }
    >
      {(() => {
        const route = props.docsRoute() as Exclude<DocsRoute, 'hub'>;
        return (
          <DocsLayout title={TITLES[route]} back={backToHub}>
            <Suspense fallback={<p>Lade…</p>}>{renderSubpage(route)}</Suspense>
          </DocsLayout>
        );
      })()}
    </Show>
  );
};

export default DocsHub;
