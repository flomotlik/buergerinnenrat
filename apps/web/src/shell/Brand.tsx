import type { Component } from 'solid-js';

/**
 * Brand block — assembly-icon SVG + wordmark. Lifted out of App.tsx so the
 * sidebar (md+) and the future mobile drawer can render the same mark
 * without duplication.
 *
 * IMPORTANT: the wordmark is a <span class="font-serif">, NOT an <h1>. The
 * single <h1> per route is owned by the page (Stage1Panel, DocsLayout,
 * Overview) — not by chrome — per a11y.spec.ts ("h1 must exist and be
 * unique").
 */
export const Brand: Component<{ subtitle?: string }> = (props) => (
  <div class="flex items-center gap-3" data-testid="brand">
    {/* Inline-SVG logo: assembly icon (one filled circle surrounded by
        six smaller circles). Same shape as the favicon for brand
        recognition. The SVG is intentionally inline rather than imported
        as an <img> so it can inherit `currentColor` and stay accessible
        to print styles. */}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-8 w-8 text-accent shrink-0"
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
    <div class="flex flex-col leading-tight">
      <span class="font-serif font-semibold text-lg text-ink">Personenauswahl</span>
      <span class="text-xs text-ink-3">{props.subtitle ?? 'Stratifiziertes Losverfahren'}</span>
    </div>
  </div>
);

export default Brand;
