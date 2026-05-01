import { createEffect, createSignal, For, Show } from 'solid-js';
import type { Component, JSX } from 'solid-js';

interface Props {
  title: string;
  /** Optional callback to return to the docs hub. Renders a back-link. */
  back?: () => void;
  children: JSX.Element;
}

interface TocItem {
  id: string;
  text: string;
}

/**
 * Shared shell for every docs subpage. Provides:
 *   - a consistent header (with optional back-to-hub link)
 *   - a 220px sticky TOC + 68ch reading column (.doc-grid / .doc-toc / .doc-body)
 *   - a build-info footer that surfaces the commit SHA + ISO build date so the
 *     printed/exported docs always carry provenance.
 *
 * The TOC is auto-extracted from the `<h2>` headings rendered inside the body
 * via createEffect(on(props.children, ...)). queueMicrotask defers the DOM
 * read until after lazy-loaded subpages have actually mounted their <h2>s.
 *
 * Globals __GIT_SHA__ / __BUILD_DATE__ are injected via vite.config.ts at
 * build time (see vite-env.d.ts).
 */
const DocsLayout: Component<Props> = (props) => {
  let bodyEl: HTMLDivElement | undefined;
  const [toc, setToc] = createSignal<TocItem[]>([]);

  // Re-extract on title change (each subpage has a unique title) and again on
  // a microtask tick so lazy-loaded children have time to mount their <h2>s.
  // For Suspense-deferred subpages the first pass yields zero headings; a
  // second microtask after the next mount catches them.
  createEffect(() => {
    // Tracking props.title forces re-run on subpage navigation. Tracking the
    // children getter would not work — Solid passes JSX once, then mutation
    // happens via reactive state we don't see here.
    void props.title;
    if (!bodyEl) return;
    const extract = () => {
      if (!bodyEl) return;
      const headings = bodyEl.querySelectorAll('h2');
      const items: TocItem[] = [];
      headings.forEach((h, i) => {
        if (!h.id) {
          const slug = (h.textContent || '')
            .toLowerCase()
            .replace(/[^a-z0-9äöüß]+/g, '-')
            .replace(/^-|-$/g, '');
          h.id = slug ? `sec-${i}-${slug}` : `sec-${i}`;
        }
        items.push({ id: h.id, text: h.textContent ?? '' });
      });
      setToc(items);
    };
    // First pass — picks up immediately-mounted subpages.
    queueMicrotask(extract);
    // Second pass — for Suspense-deferred subpages, the lazy chunk resolves
    // after a tick. 50ms is a tiny budget, well below human-perceptible.
    setTimeout(extract, 50);
  });

  return (
    <article class="space-y-6" data-testid="docs-layout">
      <header class="space-y-3 pb-4 border-b border-line">
        <Show when={props.back}>
          {/* Back link as a btn-ghost-ish primary affordance: arrow + text. */}
          <button
            type="button"
            class="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-accent transition py-3 px-1 -mx-1 min-h-[44px]"
            onClick={() => props.back?.()}
            data-testid="docs-back-to-hub"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-4 w-4"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Zurück zur Übersicht
          </button>
        </Show>
        <h1 class="text-3xl font-serif font-semibold tracking-tight text-ink">{props.title}</h1>
      </header>
      <div class="doc-grid">
        <nav class="doc-toc" aria-label="Inhaltsverzeichnis" data-testid="docs-toc">
          <Show when={toc().length > 0} fallback={<span class="text-xs text-ink-3">…</span>}>
            <ol>
              <For each={toc()}>
                {(item) => (
                  <li>
                    <a href={`#${item.id}`}>{item.text}</a>
                  </li>
                )}
              </For>
            </ol>
          </Show>
        </nav>
        <div class="doc-body prose-app text-sm leading-relaxed" ref={bodyEl}>
          {props.children}
        </div>
      </div>
      <footer class="text-xs text-ink-3 border-t border-line pt-3 mt-8" data-testid="docs-build-footer">
        Diese Doku gehört zu Build <code class="font-mono">{__GIT_SHA__}</code> vom{' '}
        <code class="font-mono">{__BUILD_DATE__}</code>.
      </footer>
    </article>
  );
};

export default DocsLayout;
