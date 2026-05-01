# Ecosystem Research — 65-visual-redesign-design-handoff

> **Note:** Sections 1-5 (Solid 1.9 sidebar/drawer patterns, Tailwind v3 + CSS variables hybrid, OkLCH browser support, self-hosted webfont best practices) were research-validated by the agent but the result transcript was truncated. Their conclusions are reflected in the Sources Summary (§8) below and incorporated into RESEARCH.md synthesis. Sections 6-9 captured verbatim from the agent's inline result.

## 6. Drawer Implementation — Kobalte Dialog

### 6.1 Use `@kobalte/core/dialog`

`@kobalte/core` is already in `apps/web/package.json` deps (^0.13.11) but not currently imported. Subpath import `@kobalte/core/dialog` uses Kobalte's package.json `exports` map (`"./*": { "solid": "./dist/*/index.jsx" }`), pulling only the dialog primitive.

**Bundle cost:**
- `@kobalte/core/dialog` depends on `dismissable-layer`, `solid-presence`, `solid-prevent-scroll`. `@floating-ui/dom` is optional (drawer doesn't need floating positioning).
- Estimated **~12-15 KB raw / ~5-6 KB gzip** for dialog + primitives. Within the +50/+18 KB budget.

**Drawer features Kobalte gives free** (verified at https://kobalte.dev/docs/core/components/dialog):
- Focus trap (focus is trapped while open)
- Escape key dismissal (`onEscapeKeyDown` callback to override)
- Scroll lock (built-in via `solid-prevent-scroll` when `modal` prop = true, default)
- Returns focus to trigger on close (`onCloseAutoFocus`)
- ARIA: `role="dialog"`, `aria-modal="true"`, automatic `aria-labelledby` (via `Dialog.Title`), `aria-describedby` (via `Dialog.Description`)
- Animation hooks: `data-expanded` / `data-closed` data-attributes for CSS transitions
- Portal mounting via `Dialog.Portal`

**NOT free:** `prefers-reduced-motion` handling — must be manual via CSS.

**Verdict: USE `@kobalte/core/dialog` for the mobile drawer.** Battle-tested, tiny, already in deps.

**Skeleton:**
```tsx
// apps/web/src/shell/MobileDrawer.tsx
import { Dialog } from '@kobalte/core/dialog';

export function MobileDrawer(props: { open: boolean; onClose: () => void; children: any }) {
  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()} modal>
      <Dialog.Portal>
        <Dialog.Overlay class="
          fixed inset-0 z-40 bg-black/30
          data-[expanded]:animate-in data-[expanded]:fade-in
          data-[closed]:animate-out data-[closed]:fade-out
          motion-reduce:transition-none motion-reduce:animate-none
        " />
        <Dialog.Content
          id="mobile-drawer"
          class="
            fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw]
            bg-bg shadow-xl
            data-[expanded]:translate-x-0
            data-[closed]:-translate-x-full
            transition-transform duration-200 ease-out
            motion-reduce:transition-none
            pb-[env(safe-area-inset-bottom)]
          "
        >
          <Dialog.Title class="sr-only">Navigation</Dialog.Title>
          <Dialog.CloseButton class="absolute top-4 right-4 size-11 …" aria-label="Schließen">×</Dialog.CloseButton>
          {props.children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
```

### 6.2 Why NOT `@corvu/drawer`

[Corvu Drawer](https://corvu.dev/docs/primitives/drawer/) is a strong specialist primitive (snap points, swipe gestures, dynamic height) but:
- Adds a new dependency (~8-10 KB additional gzip on top of Kobalte's dep graph)
- Snap points / swipe gestures are mobile-app polish unnecessary for a navigation drawer
- Kobalte Dialog already has every feature the issue requires

**Verdict: skip Corvu. Use Kobalte Dialog.**

### 6.3 Touch-target ≥44×44 (WCAG 2.5.5 Level AAA)

Tailwind classes that yield 44px:
- `size-11` (Tailwind v3.4+) → 2.75rem = 44px (at default 16px root)
- `min-w-11 min-h-11` for stretching buttons
- `p-3` on a 20px icon yields 44px total

**Best:** `inline-flex items-center justify-center size-11` for icon buttons. `mobile-touch-targets.spec.ts:50-168` validates.

### 6.4 `prefers-reduced-motion`

Kobalte does NOT auto-handle this. Use Tailwind's `motion-reduce:` variant directly in classes (built into v3, no plugin):
```
motion-reduce:transition-none motion-reduce:animate-none
```
OR plain CSS:
```css
@media (prefers-reduced-motion: reduce) {
  [data-kb-dialog-content] {
    transition: none !important;
    animation: none !important;
  }
}
```

### 6.5 `role="dialog"` vs `role="navigation"`

Drawer is a **modal that contains navigation**, not a navigation landmark itself.
- Outer dialog: `role="dialog"`, `aria-modal="true"` (Kobalte sets automatically)
- Inner `<nav>` element with `aria-label="Hauptnavigation"` inside the dialog

Matches existing `<nav data-testid="main-nav">` semantic.

---

## 7. Source Serif 4 vs Alternatives — German Display Text

### 7.1 Source Serif 4 still best Adobe-OFL serif for DE in 2026?

**Yes, with a caveat.** Source Serif 4 character coverage is Adobe Latin 4 (616 glyphs) — covers Basic Latin + Latin-1 Supplement + Latin Extended-A. Includes:
- `ä ö ü ß` (U+00E4, U+00F6, U+00FC, U+00DF)
- `Ä Ö Ü` (U+00C4, U+00D6, U+00DC)
- Capital `ẞ` (U+1E9E) — included in Adobe Latin 4 specifically since Adobe added it post-2017

**Validation step for executor:** open `SourceSerif4-Semibold.otf.woff2` with `fonttools ttx -t cmap` and confirm `U+1E9E` glyph exists. If absent, fallback options: Junicode (also OFL) or accept SS-ligature rendering (German typographic tradition pre-2017).

**Alternatives considered:**
- **Crimson Pro** (OFL): smaller, less Adobe-quality hinting, proven coverage. Less "civic-tech serious".
- **Vollkorn** (OFL, German designer): excellent ß and ẞ, designed for German body text. **Stronger DE choice if cultural fit matters.** CONTEXT.md L44 already locked Source Serif — don't override unless ẞ is missing.

**Verdict:** stick with Source Serif 4. Validate ẞ at executor stage.

### 7.2 JetBrains Mono — tabular-nums for audit hashes?

JetBrains Mono is monospace — every glyph (including digits 0-9) has same advance width. SHA-256 hex hashes (0-9, a-f) align in fixed columns automatically. **`tnum` OpenType feature is irrelevant for monospace fonts.**

Defensive declaration:
```css
.audit, .sig-pill {
  font-family: var(--mono);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1, "calt" 0;  /* disable code ligatures in audit hashes */
}
```

**Important:** disable `calt` (default in JetBrains Mono per https://github.com/JetBrains/JetBrainsMono/wiki/OpenType-features) for SHA hashes — sequences like `==`, `!=`, `>=` would otherwise render as ligature glyphs (inappropriate for cryptographic identifiers).

---

## 8. Sources Summary

### HIGH confidence (Context7 / official docs / live npm/GitHub data)
- Kobalte 0.13.11 dialog primitive (local `node_modules` inspection + https://kobalte.dev/docs/core/components/dialog)
- caniuse oklch (https://caniuse.com/mdn-css_types_color_oklch) — global usage 93.29% as of 2026-04-30
- Tailwind v3 dark mode + plugin API (https://v3.tailwindcss.com/docs/dark-mode, https://v3.tailwindcss.com/docs/plugins)
- Source Serif 4 4.005R (https://github.com/adobe-fonts/source-serif/releases/tag/4.005R)
- Inter v4.1 (https://github.com/rsms/inter/releases/tag/v4.1) — file sizes from downloaded zip, license confirmed OFL 1.1
- JetBrains Mono v2.304 (https://github.com/JetBrains/JetBrainsMono) — OFL since v2.002
- rollup-plugin-visualizer 7.0.1
- Solid lazy() / Show (https://docs.solidjs.com/reference/component-apis/lazy)
- OFL 1.1 GPL compatibility (https://scripts.sil.org/cms/scripts/page.php?site_id=nrsi&id=ofl-faq_web)
- @csstools/postcss-oklab-function CSS-variable limitation (https://github.com/csstools/postcss-plugins/issues/507)
- LG München I 2022 Google Fonts ruling (https://dejure.org/dienste/vernetzung/rechtsprechung?Text=3+O+17493/20)

### MEDIUM confidence
- Evil Martians OKLCH-Tailwind pattern — single authoritative blog source
- font-display: swap consensus
- Source Serif 4 capital ẞ presence — Adobe Latin 4 spec includes; individual font release not glyph-dumped
- Inter variable woff2 ~352 KB raw, gzipped ~150 KB based on typical compression ratio
- prefers-reduced-motion handling (MDN)

### LOW confidence (validation needed)
- Estimated bundle cost of `@kobalte/core/dialog` (~12-15 KB raw / ~5-6 KB gzip) — measure with rollup-plugin-visualizer
- Capital `ẞ` glyph in Source Serif 4.005 — needs `ttx -t cmap` validation; fallback Vollkorn or SS-ligature

---

## 9. Open Questions for Planner

1. **CONTEXT.md L41 vs bundle budget:** Is `+50 KB raw / +18 KB gzip` meant to include binary woff2 files (which are payload-on-demand and arguably shouldn't count) OR just JS+CSS code delta? Clarify in PLAN.md so executor's bundle gate is unambiguous. **Recommendation: woff2 binaries OUTSIDE the +50/+18 budget; tracked separately under "fonts" in BUNDLE_DELTA.md.**

2. **Safari `color-mix()` baseline:** `safari >= 15.4` (CONTEXT.md L39) covers `oklch()` but NOT `color-mix()` (Safari 16.2+). Pre-compute soft variants in tokens instead of using `color-mix()`, OR bump baseline to safari ≥ 16.2. **Recommendation: pre-compute** — handoff `styles.css:633-634` uses `color-mix(in oklch, var(--warn) 30%, transparent)` only for banner borders; replace with explicit oklch values.

3. **Inter Variable vs static:** Variable file ~344 KB single woff2 vs four static at ~445 KB. If only 400 + 600 needed (no 500, no 700), four static at ~225 KB beats Variable. **Recommendation: 3 static weights (400/500/600) per family + Variable JetBrains Mono.**

4. **Source Serif 500 weight:** Adobe doesn't ship a 500. Reinterpret "Source Serif 500" as 400 (Regular) for body or 600 (Semibold) for headings. **Recommendation: 400 for body display text, 600 for emphasized headings.**

5. **Capital ẞ validation:** Executor runs `ttx -t cmap SourceSerif4-Semibold.otf.woff2 | grep '0x1e9e'` before declaring done. If absent, fall back to Vollkorn.

---

## Sources

- https://docs.solidjs.com/concepts/control-flow/conditional-rendering
- https://docs.solidjs.com/reference/component-apis/lazy
- https://docs.solidjs.com/reference/components/show
- https://docs.solidjs.com/solid-router/reference/components/hash-router
- https://github.com/solidjs/solid/discussions/1505
- https://v3.tailwindcss.com/docs/dark-mode
- https://v3.tailwindcss.com/docs/plugins
- https://v3.tailwindcss.com/docs/customizing-colors
- https://evilmartians.com/chronicles/better-dynamic-themes-in-tailwind-with-oklch-color-magic
- https://caniuse.com/mdn-css_types_color_oklch
- https://www.oklch.click/blog/oklch-browser-compatibility-2025
- https://css-tricks.com/almanac/functions/c/color-mix/
- https://github.com/csstools/postcss-plugins/issues/507
- https://www.npmjs.com/package/@csstools/postcss-oklab-function
- https://github.com/adobe-fonts/source-serif
- https://github.com/adobe-fonts/source-serif/releases/tag/4.005R
- https://github.com/adobe-type-tools/adobe-latin-charsets
- https://en.wikipedia.org/wiki/Source_Serif_4
- https://github.com/rsms/inter
- https://rsms.me/inter/
- https://github.com/JetBrains/JetBrainsMono
- https://github.com/JetBrains/JetBrainsMono/wiki/OpenType-features
- https://scripts.sil.org/cms/scripts/page.php?site_id=nrsi&id=ofl-faq_web
- https://www.debugbear.com/blog/preload-web-fonts
- https://www.debugbear.com/blog/web-font-layout-shift
- https://font-converters.com/guides/font-loading-strategies
- https://kobalte.dev/docs/core/components/dialog
- https://corvu.dev/docs/primitives/drawer/
- https://github.com/btd/rollup-plugin-visualizer
- https://www.npmjs.com/package/rollup-plugin-visualizer
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- https://www.ra-plutte.de/lg-muenchen-dynamische-einbindung-google-web-fonts-ist-dsgvo/
- https://dejure.org/dienste/vernetzung/rechtsprechung?Text=3+O+17493/20
