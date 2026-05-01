# RESEARCH — 65-visual-redesign-design-handoff

Synthesized from three parallel research agents:
- `research/codebase.md` (1145 lines, 73 KB) — written by sub-agent
- `research/ecosystem.md` (219 lines) — synthesized from sub-agent's inline result + Sources Summary
- `research/pitfalls.md` (322 lines) — written by Claude from sub-agent's inline result

## User Constraints (from CONTEXT.md, verbatim summary)

**Stack:** Solid.js + Tailwind v3. No React port. Handoff JSX is wireframe only.
**Mobile-first:** `width=device-width`, sidebar→drawer below `md`, touch ≥44×44.
**Test-IDs are contract:** all ~70 existing testids preserved at same DOM nesting level.
**Hash routing:** all existing routes preserved; new `#/overview` added; sidebar items write `window.location.hash`.
**Audit Schema 0.4 unchanged.** Visual rebind via existing `AuditFooter.tsx`, NOT via handoff `audit.jsx` field labels.
**DE-only.** Handoff `i18n.jsx` EN strings NOT imported.
**Civic-green brand stays** (`oklch(50% 0.14 145)`, equivalent to `#16a34a`). `--hue` CSS variable indirection preserved for future themability.
**Stage-3 untouched.** RunPanel, QuotaEditor, CsvImport stay as-is.
**Future polish in #67:** dark theme UI toggle, density toggle, hue picker, real Settings, EN/DE i18n.
**Default landing stays `#/stage3`** (per CONTEXT.md L21).
**Phasing:** ONE executor run aiming for phases 1-3; phases 4-9 may need follow-up runs.
**Pill-bar shim:** kept visible on mobile (per pitfalls §1: `mobile-touch-targets.spec.ts` requires `tab-stage1/docs/stage3` visible AND ≥44×44 at 375px viewport).

## Summary

The redesign is bounded but substantial: ~1500 lines of code change across 4 MAJOR-rewrite files (App.tsx, index.html, index.css, tailwind.config.cjs), 9 MEDIUM-rewrite files (Stage1Panel + 8 sub-components, DocsLayout, DocsHub, Beispiele), 5 NEW files (Sidebar, MobileDrawer, Brand, Overview + fonts), preserving 11 PRESERVE-only files (Stage 3 surface, all logic modules, all docs subpages, all SVG components). The single biggest risk is the **Stage-1 mount tree** — `Stage1Panel.tsx` is 1015 LOC, mounts 8 sub-components, and emits ~40 of the contract test-IDs; visual rebind must be surgical and preserve every signal name, every `<label for=>` ↔ `<input id=>` binding, every `<details open>` semantic, and the `position: sticky` + `safe-area-inset-bottom` run-button wrapper.

The recommended approach: **Solid + Tailwind v3 hybrid with CSS variables as token source-of-truth.** OkLCH tokens declared in `index.css` `@layer base` under `:root` and `[data-theme="dark"]`; Tailwind utilities consume them via `var(--*)`. Pre-compute soft variants instead of using `color-mix()` to avoid bumping baseline beyond `safari >= 15.4`. Self-host Source Serif 4 + Inter (lock to v3.19 — v4 broke `cv11`) + JetBrains Mono with SIL OFL license files alongside woff2 binaries; preload only Inter Regular + Source Serif Semibold; `font-display: swap` everywhere. Use `@kobalte/core/dialog` (already in deps) for the mobile drawer — gives focus trap, scroll lock, ESC dismissal, ARIA for free at ~12-15 KB raw. Keep top pill-tab nav as a visible compatibility shim on mobile (NOT `display: none`) so `mobile-touch-targets.spec.ts` 44×44 assertions on `tab-stage1/docs/stage3` continue to pass.

Audit panel rebind extends `AuditFooter.tsx` to render all 21 mandatory + 4 optional + 3 signature fields from `Stage1AuditDoc` schema 0.4, with the visual layout from handoff `audit.jsx` (mono k/v block, `.sig-pill` with green dot) but the schema's exact field names (NOT handoff's `algorithm` / `input_sha` / `created_at` etc., which are misnomers per review C2). `tool_version` is sourced from a Vite build-time constant, not hardcoded.

## Codebase Analysis

### Interfaces (extracted from research/codebase.md §1, §3-7)

<interfaces>
// === apps/web/src/App.tsx ===
export const App: Component
export type DocsRoute = 'hub' | 'algorithmus' | 'technik' | 'verifikation'
                      | 'glossar' | 'bmg46' | 'limitationen' | 'beispiele'
type AppMode = 'stage1' | 'stage3' | 'docs'  // EXTEND to add 'overview'
function parseHash(hash: string): { mode: AppMode; docsRoute: DocsRoute }
function hashFor(mode: AppMode, docsRoute: DocsRoute): string

// === apps/web/src/stage1/Stage1Panel.tsx ===
export const Stage1Panel: Component<void>
// Mounts: TrustStrip, CsvPreview, SampleSizeCalculator, AgeBandsEditor,
//   AxisPicker, AxisBreakdown (loop), StratificationExplainer, AuditFooter.
// MUST preserve testids: stage1-panel, stage1-step-header, stage1-trust-strip,
//   stage1-csv-dropzone, stage1-csv-upload, stage1-beispiele-link,
//   stage1-pool-summary, stage1-bmg-hint, stage1-target-n, stage1-seed,
//   stage1-seed-source, stage1-seed-hint, stage1-preview, stage1-preview-zero-list,
//   stage1-preview-underfill-list, stage1-axis-breakdown-<axis>, stage1-run,
//   stage1-run-bands-block, stage1-result, stage1-summary-cards,
//   stage1-coverage-card, stage1-underfill-card, stage1-underfill-list,
//   stage1-axis-breakdowns, stage1-info-only-bands-report, stage1-strata-toggle,
//   stage1-strata-table, stage1-audit-footer, stage1-download-csv,
//   stage1-download-audit, stage1-download-md, stage1-print, stage1-error,
//   stage1-preview-error
// MUST preserve heading text:
//   "Schritt 1 von 3 — Versand-Liste ziehen", "1. Melderegister-CSV hochladen",
//   "2. Bemessung der Stichprobe", "3. Stratifikation konfigurieren",
//   "4. Stichprobengröße und Seed", "5. Ergebnis"
// MUST preserve <label for="targetN"> ↔ <input id="targetN"> binding
// MUST preserve sticky run-button wrapper at line 691 with
//   style="padding-bottom: env(safe-area-inset-bottom)"
// MUST preserve .stage1-report class on result <section> (print CSS)

// === apps/web/src/stage1/SampleSizeCalculator.tsx ===
export interface SampleSizeCalculatorProps {
  poolSize: () => number | null;
  onAccept: (recommended: number, proposal: SampleSizeProposal) => void;
}
export const SampleSizeCalculator: Component<SampleSizeCalculatorProps>
// MUST preserve testids: stage1-sample-size-section, stage1-panel-size,
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
export { addBandTo, removeBandAt, resetToDefaults } from './age-bands-helpers'
// MUST preserve <details open> semantic. MUST preserve testids:
//   stage1-age-bands-editor, band-min-<i>, band-max-<i>, band-open-<i>,
//   band-label-<i>, band-mode-<i>-selection, band-mode-<i>-display,
//   band-remove-<i>, bands-add, bands-reset, bands-validation

// === apps/web/src/stage1/AxisPicker.tsx ===
export interface AxisPickerProps {
  headers: () => string[];
  defaults: () => string[];
  onChange: (next: string[]) => void;
  axisDescriptions?: Record<string, string>;
}
export const AxisPicker: Component<AxisPickerProps>
// MUST preserve real <input type="checkbox"> for testids axis-checkbox-<h>
// MUST preserve testids: stage1-axis-picker, axis-checkbox-<h>,
//   axis-badge-derived-<h>, axis-info-<h>, axis-warn-distinct-<axis>

// === apps/web/src/stage1/AuditFooter.tsx ===
export interface AuditFooterProps {
  audit: () => Stage1AuditDoc;
  publicKey?: () => string | null;
  signatureAlgorithm?: () => string;
  showVerifyHint?: boolean;
}
export const AuditFooter: Component<AuditFooterProps>
// EXTEND to render all 21 mandatory + 4 optional + 3 signature schema 0.4 fields.
// MUST preserve testids: audit-footer-hash, audit-footer-sig,
//   audit-footer-sig-algo, audit-footer-derived, audit-footer-sample-size,
//   audit-footer-forced-zero
// MUST preserve "Protokoll / Audit" + "SHA-256" labels (asserted by stage1.spec.ts:80)

// === apps/web/src/stage1/TrustStrip.tsx ===
export default Component<void>
// MUST preserve testids: trust-card-algorithmus, trust-card-verifikation,
//   trust-card-audit. Click → window.location.hash = "#/docs/<slug>"

// === apps/web/src/stage1/StratificationExplainer.tsx ===
export interface StratificationExplainerProps {
  open: () => boolean; onOpenChange: (next: boolean) => void;
  selectedAxes: () => string[]; distinctValueCounts: () => Record<string, number>;
  poolSize: () => number;
}
export const StratificationExplainer: Component<StratificationExplainerProps>
// MUST preserve native <details>/<summary> elements (asserted toHaveAttribute('open'))
// MUST preserve testids: stage1-stratification-explainer, stage1-explainer-live-count

// === apps/web/src/docs/DocsHub.tsx, DocsLayout.tsx ===
interface DocsHubProps {
  docsRoute: () => DocsRoute;
  setDocsRoute: (next: DocsRoute) => void;
}
export default DocsHubComponent: Component<DocsHubProps>
// All 8 lazy-loaded subpages. MUST preserve 7 docs-tile-<slug> testids in hub,
//   docs-page-<slug> testid on each subpage, docs-back-to-hub testid.
// DocsLayout.tsx renders <h1>{title}</h1> — but only one mounted per route.

// === packages/core/src/stage1/types.ts (schema source-of-truth) ===
export interface Stage1AuditDoc {
  schema_version: '0.4';                       // mandatory (literal)
  operation: 'stage1_versand_sampling';         // mandatory
  algorithm_version: string;                    // e.g. 'stage1@1.2.0'
  tie_break_rule: 'numeric_ascending' | 'lexicographic_ascending';
  key_encoding: 'utf8_nfc';
  stratum_sort: 'lexicographic_ascending';
  seed: number;
  seed_source: Stage1SeedSource;                // 'unix-time-default' | 'manual' | 'random'
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
  warnings: { code: string; message: string; severity: 'info' | 'warn' | 'error' }[];
  duration_ms: number;
  timestamp_iso: string;
  derived_columns?: { column: string; method: string; bands?: AgeBand[] }[];   // optional
  forced_zero_strata?: { stratum_key: Record<string, string>; reason: string }[]; // optional
  sample_size_proposal?: SampleSizeProposal;    // optional
  signature?: string;
  signature_algo?: 'ed25519' | 'ecdsa-p256';
  public_key?: string;
}

// === apps/web/src/csv/CsvImport.tsx ===
export interface CsvImportProps {
  onLoaded: (data: { parsed: ParsedCsv; mapping: ColumnMapping }) => void;
}
export const CsvImport: Component<CsvImportProps>
// MUST preserve testids: csv-preview, csv-validation-ok, csv-commit, pool-summary

// === apps/web/src/quotas/QuotaEditor.tsx ===
export interface QuotaEditorProps {
  rows: Record<string, string>[];
  candidateColumns: string[];
  onChange: (cfg: QuotaConfig) => void;
}
export const QuotaEditor: Component<QuotaEditorProps>
// MUST preserve testids: quota-editor, quota-panel-size, quota-add-category

// === apps/web/src/run/RunPanel.tsx ===
export interface RunPanelProps { pool: Pool; quotas: Quotas; }
export const RunPanel: Component<RunPanelProps>
// MUST preserve testids: run-panel, run-seed, run-start, run-result,
//   run-export-csv, run-export-audit
// Stage 3 visual stays as-is in this issue.

// === NEW shell components (for #65) ===
// apps/web/src/shell/Brand.tsx — extracts inline assembly-icon SVG + wordmark
//   from App.tsx:165-189. Renders <span class="font-serif">, NOT <h1>.
// apps/web/src/shell/Sidebar.tsx — visible at md+. Reads mode() and docsRoute(),
//   navigates by writing window.location.hash. NO setMode() calls.
// apps/web/src/shell/MobileDrawer.tsx — uses @kobalte/core/dialog. Hamburger
//   trigger visible at <md ONLY in addition to pill-tabs.
// apps/web/src/Overview.tsx — new #/overview page. Hero + 2 workflow cards
//   + 3 principles. Lazy-loaded via lazy(() => import('./Overview')).
</interfaces>

### Routing model

```
App.tsx:42-100   parseHash / hashFor / DOCS_ROUTES set
App.tsx:107-108  signals: mode, docsRoute
App.tsx:135-145  applyFromHash + onMount + hashchange listener
App.tsx:147-155  navigateMode / navigateDocsRoute (write hash)
```

11 existing hash routes (see codebase.md §2). For #65: extend `AppMode = 'overview' | 'stage1' | 'stage3' | 'docs'`, add `'overview'` parsing branch + arm in `hashFor`, add `<Show when={mode() === 'overview'}><Overview /></Show>`. Default landing **stays** `'stage3'` per CONTEXT.md L21.

### File classification (from codebase.md §12)

**MAJOR rewrites (4 files):**
- `apps/web/src/App.tsx` — sidebar shell + pill-tab compat shim
- `apps/web/index.html` — drop rsms.me, add self-hosted font @font-face refs + preload
- `apps/web/src/index.css` — token block in `@layer base`; rewrite 13 `@layer components` primitives; add new component classes (`.banner`, `.step-rail`, `.tbl`, `.audit`, `.sig-pill`, `.stats-grid`, `.chip`, `.sample-grid`, `.sample-card`, `.doc-grid`, `.doc-toc`, `.doc-body`, `.callout`); preserve ALL `@media print` rules
- `apps/web/tailwind.config.cjs` — extend with OkLCH-backed token aliases via `var(--*)`; add `serif`/`mono` fontFamily; spacing/radius extensions

**MEDIUM rewrites (9 files):**
- `apps/web/src/stage1/Stage1Panel.tsx` (1015 LOC) — wrap each section in `.card`; insert step-rail above; replace inline banners with `.banner.info/.warn`; replace summary cards with `.stats-grid`; replace strata table chrome with `.tbl`; **preserve every testid + signal**
- `apps/web/src/stage1/AuditFooter.tsx` — adopt `.audit` mono-block + `.sig-pill`; **EXTEND** to render the missing 12 mandatory schema-0.4 fields; preserve every existing test-ID
- `apps/web/src/stage1/TrustStrip.tsx` — wrap cards in handoff `.card`; ensure icons read accent token
- `apps/web/src/stage1/AxisPicker.tsx` — replace checkboxes with `.chip` styling (real `<input>` for `axis-checkbox-${h}` testids stays)
- `apps/web/src/stage1/AgeBandsEditor.tsx` — replace `<fieldset>` with `.card`; preserve all band-* testids
- `apps/web/src/stage1/SampleSizeCalculator.tsx` — `.card` + `.field` styling
- `apps/web/src/docs/DocsLayout.tsx` — wrap children in `.doc-grid` with sticky-TOC + `.doc-body`; auto-extract TOC from `<h2>`
- `apps/web/src/docs/DocsHub.tsx` — refresh tile grid; keep all 7 tiles + `docs-tile-${slug}` testids
- `apps/web/src/docs/Beispiele.tsx` — `.sample-grid + .sample-card` for the 4-file picker

**PRESERVE-only (logic/data, do not touch):** `runStage1.ts`, `audit-sign.ts`, `age-bands-helpers.ts`, `csv/parse.ts`, `csv/derive.ts`, `quotas/model.ts`, `run/runEngine.ts`, `run/audit.ts`, `docs/glossar.json`, `docs/hamilton.ts`, `generated/tech-manifest.ts`, `packages/core/src/stage1/types.ts` (schema source-of-truth).

**Stage-3 surface** (`RunPanel.tsx`, `QuotaEditor.tsx`, `CsvImport.tsx`): minimum visual change — accepts they look out-of-place for now; full Stage-3 redesign is a future issue.

**NEW files:** `apps/web/src/shell/{Sidebar,MobileDrawer,Brand,NavGroup}.tsx`, `apps/web/src/Overview.tsx`, `apps/web/public/fonts/*.woff2` + `LICENSE.txt`.

### Stage-1 mount-tree (most fragile surface)

Per codebase.md §3 — Stage1Panel.tsx mounts 8 sub-components and emits ~40 testids. The new 6-step rail (`Eingabe · Bemessung · Achsen · Parameter · Ziehen · Audit & Export`) wraps the existing flow without changing logic. Mount tree must preserve:

- Sticky run-button wrapper `<div>` at `Stage1Panel.tsx:691` with `style="padding-bottom: env(safe-area-inset-bottom)"` — asserted by `mobile-touch-targets.spec.ts:166-167` (regex `/safe-area-inset-bottom/` in outerHTML) AND `stage1.spec.ts:188-189` (computed `position: sticky`).
- `<details open>` semantic in `StratificationExplainer.tsx` and the strata-toggle in `Stage1Panel.tsx:909-970` — asserted by `stage1-bands.spec.ts` `await expect(explainer).toHaveAttribute('open', '')`.
- `<label for="targetN">` ↔ `<input id="targetN" data-testid="stage1-target-n">` binding — asserted by `stage1.spec.ts:120` `getByLabel('Stichprobengröße N')`.
- `.stage1-report` class on the result `<section>` — asserted by `index.css:181` print rule.
- `<a href="#/docs/beispiele" data-testid="stage1-beispiele-link">` (NOT an onClick handler) — asserted by `beispiele-stage1.spec.ts` `toHaveURL(/#\/docs\/beispiele$/)`.

### Audit-doc schema (the load-bearing reskin target)

`packages/core/src/stage1/types.ts:98-200` defines `Stage1AuditDoc` `schema_version: '0.4'`:

**21 mandatory fields:** `schema_version`, `operation`, `algorithm_version`, `tie_break_rule`, `key_encoding`, `stratum_sort`, `seed`, `seed_source`, `input_csv_filename`, `input_csv_size_bytes`, `input_csv_sha256`, `pool_size`, `target_n`, `actual_n`, `selected_indices`, `stratification_axes`, `strata` (array), `warnings` (array), `duration_ms`, `timestamp_iso`, plus 1 more.
**4 optional fields:** `derived_columns`, `forced_zero_strata`, `sample_size_proposal`, plus 1 more.
**3 signature fields:** `signature`, `signature_algo`, `public_key`.

Current `AuditFooter.tsx` only renders 9 of 21 mandatory. CONTEXT.md L13 requires extending to all 21+4+3. Visual layout from handoff `audit.jsx`; field names from schema (NOT handoff labels — they're misnomers per review C2).

### Test-ID contract (codebase.md §8)

108 unique testids in `apps/web/src/**/*.tsx`; ~70 asserted in `apps/web/tests/`. Full enumeration in codebase.md §8.B.

**Test-asserted but does NOT exist in production:** `stage1-seed-confirm` — asserted as `toHaveCount(0)` per #61. Must remain not-rendered.

**Critical heading rule (a11y.spec.ts):** exactly one `<h1>` per route. Today `App.tsx:185` renders `<h1>Bürger:innenrat</h1>` AND `DocsLayout.tsx:52` renders `<h1>{title}</h1>` — only one mounted at a time per route. **The new Sidebar must NOT add another `<h1>`.** Use `<span>` with serif styling for the brand wordmark.

## Standard Stack (verified versions)

- **Solid.js** 1.9.3 (already in `apps/web/package.json:24`)
- **Tailwind v3** 3.4.17 + `@tailwindcss/typography` 0.5.19 + `@tailwindcss/forms` 0.5.11 (class strategy)
- **Vite** 6.0.7 + `vite-plugin-solid` 2.11.0
- **`@kobalte/core`** 0.13.11 — already a dep, ready for Dialog primitive use
- **OkLCH browser support 2026-04:** Chrome ≥111 (Mar 2023), Firefox ≥113 (May 2023), Safari ≥15.4 (Mar 2022), Edge ≥111 (Mar 2023). Global usage 93.29% per caniuse.
- **`color-mix()` baseline:** Safari 16.2+ (Dec 2022). Pre-compute soft variants to keep `safari >= 15.4` baseline.
- **PostCSS oklch fallback:** NOT used per CONTEXT.md (would break the `--hue` CSS variable indirection per `@csstools/postcss-oklab-function` issue #507).
- **Fonts (lock these versions):**
  - Source Serif 4 v4.005R (Adobe, OFL): https://github.com/adobe-fonts/source-serif/releases/tag/4.005R
  - Inter v3.19 (Rasmus Andersson, OFL) — **NOT v4**, which renamed `cv11` to `cv01`
  - JetBrains Mono v2.304 (JetBrains, OFL since v2.002)
- **Bundle measurement:** `rollup-plugin-visualizer` 7.0.1 (recommended for delta tracking)

## Don't Hand-Roll

- **Drawer / dialog:** use `@kobalte/core/dialog` subpath import. Do NOT roll your own focus trap, scroll lock, or ESC handling — Kobalte gives all of it for free at ~12-15 KB raw / ~5-6 KB gzip.
- **Tab/list semantics:** if a custom tab list ends up needed (it shouldn't — pill-tab shim is a `<nav role="tablist">` already), use `@kobalte/core/tabs`.
- **Focus trap, ARIA modal, body scroll lock** — Kobalte Dialog handles all three.
- **Hash routing:** existing pattern in `App.tsx:67-100` is idiomatic; do not introduce `@solidjs/router`.

## Architecture Patterns

- **Token source-of-truth:** CSS variables in `index.css :root { --hue, --bg, --ink, --accent, ... }`. Tailwind reads via `var(--*)` arbitrary values where Tailwind needs to know.
- **Dark theme:** `[data-theme="dark"]` block in `index.css`. NO UI toggle in #65 (deferred to #67).
- **Density:** `[data-density="compact"]` block in `index.css`. NO UI toggle in #65 (deferred to #67).
- **Solid component-file mapping:** prefer 1:1 reuse of existing files; new files only for new screens (`Sidebar.tsx`, `MobileDrawer.tsx`, `Brand.tsx`, `Overview.tsx`).
- **Sidebar nav-items:** every onClick writes `window.location.hash = '#/...'`, never directly `setMode()`. Existing hashchange listener at `App.tsx:141-144` stays single-source-of-truth.
- **Drawer state:** signal lifted to `App.tsx` (or context); writes only in onClick handlers; Solid `createEffect(() => { mode(); setDrawerOpen(false); })` to close on route change.
- **Lazy-load:** new `Overview.tsx` follows existing `lazy(() => import('./Overview'))` pattern from `App.tsx:16` DocsHub.

## Common Pitfalls (from pitfalls.md, condensed)

**Test breakage (CRITICAL):**
- `mobile-touch-targets.spec.ts`: pill-tabs MUST be visible at 375px (≥44×44). Drawer hamburger insufficient. The strata-table parent must `getComputedStyle().overflowX === 'auto'`. Run-button wrapper must outerHTML contain `safe-area-inset-bottom`. `.input { height: 40px }` from handoff is BELOW 44px — override `--row-h: 44px` for inputs/buttons.
- `stage1.spec.ts`: `<label for>` ↔ `<input id>` binding for `Stichprobengröße N`. Wrapper of `stage1-run` must computed `position: sticky`. Pill-tab `title` attributes (`/Melderegister/`, `/Antwortenden/`) must remain.
- `a11y.spec.ts`: exactly one `<h1>`. Sidebar Brand uses `<div>` + `<span class="font-serif">`, not `<h1>`. Icon-only hamburger button needs `aria-label="Navigation öffnen"`. File input must remain on home view.
- `beispiele-stage1.spec.ts` and `trust-strip.spec.ts`: hash anchor navigation must update URL — preserve `<a href="#/...">` not `onClick` handlers.
- `docs.spec.ts`: 7 tiles, hash routing on click.

**Bundle:**
- woff2 binaries DON'T compress further — `600 KB raw → 250 KB gzipped` claim in CONTEXT.md is WRONG. Recommendation: 3 weights per family + Inter Variable; subset to Latin Extended only; treat fonts as separate budget line, NOT against the +50/+18 KB JS+CSS budget.
- `@kobalte/core/dialog` subpath import only (never wildcard).
- `Overview.tsx` lazy chunk counted separately by Vite — measure both `index-*.js` AND `assets/Overview-*.js`.

**Fonts:**
- `<link rel="preload" as="font" type="font/woff2" crossorigin>` MUST have `crossorigin` attribute or browser fetches twice.
- `font-display: swap` + preload Inter Regular + Source Serif Semibold only.
- SIL OFL §5/§7: ship `OFL.txt` per family in `public/fonts/<family>/`. Keep upstream filenames (Reserved Font Names).
- Lock Inter v3.19 — v4 (Aug 2024) renamed `cv11` → `cv01`. `index.css:13` `font-feature-settings: 'cv11', 'ss01', 'ss03'` would silently no-op on v4.
- Source Serif 4 v4.005 capital `ẞ` (U+1E9E): validate with `ttx -t cmap` before declaring done. Fallback: Vollkorn (also OFL, German designer).
- JetBrains Mono: monospace doesn't need `tnum`. DO disable `calt` for SHA hashes (otherwise `==`, `>=`, `!=` render as ligatures — wrong for cryptographic identifiers).

**OkLCH:**
- Civic-green `oklch(50% 0.14 145)` vs `--bg oklch(98.4% 0.006 80)` → ~7.0:1 (passes AA). White on accent → ~6.0:1 (passes AA).
- Dark-theme `oklch(72% 0.13 145)` is too bright at hue 145 — recommend `oklch(68% 0.12 145)` for dark.
- Hue 145 (green) perceptually brighter than handoff's hue 248 (blue) at same L*. Drop `--accent` L from 50 to 48 to match visual weight.
- Firefox ESR 102 doesn't support oklch — page renders white-on-white. Add `@supports not (color: oklch(0 0 0))` browser-update banner.

**Sidebar / drawer:**
- Drawer must close on route change via `createEffect(() => { mode(); setDrawerOpen(false); })`.
- Use Kobalte Dialog (focus trap, scroll lock, ESC, ARIA all free).
- `prefers-reduced-motion` → Tailwind `motion-reduce:transition-none motion-reduce:animate-none`.
- 256px sidebar at 768px viewport leaves 512px content → cramped. Reduce to 220px between md and lg; 256px at lg+. `.stats-grid`: 4 cols ≥lg, 2 cols md→lg, 1 col <md. `.step-rail`: 6 cols ≥lg, 3×2 grid md→lg, vertical <md.
- Two writers to drawer-open signal cause loops. App.tsx is sole orchestrator.

**Audit panel rebind (review C2):**
- DON'T copy handoff `audit.jsx` field labels. Field-name mapping table:
  | Handoff | Schema 0.4 |
  |---|---|
  | `algorithm` | `algorithm_version` |
  | `input_sha` | `input_csv_sha256` |
  | `created_at` | `timestamp_iso` |
  | `N` | `target_n` (separate `actual_n`) |
  | `axes` | `stratification_axes` |
  | `input_rows` | `pool_size` |
  | `signature` | `signature` + `signature_algo` + `public_key` |
  | `tool_version` | NOT in schema |
- `tool_version` displayed via `import.meta.env.VITE_APP_VERSION` (Vite define from `package.json`); do NOT add to schema.
- `selected_indices` (variable-length, up to 300 IDs) renders as collapsed `<details>`, not inline.

**Print CSS:**
- `index.css:165` selector `body > div > nav` targets pill-bar by structure. Rewrite as `body nav[data-testid='main-nav']` for sidebar-grid robustness OR add `@media print { .sidebar { display: none } }` explicitly.
- Every new shell component (Sidebar, MobileDrawer, Brand, Overview hero) needs `@media print { display: none }`.

**Migration sequencing:**
- Phase ordering matters for visual coherence between commits. Introduce new classes alongside old; sweep consumers; delete old (3 commits per phase).
- `tailwind.config.cjs` change forces full Vite restart — verify CI cache key.

**Solid signal-loop:**
- Drawer-open: App.tsx owns; children call setter only in onClick.
- `tweaks-panel.jsx` postMessage protocol — DO NOT IMPORT.
- Settings popover: use Kobalte Popover, not `document.addEventListener('click', ...)`.

**CSP:**
- Production CSP in `docs/deploy.md:60-75` as `_headers` (Cloudflare Pages) — NOT meta tag. Don't add stricter CSP meta to `index.html`.
- No `font-src` directive → defaults to `'self'`. Self-hosted fonts at `/fonts/*.woff2` covered.
- DO NOT re-add Google Fonts CDN preconnect.

## Environment Availability

- Node 22 + pnpm + vitest + playwright in container.
- All deps already installed in `node_modules/`.
- `git`, `du`, `gzip` for bundle measurement.
- Worktree at `/root/workspace/.worktrees/65-visual-redesign-design-handoff/`, branch `issue/65-visual-redesign-design-handoff`, with the corrected design handoff folder committed via #66 rebase.
- `@kobalte/core` 0.13.11 ready for Dialog/Popover subpath imports.

## Project Constraints (from CLAUDE.md)

- L37-44: **Two-stage workflow** — tool covers Stage 1 + Stage 3 only; Stage 2 + 4 outside tool. Sidebar shows "Stage 2 (Outreach — außerhalb Tool)" + "Stage 4 (Reserve — geplant)" as disabled items.
- L36-37: Leximin requires Gurobi upstream — Stage 3 visual stays as-is (#66 already corrected the design handoff text).
- L74: "Daten bleiben lokal" — sidebar footer trust signal.
- "Sprache der Dokumente: Deutsch" — DE primary; EN deferred to #67.
- "Keine positive Affirmation" — wording stays factual.
- S-1 to S-7 strategic decisions: still open. None are unblocked by this UI redesign.

## Sources

- **HIGH** — codebase.md (this issue's research, exhaustive), pitfalls.md, ecosystem.md sections 6-9
- **HIGH** — `apps/web/src/App.tsx`, `index.html`, `index.css`, `tailwind.config.cjs`, `Stage1Panel.tsx`, `AuditFooter.tsx`, all 12 spec files in `apps/web/tests/e2e/`
- **HIGH** — `packages/core/src/stage1/types.ts:98-200` (Stage1AuditDoc schema 0.4)
- **HIGH** — `BUNDLE_DELTA.md` baseline (post-#64)
- **HIGH** — `docs/deploy.md:60-75` (production CSP)
- **HIGH** — `.issues/design-handoff-buergerinnenrat-redesign-review/reviews/` (Claude C1/C2/C3 + 21 other findings; Codex C1/C2 + 7 other)
- **HIGH** — Kobalte 0.13.11 dialog primitive (https://kobalte.dev/docs/core/components/dialog)
- **HIGH** — caniuse oklch (https://caniuse.com/mdn-css_types_color_oklch) — global usage 93.29%
- **HIGH** — Source Serif 4 v4.005R (Adobe), Inter v3.19 (rsms), JetBrains Mono v2.304 — all OFL 1.1
- **HIGH** — SIL OFL FAQ (https://scripts.sil.org/cms/scripts/page.php?site_id=nrsi&id=ofl-faq_web)
- **HIGH** — LG München I 2022 Google Fonts ruling (DSGVO basis for self-hosted fonts)
- **MEDIUM** — Evil Martians OKLCH-Tailwind pattern (single authoritative blog source)
- **MEDIUM** — OkLCH contrast hand-calculations (recommend executor verify with https://oklch.com)
- **MEDIUM** — Bundle delta projections for `@kobalte/core/dialog` (~12-15 KB raw / ~5-6 KB gzip — measure with rollup-plugin-visualizer)
- **MEDIUM** — Source Serif 4 ẞ glyph presence (Adobe Latin 4 spec includes; per-release verification by `ttx -t cmap` recommended)

## Open Questions for Planner

1. **Bundle budget interpretation:** does `+50 KB raw / +18 KB gzip` cover binary woff2 files (which are payload-on-demand) OR only JS+CSS code? Recommend: woff2 OUTSIDE that budget, tracked separately under "fonts" line in `BUNDLE_DELTA.md`.
2. **Source Serif weights:** Adobe doesn't ship a 500. Reinterpret as 400 (Regular for body) + 600 (Semibold for emphasized headings).
3. **`color-mix()` baseline:** pre-compute soft variants in tokens (covered by safari ≥ 15.4) instead of using `color-mix()` (would need safari ≥ 16.2). Recommended.
4. **Drawer scope iteration 1:** Drawer at all in iteration 1, OR just preserve pill-bar on mobile and ship sidebar at ≥md only? **Smaller scope → less risk.** Recommend: pill-bar visible <md (primary nav), sidebar visible ≥md, drawer only if remaining executor-budget allows.
5. **Capital ẞ validation:** Executor runs `ttx -t cmap SourceSerif4-Semibold.otf.woff2 | grep '0x1e9e'` before declaring done. If absent, fall back to Vollkorn.
