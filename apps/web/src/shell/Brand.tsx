import type { Component } from 'solid-js';

/**
 * Brand block — Grüne-AT wordmark logo from the design-system CDN +
 * Personenauswahl sub-title. Lifted out of App.tsx so the sidebar (md+)
 * and the future mobile drawer can render the same mark without
 * duplication.
 *
 * IMPORTANT: the wordmark is a <span class="font-serif">, NOT an <h1>. The
 * single <h1> per route is owned by the page (Stage1Panel, DocsLayout,
 * Overview) — not by chrome — per a11y.spec.ts ("h1 must exist and be
 * unique").
 *
 * The logo asset is loaded straight from the design-system project page
 * (no vendoring) so the CDN-refresh path also delivers any future
 * brand-asset updates without a deploy here.
 */
export const Brand: Component<{ subtitle?: string }> = (props) => (
  <div class="flex items-center gap-3" data-testid="brand">
    <img
      src="https://grueneat.github.io/design-system/assets/gruene-logo.svg"
      alt="Grüne — Bürgerinnenrat"
      class="h-8 w-auto shrink-0"
      width="32"
      height="32"
    />
    <div class="flex flex-col leading-tight">
      <span class="font-serif font-semibold text-lg text-ink">Personenauswahl</span>
      <span class="text-xs text-ink-3">{props.subtitle ?? 'Stratifiziertes Losverfahren'}</span>
    </div>
  </div>
);

export default Brand;
