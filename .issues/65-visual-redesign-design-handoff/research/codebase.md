# Codebase Research — 65-visual-redesign-design-handoff

**Worktree:** `/root/workspace/.worktrees/65-visual-redesign-design-handoff/`
**Branch:** `issue/65-visual-redesign-design-handoff` (current HEAD `2a54172`)
**Stack:** Solid.js 1.9.3 + Tailwind 3.4.17 + Vite 6 + TypeScript 5.6.3
**Test stack:** Vitest 2.1.8 (jsdom) + Playwright 1.49.1 (chromium + firefox)

---

## 1. App / Solid surface inventory

### Files

| Path | LOC | Role | Risk for #65 |
|------|----:|------|-------------|
| `apps/web/src/main.tsx` | 7 | Solid render entrypoint | low — touch only if html-mount changes |
| `apps/web/src/App.tsx` | 314 | Shell, hash-routing, top pill-tab nav, mode signals, branches into Stage1/Docs/Stage3 | **MAJOR rewrite** — header chrome out, sidebar in, pill-tab kept as `<md` shim |
| `apps/web/index.html` | 18 | `<html lang="de">`, `<meta viewport=device-width>`, Inter via rsms.me CDN, `<link rel=icon>` SVG dataURI | **MAJOR** — replace rsms.me preconnect with self-hosted woff2; add `<link rel=preload>` for fonts |
| `apps/web/src/index.css` | 237 | `@layer base` body defaults, `@layer components` primitives (`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.card`, `.card-hover`, `.pill-tab*`, `.status-pill*`, `.input-base`, `.input-label`, `.dropzone`, `.dropzone-icon/-label/-hint`, `.prose-app`), `@media print` block | **MAJOR rewrite** — replace component primitives with handoff-derived versions, preserve print rules |
| `apps/web/tailwind.config.cjs` | 47 | `theme.extend.colors.brand{DEFAULT,fg,muted,accent,accent-strong}` + `accent-warm`/`accent-cool`, `fontFamily.sans` (Inter stack), `boxShadow.card/-hover`, plugins typography + forms (class strategy) | **MAJOR rewrite** — extend with OkLCH tokens via `var(--*)`, add new spacing/radius tokens, font families serif/mono |
| `apps/web/postcss.config.cjs` | 6 | `tailwindcss` + `autoprefixer` only | low — no PostCSS oklch fallback per CONTEXT |
| `apps/web/vite.config.ts` | 65 | `base: '/buergerinnenrat/'`, `define: __GIT_SHA__/__BUILD_DATE__`, solid plugin, vitest config | low — only touch if font assets need plugin |
| `apps/web/src/vite-env.d.ts` | 7 | Declares `__GIT_SHA__` + `__BUILD_DATE__` globals | low |
| `apps/web/playwright.config.ts` | 27 | preview server on `:4173`, `VITE_BASE_PATH=/`, chromium + firefox | none |

### Public exports relevant to #65

```
apps/web/src/App.tsx
  export const App: Component
  export type DocsRoute = 'hub' | 'algorithmus' | 'technik' | 'verifikation'
                        | 'glossar' | 'bmg46' | 'limitationen' | 'beispiele'
```

`DocsRoute` is imported by `apps/web/src/docs/DocsHub.tsx:3`. Adding `#/overview` does NOT widen `DocsRoute` — overview is a top-level mode, not a docs subroute.

---

## 2. Hash routing — full enumeration

`App.tsx:42-100` defines:

```ts
type AppMode = 'stage1' | 'stage3' | 'docs';

const DOCS_ROUTES: ReadonlySet<DocsRoute> = new Set([
  'hub', 'algorithmus', 'technik', 'verifikation', 'glossar',
  'bmg46', 'limitationen', 'beispiele',
]);

function parseHash(hash): { mode: AppMode; docsRoute: DocsRoute }
function hashFor(mode, docsRoute): string
```

Routes today:

| Hash | Resolves to |
|------|-------------|
| `''`, `'#'`, `'#/'` | mode=stage3, docsRoute=hub (default landing — **CONTEXT.md keeps this**) |
| `#/stage1` | mode=stage1 |
| `#/stage3` | mode=stage3 |
| `#/docs` | mode=docs, docsRoute=hub |
| `#/docs/algorithmus` | mode=docs, docsRoute=algorithmus |
| `#/docs/technik` | mode=docs, docsRoute=technik |
| `#/docs/verifikation` | mode=docs, docsRoute=verifikation |
| `#/docs/glossar` | mode=docs, docsRoute=glossar |
| `#/docs/glossar/<slug>` | mode=docs, docsRoute=glossar; `Glossar.tsx:26-36` deep-links to `<dt id={slug}>` via `scrollIntoView` |
| `#/docs/bmg46` | mode=docs, docsRoute=bmg46 |
| `#/docs/limitationen` | mode=docs, docsRoute=limitationen |
| `#/docs/beispiele` | mode=docs, docsRoute=beispiele |
| anything else | falls back to `mode=stage3, docsRoute=hub` (`App.tsx:78-93`) |

**For #65:** add `#/overview` as a **fourth** `AppMode` value (extend `AppMode = 'overview' | 'stage1' | 'stage3' | 'docs'`). Update `parseHash`, `hashFor`, the catch-all fallback line `App.tsx:93`. CONTEXT.md decision: default landing **stays** `#/stage3`, NOT `#/overview`.

Single-source-of-truth pattern (`App.tsx:130-145`): tab clicks write `window.location.hash`; `hashchange` listener flips signals via `applyFromHash()`. Sidebar nav-items in #65 must follow the same pattern (write hash, do not setSignal directly).

---

## 3. Stage 1 sub-component map — the big preservation surface

### Mount tree inside `Stage1Panel.tsx`

| Line | Element | Component / Inline | data-testid |
|-----:|---------|-------------------|-------------|
| 338 | `<div class="space-y-6">` (outer) | inline | `stage1-panel` |
| 342-346 | `<header>` step-header | inline | `stage1-step-header` |
| 350 | `<TrustStrip />` | TrustStrip.tsx | `stage1-trust-strip` |
| 357-393 | `<section>` Step 1 CSV upload | inline `<label class="dropzone">` wrapping sr-only file input | `stage1-csv-dropzone`, `stage1-csv-upload` |
| 399-405 | Beispiel-Datei link | `<a href="#/docs/beispiele">` | `stage1-beispiele-link` |
| 410-414 | Pool summary | inline | `stage1-pool-summary` |
| 418 | CsvPreview | CsvPreview.tsx | `csv-preview-wrap`, `csv-preview-table` |
| 424-426 | Error inline | inline | `stage1-error` |
| 432-456 | BMG hint banner | inline `<aside>` | `stage1-bmg-hint` |
| 466-469 | SampleSizeCalculator | SampleSizeCalculator.tsx | (cf. 4) |
| 474-496 | Stratification + AxisPicker + AgeBandsEditor section | StratificationExplainer.tsx, AxisPicker.tsx, AgeBandsEditor.tsx | (cf. 5) |
| 500-722 | Stichprobengröße/Seed section | inline + AxisBreakdown previews + sticky run button | (cf. below) |
| 514 | Target N input | inline `<input>` | `stage1-target-n` |
| 528 | Seed input | inline `<input>` | `stage1-seed` |
| 539-543 | "Neuer Default-Seed" button | inline | (no testid) |
| 544 | Seed source label | inline | `stage1-seed-source` |
| 550-556 | Seed hint banner | inline `<aside>` | `stage1-seed-hint` |
| 558-561 | Preview error | inline | `stage1-preview-error` |
| 563-683 | Preview block | inline div | `stage1-preview` |
| 586-625 | Zero-allocation list | inline | `stage1-preview-zero-list` |
| 633-672 | Underfill list | inline | `stage1-preview-underfill-list` |
| 676-680 | AxisBreakdown previews | AxisBreakdown.tsx (loop) | `stage1-axis-breakdown-<axis>` |
| 691-721 | Sticky run-button wrapper | inline `<div>` (sticky+safe-area-inset-bottom) | wrapper has no testid; button = `stage1-run`, bands-block warning = `stage1-run-bands-block` |
| 727-1010 | Result section `.stage1-report` | inline | `stage1-result` |
| 734-788 | Summary cards row | inline | `stage1-summary-cards`, `stage1-coverage-card`, `stage1-underfill-card` |
| 798-820 | Underfill warning section | inline | `stage1-underfill-list` |
| 841-844 | AxisBreakdown post-run | AxisBreakdown.tsx (loop) | `stage1-axis-breakdowns` (wrapping section), `stage1-axis-breakdown-<axis>` |
| 866-901 | Info-only-bands report | inline | `stage1-info-only-bands-report` |
| 909-970 | Strata details `<details>` | inline | `stage1-strata-toggle`, `stage1-strata-table` |
| 974 | AuditFooter | AuditFooter.tsx | (cf. 6) |
| 977-1009 | Export buttons row | inline | `stage1-download-csv`, `stage1-download-audit`, `stage1-download-md`, `stage1-print` |

### Sub-components (full interface inventory)

<interfaces>
// From apps/web/src/stage1/Stage1Panel.tsx
export const Stage1Panel: Component<void>
// Internal signals: parsed, file, defaultAxes, selectedAxes, targetN, seed,
// seedSource, running, output, error, strataExpanded, bands, explainerOpen,
// sampleSizeProposal, sampleSizeManuallyOverridden.
// Internal createMemos: distinctValueCounts, preview, previewMarginals,
// resultMarginals, coverage, underfills.
// Local refYear = new Date().getFullYear().
// Heading text used in DOM (for redesign label preservation):
//   "Schritt 1 von 3 — Versand-Liste ziehen"            (header, l. 343-345)
//   "1. Melderegister-CSV hochladen"                    (l. 357)
//   "2. Bemessung der Stichprobe"                       (l. 465)
//   "3. Stratifikation konfigurieren"                   (l. 476)
//   "4. Stichprobengröße und Seed"                      (l. 501)
//   "5. Ergebnis"                                       (l. 728)
//   "Stichprobengröße N"  (label for #stage1-target-n)
//   "Seed (deterministisch)" (label for #stage1-seed)
//   "Versand-Liste ziehen" / "Ziehe…" (run button text)
// EXTERNAL imports used:
//   from '../csv/parse': parseCsvFile, autoGuessMapping
//   from '../csv/derive': DEFAULT_AGE_BANDS, recomputeAltersgruppe, validateBands, AgeBand
//   from '../run/audit': downloadBlob
//   from './runStage1': runStage1, RunStage1Output
//   from './AxisPicker': AxisPicker
//   from './AgeBandsEditor': AgeBandsEditor
//   from './AxisBreakdown': AxisBreakdown
//   from './AuditFooter': AuditFooter
//   from './StratificationExplainer': StratificationExplainer
//   from './SampleSizeCalculator': SampleSizeCalculator
//   from './TrustStrip': TrustStrip (default export)
//   from '../csv/CsvPreview': CsvPreview
//   from '@sortition/core': coverageMetric, infoOnlyBandsReport,
//     marginalAggregates, previewAllocation, sortUnderfillsByGap,
//     stage1ToMarkdownReport, AllocationPreview, CoverageMetric,
//     MarginalsForAxis, SampleSizeProposal, Stage1SeedSource

// From apps/web/src/stage1/SampleSizeCalculator.tsx
export interface SampleSizeCalculatorProps {
  poolSize: () => number | null;
  onAccept: (recommended: number, proposal: SampleSizeProposal) => void;
}
export const SampleSizeCalculator: Component<SampleSizeCalculatorProps>
// Internal signals: panelSize (default 30), outreach (default 'mail-plus-phone'),
//   customMinPct (default '15'), customMaxPct (default '25').
// Constant: safetyFactor = DEFAULT_SAFETY_FACTOR (from @sortition/core).
// Test-IDs (production code → tests):
//   stage1-sample-size-section          (asserted: stage1-sample-size.spec.ts:41)
//   stage1-panel-size                   (asserted: stage1-sample-size.spec.ts:44)
//   stage1-outreach-mode                (PROD-ONLY)
//   stage1-outreach-mail-plus-phone     (asserted: ...spec.ts:45)
//   stage1-outreach-mail-only           (asserted: ...spec.ts:88)
//   stage1-outreach-custom              (asserted: ...spec.ts:69)
//   stage1-custom-rate-min              (asserted: ...spec.ts:48,72,74)
//   stage1-custom-rate-max              (asserted: ...spec.ts:73,75)
//   stage1-sample-suggestion            (asserted: ...spec.ts:51,79,90)
//   stage1-pool-too-small-warning       (asserted: ...spec.ts:91-93)
//   stage1-accept-suggestion            (asserted: ...spec.ts:59,98,115,136)

// From apps/web/src/stage1/AgeBandsEditor.tsx
export interface AgeBandsEditorProps {
  bands: () => AgeBand[];
  onBandsChange: (next: AgeBand[]) => void;
  refYear: number;
}
export const AgeBandsEditor: Component<AgeBandsEditorProps>
export { addBandTo, removeBandAt, resetToDefaults } from './age-bands-helpers';
// Internal: setBandField<K>(index, key, value) helper, setOpen(index, bool),
//   parseIntCell(raw), validationMsg(), summary().
// Heading (legend): "Altersgruppen-Bänder (berechnet aus geburtsjahr)"
// Test-IDs:
//   stage1-age-bands-editor             (asserted: stage1-bands.spec.ts:60, beispiele-stage1.spec.ts:55, stage1.spec.ts:38)
//   band-min-<i>                        (asserted: stage1-bands.spec.ts:126)
//   band-max-<i>                        (PROD-ONLY)
//   band-open-<i>                       (PROD-ONLY)
//   band-label-<i>                      (PROD-ONLY)
//   band-mode-<i>-selection             (asserted: stage1-bands.spec.ts:62-65,73)
//   band-mode-<i>-display               (asserted: stage1-bands.spec.ts:61, beispiele-stage1.spec.ts:56)
//   band-remove-<i>                     (PROD-ONLY)
//   bands-add                           (PROD-ONLY)
//   bands-reset                         (PROD-ONLY)
//   bands-validation                    (asserted: stage1-bands.spec.ts:74,130)

// From apps/web/src/stage1/age-bands-helpers.ts
export function addBandTo(bands: AgeBand[]): AgeBand[]
export function removeBandAt(bands: AgeBand[], index: number): AgeBand[]
export function resetToDefaults(): AgeBand[]
// Re-imports DEFAULT_AGE_BANDS from '../csv/derive'.

// From apps/web/src/stage1/AxisPicker.tsx
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
// Heading (legend): "Aufteilungs-Merkmale (Stratifikations-Achsen)"
// Inline labels: "vorgeschlagen", "berechnet"
// Test-IDs:
//   stage1-axis-picker                  (PROD-ONLY)
//   axis-checkbox-<header>              (asserted multiple specs:
//     beispiele-stage1.spec.ts:52; stage1-bands.spec.ts:32-34;
//     stage1.spec.ts:42-44)
//   axis-badge-derived-<header>         (asserted: stage1-bands.spec.ts:36)
//   axis-info-<header>                  (PROD-ONLY)
//   axis-warn-distinct-<header>         (PROD-ONLY)

// From apps/web/src/stage1/AxisBreakdown.tsx
interface Props {
  marginals: MarginalsForAxis;
  previewMode?: boolean;
}
export const AxisBreakdown: Component<Props>
// Constants: BAR_W=200, ROW_H=28
// SVG <pattern> id: stripes-<axis>-<preview|result>
// Test-IDs:
//   stage1-axis-breakdown-<axis>        (asserted: stage1.spec.ts:52, 215, 221)

// From apps/web/src/stage1/StratificationExplainer.tsx
export interface StratificationExplainerProps {
  selectedAxes: () => string[];
  rows: () => Record<string, string>[];
  open: () => boolean;
  onToggle: (next: boolean) => void;
}
export const StratificationExplainer: Component<StratificationExplainerProps>
// Test-IDs:
//   stage1-stratification-explainer     (asserted: stage1-bands.spec.ts:41)
//   stage1-explainer-live-count         (asserted: stage1-bands.spec.ts:45)
// Renders <details>; e2e asserts open attribute.

// From apps/web/src/stage1/TrustStrip.tsx
const TrustStrip: Component<void>      // DEFAULT export!
export default TrustStrip;
// Card-data driven; 3 cards always rendered.
// Hard-coded card.iconColor = 'text-brand-accent' (3×); needs token swap.
// Card hashes: '#/docs/algorithmus' (×1) and '#/docs/verifikation' (×2).
// Test-IDs:
//   stage1-trust-strip                  (asserted: trust-strip.spec.ts:6,
//                                                 _visual-iteration.spec.ts:62,94)
//   trust-card-algorithmus              (asserted: trust-strip.spec.ts:7,14;
//                                                 mobile-touch-targets.spec.ts:91)
//   trust-card-verifikation             (asserted: trust-strip.spec.ts:8;
//                                                 mobile-touch-targets.spec.ts:92)
//   trust-card-audit                    (asserted: trust-strip.spec.ts:9;
//                                                 mobile-touch-targets.spec.ts:93)

// From apps/web/src/stage1/AuditFooter.tsx
interface Props { doc: Stage1AuditDoc }
export const AuditFooter: Component<Props>
// Heading: "Protokoll / Audit"
// Field labels (German, all currently visible):
//   "Eingangs-Datei:" → input_csv_filename + size
//   "Eingangs-Datei-Hash (SHA-256):" → input_csv_sha256
//   "Algorithmus-Version:" → algorithm_version (with prng aside)
//   "Tie-Break-Regel:" → tie_break_rule
//   "Stratum-Sortierung:" → stratum_sort
//   "Zeitstempel (UTC):" → timestamp_iso
//   "Signatur-Algorithmus:" → signature_algo
//   "Public Key (gekürzt):" → public_key (abbreviated)
//   "Signatur (gekürzt):" → signature (abbreviated)
//   "Berechnete Spalten:" (cond.) → derived_columns
//   "Bemessung:" (cond.) → sample_size_proposal summary
//   "Strata mit Soll=0 (nur Anzeige):" (cond.) → forced_zero_strata.length
// Test-IDs:
//   stage1-audit-footer                 (asserted: stage1.spec.ts:80-82)
//   audit-footer-hash                   (PROD-ONLY)
//   audit-footer-sig-algo               (asserted: stage1.spec.ts:83)
//   audit-footer-sig                    (PROD-ONLY)
//   audit-footer-derived                (asserted: stage1-bands.spec.ts:100)
//   audit-footer-sample-size            (asserted: stage1-sample-size.spec.ts:105,125,179)
//   audit-footer-forced-zero            (asserted: stage1-bands.spec.ts:82,98)

// From apps/web/src/stage1/runStage1.ts
export interface RunStage1Input {
  file: File;
  parsed: ParsedCsv;
  axes: string[];
  targetN: number;
  seed: number;
  seedSource: Stage1SeedSource;
  bands?: readonly AgeBand[];
  ageBandColumn?: string;
  bandsRefYear?: number;
  sampleSizeProposal?: Stage1SampleSizeProposalAudit;
}
export interface RunStage1Output {
  result: StratifyResult;
  signedAudit: SignedStage1Audit;
  csv: string;
  csvWarnings: string[];
  durationMs: number;
}
export async function runStage1(input: RunStage1Input): Promise<RunStage1Output>
// Pure async, no JSX. Calls bucketize/stratify/buildStage1Audit/stage1ResultToCsv
// from @sortition/core, signStage1Audit from ./audit-sign.

// From apps/web/src/stage1/audit-sign.ts
export interface SignedStage1Audit {
  doc: Stage1AuditDoc;
  bodyJson: string;
}
export async function signStage1Audit(doc: Stage1AuditDoc): Promise<SignedStage1Audit>
// Uses Web Crypto Ed25519 → ECDSA-P256-SHA256 fallback chain.
</interfaces>

### Inter-component dependencies

```
Stage1Panel.tsx
├── TrustStrip (default import)         — visual-only, no shared signals
├── CsvPreview                          — pure presentation, headers+rows
├── SampleSizeCalculator (poolSize, onAccept)
│       ↑ pushes proposal back via callback
├── StratificationExplainer (selectedAxes, rows, open, onToggle)
├── AxisPicker (headers, defaultAxes, selected, onToggle, derivedColumns,
│                axisDescriptions, distinctValueCounts)
├── AgeBandsEditor (bands, onBandsChange, refYear)
├── AxisBreakdown (marginals, previewMode?)  — used in 2 places (preview + result)
├── AuditFooter (doc) — reads from output().signedAudit.doc
├── runStage1 (orchestrator)
└── audit-sign (signStage1Audit) — chained inside runStage1, NOT imported by panel
```

**Solid signal flow:** every sub-component is **controlled by Stage1Panel signals**. The redesign can re-arrange visual chrome around them but must NOT touch the props contracts or the signal directions. SampleSizeCalculator's `onAccept` writes back into Stage1Panel's `targetN` + `sampleSizeProposal` (`Stage1Panel.tsx:229-233`).

---

## 4. Audit-doc schema authoritative source

### `Stage1AuditDoc` (schema_version 0.4)

**File:** `packages/core/src/stage1/types.ts:98-200`

```ts
export interface Stage1AuditDoc {
  schema_version: '0.4';
  operation: 'stage1-versand';
  algorithm_version: 'stage1@1.2.0';
  prng: 'mulberry32';
  tie_break_rule: 'largest-remainder, then largest n_h, then codepoint-smaller key';
  key_encoding: 'json-compact-array-of-pairs';
  stratum_sort: 'codepoint-ascending';
  seed: number;
  seed_source: Stage1SeedSource;          // 'user' | 'unix-time-default'
  input_csv_sha256: string;
  input_csv_filename: string;
  input_csv_size_bytes: number;
  pool_size: number;
  target_n: number;
  actual_n: number;
  stratification_axes: string[];
  selected_indices: number[];
  strata: Array<{ key, n_h_pool, n_h_target, n_h_actual, underfilled, forced_zero? }>;
  warnings: string[];
  derived_columns?: Record<string, { source: string; description: string; bands?: AgeBand[] }>;
  forced_zero_strata?: string[];
  sample_size_proposal?: Stage1SampleSizeProposalAudit;
  timestamp_iso: string;
  duration_ms: number;
  // Filled by signStage1Audit():
  public_key?: string;
  signature?: string;
  signature_algo?: 'Ed25519' | 'ECDSA-P256-SHA256';
}
```

**21 mandatory fields** (everything except the 4 optional + 3 signature):
`schema_version, operation, algorithm_version, prng, tie_break_rule, key_encoding, stratum_sort, seed, seed_source, input_csv_sha256, input_csv_filename, input_csv_size_bytes, pool_size, target_n, actual_n, stratification_axes, selected_indices, strata, warnings, timestamp_iso, duration_ms`.

**4 optional fields:** `derived_columns, forced_zero_strata, sample_size_proposal` (3 — the issue body says 4 incl. `actual_n`, but the type says it's required; treat as 3 optional + 21 mandatory + 3 signature = 27 total surface).

Schema bump history:
- `0.4` (#64): adds optional `sample_size_proposal`
- `0.3`/`1.1.0` (#62): adds optional `derived_columns` + `forced_zero_strata`

### Field-to-AuditFooter render map

`AuditFooter.tsx` currently exposes:

| Footer label | Schema field | testid (if any) |
|--------------|--------------|-----------------|
| "Eingangs-Datei:" | `input_csv_filename`, `input_csv_size_bytes` | (none) |
| "Eingangs-Datei-Hash (SHA-256):" | `input_csv_sha256` (abbreviated) | `audit-footer-hash` |
| "Algorithmus-Version:" | `algorithm_version`, `prng` | (none) |
| "Tie-Break-Regel:" | `tie_break_rule` | (none) |
| "Stratum-Sortierung:" | `stratum_sort` | (none) |
| "Zeitstempel (UTC):" | `timestamp_iso` | (none) |
| "Signatur-Algorithmus:" | `signature_algo` | `audit-footer-sig-algo` |
| "Public Key (gekürzt):" | `public_key` (abbreviated) | (none) |
| "Signatur (gekürzt):" | `signature` (abbreviated) | `audit-footer-sig` |
| "Berechnete Spalten:" (cond.) | `derived_columns` | `audit-footer-derived` |
| "Bemessung:" (cond.) | `sample_size_proposal` | `audit-footer-sample-size` |
| "Strata mit Soll=0 (nur Anzeige):" (cond.) | `forced_zero_strata.length` | `audit-footer-forced-zero` |

**Fields NOT currently rendered in the footer** (would surface only in JSON download):
`schema_version, operation, key_encoding, seed, seed_source, pool_size, target_n, actual_n, stratification_axes, selected_indices, strata, warnings, duration_ms`

**Decision point for #65:** the issue text (L86, L141) lists "alle 21 Pflicht-Felder" as required to render. The current AuditFooter renders **9 of 21 mandatory fields**. CONTEXT.md L13 says "renders all 21 mandatory fields via existing `AuditFooter.tsx` rebound, NOT via `audit.jsx` field labels" — so #65 must EXTEND AuditFooter to render the missing 12 mandatory fields (operation, schema_version, key_encoding, seed, seed_source, pool_size, target_n, actual_n, stratification_axes, selected_indices, strata-summary, warnings, duration_ms — note duration_ms is currently shown elsewhere on `Stage1Panel.tsx:791` "Laufzeit"). PLAN must spell out which fields land in the footer text vs which stay in dedicated DOM (e.g. seed in `stage1-seed`, pool_size in `stage1-pool-summary`).

### handoff `audit.jsx` field set (incompatible — DO NOT use as labels)

**File:** `design_handoff_buergerinnenrat/reference/components/audit.jsx`

Per ISSUE.md L30, handoff uses 11 fields with wrong names: `algorithm` (vs `algorithm_version`), `input_sha` (vs `input_csv_sha256`), `created_at` (vs `timestamp_iso`), `N` (vs `target_n`). **Do not import handoff field set.** Adopt only the visual treatment (mono block, sig-pill with green dot — `styles.css:590-620`).

---

## 5. Docs hub structure

### Subpages

| Slug (DocsRoute) | File | Component (default export) | Hash | Test-ID at root |
|------------------|------|----------------------------|------|-----------------|
| `algorithmus` | `apps/web/src/docs/Algorithmus.tsx` | `Algorithmus: Component` | `#/docs/algorithmus` | `docs-page-algorithmus` |
| `beispiele` | `apps/web/src/docs/Beispiele.tsx` | `Beispiele: Component` | `#/docs/beispiele` | `docs-page-beispiele` |
| `bmg46` | `apps/web/src/docs/Bmg46.tsx` | `Bmg46: Component` | `#/docs/bmg46` | `docs-page-bmg46` |
| `glossar` | `apps/web/src/docs/Glossar.tsx` | `Glossar: Component` | `#/docs/glossar` (+ `/<slug>` deep-link) | `docs-page-glossar` |
| `limitationen` | `apps/web/src/docs/Limitationen.tsx` | `Limitationen: Component` | `#/docs/limitationen` | `docs-page-limitationen` |
| `technik` | `apps/web/src/docs/Technik.tsx` | `Technik: Component` | `#/docs/technik` | `docs-page-technik` |
| `verifikation` | `apps/web/src/docs/Verifikation.tsx` | `Verifikation: Component` | `#/docs/verifikation` | `docs-page-verifikation` |

That is **7 subpages**. ISSUE.md L106/L140 says "alle 8 bestehenden Subpages"; the 8th is the **hub itself** (`docs-hub` testid in `DocsHub.tsx:193`). The docs hub tile grid in `DocsHub.tsx:43-145` lists 7 tiles (one per subpage). `docs.spec.ts:16` asserts `await expect(tiles).toHaveCount(7)`.

### Supporting modules (NOT subpages)

- `apps/web/src/docs/DocsLayout.tsx` (64 LOC) — chrome wrapper; render target for sticky-TOC + 68ch-body in #65.
- `apps/web/src/docs/HamiltonSvg.tsx` (50+ LOC) — toy-example SVG embedded in Algorithmus.tsx.
- `apps/web/src/docs/Term.tsx` (96 LOC) — inline-tooltip wrapper; emits `term-<slug>` + `term-tooltip-<slug>` testids.
- `apps/web/src/docs/glossar.json` — data file for Glossar.
- `apps/web/src/docs/hamilton.ts` — math helpers for HamiltonSvg.

### `DocsHub.tsx` structure

```
DocsHub: Component<{ docsRoute: () => DocsRoute; setDocsRoute: (r) => void }>
  Show when={route !== 'hub'}
    fallback={<section data-testid="docs-hub"> Hub grid </section>}
    DocsLayout(title, back)
      Suspense
        renderSubpage(route)  ← lazy-loaded module
```

Hub grid: `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">` containing 7 `<button class="card card-hover ...">` tiles.

Hub footer: `<footer data-testid="docs-build-footer-hub">` with `__GIT_SHA__` + `__BUILD_DATE__`.

### `DocsLayout.tsx` structure (the redesign target)

```
DocsLayout: Component<{ title: string; back?: () => void; children: JSX.Element }>
  <article class="space-y-6" data-testid="docs-layout">
    <header class="space-y-3 pb-4 border-b border-slate-200">
      Show when={back} → <button data-testid="docs-back-to-hub">Zurück zur Übersicht</button>
      <h1 class="text-3xl font-bold tracking-tight text-brand">{title}</h1>
    </header>
    <div class="prose-app text-sm leading-relaxed">{children}</div>
    <footer class="text-xs text-slate-500 border-t pt-3 mt-8" data-testid="docs-build-footer">
      ...{__GIT_SHA__} ... {__BUILD_DATE__}
    </footer>
  </article>
```

For the new sticky 220px TOC + 68ch body layout (handoff `styles.css:679-730`), the planner needs to wrap the children in:

```
<div class="doc-grid">
  <nav class="doc-toc">…anchors…</nav>
  <div class="doc-body prose-app">{children}</div>
</div>
```

The TOC needs a generation strategy — either auto-extracted from `<h2>` elements within children at runtime via `createMemo` + DOM query, OR each subpage exports a TOC list. **Recommend: runtime DOM query in `DocsLayout`** (lazy-mounted children mean a `createEffect` after Suspense resolves). The 7 subpages already use `<h2 class="text-xl font-semibold">` for sections; tagging them with stable IDs via slugify is straightforward.

### Docs print-CSS coupling

`index.css:211-235` strips chrome and forces details-open for **every** `[data-testid^='docs-page-']` element. The redesigned doc layout MUST keep the `docs-page-<slug>` test-IDs at the same DOM-nesting level on each subpage.

---

## 6. Tailwind + CSS audit

### `apps/web/tailwind.config.cjs` (47 LOC)

| Theme key | Current value | #65 plan |
|-----------|---------------|---------|
| `theme.extend.colors.brand.DEFAULT` | `#0f172a` | Likely **stays** (slate-900 used for headings + ink). May read from `var(--ink)`. |
| `theme.extend.colors.brand.fg` | `#f8fafc` | likely keep |
| `theme.extend.colors.brand.muted` | `#f1f5f9` | replace with `var(--bg-sunken)` |
| `theme.extend.colors.brand.accent` | `#16a34a` | swap to `var(--accent)` (oklch civic-green) |
| `theme.extend.colors.brand.accent-strong` | `#15803d` | swap to `var(--accent-strong)` |
| `theme.extend.colors.accent-warm` | `#d97706` | unused in product code (only theme metadata) — verify |
| `theme.extend.colors.accent-cool` | `#2563eb` | unused in product code |
| `theme.extend.fontFamily.sans` | Inter stack | keep + add `serif` (Source Serif 4) and `mono` (JetBrains Mono) |
| `theme.extend.boxShadow.card` / `card-hover` | slate-rgb shadows | adapt to ink-token |
| `plugins[]` | `@tailwindcss/typography` (v0.5.19), `@tailwindcss/forms` (v0.5.11, class strategy) | **keep both** — `prose-app` depends on typography; `forms({ strategy: 'class' })` protects globals |

### `apps/web/src/index.css` (237 LOC) — every rule

**`@layer base` (lines 8-24):**
- `html { scroll-behavior: smooth; }`
- `body { font-feature-settings: 'cv11','ss01','ss03'; text-rendering: optimizeLegibility; }`
- `button { -webkit-tap-highlight-color: transparent; }`

**`@layer components` (lines 30-154) — 13 utility classes:**

| Selector | Lines | Used in (file:line) | Collision risk |
|----------|------:|--------------------|----------------|
| `.btn-primary` | 32-41 | `Stage1Panel.tsx:694` | **YES** — handoff also defines `.btn-primary` (`styles.css:403-408`) but with different visual: dark ink bg + accent-strong on hover. Replace, do not duplicate. |
| `.btn-secondary` | 43-52 | `Stage1Panel.tsx:979,987,995,1003`; `Beispiele.tsx:91`; `SampleSizeCalculator.tsx:273`; `AgeBandsEditor.tsx:149,162,170` | **YES** — handoff has `.btn` baseline + `.btn-accent` + `.btn-ghost`; no `.btn-secondary`. Decision: keep `.btn-secondary` name + remap visuals, OR rename to `.btn` + global rewrite. CONTEXT.md hints "executor picks consistently". |
| `.btn-ghost` | 54-61 | (no production use found in apps/web/src) | Conflict with handoff `.btn-ghost` (`styles.css:415-416`). Adopt handoff variant. |
| `.card` | 64-66 | `Stage1Panel.tsx:735,748,765`; `TrustStrip.tsx:116`; `DocsHub.tsx:206` | **YES** — handoff `.card` (`styles.css:317-322`) is bigger (radius-lg + 24px pad). Replace; existing call sites stay valid. |
| `.card-hover` | 68-71 | `TrustStrip.tsx:116`; `DocsHub.tsx:206` | new add-on, no handoff equivalent — keep. |
| `.pill-tab` | 74-82 | `App.tsx:213,229,245` | NO collision with handoff. Plan keeps the pill-tabs as a `<md` shim per CONTEXT.md L34-35. |
| `.pill-tab-active` | 84-86 | `App.tsx:215,230,247` | as above |
| `.pill-tab-inactive` | 88-90 | `App.tsx:216,231,248` | as above |
| `.status-pill` | 93-97 | (composed by status-pill-warn/-ok) | no conflict |
| `.status-pill-warn` | 98-100 | `Stage1Panel.tsx:775,961` | no conflict |
| `.status-pill-ok` | 101-103 | `Stage1Panel.tsx:778,961` | no conflict |
| `.input-base` | 106-118 | `Stage1Panel.tsx:513,527`; `SampleSizeCalculator.tsx:104,193,209`; `AgeBandsEditor.tsx:86,99,118` | **YES** — handoff `.input` + `.select` (`styles.css:367-384`). Decision: keep `.input-base` name OR add `.input`/`.select` aliases. PLAN must decide. |
| `.input-label` | 120-122 | `Stage1Panel.tsx:506,521`; `SampleSizeCalculator.tsx:97,118,184,200` | no handoff equivalent — keep |
| `.dropzone` | 125-134 | `Stage1Panel.tsx:358`; `CsvImport.tsx:62` | **YES** — handoff `.dropzone` (`styles.css:421-454`) is dashed border with bigger padding + `.is-drag` state. Replace. |
| `.dropzone-icon` | 136-138 | `Stage1Panel.tsx:367`; `CsvImport.tsx:73` | handoff uses `.dropzone .ico` (nested). Keep current naming OR rewrite call sites. |
| `.dropzone-label` | 140-142 | `Stage1Panel.tsx:374`; `CsvImport.tsx:79` | handoff uses `.dropzone h3`. Keep utility name. |
| `.dropzone-hint` | 144-146 | `Stage1Panel.tsx:375`; `CsvImport.tsx:80` | handoff uses `.dropzone p`. Keep utility name. |
| `.prose-app` | 149-153 | `DocsLayout.tsx:54` | extends `prose prose-slate` from typography plugin. Keep — doc layout overlay supplements it. |

**`@media print` block (lines 163-235)** — preservation list (CONTEXT.md L52-53: "preserve every existing rule"):

| Selector | Lines | Purpose |
|----------|------:|---------|
| `body > div > nav, [data-testid='tab-stage1'], [data-testid='tab-stage3'], [data-testid='tab-docs'], [data-testid='stage1-bmg-hint'], [data-testid='stage1-seed-hint'], [data-testid='stage1-preview'], [data-testid='stage1-run'], [data-testid='stage1-trust-strip'], [data-testid^='docs-tile-'], [data-testid='docs-back-to-hub'], [data-testid^='copy-snippet-']` | 165-178 | hide chrome on print |
| `.stage1-report, .stage1-report *` | 181-186 | strip backgrounds, force black ink (Stage 1 Ergebnis) |
| `.stage1-report details` | 189-191 | force `<details>` open |
| `.stage1-report details > *:not(summary)` | 192-194 | force open content visible |
| `.stage1-report` (font-size 10pt) | 197-199 | tighter print typography |
| `.stage1-report h2, h3` (page-break-after: avoid) | 200-203 | keep headings with content |
| `.stage1-report svg` (page-break-inside: avoid) | 204-206 | keep SVG charts intact |
| `[data-testid^='docs-page-'], [data-testid^='docs-page-'] *` | 211-216 | strip docs background |
| `[data-testid^='docs-page-']` (font-size 10pt) | 217-219 | tighter docs print |
| `[data-testid^='docs-page-'] h1/h2/h3` | 220-224 | page-break-after avoid |
| `[data-testid^='docs-page-'] svg, table` | 225-227 | page-break-inside avoid |
| `[data-testid^='docs-page-'] details` | 230-235 | force open in docs |

**For #65:** new sidebar + drawer must add `display: none !important` rules in print (CONTEXT.md L53). Also need `.stage1-report` class to remain attached to `Stage1Panel.tsx:727` outer section.

### Naming-collision summary (handoff vs existing)

| Token | Handoff name | Existing name | Recommendation |
|-------|--------------|---------------|----------------|
| Primary button | `.btn-primary` (dark ink bg) | `.btn-primary` (brand-accent green bg) | **Keep name, swap visuals** to handoff variant. Existing class users (`Stage1Panel.tsx:694`) get the new look automatically. |
| Drop zone | `.dropzone` | `.dropzone` | **Keep name, swap visuals**. The existing `.dropzone` is already a Tailwind-`@apply` block — swap the `@apply` body to use handoff tokens. |
| Card | `.card` | `.card` | **Keep name, swap visuals**. |
| Buttons | `.btn-accent`, `.btn-ghost` | `.btn-ghost` only | Add `.btn-accent`. Resolve `.btn-ghost` ambiguity. |
| Form input | `.input` + `.select` | `.input-base` | Two paths: (a) keep `.input-base` and align visuals to handoff `.input`, OR (b) add `.input`/`.select` aliases. PLAN.md decides; do NOT silently break call sites. |
| Step rail | `.step-rail`, `.step.is-current/is-done` | none | New class, no conflict. |
| Stats grid | `.stats-grid`, `.stat .k/.v/.delta` | `.card md:col-span-3` (Stage1Panel.tsx:735) | New, no conflict. Replaces inline grid for Stage1 result summary. |
| Stratum table | `.tbl` | inline `min-w-full text-xs` (Stage1Panel.tsx:923) | New, can be wrapped around existing `<table>`. |
| Banner | `.banner.info/.warn/.ok` | inline `border-l-4 border-amber-500 bg-amber-50` etc. | Replace hand-rolled banners (`Stage1Panel.tsx:432-456` BMG, `:548-556` seed, `:716-720` bands-block). |
| Sample-card | `.sample-grid + .sample-card` | none | New, used in Beispiele.tsx redesign. |
| Audit panel | `.audit + .sig-pill` | inline `border rounded p-3 bg-slate-50` (AuditFooter.tsx:48) | Replace AuditFooter visual chrome. |
| Doc grid | `.doc-grid + .doc-toc + .doc-body + .callout + .doc-body code` | inline `prose-app` only | Wrap DocsLayout children. |
| Axis chips | `.chip + .chip.is-on` | inline `<input type=checkbox>` rows in AxisPicker | Replace presentation only; keep `<input>` + `axis-checkbox-<header>` testids. |

---

## 7. Sidebar layout (new — no current equivalent)

Existing: top horizontal pill-bar at `App.tsx:202-255` (`data-testid="main-nav"` + 3 `tab-*` testids). No sidebar exists today.

### Required new shell components (per CONTEXT.md L68 default file paths):

```
apps/web/src/shell/Sidebar.tsx         — 256px sticky sidebar ≥md
apps/web/src/shell/MobileDrawer.tsx    — hamburger + drawer <md
apps/web/src/shell/Brand.tsx           — assembly-icon SVG (existing) + wordmark
apps/web/src/shell/NavGroup.tsx        — `<div class="nav-section">` + items
```

OR a single `apps/web/src/shell/Sidebar.tsx` with all of the above colocated (executor's call).

### Sidebar nav structure (handoff `sidebar.jsx:43-94` adapted)

| Group label | Item | Hash | State for #65 |
|-------------|------|------|---------------|
| Übersicht | Übersicht | `#/overview` | new route, new screen |
| Verfahrensschritte | Stage 1 / Versand-Liste | `#/stage1` | existing |
| Verfahrensschritte | Stage 3 / Panel-Auswahl | `#/stage3` | existing (no Stage-3 visual rework) |
| Verfahrensschritte | Stage 2 (Outreach — außerhalb Tool) | (no nav) | **disabled item**, ISSUE.md L70 |
| Verfahrensschritte | Stage 4 (Reserve — geplant) | (no nav) | **disabled item**, ISSUE.md L70 |
| Ressourcen | Dokumentation | `#/docs` | existing |
| Ressourcen | Beispiel-Daten | `#/docs/beispiele` | existing route |
| Ressourcen | Settings | (gear popover or omitted) | per CONTEXT.md L76 — gear popover only if scope allows; otherwise defer |

### Compatibility shim (CONTEXT.md L34-35)

The existing `<nav data-testid="main-nav">` with `tab-stage1 / tab-docs / tab-stage3` MUST remain in the DOM. Strategy:
- ≥md: `class="hidden md:hidden"` (hidden); sidebar is the visible nav
- `<md`: drawer is primary nav; pill-bar may be hidden OR a visible small-screen secondary trigger row.

This satisfies `mobile-touch-targets.spec.ts:50-60` (`tab-stage1`, `tab-docs`, `tab-stage3` clickable + ≥44×44) AND `_visual-iteration.spec.ts:60` (anchor=`main-nav`) without rewriting tests. `data-testid="primary-nav"` on the new sidebar is an additional optional anchor (ISSUE.md L73).

### Sidebar test-ID surface (suggested new ones, none asserted yet — purely additive)

- `data-testid="primary-nav"` on sidebar root (ISSUE.md L73)
- `data-testid="sidebar-drawer"` on the mobile drawer container
- `data-testid="sidebar-drawer-open"` on hamburger button (with aria-label)
- `data-testid="nav-overview" / "nav-stage1" / "nav-stage3" / "nav-docs" / "nav-beispiele"` per item
- `data-testid="nav-stage2-disabled" / "nav-stage4-disabled"` for the two disabled items (so future tests can assert they are aria-disabled and not focusable)

---

## 8. Complete data-testid enumeration

### A. Production-defined test-IDs (`apps/web/src/**/*.tsx`)

Total: **77 distinct testids** across 17 files.

| testid (verbatim or template) | File | Line(s) |
|-------------------------------|------|---------|
| `main-nav` | App.tsx | 205 |
| `tab-stage1` | App.tsx | 219 |
| `tab-docs` | App.tsx | 235 |
| `tab-stage3` | App.tsx | 251 |
| `pool-summary` | App.tsx | 283 |
| `run-stub` | App.tsx | 304 |
| `csv-dropzone` | csv/CsvImport.tsx | 59 |
| `csv-error` | csv/CsvImport.tsx | 93 |
| `csv-preview` | csv/CsvImport.tsx | 114 |
| `csv-map-${h}` | csv/CsvImport.tsx | 131 |
| `csv-validation-error` | csv/CsvImport.tsx | 158 |
| `csv-validation-ok` | csv/CsvImport.tsx | 163 |
| `csv-commit` | csv/CsvImport.tsx | 177 |
| `csv-preview-wrap` | csv/CsvPreview.tsx | 21 |
| `csv-preview-table` | csv/CsvPreview.tsx | 22 |
| `docs-page-algorithmus` | docs/Algorithmus.tsx | 13 |
| `algorithm-try-stage1` | docs/Algorithmus.tsx | 57 |
| `docs-page-beispiele` | docs/Beispiele.tsx | 55 |
| `beispiele-banner` | docs/Beispiele.tsx | 58 |
| `beispiele-table` | docs/Beispiele.tsx | 72 |
| `download-${f.slug}` | docs/Beispiele.tsx | 94 |
| `docs-page-bmg46` | docs/Bmg46.tsx | 15 |
| `docs-hub` | docs/DocsHub.tsx | 193 |
| `docs-tile-${slug}` | docs/DocsHub.tsx | 208 |
| `docs-build-footer-hub` | docs/DocsHub.tsx | 221 |
| `docs-layout` | docs/DocsLayout.tsx | 25 |
| `docs-back-to-hub` | docs/DocsLayout.tsx | 33 |
| `docs-build-footer` | docs/DocsLayout.tsx | 55 |
| `docs-page-glossar` | docs/Glossar.tsx | 39 |
| `glossar-filter` | docs/Glossar.tsx | 51 |
| `glossar-entry-${slug}` | docs/Glossar.tsx | 61 |
| `hamilton-svg-container` | docs/HamiltonSvg.tsx | 27 |
| `hamilton-svg` | docs/HamiltonSvg.tsx | 35 |
| `docs-page-limitationen` | docs/Limitationen.tsx | 6 |
| `docs-page-technik` | docs/Technik.tsx | 53 |
| `tech-table-libs` | docs/Technik.tsx | 67 |
| `tech-table-tests` | docs/Technik.tsx | 88 |
| `term-${slug}` | docs/Term.tsx | 65 |
| `term-tooltip-${slug}` | docs/Term.tsx | 82 |
| `docs-page-verifikation` | docs/Verifikation.tsx | 61 |
| `copy-snippet-${idx+1}` | docs/Verifikation.tsx | 114 |
| `quota-editor` | quotas/QuotaEditor.tsx | 91 |
| `quota-panel-size` | quotas/QuotaEditor.tsx | 101 |
| `quota-add-category` | quotas/QuotaEditor.tsx | 113 |
| `quota-export` | quotas/QuotaEditor.tsx | 121 |
| `quota-import` | quotas/QuotaEditor.tsx | 133 |
| `quota-cat-${col}` | quotas/QuotaEditor.tsx | 142 |
| `quota-${col}-${val}-min` | quotas/QuotaEditor.tsx | 173 |
| `quota-${col}-${val}-max` | quotas/QuotaEditor.tsx | 185 |
| `quota-panel-errors` | quotas/QuotaEditor.tsx | 205 |
| `quota-status` | quotas/QuotaEditor.tsx | 210 |
| `run-panel` | run/RunPanel.tsx | 71 |
| `run-seed` | run/RunPanel.tsx | 80 |
| `run-start` | run/RunPanel.tsx | 95 |
| `run-cancel` | run/RunPanel.tsx | 105 |
| `run-progress` | run/RunPanel.tsx | 114 |
| `run-logs` | run/RunPanel.tsx | 131 |
| `run-error` | run/RunPanel.tsx | 140 |
| `run-result` | run/RunPanel.tsx | 159 |
| `run-export-csv` | run/RunPanel.tsx | 267 |
| `run-export-audit` | run/RunPanel.tsx | 274 |
| `stage1-age-bands-editor` | stage1/AgeBandsEditor.tsx | 67 |
| `band-min-${i}` | stage1/AgeBandsEditor.tsx | 87 |
| `band-max-${i}` | stage1/AgeBandsEditor.tsx | 100 |
| `band-open-${i}` | stage1/AgeBandsEditor.tsx | 109 |
| `band-label-${i}` | stage1/AgeBandsEditor.tsx | 120 |
| `band-mode-${i}-selection` | stage1/AgeBandsEditor.tsx | 130 |
| `band-mode-${i}-display` | stage1/AgeBandsEditor.tsx | 140 |
| `band-remove-${i}` | stage1/AgeBandsEditor.tsx | 150 |
| `bands-add` | stage1/AgeBandsEditor.tsx | 164 |
| `bands-reset` | stage1/AgeBandsEditor.tsx | 172 |
| `bands-validation` | stage1/AgeBandsEditor.tsx | 178 |
| `stage1-audit-footer` | stage1/AuditFooter.tsx | 49 |
| `audit-footer-hash` | stage1/AuditFooter.tsx | 60 |
| `audit-footer-sig-algo` | stage1/AuditFooter.tsx | 79 |
| `audit-footer-sig` | stage1/AuditFooter.tsx | 91 |
| `audit-footer-derived` | stage1/AuditFooter.tsx | 100 |
| `audit-footer-sample-size` | stage1/AuditFooter.tsx | 122 |
| `audit-footer-forced-zero` | stage1/AuditFooter.tsx | 146 |
| `stage1-axis-breakdown-${axis}` | stage1/AxisBreakdown.tsx | 53 |
| `stage1-axis-picker` | stage1/AxisPicker.tsx | 57 |
| `axis-checkbox-${h}` | stage1/AxisPicker.tsx | 68 |
| `axis-badge-derived-${h}` | stage1/AxisPicker.tsx | 79 |
| `axis-info-${h}` | stage1/AxisPicker.tsx | 88 |
| `axis-warn-distinct-${axis}` | stage1/AxisPicker.tsx | 100 |
| `stage1-sample-size-section` | stage1/SampleSizeCalculator.tsx | 88 |
| `stage1-panel-size` | stage1/SampleSizeCalculator.tsx | 106 |
| `stage1-outreach-mode` | stage1/SampleSizeCalculator.tsx | 122 |
| `stage1-outreach-mail-plus-phone` | stage1/SampleSizeCalculator.tsx | 133 |
| `stage1-outreach-mail-only` | stage1/SampleSizeCalculator.tsx | 151 |
| `stage1-outreach-custom` | stage1/SampleSizeCalculator.tsx | 169 |
| `stage1-custom-rate-min` | stage1/SampleSizeCalculator.tsx | 194 |
| `stage1-custom-rate-max` | stage1/SampleSizeCalculator.tsx | 210 |
| `stage1-sample-suggestion` | stage1/SampleSizeCalculator.tsx | 223,233 |
| `stage1-pool-too-small-warning` | stage1/SampleSizeCalculator.tsx | 264 |
| `stage1-accept-suggestion` | stage1/SampleSizeCalculator.tsx | 274 |
| `stage1-panel` | stage1/Stage1Panel.tsx | 338 |
| `stage1-step-header` | stage1/Stage1Panel.tsx | 342 |
| `stage1-csv-dropzone` | stage1/Stage1Panel.tsx | 358 |
| `stage1-csv-upload` | stage1/Stage1Panel.tsx | 387 |
| `stage1-beispiele-link` | stage1/Stage1Panel.tsx | 402 |
| `stage1-pool-summary` | stage1/Stage1Panel.tsx | 410 |
| `stage1-error` | stage1/Stage1Panel.tsx | 424 |
| `stage1-bmg-hint` | stage1/Stage1Panel.tsx | 433 |
| `stage1-target-n` | stage1/Stage1Panel.tsx | 514 |
| `stage1-seed` | stage1/Stage1Panel.tsx | 528 |
| `stage1-seed-source` | stage1/Stage1Panel.tsx | 544 |
| `stage1-seed-hint` | stage1/Stage1Panel.tsx | 550 |
| `stage1-preview-error` | stage1/Stage1Panel.tsx | 558 |
| `stage1-preview` | stage1/Stage1Panel.tsx | 563 |
| `stage1-preview-zero-list` | stage1/Stage1Panel.tsx | 586 |
| `stage1-preview-underfill-list` | stage1/Stage1Panel.tsx | 633 |
| `stage1-run` | stage1/Stage1Panel.tsx | 695 |
| `stage1-run-bands-block` | stage1/Stage1Panel.tsx | 717 |
| `stage1-result` | stage1/Stage1Panel.tsx | 727 |
| `stage1-summary-cards` | stage1/Stage1Panel.tsx | 734 |
| `stage1-coverage-card` | stage1/Stage1Panel.tsx | 748 |
| `stage1-underfill-card` | stage1/Stage1Panel.tsx | 768 |
| `stage1-underfill-list` | stage1/Stage1Panel.tsx | 798 |
| `stage1-axis-breakdowns` | stage1/Stage1Panel.tsx | 841 |
| `stage1-info-only-bands-report` | stage1/Stage1Panel.tsx | 868 |
| `stage1-strata-toggle` | stage1/Stage1Panel.tsx | 916 |
| `stage1-strata-table` | stage1/Stage1Panel.tsx | 923 |
| `stage1-download-csv` | stage1/Stage1Panel.tsx | 981 |
| `stage1-download-audit` | stage1/Stage1Panel.tsx | 989 |
| `stage1-download-md` | stage1/Stage1Panel.tsx | 997 |
| `stage1-print` | stage1/Stage1Panel.tsx | 1005 |
| `stage1-stratification-explainer` | stage1/StratificationExplainer.tsx | 55 |
| `stage1-explainer-live-count` | stage1/StratificationExplainer.tsx | 77 |
| `stage1-trust-strip` | stage1/TrustStrip.tsx | 112 |
| `trust-card-algorithmus` / `-verifikation` / `-audit` | stage1/TrustStrip.tsx | 118 (via `card.testid`) |

### B. Test-asserted test-IDs (the CONTRACT — cannot rename)

Counted by spec file, with file:line of each assertion:

| testid | Asserted in (spec:line) |
|--------|------------------------|
| `tab-stage1` | beispiele-stage1.spec.ts:13,41; csv-import.spec.ts (-); docs.spec.ts:6; mobile-touch-targets.spec.ts:53; stage1-bands.spec.ts:20; stage1-sample-size.spec.ts:26; stage1.spec.ts:20,112,128,151,178,194,229,247,255; site-smoke.spec.ts:16,27 |
| `tab-docs` | docs.spec.ts:6; mobile-touch-targets.spec.ts:54; site-smoke.spec.ts:18,34,44,54 |
| `tab-stage3` | mobile-touch-targets.spec.ts:55; site-smoke.spec.ts:20; stage1.spec.ts:251 |
| `main-nav` | _visual-iteration.spec.ts:60,93 (used as anchor) |
| `pool-summary` | csv-import.spec.ts:25; end-to-end.spec.ts:26 |
| `csv-dropzone` | (PRODUCTION-ONLY — test asserts via `input[type="file"]` directly) |
| `csv-preview` | csv-import.spec.ts:21 |
| `csv-validation-ok` | csv-import.spec.ts:22 |
| `csv-commit` | csv-import.spec.ts:24,33; end-to-end.spec.ts:25 |
| `csv-preview-table` | stage1.spec.ts:236,238 |
| `quota-editor` | csv-import.spec.ts:35 |
| `quota-panel-size` | csv-import.spec.ts:36; end-to-end.spec.ts:29 |
| `quota-add-category` | csv-import.spec.ts:37; end-to-end.spec.ts:30 |
| `run-panel` | csv-import.spec.ts:40; end-to-end.spec.ts:34 |
| `run-seed` | end-to-end.spec.ts:35 |
| `run-start` | end-to-end.spec.ts:36 |
| `run-result` | end-to-end.spec.ts:39,42 |
| `run-export-csv` | end-to-end.spec.ts:46 |
| `run-export-audit` | end-to-end.spec.ts:47,55 |
| `docs-hub` | docs.spec.ts:9,51; site-smoke.spec.ts:19,35 |
| `docs-tile-${slug}` | docs.spec.ts:14,17; mobile-touch-targets.spec.ts:74; site-smoke.spec.ts:36,45,55; stage1-bands.spec.ts (-) |
| `docs-back-to-hub` | docs.spec.ts:49; mobile-touch-targets.spec.ts:83 |
| `docs-page-algorithmus` | docs.spec.ts:19; trust-strip.spec.ts:16 |
| `docs-page-bmg46` | docs.spec.ts:56,57 |
| `docs-page-glossar` | docs.spec.ts:44 |
| `docs-page-technik` | docs.spec.ts:30 |
| `docs-page-verifikation` | docs.spec.ts:37 |
| `docs-page-beispiele` | beispiele-stage1.spec.ts:19; site-smoke.spec.ts:56 |
| `tech-table-libs` | docs.spec.ts:31 |
| `hamilton-svg` | docs.spec.ts:24; site-smoke.spec.ts:47 |
| `copy-snippet-${idx}` | docs.spec.ts:38 (selector-prefix) |
| `download-herzogenburg-melderegister-8000` | beispiele-stage1.spec.ts:23; site-smoke.spec.ts:57 |
| `stage1-panel` | beispiele-stage1.spec.ts:14,42; mobile-touch-targets.spec.ts (-); site-smoke.spec.ts:17; stage1-bands.spec.ts:21; stage1.spec.ts:21; _visual-iteration.spec.ts:59,69,103 (anchor) |
| `stage1-csv-upload` | beispiele-stage1.spec.ts:43; mobile-touch-targets.spec.ts:104,128,154; stage1-bands.spec.ts:22; stage1-sample-size.spec.ts:27; stage1.spec.ts:24,113,129,152,179,195,230; site-smoke.spec.ts:28; _visual-iteration.spec.ts:125,164 |
| `stage1-csv-dropzone` | mobile-touch-targets.spec.ts:118 |
| `stage1-pool-summary` | beispiele-stage1.spec.ts:51; mobile-touch-targets.spec.ts:109,133,159; stage1-bands.spec.ts:27; stage1-sample-size.spec.ts:32; stage1.spec.ts:31,134; _visual-iteration.spec.ts:130,169 |
| `stage1-bmg-hint` | stage1.spec.ts:34 |
| `stage1-target-n` | beispiele-stage1.spec.ts:59; mobile-touch-targets.spec.ts:110,113,134,160; stage1-bands.spec.ts:76,89,132; stage1-sample-size.spec.ts:62,99,116,119,120,164; stage1.spec.ts:47,123,136,143,157,184,200; _visual-iteration.spec.ts:131,170 |
| `stage1-seed` | mobile-touch-targets.spec.ts:114; stage1.spec.ts:166 |
| `stage1-seed-source` | stage1.spec.ts:161,167,172 |
| `stage1-seed-confirm` | stage1.spec.ts:162 (asserts **count == 0**, i.e. removed in #61) |
| `stage1-step-header` | stage1.spec.ts:256 |
| `stage1-preview` | stage1.spec.ts:51 |
| `stage1-axis-breakdown-${axis}` | stage1.spec.ts:52,215,221 |
| `stage1-axis-breakdowns` | stage1.spec.ts:70 |
| `stage1-run` | beispiele-stage1.spec.ts:60,61; mobile-touch-targets.spec.ts:115,135,161; stage1-bands.spec.ts:77,78,90,133,134; stage1-sample-size.spec.ts:102,122,137,165; stage1.spec.ts:56,59,139,163,168,173,201; _visual-iteration.spec.ts:132 |
| `stage1-run-bands-block` | stage1-bands.spec.ts:134 |
| `stage1-result` | beispiele-stage1.spec.ts:63; mobile-touch-targets.spec.ts:136; stage1-bands.spec.ts:79,91; stage1-sample-size.spec.ts:103,123,138,166; stage1.spec.ts:62,140,144,202; _visual-iteration.spec.ts:133 |
| `stage1-summary-cards` | stage1.spec.ts:65 |
| `stage1-coverage-card` | stage1.spec.ts:66 |
| `stage1-underfill-card` | stage1.spec.ts:67 |
| `stage1-strata-toggle` | mobile-touch-targets.spec.ts:137; stage1.spec.ts:73,74 |
| `stage1-strata-table` | mobile-touch-targets.spec.ts:138,142; stage1.spec.ts:75 |
| `stage1-info-only-bands-report` | stage1-bands.spec.ts:81,94 |
| `stage1-audit-footer` | stage1.spec.ts:80,81,82 |
| `audit-footer-sig-algo` | stage1.spec.ts:83 |
| `audit-footer-derived` | stage1-bands.spec.ts:100 |
| `audit-footer-forced-zero` | stage1-bands.spec.ts:82,98 |
| `audit-footer-sample-size` | stage1-sample-size.spec.ts:105,125,179 |
| `stage1-download-csv` | beispiele-stage1.spec.ts:67; stage1.spec.ts:87 |
| `stage1-download-audit` | stage1-bands.spec.ts:106; stage1-sample-size.spec.ts:142,170; stage1.spec.ts:96 |
| `stage1-download-md` | stage1.spec.ts:102 |
| `stage1-stratification-explainer` | stage1-bands.spec.ts:41,44,54 |
| `stage1-explainer-live-count` | stage1-bands.spec.ts:45 |
| `stage1-age-bands-editor` | beispiele-stage1.spec.ts:55; stage1-bands.spec.ts:60; stage1.spec.ts:38 |
| `band-min-${i}` | stage1-bands.spec.ts:126 |
| `band-mode-${i}-selection` | stage1-bands.spec.ts:62-65,73 |
| `band-mode-${i}-display` | stage1-bands.spec.ts:61; beispiele-stage1.spec.ts:56 |
| `bands-validation` | stage1-bands.spec.ts:74,130 |
| `axis-checkbox-${h}` | beispiele-stage1.spec.ts:52; stage1-bands.spec.ts:32-34; stage1.spec.ts:42-44 |
| `axis-badge-derived-${h}` | stage1-bands.spec.ts:36 |
| `stage1-trust-strip` | trust-strip.spec.ts:6; _visual-iteration.spec.ts:62,94 (anchor) |
| `trust-card-algorithmus` | trust-strip.spec.ts:7,14; mobile-touch-targets.spec.ts:91 |
| `trust-card-verifikation` | trust-strip.spec.ts:8; mobile-touch-targets.spec.ts:92 |
| `trust-card-audit` | trust-strip.spec.ts:9; mobile-touch-targets.spec.ts:93 |
| `stage1-sample-size-section` | stage1-sample-size.spec.ts:41 |
| `stage1-panel-size` | stage1-sample-size.spec.ts:44 |
| `stage1-outreach-mail-plus-phone` | stage1-sample-size.spec.ts:45 |
| `stage1-outreach-mail-only` | stage1-sample-size.spec.ts:88 |
| `stage1-outreach-custom` | stage1-sample-size.spec.ts:69 |
| `stage1-custom-rate-min` | stage1-sample-size.spec.ts:48,72,74 |
| `stage1-custom-rate-max` | stage1-sample-size.spec.ts:73,75 |
| `stage1-sample-suggestion` | stage1-sample-size.spec.ts:51,79,90 |
| `stage1-pool-too-small-warning` | stage1-sample-size.spec.ts:91-93 |
| `stage1-accept-suggestion` | stage1-sample-size.spec.ts:59,98,115,136 |

**Contract count:** ~70 unique testids asserted across 12 spec files (matches the issue's claim of "~70 existing data-testid contracts").

### C. PRODUCTION-ONLY testids (defined but never asserted on)

These exist in `apps/web/src/**/*.tsx` but are **not** referenced by any spec. The redesign is technically free to rename them, but doing so would degrade future test-authoring affordance — recommend keeping them.

- `csv-error`, `csv-validation-error`, `csv-map-${h}`, `csv-preview-wrap`
- `algorithm-try-stage1`
- `beispiele-banner`, `beispiele-table`
- `docs-build-footer-hub`, `docs-build-footer`, `docs-layout`
- `glossar-filter`, `glossar-entry-${slug}`
- `hamilton-svg-container`
- `tech-table-tests`
- `term-${slug}`, `term-tooltip-${slug}`
- `quota-export`, `quota-import`, `quota-cat-${col}`, `quota-${col}-${val}-min/-max`, `quota-panel-errors`, `quota-status`
- `run-cancel`, `run-progress`, `run-logs`, `run-error`
- `band-max-${i}`, `band-open-${i}`, `band-label-${i}`, `band-remove-${i}`, `bands-add`, `bands-reset`
- `audit-footer-hash`, `audit-footer-sig`
- `stage1-axis-picker`, `axis-info-${h}`, `axis-warn-distinct-${axis}`
- `stage1-error`, `stage1-seed-hint`, `stage1-preview-error`, `stage1-preview-zero-list`, `stage1-preview-underfill-list`, `stage1-underfill-list` (defined but only auto-mounted under specific data conditions)
- `stage1-print`
- `stage1-outreach-mode`
- `pool-summary`, `run-stub` (Stage 3 mount; `pool-summary` IS asserted in csv-import + end-to-end)

### D. Test-asserted test-IDs that DO NOT EXIST in production today

- `stage1-seed-confirm` — asserted at `stage1.spec.ts:162` as `toHaveCount(0)`. This is the **expected** state per #61. The redesign must keep this not-rendered.

---

## 9. Existing screenshot artifacts (visual smoke reference)

### `.issues/56-ui-visual-redesign/before-screenshots/` (8 files)

PNG-pairs for the pre-redesign baseline (these are the "vorher" set):
- `01-stage3-default-{desktop,mobile}.png` (~40 KB ea)
- `02-stage1-empty-{desktop,mobile}.png` (~57 KB ea)
- `03-docs-hub-{desktop,mobile}.png` (~73 KB ea)
- `04-docs-algo-{desktop,mobile}.png` (~190 KB ea)

### `.issues/56-ui-visual-redesign/after-screenshots/` (10 files)

The post-#56 redesign:
- `01-stage3-default-{desktop,mobile}.png`
- `02-stage1-empty-{desktop,mobile}.png`
- `03-docs-hub-{desktop,mobile}.png`
- `04-docs-algo-{desktop,mobile}.png`
- `05-stage1-with-result-{desktop,mobile}.png` (full Stage-1 result flow)

### `.issues/56-ui-visual-redesign/iteration/` (24 files)

Per-step before/after pairs:
- `01-header-{before,after}-{desktop,mobile}.png`
- `02-tabs-{before,after}-{desktop,mobile}.png`
- `03-trust-strip-{before,after}-{desktop,mobile}.png`
- `04-stage1-form-{before,after}-{desktop,mobile}.png`
- `05-docs-algorithmus-{before,after}-{desktop,mobile}.png`
- `05-docs-hub-{before,after}-{desktop,mobile}.png`

Viewports: desktop = 1280×800, mobile = 375×812 (`_visual-iteration.spec.ts:34-37`).
deviceScaleFactor = 2 (`_visual-iteration.spec.ts:115`).

For #65 (per CONTEXT.md L57): output to `.issues/65-visual-redesign-design-handoff/iteration/<step>-<viewport>.png`. **5 iteration points × 2 viewports = 10 PNGs**: `01-sidebar-or-drawer`, `02-stage1-card`, `03-audit-panel`, `04-doc-layout`, `05-overview` × `{desktop,mobile}`.

The existing `_visual-iteration.spec.ts` machinery is **directly reusable**: copy the pattern (viewports + waitFor anchor + screenshot path) and adjust ITER_DIR.

---

## 10. Bundle baseline

### `BUNDLE_DELTA.md` (workspace root) — current state

Latest entry (post-#64):

| Asset | KB raw | KB gzip |
|-------|------:|------:|
| `dist/assets/index-*.js` | 132.82 | 43.39 |
| `dist/assets/index-*.css` | 44.47 | 7.41 |

HiGHS WASM: 2.60 MB (unchanged).

#65 budget per ISSUE.md L132 + CONTEXT.md L55: **+50 KB raw / +18 KB gzip** post-redesign. ~30 KB raw / ~12 KB gzip is reserved for self-hosted woff2 references in CSS (the binary fonts are payload-on-demand and counted separately by browser, not in the JS/CSS bundle).

### `apps/web/package.json` deps (already in bundle)

Runtime:
- `@kobalte/core` ^0.13.11 (a11y primitives — Tabs/Dialogs; **available** for the drawer Dialog primitive)
- `@sortition/engine-a` workspace
- `@sortition/engine-contract` workspace
- `papaparse` ^5.5.3
- `solid-js` ^1.9.3

Build/dev:
- `@tailwindcss/forms` ^0.5.11 (class strategy — preserves existing inputs)
- `@tailwindcss/typography` ^0.5.19 (used by `.prose-app`)
- `tailwindcss` ^3.4.17
- `autoprefixer` ^10.4.20
- `vite` ^6.0.7
- `vite-plugin-solid` ^2.11.0
- `eslint-plugin-solid` ^0.14.5

**No new runtime dependencies required for #65** per CONTEXT.md L42 (no PostCSS oklch fallback). Drawer animation via simple CSS transition. Sidebar/drawer can use `@kobalte/core/dialog` if a robust modal is wanted, but this is optional — a Solid signal + CSS transform works.

### Out-of-bundle:
- Inter font today via `https://rsms.me/inter/inter.css` (CDN, `index.html:9`). **Removed in #65** per CONTEXT.md L43-47.
- New: 3× woff2 families × ~4 weights × ~50 KB each ≈ 600 KB raw / ~250 KB gzip total **on disk**, ~30 KB CSS @font-face declarations. These ship in `apps/web/public/fonts/` and are counted as static assets, not bundle.

---

## 11. Routing model (full enumeration with file:line evidence)

```
App.tsx:67-94   parseHash(hash: string): ParsedHash
App.tsx:96-100  hashFor(mode: AppMode, docsRoute: DocsRoute): string

App.tsx:107     const [mode, setMode] = createSignal<AppMode>('stage3')
App.tsx:108     const [docsRoute, setDocsRoute] = createSignal<DocsRoute>('hub')

App.tsx:135-139 applyFromHash(): void   // single source of truth

App.tsx:141-145 onMount: read hash + register hashchange listener
                onCleanup: removeEventListener('hashchange', applyFromHash)

App.tsx:147-151 navigateMode(next: AppMode): void   // writes window.location.hash
App.tsx:153-155 navigateDocsRoute(next: DocsRoute): void   // writes window.location.hash
```

**Pattern for #65 sidebar:** every nav item's onClick MUST be `() => { window.location.hash = '#/<path>' }` — never directly `setMode(...)`. The hashchange listener does the rest.

**For new `#/overview` route:**
1. Extend `AppMode` union to `'overview' | 'stage1' | 'stage3' | 'docs'`.
2. Add `'overview'` parsing branch in `parseHash`.
3. Add `'overview'` arm in `hashFor`.
4. Add `<Show when={mode() === 'overview'}><Overview /></Show>` in App.tsx render tree.
5. Default landing **stays** `'stage3'` per CONTEXT.md L21.

---

## 12. Files: rewrite tier classification

**MAJOR rewrites (most lines change):**
- `apps/web/src/App.tsx` — replace top pill-tab nav with sidebar shell wrapping the `<main>` content; pill-tabs survive as compatibility shim.
- `apps/web/index.html` — drop rsms.me preconnect; add self-hosted font @font-face references; viewport already correct.
- `apps/web/src/index.css` — add CSS-variable token block in `@layer base`; rewrite all 13 `@layer components` primitives to handoff equivalents; add new component classes (`.banner`, `.step-rail`, `.tbl`, `.audit`, `.sig-pill`, `.stats-grid`, `.chip`, `.sample-grid`, `.sample-card`, `.doc-grid`, `.doc-toc`, `.doc-body`, `.callout`); preserve all `@media print` rules unchanged + add `display: none` for sidebar.
- `apps/web/tailwind.config.cjs` — extend with OkLCH-backed token aliases via `var(--*)`; add `serif`/`mono` fontFamily entries; add spacing/radius extensions.

**MEDIUM rewrites (visual chrome change, no logic):**
- `apps/web/src/stage1/Stage1Panel.tsx` — wrap each section in `.card` chrome; insert step-rail above; replace inline banner divs (`l. 432-456, 548-556, 716-720`) with `.banner.info/.warn`; replace summary cards (`l. 734-788`) with `.stats-grid`; replace strata table chrome with `.tbl`; preserve **every** existing testid + signal.
- `apps/web/src/stage1/AuditFooter.tsx` — adopt handoff `.audit` mono-block + `.sig-pill`; **EXTEND** to render the missing 12 mandatory schema fields (CONTEXT.md L13); preserve every existing test-ID.
- `apps/web/src/stage1/TrustStrip.tsx` — wrap cards in handoff `.card` (already mostly done); ensure card.iconColor reads from accent token.
- `apps/web/src/stage1/AxisPicker.tsx` — replace `<input type=checkbox>` rows with `.chip` styling (still real `<input>` for testids `axis-checkbox-${h}` to keep working).
- `apps/web/src/stage1/AgeBandsEditor.tsx` — replace `<fieldset>` chrome with `.card`; preserve every band-* testid.
- `apps/web/src/stage1/SampleSizeCalculator.tsx` — adopt `.card` + `.field` styling.
- `apps/web/src/docs/DocsLayout.tsx` — wrap children in `.doc-grid` with sticky-TOC + `.doc-body`; auto-extract TOC from `<h2>` elements.
- `apps/web/src/docs/DocsHub.tsx` — refresh tile grid with handoff `.card` styling (already uses `.card`); keep all 7 tiles + `docs-tile-${slug}` testids.
- `apps/web/src/docs/Beispiele.tsx` — adopt `.sample-grid + .sample-card` for the 4-file picker; keep `download-${slug}` testids.

**PRESERVE-ONLY (only visual chrome change via cascading parent classes):**
- `apps/web/src/stage1/AxisBreakdown.tsx` — only the SVG rendering; visual updates via `.card` parent only.
- `apps/web/src/stage1/StratificationExplainer.tsx` — `<details>` content unchanged; `.banner.info` may wrap the example block.
- `apps/web/src/csv/CsvPreview.tsx` — `.tbl` styling for the table; keep `csv-preview-table` testid.
- `apps/web/src/docs/Algorithmus.tsx`, `Bmg46.tsx`, `Glossar.tsx`, `HamiltonSvg.tsx`, `Limitationen.tsx`, `Technik.tsx`, `Verifikation.tsx`, `Term.tsx` — content unchanged. Visual upgrade via `DocsLayout.tsx`'s `.doc-body` cascade.
- `apps/web/src/run/RunPanel.tsx`, `apps/web/src/quotas/QuotaEditor.tsx`, `apps/web/src/csv/CsvImport.tsx` — Stage-3 surface; CONTEXT.md L82 says "Stage-3 visual rework. Stays as-is on `RunPanel.tsx`". CsvImport.tsx is also Stage-3-coupled (used in App.tsx Stage 3 branch). **Touch with minimum visual change** — accept that they look out-of-place for now; Stage-3 redesign is its own future issue.
- `apps/web/src/stage1/runStage1.ts`, `apps/web/src/stage1/audit-sign.ts`, `apps/web/src/stage1/age-bands-helpers.ts`, `apps/web/src/csv/parse.ts`, `apps/web/src/csv/derive.ts`, `apps/web/src/quotas/model.ts`, `apps/web/src/run/runEngine.ts`, `apps/web/src/run/audit.ts`, `apps/web/src/docs/glossar.json`, `apps/web/src/docs/hamilton.ts`, `apps/web/src/generated/tech-manifest.ts` — pure logic / data, **DO NOT TOUCH**.

**NEW files (creation):**
- `apps/web/src/shell/Sidebar.tsx` (≥md sticky sidebar)
- `apps/web/src/shell/MobileDrawer.tsx` (<md hamburger + drawer)
- `apps/web/src/shell/Brand.tsx` (existing assembly-icon SVG + wordmark — extracted from `App.tsx:165-189`)
- `apps/web/src/shell/NavGroup.tsx` (nav-section component; optional split)
- `apps/web/src/Overview.tsx` (new `#/overview` page)
- `apps/web/public/fonts/source-serif-4-{weight}.woff2` (×4)
- `apps/web/public/fonts/inter-{weight}.woff2` (×4)
- `apps/web/public/fonts/jetbrains-mono-{weight}.woff2` (×4)
- `apps/web/public/fonts/LICENSE.txt` (SIL OFL 1.1 copies for all three families)

---

## 13. Risks & considerations the planner must address

1. **`stage1-report` class on `Stage1Panel.tsx:727`** — print CSS uses this hand-rolled class (not a testid). The redesign must KEEP this class on the result section's outer `<section>`, otherwise print breaks silently.

2. **Pill-tab compatibility shim DOM placement** — if pill-tabs are hidden via `<md:hidden`, `_visual-iteration.spec.ts:60` waiting for `main-nav` anchor still works (waitFor visible state — but the element exists in DOM). Test name is `02-tabs-after-mobile.png` which expects the pill-tab visible at 375 wide. If pill-tabs are HIDDEN at all viewports because the drawer subsumes them, that screenshot becomes meaningless. **Recommend:** at `<md`, pill-tabs render visibly above the main content as a secondary nav (matches CONTEXT.md L34-35 second clause "the pill-bar is a hidden test-contract surface OR the visible mobile drawer trigger row").

3. **Stage-1 sticky run-button + safe-area-inset-bottom** (`Stage1Panel.tsx:691`) — the wrapper class is asserted by `mobile-touch-targets.spec.ts:166-167` (regex `/safe-area-inset-bottom/` in outerHTML). If the sticky class moves into `index.css` `@layer components` instead of inline `class="sticky [bottom:env(...)]"`, the regex must still match the outerHTML — Tailwind `@apply` writes the rule to a stylesheet not the inline attribute. **Either:** keep the inline class string OR move to a Vite class that emits `data-` attribute / `style=`. Safest: keep inline.

4. **Sticky position assertion** (`stage1.spec.ts:188-189`): `await expect(wrapper).toHaveCSS('position', 'sticky')` — wrapper = `[data-testid="stage1-run"]` parent. Whatever wraps the run button must computed-style as sticky. The new `.btn-row` from handoff is NOT sticky; the existing `<div class="sticky ...">` wrapper at `Stage1Panel.tsx:691` must be preserved as-is or replaced with an equivalent.

5. **Handoff `<meta viewport="width=1280">`** (`design_handoff_buergerinnenrat/reference/index.html`) — desktop-only. The existing `apps/web/index.html:5` correctly says `width=device-width, initial-scale=1.0, viewport-fit=cover`. Do NOT regress this.

6. **`@kobalte/core` Tabs/Dialog availability** — package is already a dep. If executor needs an a11y-correct drawer, `@kobalte/core/dialog` exists. Adding it to MobileDrawer is allowed (no new dep) — but a vanilla Solid signal + CSS transform is also fine and lighter.

7. **`_visual-iteration.spec.ts:31-32`** points to `.issues/56-ui-visual-redesign/iteration` and `after-screenshots`. For #65, **do NOT modify that spec file** — it is generic machinery. Either copy it to `.issues/65-...` OR add a new wrapper spec that points at the new ITER_DIR. Tests remain green.

8. **Pool-summary heading text in Stage-3** (`App.tsx:282`) reads "Pool importieren". `site-smoke.spec.ts:22` asserts `await expect(page.getByRole('heading', { name: /Pool importieren/i })).toBeVisible()`. Stage 3 chrome stays; the heading stays.

9. **Algorithmus / Verifikation / Beispiele lazy chunks** (DocsHub.tsx:8-14) — each subpage is a separate chunk. The `.doc-grid` layout (sticky TOC + body) must compose with `<Suspense fallback>` at the right level. TOC extraction needs to wait for the lazy chunk to mount + its `<h2>`s to render. Use `createEffect(on(props.children, ...))` or `mount + queueMicrotask`.

10. **`<h1>` uniqueness** (`a11y.spec.ts:30-31`): "h1 must exist and be unique". Today `App.tsx:185` renders `<h1>Bürger:innenrat</h1>` AND `DocsLayout.tsx:52` renders `<h1>{title}</h1>` — but only one is mounted at a time per route. The new sidebar must NOT add another `<h1>`. Use `<span>` with serif styling for the brand wordmark.

11. **Kobalte forms-class strategy** — `@tailwindcss/forms` is configured with `strategy: 'class'` (`tailwind.config.cjs:45`) so `<input>` tags do NOT pick up plugin styles unless they have `.form-input` etc. The redesign must NOT switch to the `'base'` strategy or it will regress all the Stage-3 inline `<input>`s.

12. **Schema field rendering** — adding new fields to AuditFooter MUST not break existing assertions. e.g. `stage1.spec.ts:80` asserts `stage1-audit-footer` contains "Protokoll / Audit" + "SHA-256". Both are h3 + a label string today; preserve them.

---

## 14. Non-touched modules confirmed safe

| File | Reason |
|------|--------|
| `packages/core/**` | Pure logic / types; #65 must not bump versions or change exports |
| `packages/engine-a/**` | Solver / panel-ops; out of scope per ISSUE.md "Skip" list |
| `packages/engine-contract/**` | Engine ABI; out of scope |
| `apps/web/src/run/runEngine.ts`, `audit.ts` | Stage-3 logic |
| `apps/web/src/quotas/model.ts` | Quota validation logic |
| `apps/web/src/csv/parse.ts`, `derive.ts` | CSV parse + altersgruppe derivation |
| `apps/web/src/stage1/runStage1.ts`, `audit-sign.ts`, `age-bands-helpers.ts` | Stage-1 orchestration + helpers |
| `apps/web/src/docs/glossar.json`, `hamilton.ts` | Data + math |
| `apps/web/src/generated/tech-manifest.ts` | Auto-generated |
| `scripts/synthetic-meldedaten/**` | Out of scope per task brief |
| `tests/fixtures/**` | Test data |

---

## 15. Quick reference — file paths (absolute, for executor)

**Read-mostly references (visual source of truth):**
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/design_handoff_buergerinnenrat/README.md`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/design_handoff_buergerinnenrat/reference/styles.css`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/design_handoff_buergerinnenrat/reference/components/sidebar.jsx`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/design_handoff_buergerinnenrat/reference/components/stage1.jsx`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/design_handoff_buergerinnenrat/reference/components/audit.jsx`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/design_handoff_buergerinnenrat/reference/components/docs.jsx`

**Authoritative schema:**
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/packages/core/src/stage1/types.ts:98-200`

**Files to MAJOR-rewrite:**
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/App.tsx`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/index.html`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/index.css`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/tailwind.config.cjs`

**Files to MEDIUM-rewrite (chrome only):**
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/stage1/Stage1Panel.tsx`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/stage1/AuditFooter.tsx`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/stage1/TrustStrip.tsx`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/stage1/AxisPicker.tsx`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/stage1/AgeBandsEditor.tsx`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/stage1/SampleSizeCalculator.tsx`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/docs/DocsLayout.tsx`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/docs/DocsHub.tsx`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/docs/Beispiele.tsx`

**Files to CREATE:**
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/shell/Sidebar.tsx`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/shell/MobileDrawer.tsx`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/shell/Brand.tsx`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/Overview.tsx`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/public/fonts/*` (+ LICENSE.txt)

**Files to PRESERVE (logic + data, do not touch):**
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/stage1/runStage1.ts`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/stage1/audit-sign.ts`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/stage1/age-bands-helpers.ts`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/csv/parse.ts`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/csv/derive.ts`
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/run/RunPanel.tsx` (Stage-3, deferred)
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/quotas/QuotaEditor.tsx` (Stage-3, deferred)
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/apps/web/src/csv/CsvImport.tsx` (Stage-3, deferred)
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/packages/core/src/stage1/types.ts` (schema is truth)
- All test specs in `apps/web/tests/`

**Iteration screenshot dir for #65:**
- `/root/workspace/.worktrees/65-visual-redesign-design-handoff/.issues/65-visual-redesign-design-handoff/iteration/` (executor creates)

---

End of codebase research.
