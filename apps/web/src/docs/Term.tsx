import { createSignal, Show } from 'solid-js';
import type { Component, JSX } from 'solid-js';
import glossar from './glossar.json';

export interface GlossarEntry {
  slug: string;
  term: string;
  kurz: string;
  lang_md?: string;
  see_also?: string[];
  external_link?: { label: string; url: string };
}

const ENTRIES = glossar as GlossarEntry[];
const LOOKUP: Map<string, GlossarEntry> = new Map(ENTRIES.map((e) => [e.slug, e]));

/** Public lookup helper used by tests and other docs components. */
export function findEntry(slug: string): GlossarEntry | undefined {
  return LOOKUP.get(slug);
}

/** All entries (for the full Glossar page). */
export function allEntries(): GlossarEntry[] {
  return ENTRIES;
}

interface Props {
  slug: string;
  children: JSX.Element;
}

/**
 * Inline term tooltip. Wraps the children in a dotted-underline span; on
 * hover/focus a small tooltip surfaces the short definition plus a link to
 * the full glossary entry. Touch users can tap to toggle. The tooltip is
 * absolutely positioned so it does not push surrounding text.
 *
 * If the slug is unknown, children render unchanged and a console.warn is
 * emitted in DEV — that catches typos before they reach production.
 */
const Term: Component<Props> = (props) => {
  const entry = LOOKUP.get(props.slug);
  if (!entry) {
    if (import.meta.env.DEV) {
      console.warn(`[docs/Term] unknown glossary slug: ${props.slug}`);
    }
    return <>{props.children}</>;
  }

  const [show, setShow] = createSignal(false);

  function open() {
    setShow(true);
  }
  function close() {
    setShow(false);
  }
  function toggle() {
    setShow((s) => !s);
  }

  return (
    <span
      class="relative inline-block"
      data-testid={`term-${props.slug}`}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocusIn={open}
      onFocusOut={close}
    >
      <span
        tabIndex={0}
        class="border-b border-dotted border-slate-500 cursor-help"
        onClick={toggle}
      >
        {props.children}
      </span>
      <Show when={show()}>
        <span
          role="tooltip"
          class="absolute left-0 top-full z-10 bg-slate-900 text-white text-xs p-2 rounded shadow max-w-xs mt-1"
          data-testid={`term-tooltip-${props.slug}`}
        >
          <span class="block font-semibold">{entry.term}</span>
          <span class="block mt-1">{entry.kurz}</span>
          <a class="block mt-2 underline text-sky-300" href={`#/docs/glossar/${entry.slug}`}>
            → im Glossar nachschlagen
          </a>
        </span>
      </Show>
    </span>
  );
};

export default Term;
