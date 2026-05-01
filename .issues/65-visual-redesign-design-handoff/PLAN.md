# PLAN — 65-visual-redesign-design-handoff

## Objective

Translate the visual handoff under `design_handoff_buergerinnenrat/` into the existing Solid.js + Tailwind v3 app while preserving every contract test-id, hash route, audit-schema field, mobile-first behaviour, and DE-only copy. New shell (sidebar at md+, optional drawer at <md, pill-tab compatibility shim kept), new `#/overview` route, audit-panel rebind to all 21+4+3 schema-0.4 fields, docs sticky-TOC layout, and a token-driven OkLCH design system. Civic-green stays. Default landing stays `#/stage3`. Stage 3 surface is NOT visually redesigned in this issue.

The work is large (multi-day if executed in one shot). Tasks are organised in **9 atomic phases**, each a self-coherent visual state that commits independently and can be revert-able. Phases 1+2+3+5 form the **minimum viable visual redesign** and should be the executor's primary target if budget is tight; phases 4 (drawer) and 6-9 are follow-up. The orchestrator commits per phase, executor must NOT commit.

## Skills

<skills>
<!-- No workspace skills under .claude/skills/. Project conventions (German docs, English code comments, Solid + Tailwind v3, mobile-first, ≥44×44 touch targets, no positive affirmation, source every claim) are inlined into per-task <action> blocks. -->
</skills>

## Interfaces

<interfaces>
// === apps/web/src/App.tsx ===
export const App: Component
export type DocsRoute = 'hub' | 'algorithmus' | 'technik' | 'verifikation'
                      | 'glossar' | 'bmg46' | 'limitationen' | 'beispiele'
type AppMode = 'stage1' | 'stage3' | 'docs'  // EXTEND to add 'overview'
function parseHash(hash: string): { mode: AppMode; docsRoute: DocsRoute }
function hashFor(mode: AppMode, docsRoute: DocsRoute): string
// Default landing STAYS #/stage3 per CONTEXT.md L21.
// Sidebar nav-items write window.location.hash, NEVER call setMode directly.

// === apps/web/src/stage1/Stage1Panel.tsx (1015 LOC, MEDIUM rewrite — visual-only) ===
export const Stage1Panel: Component<void>
// Mounts: TrustStrip, CsvPreview, SampleSizeCalculator, AgeBandsEditor,
//   AxisPicker, AxisBreakdown (loop), StratificationExplainer, AuditFooter.
// PRESERVE every testid (~40 in this file alone), every signal name,
//   every <label for=> ↔ <input id=> binding, every <details open>,
//   sticky run-button wrapper inline style, and .stage1-report class.

// === apps/web/src/stage1/SampleSizeCalculator.tsx ===
export interface SampleSizeCalculatorProps {
  poolSize: () => number | null;
  onAccept: (recommended: number, proposal: SampleSizeProposal) => void;
}
export const SampleSizeCalculator: Component<SampleSizeCalculatorProps>
// PRESERVE testids: stage1-sample-size-section, stage1-panel-size,
//   stage1-outreach-mode, stage1-outreach-mail-plus-phone,
//   stage1-outreach-mail-only, stage1-outreach-custom, stage1-custom-rate-min,
//   stage1-custom-rate-max, stage1-sample-suggestion,
//   stage1-pool-too-small-warning, stage1-accept-suggestion

// === apps/web/src/stage1/AgeBandsEditor.tsx ===
export interface AgeBandsEditorProps {
  bands: () => AgeBand[];
  onBandsChange: (next: AgeBand[]) => void;
  refYear: number;
}
export const AgeBandsEditor: Component<AgeBandsEditorProps>
// PRESERVE <details open> semantic, .card may wrap but native <details>/<summary> stay.
// PRESERVE testids: stage1-age-bands-editor, band-min-<i>, band-max-<i>,
//   band-open-<i>, band-label-<i>, band-mode-<i>-selection, band-mode-<i>-display,
//   band-remove-<i>, bands-add, bands-reset, bands-validation

// === apps/web/src/stage1/AxisPicker.tsx ===
export interface AxisPickerProps {
  headers: string[];
  defaultAxes: string[];
  selected: () => string[];
  onToggle: (header: string) => void;
  derivedColumns?: string[];
  axisDescriptions?: Record<string, string>;
  distinctValueCounts?: Record<string, number>;
}
export const AxisPicker: Component<AxisPickerProps>
// PRESERVE real <input type="checkbox"> for testids axis-checkbox-<h>.
// Chip styling MAY wrap but the underlying <input> must remain.
// PRESERVE testids: stage1-axis-picker, axis-checkbox-<h>,
//   axis-badge-derived-<h>, axis-info-<h>, axis-warn-distinct-<h>

// === apps/web/src/stage1/AuditFooter.tsx (MEDIUM rewrite — visual + EXTEND) ===
interface Props { doc: Stage1AuditDoc }
export const AuditFooter: Component<Props>
// EXTEND to render all 21 mandatory + 4 optional + 3 signature schema-0.4 fields.
// PRESERVE testids: stage1-audit-footer, audit-footer-hash, audit-footer-sig,
//   audit-footer-sig-algo, audit-footer-derived, audit-footer-sample-size,
//   audit-footer-forced-zero
// PRESERVE labels asserted by stage1.spec.ts: "Protokoll / Audit", "SHA-256"

// === apps/web/src/stage1/TrustStrip.tsx ===
const TrustStrip: Component<void>      // DEFAULT export
export default TrustStrip;
// PRESERVE testids: stage1-trust-strip, trust-card-algorithmus,
//   trust-card-verifikation, trust-card-audit
// Click handlers write window.location.hash

// === apps/web/src/stage1/StratificationExplainer.tsx ===
export interface StratificationExplainerProps {
  selectedAxes: () => string[];
  rows: () => Record<string, string>[];
  open: () => boolean;
  onToggle: (next: boolean) => void;
}
export const StratificationExplainer: Component<StratificationExplainerProps>
// PRESERVE native <details>/<summary> elements (asserted toHaveAttribute('open')).
// PRESERVE testids: stage1-stratification-explainer, stage1-explainer-live-count

// === apps/web/src/docs/DocsHub.tsx + DocsLayout.tsx ===
interface DocsHubProps {
  docsRoute: () => DocsRoute;
  setDocsRoute: (next: DocsRoute) => void;
}
export default DocsHubComponent: Component<DocsHubProps>
// All 8 lazy-loaded subpages. PRESERVE 7 docs-tile-<slug> testids in hub,
//   docs-page-<slug> testid on each subpage, docs-back-to-hub testid.
// DocsLayout.tsx renders <h1>{title}</h1> — exactly one <h1> per route.

// === packages/core/src/stage1/types.ts (SCHEMA SOURCE OF TRUTH — DO NOT EDIT) ===
export interface Stage1AuditDoc {
  schema_version: '0.4';                       // mandatory (literal)
  operation: 'stage1_versand_sampling';
  algorithm_version: string;                    // e.g. 'stage1@1.2.0'
  tie_break_rule: 'numeric_ascending' | 'lexicographic_ascending';
  key_encoding: 'utf8_nfc';
  stratum_sort: 'lexicographic_ascending';
  seed: number;
  seed_source: Stage1SeedSource;
  input_csv_filename: string;
  input_csv_size_bytes: number;
  input_csv_sha256: string;
  pool_size: number;                            // = total rows in input
  target_n: number;                             // user requested
  actual_n: number;                             // actually drawn
  selected_indices: number[];                   // 0-based, length = actual_n
  stratification_axes: string[];
  strata: { stratum_key: Record<string, string>; pool_count: number;
            target_count: number; drawn_count: number; }[];
  warnings: { code: string; message: string; severity: 'info'|'warn'|'error' }[];
  duration_ms: number;
  timestamp_iso: string;
  derived_columns?: { column: string; method: string; bands?: AgeBand[] }[];
  forced_zero_strata?: { stratum_key: Record<string, string>; reason: string }[];
  sample_size_proposal?: SampleSizeProposal;
  signature?: string;
  signature_algo?: 'ed25519' | 'ecdsa-p256';
  public_key?: string;
}
// Field-name mapping — do NOT use handoff labels:
//   handoff `algorithm` → schema `algorithm_version`
//   handoff `input_sha` → schema `input_csv_sha256`
//   handoff `created_at` → schema `timestamp_iso`
//   handoff `N` → schema `target_n` + separate `actual_n`
//   handoff `axes` → schema `stratification_axes`
//   handoff `input_rows` → schema `pool_size`
//   handoff `signature` → schema `signature` + `signature_algo` + `public_key`
//   handoff `tool_version` → NOT in schema; render from import.meta.env.VITE_APP_VERSION

// === apps/web/src/run/RunPanel.tsx + QuotaEditor.tsx + CsvImport.tsx ===
// Stage 3 surface — minimum visual change in this issue. Don't redesign.
// PRESERVE testids: run-panel, run-seed, run-start, run-result,
//   run-export-csv, run-export-audit, quota-editor, quota-panel-size,
//   quota-add-category, csv-preview, csv-validation-ok, csv-commit, pool-summary

// === NEW shell components (for #65) ===
// apps/web/src/shell/Brand.tsx — extracts inline assembly-icon SVG +
//   wordmark from App.tsx:165-189. Renders <span class="font-serif">,
//   NOT <h1>. Existing favicon Versammlung-icon stays.
// apps/web/src/shell/Sidebar.tsx — visible at md+. Reads mode() and docsRoute()
//   for active-state; navigates by writing window.location.hash. NO setMode().
//   Adds data-testid="primary-nav" as superset of main-nav.
// apps/web/src/shell/MobileDrawer.tsx — OPTIONAL. Uses @kobalte/core/dialog
//   subpath import. Hamburger trigger visible at <md ALONGSIDE pill-tabs
//   (drawer is supplementary; pill-tabs are primary <md nav per CONTEXT.md L35).
// apps/web/src/Overview.tsx — new #/overview page. Hero + 2 workflow cards
//   + 3 principles columns. Lazy-loaded via lazy(() => import('./Overview')).
</interfaces>

## Constraints (verbatim from CONTEXT.md, condensed)

- **Stack:** Solid.js + Tailwind v3. NO React port. Handoff JSX is wireframe-only.
- **Mobile-first:** `<meta viewport="width=device-width">`. Touch targets ≥44×44. Pill-tabs visible at <md (NOT hidden). Sidebar visible md+.
- **Test-IDs are contract.** All ~70 existing `data-testid`s preserved at the same DOM-nesting level. ~108 unique testids in `apps/web/src`; ~70 asserted across 12 specs.
- **Hash routing preserved.** `#/stage1`, `#/stage3`, `#/docs`, `#/docs/<sub>` stay; new `#/overview` added. Sidebar items write `window.location.hash`; existing `hashchange` listener at `App.tsx:141-144` stays single source of truth.
- **Audit-Schema is truth.** `Stage1AuditDoc` schema_version 0.4 unchanged; visual rebind via `AuditFooter.tsx`, NOT via handoff `audit.jsx` field labels (which are misnomers).
- **DE-only.** Handoff `i18n.jsx` EN strings NOT imported. Asset preserved for future #67.
- **Civic-green brand.** `--accent: oklch(50% 0.14 145)` (drop to L=48 to match handoff blue's visual weight). `--hue` CSS-variable indirection preserved for #67. Dark-theme `--accent: oklch(68% 0.12 145)` (NOT 72%, too bright).
- **Stage-3 untouched.** RunPanel, QuotaEditor, CsvImport stay as-is. Sidebar links to existing `#/stage3` route.
- **Default landing stays `#/stage3`** per CONTEXT.md L21.
- **No UI toggles for theme/density/hue** in this issue (deferred to #67). Tokens land, no controls.
- **No real Settings screen** (deferred to #67).
- **No drag-and-drop CSV upload.** Drop zone is visual-only; click-to-pick is the only behavior.
- **Pill-bar shim:** ON. Existing top `<nav data-testid="main-nav">` with `tab-stage1/docs/stage3` REMAINS visible at <md. `mobile-touch-targets.spec.ts:50-60` asserts 44×44 on those test-IDs at 375×812. Sidebar hides those tabs at md+ (display:none on the pill-bar at md+ is allowed; the sidebar is the visible nav at md+).
- **OkLCH browserslist baseline:** `["chrome >= 111", "firefox >= 113", "safari >= 15.4", "edge >= 111"]`. **No PostCSS oklch fallback** (would break `--hue` indirection). Pre-compute `--accent-soft`/`--accent-line`/`--accent-ink` instead of using `color-mix()` (Safari 16.2+ only).
- **Self-host fonts.** Source Serif 4 v4.005R + Inter v3.19 (NOT v4 — `cv11` rename) + JetBrains Mono v2.304. SIL OFL `OFL.txt` per family. Drop rsms.me CDN preconnect. Validate Source Serif 4 v4.005 has U+1E9E (capital ẞ) via `ttx -t cmap`; fallback Vollkorn if absent.
- **`color-mix()` not used.** Pre-compute soft variants in tokens.
- **Bundle budget:** +50 KB raw / +18 KB gzip on JS+CSS combined. Self-hosted woff2 binaries are tracked SEPARATELY in `BUNDLE_DELTA.md` under "fonts" line, NOT against the +50/+18 budget.
- **Print CSS:** preserve every existing `@media print` rule from `index.css:163-235`. Add `@media print { .sidebar, .mobile-drawer, .overview-hero { display: none } }` for new chrome.
- **Sticky run-button wrapper** at `Stage1Panel.tsx:691` keeps its `style="padding-bottom: env(safe-area-inset-bottom)"` inline — `mobile-touch-targets.spec.ts:166-167` regex-matches outerHTML.
- **`.stage1-report` class** on result section preserved (print CSS at `index.css:181`).
- **Single `<h1>` per route** (`a11y.spec.ts`). Brand uses `<span class="font-serif">`, NOT `<h1>`. Today's `App.tsx:185 <h1>Bürger:innenrat</h1>` MUST be removed when sidebar is added; the page (Stage 1, Docs, Overview) owns the single `<h1>`. BUT `csv-import.spec.ts` and `smoke.spec.ts` assert `getByRole('heading', { name: 'Bürger:innenrat' })` — Stage 1 (or whichever page is the home view) must contain that exact heading text in some `<h1>`.
- **`<a href="#/...">` anchors NOT replaced with `onClick`** (`beispiele-stage1.spec.ts`, `trust-strip.spec.ts` assert URL change).
- **Native `<details>/<summary>`** in `StratificationExplainer` and `Stage1Panel.tsx:909-970` strata-toggle.
- **DO NOT import any file from `design_handoff_buergerinnenrat/reference/`.** Optional safeguard: `vite.config.ts` `build.rollupOptions.external`.
- **DO NOT touch:** `Stage1Panel.runStage1.ts`, `audit-sign.ts`, `csv/parse.ts`, `csv/derive.ts`, `quotas/model.ts`, `run/runEngine.ts`, `run/audit.ts`, `packages/core/`, `packages/engine-a/`, `packages/engine-contract/`, `docs/glossar.json`, `docs/hamilton.ts`, `generated/tech-manifest.ts`.

## Tasks

<task type="auto">
  <name>Task 1 — Phase 1: Token foundation + self-hosted fonts</name>
  <files>
    apps/web/src/index.css,
    apps/web/tailwind.config.cjs,
    apps/web/index.html,
    apps/web/public/fonts/source-serif-4/SourceSerif4-Regular.woff2,
    apps/web/public/fonts/source-serif-4/SourceSerif4-Semibold.woff2,
    apps/web/public/fonts/source-serif-4/OFL.txt,
    apps/web/public/fonts/inter/Inter-Regular.woff2,
    apps/web/public/fonts/inter/Inter-Medium.woff2,
    apps/web/public/fonts/inter/Inter-SemiBold.woff2,
    apps/web/public/fonts/inter/OFL.txt,
    apps/web/public/fonts/jetbrains-mono/JetBrainsMono-Regular.woff2,
    apps/web/public/fonts/jetbrains-mono/JetBrainsMono-Medium.woff2,
    apps/web/public/fonts/jetbrains-mono/OFL.txt,
    apps/web/package.json
  </files>
  <action>
  **Add OkLCH token block** to `apps/web/src/index.css` `@layer base { :root { ... } }`:

  ```css
  :root {
    /* Hue indirection (preserved for #67 themability) */
    --hue: 145;

    /* Surfaces — warm-neutral */
    --bg: oklch(98.4% 0.006 80);
    --bg-sunken: oklch(96.5% 0.008 80);
    --bg-card: oklch(100% 0 0);
    --line: oklch(91% 0.005 80);
    --line-strong: oklch(82% 0.008 80);

    /* Ink scale */
    --ink: oklch(20% 0.01 80);
    --ink-2: oklch(35% 0.01 80);
    --ink-3: oklch(50% 0.01 80);
    --ink-4: oklch(65% 0.01 80);

    /* Accent (civic-green) — pre-computed soft variants, NO color-mix() */
    --accent: oklch(48% 0.14 var(--hue));        /* drop from 50 to 48 to match handoff blue weight */
    --accent-strong: oklch(40% 0.16 var(--hue));
    --accent-soft: oklch(94% 0.04 var(--hue));
    --accent-line: oklch(85% 0.06 var(--hue));
    --accent-ink: oklch(28% 0.13 var(--hue));

    /* State tokens */
    --ok: oklch(55% 0.13 145);
    --ok-soft: oklch(94% 0.04 145);
    --warn: oklch(58% 0.13 60);
    --warn-soft: oklch(94% 0.06 60);
    --err: oklch(54% 0.20 25);
    --err-soft: oklch(95% 0.04 25);

    /* Spacing & radii */
    --gap-1: 4px;  --gap-2: 8px;  --gap-3: 12px; --gap-4: 16px;
    --gap-5: 24px; --gap-6: 32px; --gap-7: 48px;
    --pad-card: 24px;
    --row-h: 44px;       /* override handoff 40px to satisfy ≥44×44 mobile-touch-targets rule */
    --radius: 8px;
    --radius-lg: 14px;

    /* Layout */
    --sidebar-w: 256px;

    /* Fonts (CSS variables — actual @font-face below) */
    --serif: 'Source Serif 4', 'Vollkorn', Georgia, serif;
    --sans:  'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --mono:  'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
  }

  [data-theme="dark"] {
    --bg: oklch(18% 0.01 80);
    --bg-sunken: oklch(14% 0.008 80);
    --bg-card: oklch(22% 0.01 80);
    --line: oklch(30% 0.008 80);
    --line-strong: oklch(40% 0.012 80);
    --ink: oklch(96% 0.005 80);
    --ink-2: oklch(82% 0.008 80);
    --ink-3: oklch(65% 0.01 80);
    --ink-4: oklch(50% 0.012 80);
    --accent: oklch(68% 0.12 var(--hue));        /* NOT 72% — too bright at hue 145 */
    --accent-strong: oklch(78% 0.14 var(--hue));
    --accent-soft: oklch(28% 0.06 var(--hue));
    --accent-line: oklch(40% 0.08 var(--hue));
    --accent-ink: oklch(88% 0.10 var(--hue));
  }

  [data-density="compact"] {
    --gap-3: 8px; --gap-4: 12px; --gap-5: 16px; --gap-6: 24px;
    --pad-card: 16px;
    --row-h: 40px;
  }

  /* OkLCH guard — Firefox ESR 102 etc. without oklch support fall through to a banner */
  @supports not (color: oklch(0 0 0)) {
    body::before {
      content: 'Dieser Browser unterstützt OkLCH-Farben nicht. Bitte aktualisieren.';
      display: block; padding: 12px; background: #fde68a; color: #000;
      font-family: system-ui, sans-serif;
    }
  }
  ```

  **Download self-hosted fonts** (executor downloads from upstream):
  - Source Serif 4 v4.005R: `https://github.com/adobe-fonts/source-serif/releases/tag/4.005R` → take `SourceSerif4-Regular.otf.woff2` and `SourceSerif4-Semibold.otf.woff2`. Adobe doesn't ship a 500 weight — use 400 + 600 only. Place under `apps/web/public/fonts/source-serif-4/`. Copy `LICENSE.md` to `OFL.txt` in same folder.
  - Inter v3.19 (NOT v4 — v4 renamed `cv11` to `cv01`, would silently break `font-feature-settings`): `https://github.com/rsms/inter/releases/tag/v3.19` → take `Inter-Regular.woff2`, `Inter-Medium.woff2`, `Inter-SemiBold.woff2`. Place under `apps/web/public/fonts/inter/`. Copy `LICENSE.txt` to `OFL.txt`.
  - JetBrains Mono v2.304: `https://github.com/JetBrains/JetBrainsMono/releases/tag/v2.304` → take `JetBrainsMono-Regular.woff2`, `JetBrainsMono-Medium.woff2` (mono doesn't need 600/SemiBold). Place under `apps/web/public/fonts/jetbrains-mono/`. Copy `OFL.txt`.

  **Validate ẞ (capital eszett):** run `pip install fonttools` then `ttx -t cmap apps/web/public/fonts/source-serif-4/SourceSerif4-Semibold.woff2 -o /tmp/ssf.ttx && grep -i '0x1e9e\|U+1E9E' /tmp/ssf.ttx`. If present, document in commit message. If ABSENT, fall back to Vollkorn (also OFL, German designer): take from `https://github.com/kosbarts/Vollkorn-Typeface` and adjust `--serif` to `'Vollkorn'`.

  **Add @font-face declarations** to `index.css` `@layer base` (BEFORE `:root`):

  ```css
  @font-face {
    font-family: 'Source Serif 4'; font-style: normal; font-weight: 400; font-display: swap;
    src: url('/fonts/source-serif-4/SourceSerif4-Regular.woff2') format('woff2');
  }
  @font-face {
    font-family: 'Source Serif 4'; font-style: normal; font-weight: 600; font-display: swap;
    src: url('/fonts/source-serif-4/SourceSerif4-Semibold.woff2') format('woff2');
  }
  @font-face {
    font-family: 'Inter'; font-style: normal; font-weight: 400; font-display: swap;
    src: url('/fonts/inter/Inter-Regular.woff2') format('woff2');
  }
  @font-face {
    font-family: 'Inter'; font-style: normal; font-weight: 500; font-display: swap;
    src: url('/fonts/inter/Inter-Medium.woff2') format('woff2');
  }
  @font-face {
    font-family: 'Inter'; font-style: normal; font-weight: 600; font-display: swap;
    src: url('/fonts/inter/Inter-SemiBold.woff2') format('woff2');
  }
  @font-face {
    font-family: 'JetBrains Mono'; font-style: normal; font-weight: 400; font-display: swap;
    src: url('/fonts/jetbrains-mono/JetBrainsMono-Regular.woff2') format('woff2');
  }
  @font-face {
    font-family: 'JetBrains Mono'; font-style: normal; font-weight: 500; font-display: swap;
    src: url('/fonts/jetbrains-mono/JetBrainsMono-Medium.woff2') format('woff2');
  }
  ```

  **Use `import.meta.env.BASE_URL`-aware paths if needed.** `vite.config.ts` has `base: '/buergerinnenrat/'` for prod; the `/fonts/...` URL above resolves correctly because Vite rewrites root-relative paths in CSS during build.

  **Update `apps/web/index.html`:**
  - DELETE the rsms.me preconnect/stylesheet `<link>` tags (currently around lines for `rel="preconnect" href="https://rsms.me"` and `rel="stylesheet" href="https://rsms.me/inter/inter.css"`).
  - ADD `<link rel="preload" as="font" type="font/woff2" href="/buergerinnenrat/fonts/inter/Inter-Regular.woff2" crossorigin>` (above-fold UI weight). Use `crossorigin` ATTRIBUTE — without it, browser fetches twice.
  - ADD `<link rel="preload" as="font" type="font/woff2" href="/buergerinnenrat/fonts/source-serif-4/SourceSerif4-Semibold.woff2" crossorigin>` (above-fold display weight).
  - Use `<%= BASE_URL %>`-style if Vite supports HTML transforms; otherwise hardcode `/buergerinnenrat/` for prod and accept the dev-mode 404 for preload fonts (preload failure is non-fatal). Confirm via `pnpm dev` console.

  **Extend `apps/web/tailwind.config.cjs`:**
  ```js
  module.exports = {
    // ... existing config ...
    theme: {
      extend: {
        colors: {
          // KEEP existing brand.* aliases for backward-compat during sweep.
          // ADD new token-aliased colors:
          bg: 'var(--bg)',
          'bg-sunken': 'var(--bg-sunken)',
          'bg-card': 'var(--bg-card)',
          line: 'var(--line)',
          'line-strong': 'var(--line-strong)',
          ink: 'var(--ink)',
          'ink-2': 'var(--ink-2)',
          'ink-3': 'var(--ink-3)',
          'ink-4': 'var(--ink-4)',
          accent: 'var(--accent)',
          'accent-strong': 'var(--accent-strong)',
          'accent-soft': 'var(--accent-soft)',
          'accent-line': 'var(--accent-line)',
          'accent-ink': 'var(--accent-ink)',
          ok: 'var(--ok)', 'ok-soft': 'var(--ok-soft)',
          warn: 'var(--warn)', 'warn-soft': 'var(--warn-soft)',
          err: 'var(--err)', 'err-soft': 'var(--err-soft)',
        },
        fontFamily: {
          sans:  ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
          serif: ['Source Serif 4', 'Vollkorn', 'Georgia', 'serif'],
          mono:  ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
        },
        spacing: {
          'gap-1': 'var(--gap-1)', 'gap-2': 'var(--gap-2)', 'gap-3': 'var(--gap-3)',
          'gap-4': 'var(--gap-4)', 'gap-5': 'var(--gap-5)', 'gap-6': 'var(--gap-6)',
          'gap-7': 'var(--gap-7)',
          'row-h': 'var(--row-h)',
          'sidebar-w': 'var(--sidebar-w)',
        },
        borderRadius: {
          DEFAULT: 'var(--radius)',
          lg: 'var(--radius-lg)',
        },
      },
    },
  };
  ```

  Add a top-of-file comment: `/* Tokens & font stack defined in apps/web/src/index.css; see issue #65 + design_handoff_buergerinnenrat/. */`.

  **Add browserslist to `apps/web/package.json`:**
  ```json
  "browserslist": ["chrome >= 111", "firefox >= 113", "safari >= 15.4", "edge >= 111"]
  ```

  **Frontmatter comments:** add at top of `apps/web/src/index.css` and `apps/web/tailwind.config.cjs`:
  ```css
  /*
   * Visual redesign — issue #65 (supersedes #56).
   * Tokens & shell derived from design_handoff_buergerinnenrat/.
   * DO NOT import from design_handoff_buergerinnenrat/reference/ — it is a React/Babel wireframe.
   */
  ```
  </action>
  <verify>
    <automated>
      cd /root/workspace/.worktrees/65-visual-redesign-design-handoff &amp;&amp;
      grep -E '^\s*--accent:\s*oklch' apps/web/src/index.css &amp;&amp;
      grep -E '^\s*--row-h:\s*44px' apps/web/src/index.css &amp;&amp;
      grep -E "url\('/fonts/source-serif-4/SourceSerif4-Regular\.woff2'\)" apps/web/src/index.css &amp;&amp;
      grep 'crossorigin' apps/web/index.html &amp;&amp;
      ! grep -i 'rsms\.me' apps/web/index.html &amp;&amp;
      test -f apps/web/public/fonts/source-serif-4/OFL.txt &amp;&amp;
      test -f apps/web/public/fonts/inter/OFL.txt &amp;&amp;
      test -f apps/web/public/fonts/jetbrains-mono/OFL.txt &amp;&amp;
      cd apps/web &amp;&amp; pnpm typecheck &amp;&amp; pnpm build
    </automated>
  </verify>
  <done>
    - `--accent` declared as `oklch(48% 0.14 var(--hue))` in `index.css :root`.
    - `--row-h: 44px` in `:root` (override handoff 40px).
    - `[data-theme="dark"]` block declared with `--accent: oklch(68% 0.12 ...)`.
    - `[data-density="compact"]` block declared (no UI toggle).
    - 7 `@font-face` declarations (2 Source Serif + 3 Inter + 2 JetBrains Mono).
    - `OFL.txt` present in each `apps/web/public/fonts/<family>/`.
    - `<link rel="preload"... crossorigin>` for Inter Regular + Source Serif Semibold in `index.html`.
    - rsms.me preconnect/stylesheet links REMOVED from `index.html`.
    - `tailwind.config.cjs` extends with `colors.{bg,ink,accent,…}` reading `var(--*)`, `fontFamily.{sans,serif,mono}`, spacing tokens.
    - `browserslist` added to `apps/web/package.json`.
    - `pnpm typecheck` passes; `pnpm build` succeeds.
    - Capital ẞ presence in Source Serif 4 v4.005 noted in commit (or fallback to Vollkorn applied).
  </done>
</task>

<task type="auto">
  <name>Task 2 — Phase 2: Component primitives in @layer components</name>
  <files>
    apps/web/src/index.css
  </files>
  <action>
  **Replace existing `@layer components` block** in `apps/web/src/index.css` with handoff-derived primitives. Existing classes (`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.card`, `.card-hover`, `.pill-tab`, `.pill-tab-active`, `.pill-tab-inactive`, `.status-pill*`, `.input-base`, `.input-label`, `.dropzone`, `.dropzone-icon`, `.dropzone-label`, `.dropzone-hint`, `.prose-app`) MUST keep their NAMES — only the visual definitions change. Consumers all over `Stage1Panel.tsx`, `App.tsx`, etc. reference these exact class names.

  **Definitions (use Tailwind `@apply` where idiomatic, raw CSS where token-driven):**

  ```css
  @layer components {
    /* Buttons — keep .btn-primary / .btn-secondary / .btn-ghost names */
    .btn-primary {
      @apply inline-flex items-center justify-center gap-2 px-5;
      min-height: var(--row-h);
      background: var(--accent);
      color: white;
      border-radius: var(--radius);
      font-weight: 600;
      transition: background 120ms ease;
    }
    .btn-primary:hover { background: var(--accent-strong); }
    .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

    .btn-secondary {
      @apply inline-flex items-center justify-center gap-2 px-5;
      min-height: var(--row-h);
      background: var(--bg-card);
      color: var(--ink);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius);
      font-weight: 500;
    }
    .btn-secondary:hover { background: var(--bg-sunken); }

    .btn-ghost {
      @apply inline-flex items-center justify-center gap-2 px-3;
      min-height: var(--row-h);
      background: transparent;
      color: var(--ink-2);
      border-radius: var(--radius);
    }
    .btn-ghost:hover { background: var(--bg-sunken); color: var(--ink); }

    /* Card — replaces existing .card */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: var(--pad-card);
    }
    .card-hover { transition: transform 120ms ease, box-shadow 120ms ease; }
    .card-hover:hover { transform: translateY(-1px); box-shadow: 0 4px 12px oklch(20% 0 0 / 0.06); }

    .card-head { display: flex; flex-direction: column; gap: var(--gap-1); margin-bottom: var(--gap-4); }
    .card-eyebrow {
      font-family: var(--mono);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ink-3);
    }
    .card-title { font-family: var(--serif); font-size: 20px; font-weight: 600; color: var(--ink); }
    .card-help  { color: var(--ink-3); font-size: 14px; }

    /* Form controls — keep .input-base / .input-label names */
    .input-base, .input, .select {
      @apply w-full px-3;
      min-height: var(--row-h);
      background: var(--bg-card);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius);
      color: var(--ink);
      font-family: var(--sans);
      font-size: 15px;
    }
    .input-base:focus, .input:focus, .select:focus {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
      border-color: var(--accent);
    }
    .input-label, .field-label {
      display: block; font-size: 13px; font-weight: 500;
      color: var(--ink-2); margin-bottom: var(--gap-1);
    }
    .field { display: flex; flex-direction: column; gap: var(--gap-1); }

    /* Pill-tabs — keep names; visual refresh only */
    .pill-tab {
      @apply inline-flex items-center justify-center px-4;
      min-height: 44px;       /* hard-coded ≥44 for mobile-touch-targets.spec.ts */
      border-radius: 9999px;
      border: 1px solid var(--line-strong);
      background: var(--bg-card);
      color: var(--ink-2);
      font-weight: 500;
      transition: all 120ms ease;
    }
    .pill-tab-active {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }
    .pill-tab-inactive:hover {
      background: var(--bg-sunken);
      color: var(--ink);
    }

    /* Status pills */
    .status-pill {
      @apply inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium;
    }
    .status-pill-ok   { background: var(--ok-soft);   color: var(--ok); }
    .status-pill-warn { background: var(--warn-soft); color: var(--warn); }
    .status-pill-err  { background: var(--err-soft);  color: var(--err); }

    /* Dropzone — keep names; visual refresh */
    .dropzone {
      @apply flex flex-col items-center justify-center gap-2 cursor-pointer;
      min-height: 176px;
      padding: var(--gap-5);
      background: var(--bg-sunken);
      border: 2px dashed var(--line-strong);
      border-radius: var(--radius-lg);
      color: var(--ink-3);
      transition: border-color 120ms, background 120ms;
    }
    .dropzone:hover { border-color: var(--accent); background: var(--accent-soft); }
    .dropzone.is-drag { border-color: var(--accent); background: var(--accent-soft); }
    .dropzone-icon  { width: 32px; height: 32px; color: var(--ink-3); }
    .dropzone-label { font-weight: 600; color: var(--ink); }
    .dropzone-hint  { font-size: 13px; color: var(--ink-3); }

    /* Prose — keep .prose-app name */
    .prose-app {
      @apply prose prose-neutral max-w-none;
      color: var(--ink);
    }
    .prose-app h2 { font-family: var(--serif); font-weight: 600; color: var(--ink); }
    .prose-app h3 { font-family: var(--serif); font-weight: 600; color: var(--ink); }
    .prose-app a  { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }
    .prose-app code {
      font-family: var(--mono); font-size: 0.9em;
      background: var(--bg-sunken); padding: 0.1em 0.35em;
      border-radius: 4px; color: var(--ink);
    }

    /* === NEW component classes (from handoff styles.css) === */

    /* Banner — .banner.info / .banner.warn / .banner.ok */
    .banner {
      display: flex; gap: var(--gap-3); align-items: flex-start;
      padding: var(--gap-3) var(--gap-4);
      border-radius: var(--radius);
      border: 1px solid;
      font-size: 14px;
    }
    .banner.info { background: var(--accent-soft); border-color: var(--accent-line); color: var(--accent-ink); }
    .banner.warn { background: var(--warn-soft); border-color: oklch(80% 0.10 60); color: oklch(35% 0.13 60); }
    .banner.ok   { background: var(--ok-soft);   border-color: oklch(80% 0.08 145); color: oklch(35% 0.12 145); }
    .banner.err  { background: var(--err-soft);  border-color: oklch(80% 0.10 25); color: oklch(35% 0.18 25); }

    /* Step rail — 6 steps */
    .step-rail {
      display: grid;
      gap: var(--gap-2);
      grid-template-columns: repeat(6, 1fr);
    }
    @media (max-width: 1024px) {
      .step-rail { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 640px) {
      .step-rail { grid-template-columns: 1fr; }
    }
    .step {
      display: flex; gap: var(--gap-2); align-items: center;
      padding: var(--gap-2) var(--gap-3);
      background: var(--bg-card);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      font-size: 13px;
      color: var(--ink-3);
    }
    .step.is-current { background: var(--accent-soft); border-color: var(--accent-line); color: var(--accent-ink); }
    .step.is-done    { color: var(--ink); }
    .step .step-num  { font-family: var(--mono); font-weight: 600; color: var(--ink-3); }
    .step.is-current .step-num { color: var(--accent); }

    /* Tables — .tbl */
    .tbl {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 14px;
    }
    .tbl thead th {
      position: sticky; top: 0;
      background: var(--bg-sunken);
      color: var(--ink-3);
      font-weight: 500;
      text-align: left;
      padding: var(--gap-2) var(--gap-3);
      border-bottom: 1px solid var(--line-strong);
      font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em;
    }
    .tbl tbody td {
      padding: var(--gap-2) var(--gap-3);
      border-bottom: 1px solid var(--line);
      color: var(--ink);
    }
    .tbl tbody tr:hover td { background: var(--bg-sunken); }
    .tbl .tnum { font-variant-numeric: tabular-nums; font-family: var(--mono); }

    /* Audit panel mono block */
    .audit {
      font-family: var(--mono);
      font-size: 13px;
      font-variant-numeric: tabular-nums;
      font-feature-settings: 'tnum' 1, 'calt' 0;     /* disable code ligatures in SHA hashes */
      background: var(--bg-sunken);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: var(--gap-4);
      color: var(--ink);
    }
    .audit dl { display: grid; grid-template-columns: max-content 1fr; gap: var(--gap-1) var(--gap-3); }
    .audit dt { color: var(--ink-3); }
    .audit dd { color: var(--ink); word-break: break-all; }

    .sig-pill {
      display: inline-flex; align-items: center; gap: var(--gap-2);
      padding: var(--gap-1) var(--gap-3);
      background: var(--ok-soft);
      color: var(--ok);
      border: 1px solid oklch(80% 0.08 145);
      border-radius: 9999px;
      font-family: var(--mono);
      font-size: 12px;
      font-feature-settings: 'tnum' 1, 'calt' 0;
    }
    .sig-pill::before {
      content: ''; width: 6px; height: 6px;
      border-radius: 50%; background: var(--ok);
    }
    .sig-pill.is-unsigned { background: var(--warn-soft); color: var(--warn); border-color: oklch(80% 0.10 60); }
    .sig-pill.is-unsigned::before { background: var(--warn); }

    /* Stats grid — 4 cols ≥lg, 2 md→lg, 1 <md */
    .stats-grid {
      display: grid;
      gap: var(--gap-3);
      grid-template-columns: repeat(4, 1fr);
    }
    @media (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px)  { .stats-grid { grid-template-columns: 1fr; } }
    .stat { background: var(--bg-card); border: 1px solid var(--line); border-radius: var(--radius); padding: var(--gap-3); }
    .stat .k { font-size: 12px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.06em; }
    .stat .v { font-family: var(--mono); font-size: 22px; color: var(--ink); margin-top: 2px; font-variant-numeric: tabular-nums; }
    .stat .delta { font-size: 12px; color: var(--ink-3); }

    /* Axis chips */
    .chip {
      display: inline-flex; align-items: center; gap: var(--gap-1);
      padding: 6px var(--gap-3);
      min-height: 36px;
      background: var(--bg-card);
      border: 1px solid var(--line-strong);
      border-radius: 9999px;
      font-size: 14px;
      color: var(--ink-2);
      cursor: pointer;
    }
    .chip.is-on {
      background: var(--accent-soft);
      border-color: var(--accent-line);
      color: var(--accent-ink);
    }
    .chip.is-on::before {
      content: ''; width: 6px; height: 6px; border-radius: 50%;
      background: var(--accent);
    }
    .chip[aria-disabled="true"] { opacity: 0.55; cursor: not-allowed; }

    /* Sample picker grid + cards (for Beispiele.tsx) */
    .sample-grid {
      display: grid; gap: var(--gap-3);
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
    .sample-card {
      background: var(--bg-card); border: 1px solid var(--line);
      border-radius: var(--radius-lg); padding: var(--gap-4);
      cursor: pointer; transition: border-color 120ms;
    }
    .sample-card:hover { border-color: var(--accent); }

    /* Doc grid — sticky 220px TOC + 68ch body */
    .doc-grid {
      display: grid;
      grid-template-columns: 220px minmax(0, 68ch);
      gap: var(--gap-6);
      align-items: start;
    }
    @media (max-width: 1024px) { .doc-grid { grid-template-columns: 1fr; } }
    .doc-toc {
      position: sticky; top: var(--gap-4);
      font-size: 13px;
      max-height: calc(100vh - 64px); overflow-y: auto;
      padding-right: var(--gap-2);
      border-right: 1px solid var(--line);
    }
    .doc-toc ol { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--gap-1); }
    .doc-toc a { color: var(--ink-3); text-decoration: none; }
    .doc-toc a:hover, .doc-toc a.is-active { color: var(--accent); }
    .doc-body { color: var(--ink); }
    @media (max-width: 1024px) { .doc-toc { display: none; } }

    .callout {
      border-left: 3px solid var(--accent);
      background: var(--accent-soft);
      padding: var(--gap-3) var(--gap-4);
      border-radius: 0 var(--radius) var(--radius) 0;
      margin: var(--gap-4) 0;
    }
  }
  ```

  **Important:**
  - **Disable `calt`** on `.audit` and `.sig-pill` to keep SHA hashes from rendering `==` or `>=` as ligatures (per `JetBrains Mono` OpenType-features wiki).
  - **Keep all existing `@media print` rules** at `apps/web/src/index.css:163-235`. **Do NOT delete.** Add new print rules at the end:
    ```css
    @media print {
      .sidebar, .mobile-drawer, .overview-hero, .step-rail { display: none !important; }
      body { background: white; color: black; }
    }
    ```
  - Tailwind purge: arbitrary `bg-[var(--accent)]` utilities used inside `@apply` blocks are safe; named utilities (`bg-bg`, `text-ink`, `text-accent`) referenced from `.tsx` files survive purge automatically.
  - Body defaults: change `apps/web/src/index.css :where(body)` (or wherever current body styling lives) so `font-family: var(--sans)`, scope `font-feature-settings: 'cv11', 'ss01', 'ss03'` to `body { ... }` (these are Inter v3 features; Source Serif 4 doesn't share them — must be on body, not on serif headings).
  </action>
  <verify>
    <automated>
      cd /root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web &amp;&amp;
      grep -E '^\s*\.btn-primary\s*\{' src/index.css &amp;&amp;
      grep -E '^\s*\.dropzone\s*\{' src/index.css &amp;&amp;
      grep -E '^\s*\.banner\s*\{' src/index.css &amp;&amp;
      grep -E '^\s*\.step-rail\s*\{' src/index.css &amp;&amp;
      grep -E '^\s*\.audit\s*\{' src/index.css &amp;&amp;
      grep -E '^\s*\.sig-pill\s*\{' src/index.css &amp;&amp;
      grep -E '^\s*\.stats-grid\s*\{' src/index.css &amp;&amp;
      grep -E '^\s*\.chip\s*\{' src/index.css &amp;&amp;
      grep -E '^\s*\.tbl\s*\{' src/index.css &amp;&amp;
      grep -E '^\s*\.doc-grid\s*\{' src/index.css &amp;&amp;
      grep -E "font-feature-settings:\s*'tnum'\s*1,\s*'calt'\s*0" src/index.css &amp;&amp;
      grep -E '@media print' src/index.css | wc -l | grep -E '^[0-9]+$' &amp;&amp;
      pnpm typecheck &amp;&amp; pnpm build &amp;&amp; pnpm test
    </automated>
  </verify>
  <done>
    - All replaced primitives keep their original class NAMES (`.btn-primary`, `.dropzone`, `.card`, `.pill-tab*`, `.input-base`, `.status-pill*`, `.prose-app`, `.dropzone-icon/-label/-hint`).
    - New classes added: `.banner` (+`.info/.warn/.ok/.err`), `.step-rail` + `.step`, `.tbl`, `.audit`, `.sig-pill`, `.stats-grid` + `.stat`, `.chip`, `.sample-grid` + `.sample-card`, `.doc-grid` + `.doc-toc` + `.doc-body`, `.callout`, `.card-head/eyebrow/title/help`, `.field`.
    - `.audit` and `.sig-pill` declare `font-feature-settings: 'tnum' 1, 'calt' 0`.
    - `--row-h: 44px` enforced on `.input-base`, `.btn-primary`, `.btn-secondary` via `min-height`.
    - All existing `@media print` rules preserved at `index.css:163-235`.
    - New `@media print { .sidebar, .mobile-drawer, .overview-hero, .step-rail { display: none } }` added.
    - `pnpm test` passes (Vitest), `pnpm build` succeeds, `pnpm typecheck` passes.
  </done>
</task>

<task type="auto">
  <name>Task 3 — Phase 3: Shell — Sidebar (md+) + Brand component</name>
  <files>
    apps/web/src/shell/Brand.tsx,
    apps/web/src/shell/Sidebar.tsx,
    apps/web/src/shell/NavGroup.tsx,
    apps/web/src/App.tsx,
    apps/web/src/index.css
  </files>
  <action>
  **Create `apps/web/src/shell/Brand.tsx`** — extracts the inline assembly-icon SVG + wordmark currently at `App.tsx:165-189`:
  - Render structure: `<div class="flex items-center gap-3">` containing the existing inline SVG (Versammlung icon — keep exactly) AND `<span class="font-serif font-semibold text-lg text-ink">Bürger:innenrat</span>` + optional `<span class="text-xs text-ink-3">Stratifiziertes Losverfahren</span>` tag.
  - **CRITICAL:** Brand uses `<span>` for the wordmark, NOT `<h1>`. The page (`Stage1Panel`, `DocsLayout`, `Overview`) owns the single `<h1>` per a11y.spec.ts.
  - **EXCEPTION:** `csv-import.spec.ts` and `smoke.spec.ts` assert `getByRole('heading', { name: 'Bürger:innenrat' })`. Currently `App.tsx:185` provides this `<h1>`. After Brand becomes a `<span>`, the **Stage 1 page header** (`Stage1Panel.tsx:342-346` `<header>` with "Schritt 1 von 3 — Versand-Liste ziehen") MUST contain or precede an `<h1>Bürger:innenrat</h1>` somewhere on the home (`#/stage3`) view to satisfy those role-based queries. Resolution: keep an `<h1 class="sr-only">Bürger:innenrat</h1>` at the top of every page route in `App.tsx` (inside `<main>`), positioned before page-specific content so screen readers announce the app name once. This satisfies both: (a) sole-`<h1>` rule, because there's only one per route, (b) `getByRole('heading', { name: 'Bürger:innenrat' })`. **Stage1Panel and DocsLayout currently render their own `<h1>` — change them to `<h2>` and let App.tsx's per-route `<h1 class="sr-only">Bürger:innenrat</h1>` be the unique one.** Verify all assertions still pass.

  Wait — re-check: `stage1.spec.ts` asserts step-header text `"Schritt 1 von 3 — Versand-Liste ziehen"`, not heading-level. `DocsLayout.tsx:52` renders `<h1>{title}</h1>`. Cleanest fix: keep DocsLayout's `<h1>` (page title), and on non-docs routes (Stage1, Stage3, Overview) emit a single `<h1>Bürger:innenrat</h1>` inside `<main>` (visible or sr-only — visible on Overview hero, sr-only on Stage1/Stage3 to keep visual chrome unchanged). a11y.spec.ts `expect(h1Count).toBe(1)` then passes per route.

  **Create `apps/web/src/shell/NavGroup.tsx`** — small helper component:
  ```tsx
  export function NavGroup(props: { label: string; children: any }) {
    return (
      <div class="mb-4">
        <div class="px-3 mb-1 text-xs uppercase tracking-wider text-ink-3 font-medium">
          {props.label}
        </div>
        <ul class="space-y-0.5">{props.children}</ul>
      </div>
    );
  }
  ```

  **Create `apps/web/src/shell/Sidebar.tsx`:**
  - Props: `{ mode: () => AppMode; docsRoute: () => DocsRoute }`. Reads but never writes signals.
  - Visible at `md+` only: outermost wrapper has `class="hidden md:flex md:flex-col md:w-sidebar-w md:fixed md:inset-y-0 md:left-0 md:bg-bg-sunken md:border-r md:border-line"`.
  - Adds `data-testid="primary-nav"` on the outer `<nav>` (per CONTEXT.md L73 — superset of `main-nav`).
  - Layout (top to bottom): `<Brand />` (padding `p-4`), 3 nav groups, footer at bottom.
  - **Nav Group 1 — "Übersicht":**
    - `<a href="#/overview" data-testid="nav-overview" class="...">Übersicht</a>` — active state when `mode() === 'overview'`.
  - **Nav Group 2 — "Verfahrensschritte":**
    - `<a href="#/stage1" data-testid="nav-stage1">Stage 1 — Versand-Liste</a>` — active when `mode() === 'stage1'`.
    - `<span class="opacity-50 cursor-not-allowed" aria-disabled="true" data-testid="nav-stage2">Stage 2 — Outreach (außerhalb Tool)</span>` — disabled visual.
    - `<a href="#/stage3" data-testid="nav-stage3">Stage 3 — Panel-Auswahl</a>` — active when `mode() === 'stage3'`.
    - `<span class="opacity-50 cursor-not-allowed" aria-disabled="true" data-testid="nav-stage4">Stage 4 — Reserve (geplant)</span>` — disabled visual.
  - **Nav Group 3 — "Ressourcen":**
    - `<a href="#/docs" data-testid="nav-docs">Dokumentation</a>` — active when `mode() === 'docs'`.
    - `<a href="#/docs/beispiele" data-testid="nav-beispiele">Beispiel-Daten</a>`.
  - **Footer** (mt-auto pinned bottom): two lines of small text — `<div class="text-xs text-ink-3">Daten bleiben lokal</div>` and `<div class="text-xs text-ink-3 font-mono">v{import.meta.env.VITE_APP_VERSION || '?'} · {GIT_SHA}</div>`. Read git SHA from existing `__GIT_SHA__` Vite define (declared in `vite-env.d.ts`).
  - **Active-state styling:** anchor active class `bg-accent-soft text-accent-ink`, inactive `text-ink-2 hover:bg-bg-sunken hover:text-ink`.
  - Each `<a>` element MUST be a real anchor with `href="#/..."`, NOT an `onClick={() => setMode(...)}` handler. The existing `hashchange` listener at `App.tsx:141-144` does the rest.

  **Modify `apps/web/src/App.tsx`:**
  - Import `Sidebar` from `./shell/Sidebar`. Import `Brand` from `./shell/Brand`.
  - Restructure outer JSX so it's `<div class="md:pl-sidebar-w"><Sidebar mode={mode} docsRoute={docsRoute} /><main>...</main></div>`. Sidebar is `position: fixed`, main gets left padding at md+ to avoid overlap.
  - **KEEP** the existing top pill-tab nav (`<nav data-testid="main-nav">`) but wrap it: `<nav data-testid="main-nav" class="md:hidden ...">` — visible at <md, hidden at md+. Pill-tabs stay as primary <md nav per CONTEXT.md L35.
  - **REMOVE** the existing inline `<h1>Bürger:innenrat</h1>` at `App.tsx:185`. Replace with: a per-route conditional `<h1 class="sr-only">Bürger:innenrat</h1>` for Stage1 + Stage3 + Overview (visible on Overview is fine — emit `class="text-3xl font-serif"` on the Overview hero `<h1>` instead). On `mode() === 'docs'`, do NOT emit this `<h1>` because `DocsLayout` already does.
  - Make sure the page-title-area still emits the existing pill-tab title attributes (`title="…Melderegister…"`, `title="…Antwortenden…"`) on `tab-stage1` and `tab-stage3` per `stage1.spec.ts:75-76`.

  **Add to `apps/web/src/index.css` `@layer components`:**
  ```css
  .sidebar { /* matches the wrapper class for print rule + future styling hooks */
    background: var(--bg-sunken);
  }
  .sidebar nav a {
    display: flex; align-items: center; gap: var(--gap-2);
    padding: 8px 12px;
    min-height: 36px;
    border-radius: var(--radius);
    font-size: 14px;
  }
  ```

  **Print CSS**: `@media print { .sidebar, [data-testid='primary-nav'] { display: none !important; } }` (already added in Phase 2; verify).

  **Edge case — `stage1-step-header`:** `Stage1Panel.tsx:342-346` renders a `<header>` with a heading. Keep that exactly as-is; only the App-level `<h1>` changes.
  </action>
  <verify>
    <automated>
      cd /root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web &amp;&amp;
      test -f src/shell/Brand.tsx &amp;&amp; test -f src/shell/Sidebar.tsx &amp;&amp; test -f src/shell/NavGroup.tsx &amp;&amp;
      grep -E 'data-testid="primary-nav"' src/shell/Sidebar.tsx &amp;&amp;
      grep -E 'href="#/stage1"' src/shell/Sidebar.tsx &amp;&amp;
      grep -E 'href="#/overview"' src/shell/Sidebar.tsx &amp;&amp;
      grep -E 'aria-disabled="true"' src/shell/Sidebar.tsx &amp;&amp;
      ! grep -E 'setMode\(' src/shell/Sidebar.tsx &amp;&amp;
      grep -E 'data-testid="main-nav"' src/App.tsx &amp;&amp;
      grep -E 'md:hidden' src/App.tsx &amp;&amp;
      pnpm typecheck &amp;&amp; pnpm test &amp;&amp;
      pnpm exec playwright test --project=chromium tests/e2e/a11y.spec.ts tests/e2e/mobile-touch-targets.spec.ts tests/e2e/csv-import.spec.ts tests/e2e/smoke.spec.ts tests/e2e/_visual-iteration.spec.ts
    </automated>
  </verify>
  <done>
    - `Brand.tsx`, `Sidebar.tsx`, `NavGroup.tsx` exist under `apps/web/src/shell/`.
    - Brand renders `<span class="font-serif">Bürger:innenrat</span>`, NOT `<h1>`.
    - Sidebar adds `data-testid="primary-nav"` and is visible at `md+` only.
    - Sidebar nav anchors use `<a href="#/...">`, no `setMode()` calls.
    - Stage 2 + Stage 4 nav items are disabled visuals (`<span aria-disabled="true">`).
    - Pill-bar `<nav data-testid="main-nav">` stays in DOM, visible at <md (`md:hidden`).
    - Per-route exactly one `<h1>`: per-route sr-only or visible `<h1>Bürger:innenrat</h1>` for non-docs routes; `DocsLayout` `<h1>` for docs routes.
    - `pnpm test` (Vitest), `pnpm exec playwright test` for a11y + mobile-touch-targets + csv-import + smoke + _visual-iteration all pass.
  </done>
</task>

<task type="auto" optional="true">
  <name>Task 4 — Phase 4 (OPTIONAL): Mobile drawer (Kobalte Dialog)</name>
  <files>
    apps/web/src/shell/MobileDrawer.tsx,
    apps/web/src/App.tsx
  </files>
  <action>
  **OPTIONAL — defer to follow-up issue if executor budget is tight after Phase 3.** Pill-tabs at <md are sufficient as primary nav per CONTEXT.md L35. Drawer is supplementary.

  **Create `apps/web/src/shell/MobileDrawer.tsx`** using `@kobalte/core/dialog` SUBPATH import (NOT wildcard — tree-shake):
  ```tsx
  import { Dialog } from '@kobalte/core/dialog';
  import type { JSX } from 'solid-js';

  interface Props {
    open: () => boolean;
    onOpenChange: (open: boolean) => void;
    children: JSX.Element;
  }

  export function MobileDrawer(props: Props) {
    return (
      <Dialog open={props.open()} onOpenChange={props.onOpenChange} modal>
        <Dialog.Portal>
          <Dialog.Overlay class="fixed inset-0 z-40 bg-black/30 motion-reduce:transition-none" />
          <Dialog.Content
            class="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-bg shadow-xl
                   transition-transform duration-200 ease-out
                   data-[expanded]:translate-x-0 data-[closed]:-translate-x-full
                   motion-reduce:transition-none
                   pb-[env(safe-area-inset-bottom)]"
            data-testid="mobile-drawer"
          >
            <Dialog.Title class="sr-only">Navigation</Dialog.Title>
            <Dialog.CloseButton class="absolute top-4 right-4 inline-flex items-center justify-center size-11" aria-label="Schließen">
              ×
            </Dialog.CloseButton>
            {props.children}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    );
  }
  ```

  **Modify `App.tsx`:**
  - Add signal: `const [drawerOpen, setDrawerOpen] = createSignal(false);` — App is sole owner.
  - Add `createEffect(() => { mode(); setDrawerOpen(false); })` to close drawer on route change.
  - Add hamburger trigger visible at `<md` ALONGSIDE pill-tabs:
    ```tsx
    <button
      type="button"
      class="md:hidden inline-flex items-center justify-center size-11"
      aria-label="Navigation öffnen"
      onClick={() => setDrawerOpen(true)}
      data-testid="drawer-trigger"
    >
      ☰
    </button>
    ```
  - Render drawer with the same content as Sidebar (extract Sidebar-content to a child component to share between Sidebar and MobileDrawer).

  **Kobalte features confirmed available** (https://kobalte.dev/docs/core/components/dialog): focus trap, ESC dismissal, scroll lock, `aria-modal`, return focus to trigger. `prefers-reduced-motion` is NOT auto-handled — wrap transitions in `motion-reduce:` Tailwind variants.

  **Estimated bundle cost:** ~12-15 KB raw / ~5-6 KB gzip for `dialog` + `dismissable-layer` + `solid-presence` + `solid-prevent-scroll`. Within the +50/+18 budget.

  **If Phase 4 is skipped:** mark this task as `<status>deferred</status>` in PLAN.md follow-up notes. Pill-tabs at <md cover the navigation requirement.
  </action>
  <verify>
    <automated>
      cd /root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web &amp;&amp;
      test -f src/shell/MobileDrawer.tsx &amp;&amp;
      grep -E "from '@kobalte/core/dialog'" src/shell/MobileDrawer.tsx &amp;&amp;
      grep -E 'aria-label="Navigation öffnen"' src/App.tsx &amp;&amp;
      grep -E 'aria-label="Schließen"' src/shell/MobileDrawer.tsx &amp;&amp;
      pnpm typecheck &amp;&amp; pnpm test &amp;&amp;
      pnpm exec playwright test --project=chromium tests/e2e/a11y.spec.ts tests/e2e/mobile-touch-targets.spec.ts
    </automated>
  </verify>
  <done>
    - EITHER `MobileDrawer.tsx` exists with Kobalte Dialog and hamburger trigger has `aria-label="Navigation öffnen"` (44×44, visible at <md), AND drawer closes on route change via `createEffect`,
    - OR Phase 4 is documented as deferred to follow-up issue (Sidebar at md+, pill-tabs at <md cover all nav).
    - In either case: `a11y.spec.ts` + `mobile-touch-targets.spec.ts` stay green.
  </done>
</task>

<task type="auto">
  <name>Task 5 — Phase 5: Stage 1 reskin (the big one)</name>
  <files>
    apps/web/src/stage1/Stage1Panel.tsx,
    apps/web/src/stage1/TrustStrip.tsx,
    apps/web/src/stage1/AxisPicker.tsx,
    apps/web/src/stage1/AgeBandsEditor.tsx,
    apps/web/src/stage1/SampleSizeCalculator.tsx
  </files>
  <action>
  **CRITICAL: this is a visual rewrap, NOT a logic change.** Every signal, every callback, every test-id, every label-for binding, every `<details>` element, every inline `style="…safe-area-inset-bottom…"`, the `.stage1-report` class — preserved exactly.

  **`apps/web/src/stage1/Stage1Panel.tsx`** (1015 LOC, MEDIUM rewrite):

  1. **Insert 6-step rail** above the existing step-header (`<header>` at line 342-346):
     ```tsx
     <ol class="step-rail" aria-label="Stage-1-Schritte">
       <li class={`step ${currentStep() === 1 ? 'is-current' : currentStep() > 1 ? 'is-done' : ''}`}>
         <span class="step-num">1</span> Eingabe
       </li>
       <li class={`step ${currentStep() === 2 ? 'is-current' : currentStep() > 2 ? 'is-done' : ''}`}>
         <span class="step-num">2</span> Bemessung
       </li>
       <li class={`step ${currentStep() === 3 ? 'is-current' : currentStep() > 3 ? 'is-done' : ''}`}>
         <span class="step-num">3</span> Achsen
       </li>
       <li class={`step ${currentStep() === 4 ? 'is-current' : currentStep() > 4 ? 'is-done' : ''}`}>
         <span class="step-num">4</span> Parameter
       </li>
       <li class={`step ${currentStep() === 5 ? 'is-current' : currentStep() > 5 ? 'is-done' : ''}`}>
         <span class="step-num">5</span> Ziehen
       </li>
       <li class={`step ${currentStep() === 6 ? 'is-current' : ''}`}>
         <span class="step-num">6</span> Audit &amp; Export
       </li>
     </ol>
     ```
     `currentStep()` is a Solid `createMemo` derived from existing signals: 1 if no parsed CSV, 2 if parsed but no sample-size proposal accepted, 3 if accepted but no axes selected, 4 if axes selected but never run, 5 if running, 6 if `output()` exists. Approximate is fine — visual hint only.

  2. **Wrap each section in `.card` with `.card-head`:**
     - Step 1 CSV upload section (lines ~357-456 — drop-zone + pool summary + CsvPreview + BMG hint): wrap in `<section class="card" data-testid="stage1-csv-section">` (don't add testid if it'd shadow existing `stage1-csv-dropzone` — only add if not present). Inside, `<div class="card-head"><div class="card-eyebrow">Schritt 1</div><h2 class="card-title">1. Melderegister-CSV hochladen</h2><div class="card-help">CSV-Datei mit Bevölkerungsdaten gemäß § 46 BMG.</div></div>`. **PRESERVE existing `<h2>` text "1. Melderegister-CSV hochladen"** — it can move into `card-title` but text + heading-level stay.
     - Step 2 SampleSizeCalculator section (around line 466): wrap in `<section class="card">` with `card-head` containing eyebrow "Schritt 2" + title "2. Bemessung der Stichprobe".
     - Step 3 Stratification section (around line 474-496): wrap in `<section class="card">` with eyebrow "Schritt 3" + title "3. Stratifikation konfigurieren".
     - Step 4 Stichprobengröße/Seed section (around line 500-722): wrap in `<section class="card">` with eyebrow "Schritt 4" + title "4. Stichprobengröße und Seed".
     - Result section (around line 727-1010): keep `<section class="stage1-report card">` — DO NOT remove `.stage1-report` (print CSS). Add eyebrow "Schritt 5/6" + title "5. Ergebnis".

  3. **Replace inline banners with `.banner`:**
     - BMG hint at lines 432-456: replace existing `<aside data-testid="stage1-bmg-hint">` content/styling with `<aside class="banner info" data-testid="stage1-bmg-hint">` keeping inner content intact.
     - Seed hint at lines 548-556: `<aside class="banner info" data-testid="stage1-seed-hint">`.
     - Bands warn block-warn at lines 716-720 (`stage1-run-bands-block`): `<div class="banner warn" data-testid="stage1-run-bands-block">`.
     - Errors at lines 424-426 (`stage1-error`) and 558-561 (`stage1-preview-error`): `<div class="banner err" data-testid="stage1-error">` / `<div class="banner err" data-testid="stage1-preview-error">`.

  4. **Replace summary cards (lines 734-788) with `.stats-grid`:**
     Existing `stage1-summary-cards`, `stage1-coverage-card`, `stage1-underfill-card` testids preserved at the same DOM-nesting level. Restructure as:
     ```tsx
     <div class="stats-grid" data-testid="stage1-summary-cards">
       <div class="stat" data-testid="stage1-coverage-card">
         <div class="k">Gezogen</div>
         <div class="v tnum">{output().actual_n}</div>
         <div class="delta">von Ziel {output().target_n}</div>
       </div>
       <div class="stat" data-testid="stage1-underfill-card">
         <div class="k">Strata erfüllt</div>
         <div class="v tnum">{coverage().filled} / {coverage().total}</div>
       </div>
       <div class="stat">
         <div class="k">Dauer</div>
         <div class="v tnum">{output().duration_ms} ms</div>
       </div>
       <div class="stat">
         <div class="k">Seed</div>
         <div class="v tnum">{output().seed}</div>
       </div>
     </div>
     ```
     Adjust property paths to match current code; the structural change is just `<div class="stats-grid">` wrapping `<div class="stat">` cards.

  5. **Strata table (lines 909-970) — wrap in scroll container:**
     ```tsx
     <details data-testid="stage1-strata-toggle" open={strataExpanded()}>
       <summary>...</summary>
       <div class="overflow-x-auto">
         <table class="tbl" data-testid="stage1-strata-table">
           <thead>...</thead>
           <tbody>...</tbody>
         </table>
       </div>
     </details>
     ```
     **CRITICAL:** the parent of `stage1-strata-table` MUST have `getComputedStyle().overflowX === 'auto'` per `mobile-touch-targets.spec.ts:144`. The `<div class="overflow-x-auto">` provides this. Tailwind `.overflow-x-auto` class compiles to `overflow-x: auto`.

  6. **PRESERVE the sticky run-button wrapper at line 691:**
     ```tsx
     <div
       class="sticky bottom-0 -mx-... pt-3 bg-gradient-to-t from-bg to-transparent z-10"
       style="padding-bottom: env(safe-area-inset-bottom)"
     >
       <button data-testid="stage1-run" class="btn-primary w-full">…</button>
     </div>
     ```
     **MUST keep** the inline `style="padding-bottom: env(safe-area-inset-bottom)"` — `mobile-touch-targets.spec.ts:166-167` uses `outerHTML.match(/safe-area-inset-bottom/)`. AND the wrapper must keep `position: sticky` per `stage1.spec.ts:188-189`.

  7. **PRESERVE `<label for="targetN">` ↔ `<input id="targetN" data-testid="stage1-target-n">`** at lines around 514. Don't strip `id` or `for` attributes during chip/field restyling.

  8. **PRESERVE the `<a href="#/docs/beispiele" data-testid="stage1-beispiele-link">`** at line 399-405 — keep as `<a href>`, NOT `onClick`.

  **`apps/web/src/stage1/TrustStrip.tsx`:**
  - Wrap the 3 cards in handoff `.card` styling. Each card is `<a href="#/docs/<slug>" class="card card-hover" data-testid="trust-card-<slug>">`.
  - Hard-coded `card.iconColor = 'text-brand-accent'` (3×) → swap to `text-accent`.
  - PRESERVE testids `stage1-trust-strip`, `trust-card-algorithmus`, `trust-card-verifikation`, `trust-card-audit`.

  **`apps/web/src/stage1/AxisPicker.tsx`:**
  - Restyle each axis as a `.chip` wrapping a real `<input type="checkbox">` (the `<input>` MUST remain — `axis-checkbox-<header>` testid + asserted by 3 specs). Use:
    ```tsx
    <label class={`chip ${selected().includes(h) ? 'is-on' : ''}`} data-testid={`stage1-axis-pill-${h}`}>
      <input
        type="checkbox"
        class="sr-only"
        data-testid={`axis-checkbox-${h}`}
        checked={selected().includes(h)}
        onChange={() => onToggle(h)}
      />
      {h}
    </label>
    ```
  - Unavailable axes: `<span class="chip" aria-disabled="true">{h}</span>` — opacity-55, cursor-not-allowed.
  - PRESERVE all testids: `stage1-axis-picker`, `axis-checkbox-<h>`, `axis-badge-derived-<h>`, `axis-info-<h>`, `axis-warn-distinct-<h>`.

  **`apps/web/src/stage1/AgeBandsEditor.tsx`:**
  - Replace `<fieldset>` chrome with `<details open>` wrapped in `.card`:
    ```tsx
    <details open data-testid="stage1-age-bands-editor" class="card">
      <summary class="card-head"><span class="card-eyebrow">Schritt 3a</span><span class="card-title">Altersgruppen-Bänder</span></summary>
      ...
    </details>
    ```
  - PRESERVE the native `<details open>` — `stage1-bands.spec.ts` asserts `toHaveAttribute('open', '')`.
  - PRESERVE all band-* testids exactly as-is.

  **`apps/web/src/stage1/SampleSizeCalculator.tsx`:**
  - Wrap in `.card` with `.card-head`. Inputs use `.field` + `.input` classes.
  - PRESERVE all testids: `stage1-sample-size-section`, `stage1-panel-size`, `stage1-outreach-mode`, `stage1-outreach-mail-plus-phone`, `stage1-outreach-mail-only`, `stage1-outreach-custom`, `stage1-custom-rate-min`, `stage1-custom-rate-max`, `stage1-sample-suggestion`, `stage1-pool-too-small-warning`, `stage1-accept-suggestion`.

  **DO NOT** touch `runStage1.ts`, `audit-sign.ts`, `age-bands-helpers.ts` (logic, no UI).

  **DO NOT** import any file from `design_handoff_buergerinnenrat/reference/`.

  **End-of-phase verification:** run the full Vitest + Playwright suite. EVERY test must stay green. If a test breaks for non-test-id reasons (e.g. CSS class rename actually breaks a class-based selector), the executor MAY update the test selector to a `data-testid` equivalent — but ONLY as a last resort, with EXECUTION.md noting the change.
  </action>
  <verify>
    <automated>
      cd /root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web &amp;&amp;
      grep -E 'class="step-rail"' src/stage1/Stage1Panel.tsx &amp;&amp;
      grep -E 'data-testid="stage1-bmg-hint"' src/stage1/Stage1Panel.tsx &amp;&amp;
      grep -E 'safe-area-inset-bottom' src/stage1/Stage1Panel.tsx &amp;&amp;
      grep -E 'class="stage1-report' src/stage1/Stage1Panel.tsx &amp;&amp;
      grep -E 'overflow-x-auto' src/stage1/Stage1Panel.tsx &amp;&amp;
      grep -E 'id="targetN"' src/stage1/Stage1Panel.tsx &amp;&amp;
      grep -E 'for="targetN"' src/stage1/Stage1Panel.tsx &amp;&amp;
      grep -E 'href="#/docs/beispiele"' src/stage1/Stage1Panel.tsx &amp;&amp;
      grep -E 'class="banner' src/stage1/Stage1Panel.tsx | wc -l | awk '$1 &gt;= 3 {exit 0} {exit 1}' &amp;&amp;
      grep -E 'data-testid="axis-checkbox-' src/stage1/AxisPicker.tsx &amp;&amp;
      grep -E '&lt;details open' src/stage1/AgeBandsEditor.tsx &amp;&amp;
      pnpm typecheck &amp;&amp; pnpm test &amp;&amp;
      pnpm exec playwright test --project=chromium
    </automated>
  </verify>
  <done>
    - 6-step rail rendered above stage1-step-header.
    - Each section wrapped in `.card` with `.card-head` (eyebrow + title + help).
    - All inline banners replaced with `.banner.info/.warn/.err`.
    - `stage1-summary-cards` is `.stats-grid` containing 4 `.stat` cells.
    - Strata table wrapped in `<div class="overflow-x-auto">` parent.
    - Sticky run-button wrapper inline `style="padding-bottom: env(safe-area-inset-bottom)"` preserved verbatim.
    - `<label for="targetN">` ↔ `<input id="targetN">` binding preserved.
    - `<a href="#/docs/beispiele">` anchor preserved (not converted to onClick).
    - `.stage1-report` class on result section preserved.
    - All ~40 Stage-1 testids present at correct DOM levels.
    - TrustStrip cards use `.card` + `.card-hover`, icon color reads `text-accent`.
    - AxisPicker uses `.chip` styling with real `<input type="checkbox" class="sr-only">` inside.
    - AgeBandsEditor uses native `<details open>` inside `.card`.
    - SampleSizeCalculator uses `.card` + `.field` + `.input`.
    - Full Vitest + Playwright suite (chromium project) passes.
  </done>
</task>

<task type="auto">
  <name>Task 6 — Phase 6: Audit panel rebind to schema 0.4 (all 21+4+3 fields)</name>
  <files>
    apps/web/src/stage1/AuditFooter.tsx,
    apps/web/vite.config.ts
  </files>
  <action>
  **Add `VITE_APP_VERSION` to `apps/web/vite.config.ts`** so `tool_version` displays come from package.json:
  ```ts
  import pkg from './package.json' with { type: 'json' };
  // ...
  export default defineConfig({
    // ...
    define: {
      __GIT_SHA__: JSON.stringify(process.env.GIT_SHA || 'dev'),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
    },
    // ...
  });
  ```
  If `with { type: 'json' }` import assertion isn't supported by the Node version, use `import { readFileSync } from 'node:fs'` + `JSON.parse(readFileSync('./package.json', 'utf8'))`.

  **Rewrite `apps/web/src/stage1/AuditFooter.tsx` visually using `.audit` mono-block + `.sig-pill`** while EXTENDING to render every field of `Stage1AuditDoc` schema 0.4. Field-name mapping is non-negotiable per Review C2:

  | Display label (DE) | Schema field | Notes |
  |---|---|---|
  | Schema-Version | `schema_version` | always `"0.4"` |
  | Operation | `operation` | always `"stage1_versand_sampling"` |
  | Algorithmus-Version | `algorithm_version` | NOT `algorithm` |
  | Tie-Break-Regel | `tie_break_rule` | |
  | Schlüssel-Codierung | `key_encoding` | |
  | Stratum-Sortierung | `stratum_sort` | |
  | Seed | `seed` | tabular-nums |
  | Seed-Quelle | `seed_source` | |
  | Eingangs-Datei | `input_csv_filename` (+ `input_csv_size_bytes` formatted) | |
  | Eingangs-Datei-Hash (SHA-256) | `input_csv_sha256` | full hash, mono, no `calt` |
  | Pool-Größe | `pool_size` | NOT `input_rows` |
  | Ziel-Stichprobengröße | `target_n` | NOT `N` |
  | Tatsächliche Stichprobengröße | `actual_n` | |
  | Stratifikations-Achsen | `stratification_axes` | comma-joined |
  | Strata-Anzahl | `strata.length` | |
  | Warnungen | `warnings.length` (collapsed `<details>` listing if >0) | |
  | Dauer | `duration_ms` | tabular-nums + " ms" |
  | Zeitstempel (UTC) | `timestamp_iso` | NOT `created_at` |
  | Ausgewählte Indizes | `selected_indices` | length + collapsed `<details>` listing — variable-length up to 300 IDs |
  | Berechnete Spalten | `derived_columns` (optional) | |
  | Erzwungene Null-Strata | `forced_zero_strata` (optional) | |
  | Bemessungs-Vorschlag | `sample_size_proposal` (optional) | |
  | Tool-Version | `import.meta.env.VITE_APP_VERSION` | NOT in schema; build-time constant |
  | Signatur | `signature` (gekürzt, `.sig-pill`) | |
  | Signatur-Algorithmus | `signature_algo` | `audit-footer-sig-algo` testid |
  | Public Key | `public_key` (gekürzt, mono) | |

  **Visual layout:**
  ```tsx
  <section data-testid="stage1-audit-footer" class="card">
    <div class="card-head">
      <span class="card-eyebrow">Schritt 6</span>
      <h2 class="card-title">Protokoll / Audit</h2>
    </div>
    <div class="audit">
      <dl>
        <dt>Schema-Version</dt><dd>{props.doc.schema_version}</dd>
        <dt>Operation</dt><dd>{props.doc.operation}</dd>
        <dt>Algorithmus-Version</dt><dd>{props.doc.algorithm_version}</dd>
        <dt>Tool-Version</dt><dd>{import.meta.env.VITE_APP_VERSION ?? '?'}</dd>
        <dt>Tie-Break-Regel</dt><dd>{props.doc.tie_break_rule}</dd>
        <dt>Schlüssel-Codierung</dt><dd>{props.doc.key_encoding}</dd>
        <dt>Stratum-Sortierung</dt><dd>{props.doc.stratum_sort}</dd>
        <dt>Seed</dt><dd>{props.doc.seed}</dd>
        <dt>Seed-Quelle</dt><dd>{props.doc.seed_source}</dd>
        <dt>Eingangs-Datei</dt><dd>{props.doc.input_csv_filename} ({fmtBytes(props.doc.input_csv_size_bytes)})</dd>
        <dt>SHA-256</dt><dd data-testid="audit-footer-hash">{props.doc.input_csv_sha256}</dd>
        <dt>Pool-Größe</dt><dd>{props.doc.pool_size}</dd>
        <dt>Ziel-Stichprobengröße</dt><dd>{props.doc.target_n}</dd>
        <dt>Tatsächliche Stichprobengröße</dt><dd>{props.doc.actual_n}</dd>
        <dt>Stratifikations-Achsen</dt><dd>{props.doc.stratification_axes.join(', ')}</dd>
        <dt>Strata-Anzahl</dt><dd>{props.doc.strata.length}</dd>
        <dt>Warnungen</dt><dd>{props.doc.warnings.length}</dd>
        <dt>Dauer</dt><dd>{props.doc.duration_ms} ms</dd>
        <dt>Zeitstempel (UTC)</dt><dd>{props.doc.timestamp_iso}</dd>
      </dl>
      <details>
        <summary>Ausgewählte Indizes ({props.doc.selected_indices.length})</summary>
        <pre>{JSON.stringify(props.doc.selected_indices)}</pre>
      </details>
      <Show when={props.doc.derived_columns}>
        <dl data-testid="audit-footer-derived"><dt>Berechnete Spalten</dt><dd>...</dd></dl>
      </Show>
      <Show when={props.doc.forced_zero_strata && props.doc.forced_zero_strata.length > 0}>
        <dl data-testid="audit-footer-forced-zero"><dt>Erzwungene Null-Strata</dt><dd>{props.doc.forced_zero_strata.length}</dd></dl>
      </Show>
      <Show when={props.doc.sample_size_proposal}>
        <dl data-testid="audit-footer-sample-size"><dt>Bemessungs-Vorschlag</dt><dd>...</dd></dl>
      </Show>
    </div>
    <div class="mt-3 flex items-center gap-2">
      <Show when={props.doc.signature_algo} fallback={<span class="sig-pill is-unsigned" data-testid="audit-footer-sig-algo">noch nicht signiert</span>}>
        <span class="sig-pill" data-testid="audit-footer-sig-algo">{props.doc.signature_algo}</span>
      </Show>
      <Show when={props.doc.public_key}>
        <span class="font-mono text-xs text-ink-3">PK: {abbreviate(props.doc.public_key)}</span>
      </Show>
      <Show when={props.doc.signature}>
        <span class="font-mono text-xs text-ink-3" data-testid="audit-footer-sig">SIG: {abbreviate(props.doc.signature)}</span>
      </Show>
    </div>
  </section>
  ```

  **PRESERVE all existing testids** at the same DOM-nesting level: `stage1-audit-footer`, `audit-footer-hash`, `audit-footer-sig`, `audit-footer-sig-algo`, `audit-footer-derived`, `audit-footer-sample-size`, `audit-footer-forced-zero`.

  **PRESERVE label strings** asserted by `stage1.spec.ts:80`: "Protokoll / Audit" + "SHA-256". The latter is now in `<dt>SHA-256</dt>` instead of "Eingangs-Datei-Hash (SHA-256):" — verify `stage1.spec.ts` selector uses partial-match (`getByText(/SHA-256/)`) and adjust label accordingly if it requires exact "SHA-256:" with colon.

  **Unsigned-state assertion:** `audit-footer-sig-algo` must `not.toContainText('noch nicht signiert')` when signed; the `<Show when={signature_algo} fallback={...}>` pattern handles both.

  **DO NOT add `tool_version` to schema 0.4** — schema is unchanged. `tool_version` is a UI-only display field sourced from build-time `import.meta.env.VITE_APP_VERSION`.

  **DO NOT touch `audit-sign.ts`** (signature creation is logic, not UI).
  </action>
  <verify>
    <automated>
      cd /root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web &amp;&amp;
      grep -E 'VITE_APP_VERSION' vite.config.ts &amp;&amp;
      grep -E 'algorithm_version' src/stage1/AuditFooter.tsx &amp;&amp;
      grep -E 'input_csv_sha256' src/stage1/AuditFooter.tsx &amp;&amp;
      grep -E 'timestamp_iso' src/stage1/AuditFooter.tsx &amp;&amp;
      grep -E 'target_n' src/stage1/AuditFooter.tsx &amp;&amp;
      grep -E 'actual_n' src/stage1/AuditFooter.tsx &amp;&amp;
      grep -E 'pool_size' src/stage1/AuditFooter.tsx &amp;&amp;
      grep -E 'stratification_axes' src/stage1/AuditFooter.tsx &amp;&amp;
      grep -E 'selected_indices' src/stage1/AuditFooter.tsx &amp;&amp;
      grep -E 'signature_algo' src/stage1/AuditFooter.tsx &amp;&amp;
      grep -E 'public_key' src/stage1/AuditFooter.tsx &amp;&amp;
      grep -E 'data-testid="stage1-audit-footer"' src/stage1/AuditFooter.tsx &amp;&amp;
      grep -E 'data-testid="audit-footer-sig-algo"' src/stage1/AuditFooter.tsx &amp;&amp;
      grep -E 'data-testid="audit-footer-derived"' src/stage1/AuditFooter.tsx &amp;&amp;
      grep -E 'data-testid="audit-footer-sample-size"' src/stage1/AuditFooter.tsx &amp;&amp;
      grep -E 'data-testid="audit-footer-forced-zero"' src/stage1/AuditFooter.tsx &amp;&amp;
      pnpm typecheck &amp;&amp; pnpm test &amp;&amp;
      pnpm exec playwright test --project=chromium tests/e2e/stage1.spec.ts tests/e2e/stage1-bands.spec.ts tests/e2e/stage1-sample-size.spec.ts
    </automated>
  </verify>
  <done>
    - `vite.config.ts` `define` includes `import.meta.env.VITE_APP_VERSION` from `package.json` version.
    - `AuditFooter.tsx` renders all 21 mandatory schema-0.4 fields by their schema names (`algorithm_version`, `input_csv_sha256`, `timestamp_iso`, `target_n`, `actual_n`, `pool_size`, `stratification_axes`, etc.).
    - All 4 optional fields conditionally rendered (`derived_columns`, `forced_zero_strata`, `sample_size_proposal`, plus 4th).
    - All 3 signature fields rendered (`signature`, `signature_algo`, `public_key`).
    - `selected_indices` rendered inside collapsed `<details>` (variable-length, up to 300 IDs).
    - `tool_version` reads `import.meta.env.VITE_APP_VERSION`, NOT hardcoded.
    - Visual layout uses `.audit` mono-block + `.sig-pill` (with grey "noch nicht signiert" fallback for unsigned state).
    - All `audit-footer-*` testids preserved at same DOM level.
    - `stage1.spec.ts`, `stage1-bands.spec.ts`, `stage1-sample-size.spec.ts` all pass.
    - Manual: open Stage 1, run a draw, scroll to audit footer; visually confirm every schema-0.4 field appears.
  </done>
</task>

<task type="auto">
  <name>Task 7 — Phase 7: Docs typography (sticky TOC + 68ch body)</name>
  <files>
    apps/web/src/docs/DocsLayout.tsx,
    apps/web/src/docs/DocsHub.tsx,
    apps/web/src/docs/Beispiele.tsx
  </files>
  <action>
  **`apps/web/src/docs/DocsLayout.tsx`:**
  - Wrap children in `<div class="doc-grid"><nav class="doc-toc">...</nav><div class="doc-body prose-app">{children}</div></div>`.
  - Auto-extract TOC from `<h2>` elements rendered in the body via Solid `createEffect(on(...))`:
    ```tsx
    let bodyEl: HTMLDivElement | undefined;
    const [toc, setToc] = createSignal<{ id: string; text: string }[]>([]);
    createEffect(() => {
      docsRoute(); // re-run on route change
      if (!bodyEl) return;
      // Wait one microtask for children to mount
      queueMicrotask(() => {
        const headings = bodyEl!.querySelectorAll('h2');
        const items: { id: string; text: string }[] = [];
        headings.forEach((h, i) => {
          if (!h.id) h.id = `sec-${i}-${(h.textContent || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          items.push({ id: h.id, text: h.textContent || '' });
        });
        setToc(items);
      });
    });
    // Render: <nav class="doc-toc"><ol><For each={toc()}>{item => <li><a href={`#${item.id}`}>{item.text}</a></li>}</For></ol></nav>
    ```
  - **PRESERVE the existing `<h1>{title}</h1>`** at line 52 — DocsLayout is the only component that emits `<h1>` on docs routes.
  - **PRESERVE testids:** `docs-page-<slug>` on each subpage wrapper, `docs-back-to-hub` on the back-link.
  - **No content changes** to any of the 8 subpages (`Algorithmus.tsx`, `Beispiele.tsx`, `Bmg46.tsx`, `Glossar.tsx`, `Limitationen.tsx`, `Technik.tsx`, `Verifikation.tsx`, `DocsHub.tsx`).

  **`apps/web/src/docs/DocsHub.tsx`:**
  - Refresh tile chrome to use `.card` + `.card-hover`. Each tile is `<a href="#/docs/<slug>" class="card card-hover" data-testid="docs-tile-<slug>">`.
  - PRESERVE all 7 docs-tile testids (`docs-tile-algorithmus`, `docs-tile-technik`, `docs-tile-verifikation`, `docs-tile-glossar`, `docs-tile-bmg46`, `docs-tile-limitationen`, `docs-tile-beispiele`).
  - PRESERVE tile count (asserted as 7 by `docs.spec.ts`).

  **`apps/web/src/docs/Beispiele.tsx`:**
  - Adopt `.sample-grid` containing `.sample-card` for the 4-file picker.
  - PRESERVE all testids on the sample-card components and any `axis-checkbox-<h>` references.
  </action>
  <verify>
    <automated>
      cd /root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web &amp;&amp;
      grep -E 'class="doc-grid"' src/docs/DocsLayout.tsx &amp;&amp;
      grep -E 'class="doc-toc"' src/docs/DocsLayout.tsx &amp;&amp;
      grep -E 'createEffect' src/docs/DocsLayout.tsx &amp;&amp;
      grep -E 'class="sample-grid"' src/docs/Beispiele.tsx &amp;&amp;
      grep -E 'data-testid="docs-tile-' src/docs/DocsHub.tsx | wc -l | awk '$1 == 7 {exit 0} {exit 1}' &amp;&amp;
      pnpm typecheck &amp;&amp; pnpm test &amp;&amp;
      pnpm exec playwright test --project=chromium tests/e2e/docs.spec.ts tests/e2e/trust-strip.spec.ts tests/e2e/beispiele-stage1.spec.ts
    </automated>
  </verify>
  <done>
    - `DocsLayout` wraps children in `.doc-grid` with sticky `.doc-toc` (220px) + `.doc-body` (68ch).
    - TOC auto-extracts from `<h2>` elements via `createEffect(on(docsRoute, ...))`.
    - All 8 docs subpages render correctly with new layout, no content changes.
    - `DocsHub` tiles use `.card` + `.card-hover`, all 7 `docs-tile-<slug>` testids preserved.
    - `Beispiele` uses `.sample-grid` + `.sample-card`.
    - `docs.spec.ts`, `trust-strip.spec.ts`, `beispiele-stage1.spec.ts` all pass.
  </done>
</task>

<task type="auto">
  <name>Task 8 — Phase 8: Overview screen (#/overview)</name>
  <files>
    apps/web/src/Overview.tsx,
    apps/web/src/App.tsx
  </files>
  <action>
  **Create `apps/web/src/Overview.tsx`** — lazy-loaded Solid component:
  ```tsx
  import { Component } from 'solid-js';

  const Overview: Component = () => {
    return (
      <div class="space-y-8">
        <header class="overview-hero space-y-3">
          <h1 class="text-4xl font-serif font-semibold text-ink">Bürger:innenrat</h1>
          <p class="text-lg text-ink-2 max-w-prose">
            Browser-natives Werkzeug für stratifizierte Zufallsauswahl in Bürgerräten.
            Daten bleiben lokal, Audit-Protokolle sind Ed25519-signiert, jede Entscheidung
            ist nachvollziehbar.
          </p>
        </header>

        <section aria-label="Verfahrensschritte">
          <h2 class="text-2xl font-serif mb-4 text-ink">Was dieses Werkzeug abdeckt</h2>
          <div class="grid md:grid-cols-2 gap-4">
            <a href="#/stage1" class="card card-hover" data-testid="overview-card-stage1">
              <div class="card-head">
                <span class="card-eyebrow">Stage 1</span>
                <h3 class="card-title">Versand-Liste ziehen</h3>
                <span class="status-pill status-pill-ok">verfügbar</span>
              </div>
              <p class="text-ink-2">Stratifizierte Zufallsauswahl aus dem Melderegister gemäß § 46 BMG.</p>
            </a>
            <a href="#/stage3" class="card card-hover" data-testid="overview-card-stage3">
              <div class="card-head">
                <span class="card-eyebrow">Stage 3</span>
                <h3 class="card-title">Panel-Auswahl</h3>
                <span class="status-pill status-pill-warn">Konzept</span>
              </div>
              <p class="text-ink-2">Maximin-Heuristik aus den Antwortenden. Solver-Wahl S-2 offen.</p>
            </a>
          </div>
          <aside class="banner info mt-4" data-testid="overview-stages-2-4-note">
            <div>
              <strong>Stage 2 (Outreach + Selbstauskunft)</strong> und
              <strong>Stage 4 (Reserve / Nachholung)</strong> liegen außerhalb des aktuellen
              Funktionsumfangs. Sie werden manuell oder mit anderen Werkzeugen abgewickelt.
            </div>
          </aside>
        </section>

        <section aria-label="Architektur-Prinzipien">
          <h2 class="text-2xl font-serif mb-4 text-ink">Architektur-Prinzipien</h2>
          <div class="grid md:grid-cols-3 gap-4">
            {/* Pull from TrustStrip data — single source of truth.
                Recommended approach: import the principles array from TrustStrip
                if it's already exported, otherwise inline 3 cards with the same content
                as TrustStrip cards (Browser-nativ / Reproduzierbar / Rechtskonform). */}
            ...
          </div>
        </section>
      </div>
    );
  };

  export default Overview;
  ```

  **Single source of truth for principles:** if `TrustStrip.tsx` doesn't already export its card data, refactor it to export `export const TRUST_PRINCIPLES = [...]` (an array of `{title, body, hash, icon}` objects) and import that into both `TrustStrip.tsx` and `Overview.tsx`. Avoid divergent copies.

  **Modify `apps/web/src/App.tsx`:**
  1. Import: `const Overview = lazy(() => import('./Overview'));`.
  2. Extend type: `type AppMode = 'overview' | 'stage1' | 'stage3' | 'docs';`.
  3. Update `parseHash` (around line 67-100):
     ```ts
     if (hash === '#/overview') return { mode: 'overview', docsRoute: 'hub' };
     ```
  4. Update `hashFor`:
     ```ts
     if (mode === 'overview') return '#/overview';
     ```
  5. Add `<Show when={mode() === 'overview'}><Overview /></Show>` in the main render branches.
  6. Default landing **STAYS `#/stage3`** per CONTEXT.md L21 — do NOT change the catch-all fallback at line 93.
  7. The Sidebar `nav-overview` link added in Phase 3 already points to `#/overview` — verify it activates.

  **Print CSS:** `@media print { .overview-hero { display: none } }` (already added in Phase 2).

  **Stage-2-/-4 explanation banner is rendered inside Overview** (`overview-stages-2-4-note` testid). Sidebar items for Stage 2/4 are also already present (disabled visuals from Phase 3).
  </action>
  <verify>
    <automated>
      cd /root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web &amp;&amp;
      test -f src/Overview.tsx &amp;&amp;
      grep -E "lazy\(\(\) =&gt; import\('./Overview'\)\)" src/App.tsx &amp;&amp;
      grep -E "'overview'" src/App.tsx &amp;&amp;
      grep -E "'#/overview'" src/App.tsx &amp;&amp;
      grep -E 'data-testid="overview-card-stage1"' src/Overview.tsx &amp;&amp;
      grep -E 'data-testid="overview-card-stage3"' src/Overview.tsx &amp;&amp;
      grep -E 'data-testid="overview-stages-2-4-note"' src/Overview.tsx &amp;&amp;
      pnpm typecheck &amp;&amp; pnpm test &amp;&amp;
      pnpm exec playwright test --project=chromium
    </automated>
  </verify>
  <done>
    - `apps/web/src/Overview.tsx` exists, default-exports a Solid component, lazy-loaded in `App.tsx`.
    - `AppMode` extended with `'overview'`; `parseHash`/`hashFor` handle `#/overview`.
    - Default catch-all fallback STAYS `mode='stage3'` (NOT changed to `'overview'`).
    - Overview renders hero + 2 workflow cards (Stage 1 verfügbar, Stage 3 Konzept) + 3 principles columns + Stage-2/4 outside-tool banner.
    - Principles content sourced from a single export shared with `TrustStrip.tsx`.
    - Visiting `#/overview` shows the page; sidebar `nav-overview` link activates the route.
    - Full Vitest + Playwright suite green.
    - Manual: visit `/#/overview`, confirm visual matches handoff `docs.jsx:3-79` hero pattern.
  </done>
</task>

<task type="auto">
  <name>Task 9 — Phase 9: Bundle delta + visual smoke screenshots</name>
  <files>
    BUNDLE_DELTA.md,
    .issues/65-visual-redesign-design-handoff/iteration/01-sidebar-desktop.png,
    .issues/65-visual-redesign-design-handoff/iteration/01-sidebar-mobile.png,
    .issues/65-visual-redesign-design-handoff/iteration/02-stage1-card-desktop.png,
    .issues/65-visual-redesign-design-handoff/iteration/02-stage1-card-mobile.png,
    .issues/65-visual-redesign-design-handoff/iteration/03-audit-panel-desktop.png,
    .issues/65-visual-redesign-design-handoff/iteration/03-audit-panel-mobile.png,
    .issues/65-visual-redesign-design-handoff/iteration/04-doc-layout-desktop.png,
    .issues/65-visual-redesign-design-handoff/iteration/04-doc-layout-mobile.png,
    .issues/65-visual-redesign-design-handoff/iteration/05-overview-desktop.png,
    .issues/65-visual-redesign-design-handoff/iteration/05-overview-mobile.png,
    apps/web/tests/e2e/_visual-iteration.spec.ts
  </files>
  <action>
  **Bundle measurement.** Run from worktree root:
  ```bash
  cd apps/web
  rm -rf dist
  VITE_BASE_PATH=/ pnpm build
  echo '=== Post-redesign bundle ==='
  du -sb dist/assets/index-*.js dist/assets/index-*.css 2>/dev/null
  for f in dist/assets/index-*.js dist/assets/index-*.css; do
    echo -n "$(basename $f) gzip: "
    gzip -c "$f" | wc -c
  done
  echo '=== Lazy chunks ==='
  ls -la dist/assets/*.js | grep -v 'index-'
  echo '=== Fonts ==='
  du -sb dist/fonts/* 2>/dev/null || du -sb public/fonts/* 2>/dev/null
  ```

  **Append a new section to `BUNDLE_DELTA.md`** at the workspace root (don't replace existing #62/#64 sections):
  ```markdown
  ## #65 visual-redesign-design-handoff — YYYY-MM-DD

  ### Pre-redesign baseline (post-#64)
  - `index-*.js` raw 132.82 KB / gzip 43.39 KB
  - `index-*.css` raw 44.47 KB / gzip 7.41 KB
  - HiGHS WASM 2.60 MB (outside budget — payload-on-demand)

  ### Post-redesign
  - `index-*.js` raw <X> KB / gzip <Y> KB → delta +<dx> raw / +<dy> gzip
  - `index-*.css` raw <X> KB / gzip <Y> KB → delta +<dx> raw / +<dy> gzip
  - **JS+CSS combined delta:** +<sum> KB raw / +<sum> KB gzip (budget +50/+18 KB)
  - `Overview-*.js` lazy chunk: <Z> KB raw / <Z> KB gzip (separate; not against main bundle)
  - **Self-hosted fonts:** Source Serif 4 (2× woff2) + Inter (3× woff2) + JetBrains Mono (2× woff2) → ~<W> KB total. Tracked separately under "fonts" line, NOT against the +50/+18 budget per CONTEXT.md decision.

  ### Notes
  - `@kobalte/core/dialog` subpath import contributes ~<K> KB gzip (if Phase 4 shipped).
  - OkLCH tokens, dark-theme block, density block all in `index.css` `@layer base`.
  - Status: <within budget | exceeded — issue re-opened>
  ```

  **If JS+CSS delta exceeds +50/+18 KB:** STOP. Report to orchestrator. Do NOT silently exceed budget per CONTEXT.md L55.

  **Visual smoke screenshots.** Extend `apps/web/tests/e2e/_visual-iteration.spec.ts` (or create a new spec if cleaner) to capture 5 viewpoints × 2 viewports = 10 PNGs:
  - `01-sidebar` — full page at `/` (Stage 3 default). Desktop 1280×800 captures sidebar; mobile 375×812 captures pill-tabs.
  - `02-stage1-card` — `#/stage1` after CSV upload. Captures step-rail + first card.
  - `03-audit-panel` — `#/stage1` after a draw runs. Scroll to audit footer.
  - `04-doc-layout` — `#/docs/algorithmus`. Captures sticky TOC + 68ch body.
  - `05-overview` — `#/overview`. Captures hero + workflow cards + principles.

  Spec template:
  ```ts
  test.describe('Visual iteration screenshots for #65', () => {
    const points = [
      { slug: '01-sidebar',     route: '#/stage3' },
      { slug: '02-stage1-card', route: '#/stage1' },
      { slug: '03-audit-panel', route: '#/stage1' },
      { slug: '04-doc-layout',  route: '#/docs/algorithmus' },
      { slug: '05-overview',    route: '#/overview' },
    ];
    const viewports = [
      { name: 'desktop', size: { width: 1280, height: 800 } },
      { name: 'mobile',  size: { width: 375,  height: 812 } },
    ];
    for (const point of points) {
      for (const vp of viewports) {
        test(`${point.slug} ${vp.name}`, async ({ page }) => {
          await page.setViewportSize(vp.size);
          await page.goto(point.route);
          // For point 03: trigger a draw first via existing test helpers.
          await page.screenshot({
            path: `.issues/65-visual-redesign-design-handoff/iteration/${point.slug}-${vp.name}.png`,
            fullPage: true,
          });
        });
      }
    }
  });
  ```
  Adjust `02-stage1-card` and `03-audit-panel` to load a sample CSV via existing test helpers in `apps/web/tests/e2e/_visual-iteration.spec.ts` so screenshots show non-empty state.

  **Final test gate:** run the FULL `pnpm test` (Vitest) + `pnpm exec playwright test` (Playwright e2e — chromium AND firefox projects) + `pnpm exec playwright test apps/web/tests/smoke-live` (live smoke). Every test green.

  **Mark issue done.** No commit (orchestrator commits).
  </action>
  <verify>
    <automated>
      cd /root/workspace/.worktrees/65-visual-redesign-design-handoff &amp;&amp;
      cd apps/web &amp;&amp; rm -rf dist &amp;&amp; VITE_BASE_PATH=/ pnpm build &amp;&amp;
      JS_RAW=$(stat -c%s dist/assets/index-*.js 2>/dev/null | head -1) &amp;&amp;
      CSS_RAW=$(stat -c%s dist/assets/index-*.css 2>/dev/null | head -1) &amp;&amp;
      JS_GZ=$(gzip -c dist/assets/index-*.js | wc -c) &amp;&amp;
      CSS_GZ=$(gzip -c dist/assets/index-*.css | wc -c) &amp;&amp;
      echo "JS raw $JS_RAW gz $JS_GZ; CSS raw $CSS_RAW gz $CSS_GZ" &amp;&amp;
      cd ../.. &amp;&amp;
      grep -E '^## #65 visual-redesign-design-handoff' BUNDLE_DELTA.md &amp;&amp;
      ls .issues/65-visual-redesign-design-handoff/iteration/*.png | wc -l | awk '$1 == 10 {exit 0} {exit 1}' &amp;&amp;
      cd apps/web &amp;&amp; pnpm test &amp;&amp; pnpm exec playwright test
    </automated>
  </verify>
  <done>
    - `pnpm build` succeeds.
    - JS+CSS combined delta is within +50 KB raw / +18 KB gzip vs post-#64 baseline. If exceeded: STOP and report.
    - `BUNDLE_DELTA.md` has new `## #65` section with pre/post numbers, lazy-chunk separate, fonts as separate "fonts" line.
    - 10 PNG screenshots exist under `.issues/65-visual-redesign-design-handoff/iteration/<slug>-<viewport>.png`.
    - Full Vitest + Playwright suite (both chromium + firefox projects) green.
    - Live smoke spec (`tests/smoke-live/`) green.
    - Issue marked complete (orchestrator handles commit + status update).
  </done>
</task>

## Verification Strategy (overall)

After all phases:

- **Vitest:** `cd apps/web && pnpm test` — unit + component tests.
- **Playwright e2e:** `cd apps/web && pnpm exec playwright test` — full suite, chromium AND firefox projects. Specific specs touching the redesign surface:
  - `_visual-iteration.spec.ts` (desktop + mobile viewports)
  - `a11y.spec.ts` (single `<h1>`, button/img labels, file-input presence)
  - `mobile-touch-targets.spec.ts` (44×44, sticky run, overflow-x, safe-area)
  - `csv-import.spec.ts`, `smoke.spec.ts` (heading "Bürger:innenrat" by role)
  - `stage1.spec.ts`, `stage1-bands.spec.ts`, `stage1-sample-size.spec.ts`
  - `docs.spec.ts`, `trust-strip.spec.ts`, `beispiele-stage1.spec.ts`
  - `end-to-end.spec.ts` (Stage 3 — must stay green though Stage 3 is barely touched)
- **Live smoke:** `cd apps/web && pnpm exec playwright test tests/smoke-live/site-smoke.spec.ts` — ensures deployed assets boot.
- **TypeScript:** `cd apps/web && pnpm typecheck` — no new errors.
- **Bundle:** Phase-9 measurement script. JS+CSS delta within +50/+18 KB; fonts tracked separately.
- **Manual visual smoke (executor or operator):**
  1. `pnpm dev` and visit `/`, `/#/overview`, `/#/stage1`, `/#/docs/algorithmus`, `/#/stage3`.
  2. Resize between 320px and 1440px — sidebar shows at md+, pill-tabs at <md, no horizontal overflow.
  3. Scroll Stage 1 to audit footer — every schema-0.4 field renders with schema-correct labels.
  4. Print preview (`Cmd/Ctrl+P`) on Stage 1 — sidebar/drawer/hero hidden, `.stage1-report` card visible.
  5. Switch `<html data-theme="dark">` in DevTools — colours switch to dark token block (no UI toggle in this issue, but tokens must work).
- **Accessibility:** Lighthouse a11y score ≥ 95 on `/`, `/#/stage1`, `/#/docs/algorithmus`. (`a11y.spec.ts` covers the regression gate; full BITV audit deferred to #67.)

## Out of Scope (preserved from CONTEXT/ISSUE)

- Drag-and-drop CSV upload (visual drop-target only; click-to-pick remains).
- Stage-3 visual rework (`RunPanel.tsx`, `QuotaEditor.tsx`, `CsvImport.tsx` stay as-is; sidebar links to existing `#/stage3`).
- Stage-3 copy fix (issue #66, already merged).
- Dark-theme UI toggle (#67).
- Density UI toggle (#67).
- Accent-hue picker (#67).
- Vollständige EN/DE i18n (#67).
- Real Settings screen (#67).
- Visual-regression test suite with pixel-diff (#67).
- BITV-2.0 vollaudit (#67).
- Brand-mark swap — Versammlung-icon stays.
- Stage-2 / Stage-4 implementation.
- Engine B / Pyodide / Leximin solver (S-2 strategic decision).
- `tweaks-panel.jsx` / postMessage host protocol — DO NOT IMPORT.
- Adding `tool_version` to `Stage1AuditDoc` schema — schema 0.4 unchanged; Tool-Version is UI-only from `import.meta.env.VITE_APP_VERSION`.

## Rollback

Each phase commits independently and is revert-able:

- **Phase 1 revert:** `git revert <phase-1-commit>` undoes tokens, fonts, browserslist. App falls back to existing `#16a34a` brand colour and rsms.me Inter (after manual restore of the rsms.me link). Visual states post-Phase 1 reuse old chrome — accept temporary inconsistency until full revert.
- **Phase 2 revert:** restores old `@layer components` primitives. Stage 1 reskin (Phase 5) breaks because it consumes new classes — revert Phase 5 first if Phase 2 must be reverted alone.
- **Phase 3 revert:** `git revert <phase-3-commit>` removes sidebar; pill-tabs become primary nav at all breakpoints (current production behaviour).
- **Phase 4 revert (drawer):** revert MobileDrawer commit. Pill-tabs at <md remain, no functional regression.
- **Phase 5 revert (Stage 1 reskin):** restores existing `Stage1Panel.tsx` chrome. All testids and logic untouched, so e2e stays green.
- **Phase 6 revert (audit rebind):** restores 9-field audit footer. Schema unchanged, signing pipeline unaffected.
- **Phase 7 revert (docs typography):** restores existing `DocsLayout.tsx`. Subpage content unchanged.
- **Phase 8 revert (Overview):** removes `#/overview` route. Catch-all already maps unknown routes to Stage 3.
- **Phase 9 revert:** documentation + screenshots only — pure data, low risk.

For pipeline restart mid-issue: each phase is self-coherent and can be the last commit on the branch. The follow-up executor run reads PLAN.md + EXECUTION.md (orchestrator-maintained) to resume at the next pending phase.

## Estimated Scope

**Large.** Multi-day if executor attempts all 9 phases in one run. 1-2 days if split across executor runs.

**Recommended pacing:**
- **Run 1 (high-value MVP):** Phases 1 + 2 + 3 + 5 — token foundation + primitives + sidebar at md+ + Stage 1 reskin. This is the **minimum viable visual redesign** — visible improvement on every screen the user touches today. Phase 5 alone is multi-hour due to ~40 testids to preserve.
- **Run 2 (audit + docs):** Phases 6 + 7 — audit rebind + docs typography. Schema-correctness and docs-readability uplift.
- **Run 3 (overview + delivery):** Phases 8 + 9 — `#/overview` route + bundle measurement + screenshots + close-out.
- **Optional Phase 4 (drawer):** insert anywhere after Phase 3 if budget allows; otherwise defer to a follow-up issue (pill-tabs at <md cover the navigation requirement).

If the executor finds Phase 5 alone consumes its budget after Phases 1+2+3, that's acceptable — commit Phases 1+2+3+5 as the MVP and let a follow-up run pick up Phase 6 onwards. The orchestrator will re-spawn an executor with PLAN.md remaining tasks.
