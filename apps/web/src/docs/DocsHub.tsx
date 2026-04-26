import { For, lazy, Show, Suspense } from 'solid-js';
import type { Component } from 'solid-js';
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

interface Props {
  docsRoute: () => DocsRoute;
  setDocsRoute: (r: DocsRoute) => void;
}

interface TileDef {
  slug: Exclude<DocsRoute, 'hub'>;
  title: string;
  description: string;
}

const TILES: ReadonlyArray<TileDef> = [
  {
    slug: 'algorithmus',
    title: 'Algorithmus',
    description: 'Wie wird gezogen? Schritt für Schritt mit Toy-Beispiel.',
  },
  {
    slug: 'technik',
    title: 'Technik',
    description: 'Welche Bibliotheken, in welcher Version, mit welcher Lizenz.',
  },
  {
    slug: 'verifikation',
    title: 'Verifikation',
    description: 'Lauf nachrechnen mit der Python-Referenz.',
  },
  {
    slug: 'glossar',
    title: 'Glossar',
    description: 'Begriffe nachschlagen.',
  },
  {
    slug: 'bmg46',
    title: '§ 46 BMG',
    description: 'Welche Felder sind im Melderegister erlaubt.',
  },
  {
    slug: 'limitationen',
    title: 'Limitationen',
    description: 'Was dieses Tool bewusst nicht tut.',
  },
];

const TITLES: Record<Exclude<DocsRoute, 'hub'>, string> = {
  algorithmus: 'Algorithmus',
  technik: 'Technik',
  verifikation: 'Verifikation',
  glossar: 'Glossar',
  bmg46: '§ 46 BMG',
  limitationen: 'Limitationen',
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
        <section class="space-y-4" data-testid="docs-hub">
          <header>
            <h2 class="text-2xl font-semibold tracking-tight">Dokumentation</h2>
            <p class="text-sm text-slate-600 mt-1">
              Erklärungen zum Algorithmus, der eingesetzten Technik, dem
              Reproduktions-Pfad und den rechtlichen Grundlagen.
            </p>
          </header>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <For each={TILES}>
              {(tile) => (
                <button
                  type="button"
                  class="border rounded p-4 bg-white hover:bg-slate-50 text-left space-y-1"
                  onClick={() => openTile(tile.slug)}
                  data-testid={`docs-tile-${tile.slug}`}
                >
                  <div class="font-semibold text-slate-900">{tile.title}</div>
                  <div class="text-xs text-slate-600">{tile.description}</div>
                </button>
              )}
            </For>
          </div>
          <footer
            class="text-xs text-slate-500 border-t pt-3 mt-8"
            data-testid="docs-build-footer-hub"
          >
            Diese Doku gehört zu Build{' '}
            <code class="font-mono">{__GIT_SHA__}</code> vom{' '}
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
