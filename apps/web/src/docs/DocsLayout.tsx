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
 */
const DocsLayout: Component<Props> = (props) => {
  return (
    <article class="space-y-6" data-testid="docs-layout">
      <header class="space-y-2">
        <Show when={props.back}>
          <button
            type="button"
            class="text-xs underline text-slate-500 hover:text-slate-700"
            onClick={() => props.back?.()}
            data-testid="docs-back-to-hub"
          >
            ← Zurück zur Übersicht
          </button>
        </Show>
        <h1 class="text-2xl font-semibold tracking-tight">{props.title}</h1>
      </header>
      <div class="prose prose-slate max-w-none text-sm leading-relaxed">
        {props.children}
      </div>
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
