import { createMemo, createSignal, For, onMount, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { allEntries } from './Term';
import type { GlossarEntry } from './Term';

function sortByTerm(entries: ReadonlyArray<GlossarEntry>): GlossarEntry[] {
  return [...entries].sort((a, b) => a.term.localeCompare(b.term, 'de-DE'));
}

const SORTED = sortByTerm(allEntries());

const Glossar: Component = () => {
  const [filter, setFilter] = createSignal('');

  const visible = createMemo(() => {
    const f = filter().trim().toLowerCase();
    if (!f) return SORTED;
    return SORTED.filter(
      (e) => e.term.toLowerCase().includes(f) || e.kurz.toLowerCase().includes(f),
    );
  });

  // On mount, if the URL hash points at a specific entry, scroll into view.
  // The hash format is `#/docs/glossar/<slug>`; we just look for the slug
  // tail and use document.getElementById which works for the dt id we set.
  onMount(() => {
    const hash = window.location.hash;
    const match = hash.match(/^#\/docs\/glossar\/(.+)$/);
    if (match) {
      const slug = match[1]!;
      // Defer to the next frame so Solid has actually mounted the dt nodes.
      window.requestAnimationFrame(() => {
        document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  });

  return (
    <div class="space-y-4" data-testid="docs-page-glossar">
      <p>
        Begriffe in alphabetischer Reihenfolge. Über das Filterfeld kann nach Term oder Definition
        gesucht werden.
      </p>
      <div>
        <input
          type="search"
          placeholder="Filter…"
          class="border rounded px-2 py-1 w-full text-sm"
          value={filter()}
          onInput={(e) => setFilter(e.currentTarget.value)}
          data-testid="glossar-filter"
        />
      </div>
      <Show
        when={visible().length > 0}
        fallback={<p class="text-xs text-slate-600">Keine Treffer.</p>}
      >
        <dl class="space-y-4">
          <For each={visible()}>
            {(entry) => (
              <div data-testid={`glossar-entry-${entry.slug}`}>
                <dt id={entry.slug} class="font-semibold text-base scroll-mt-4">
                  {entry.term}
                </dt>
                <dd class="text-sm text-slate-700 mt-1">
                  <p>{entry.kurz}</p>
                  <Show when={(entry.see_also ?? []).length > 0}>
                    <p class="text-xs text-slate-600 mt-1">
                      Siehe auch:{' '}
                      <For each={entry.see_also}>
                        {(ref, i) => (
                          <>
                            <Show when={i() > 0}>, </Show>
                            <a class="underline" href={`#/docs/glossar/${ref}`}>
                              {ref}
                            </a>
                          </>
                        )}
                      </For>
                    </p>
                  </Show>
                  <Show when={entry.external_link}>
                    {(link) => (
                      <p class="text-xs mt-1">
                        <a
                          class="underline"
                          href={link().url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {link().label}
                        </a>
                      </p>
                    )}
                  </Show>
                </dd>
              </div>
            )}
          </For>
        </dl>
      </Show>
    </div>
  );
};

export default Glossar;
