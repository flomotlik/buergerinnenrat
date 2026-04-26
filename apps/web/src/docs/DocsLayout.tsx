import { Show } from 'solid-js';
import type { Component, JSX } from 'solid-js';

interface Props {
  title: string;
  /** Optional callback to return to the docs hub. Renders a back-link. */
  back?: () => void;
  children: JSX.Element;
}

/**
 * Shared shell for every docs subpage. Provides a consistent header (with
 * optional back-to-hub link) and a build-info footer that surfaces the
 * commit SHA + ISO build date so the printed/exported docs always carry
 * provenance. Globals __GIT_SHA__ / __BUILD_DATE__ are injected via
 * vite.config.ts at build time (see vite-env.d.ts).
 *
 * The content area uses .prose-app (defined in index.css) which wraps
 * @tailwindcss/typography's prose-slate with sensible max-width and
 * brand-accent link colour, so subpages get nice typography for free
 * wherever they emit semantic HTML (h2/h3/p/ul/li/code).
 */
const DocsLayout: Component<Props> = (props) => {
  return (
    <article class="space-y-6" data-testid="docs-layout">
      <header class="space-y-3 pb-4 border-b border-slate-200">
        <Show when={props.back}>
          {/* Back link as a btn-ghost-ish primary affordance: arrow + text. */}
          <button
            type="button"
            class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-accent-strong transition"
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
        <h1 class="text-3xl font-bold tracking-tight text-brand">
          {props.title}
        </h1>
      </header>
      <div class="prose-app text-sm leading-relaxed">{props.children}</div>
      <footer
        class="text-xs text-slate-500 border-t pt-3 mt-8"
        data-testid="docs-build-footer"
      >
        Diese Doku gehört zu Build <code class="font-mono">{__GIT_SHA__}</code> vom{' '}
        <code class="font-mono">{__BUILD_DATE__}</code>.
      </footer>
    </article>
  );
};

export default DocsLayout;
