# PITFALLS Research — Issue 65 Visual Redesign

Source files read for evidence:
- `.issues/65-visual-redesign-design-handoff/ISSUE.md`
- `.issues/65-visual-redesign-design-handoff/CONTEXT.md`
- `.issues/design-handoff-buergerinnenrat-redesign-review/reviews/review-2026-04-30T08-17-53Z-design-handoff-buergerinnenrat-redesign-review-claude-opus-4-7.md` (Claude review, 24 findings)
- `.issues/design-handoff-buergerinnenrat-redesign-review/reviews/review-2026-04-30T08-22-01Z-design-handoff-buergerinnenrat-redesign-review-gpt-5-4.md` (Codex review, 9 findings)
- `apps/web/tests/e2e/*.spec.ts` (12 spec files)
- `apps/web/src/App.tsx`
- `apps/web/src/index.css`
- `apps/web/index.html`
- `apps/web/tailwind.config.cjs`
- `apps/web/package.json`
- `design_handoff_buergerinnenrat/reference/styles.css`
- `docs/deploy.md`
- `BUNDLE_DELTA.md`

---

## 1. Test-Breakage Scenarios — Per-Spec Enumeration

108 unique `data-testid` values exist across `apps/web/src` (verified via grep). The redesign touches navigation, layout, visual chrome, and CSS. Per-spec analysis below.

### `_visual-iteration.spec.ts`
- **Viewports:** Desktop 1280×800, Mobile 375×812 (test.use loop).
- **Test-IDs depended on:** `stage1-panel`, `main-nav`, `stage1-trust-strip`, `stage1-csv-upload`, `stage1-pool-summary`, `stage1-target-n`, `stage1-run`, `stage1-result`, `docs-hub`, `docs-page-algorithmus`.
- **Risk: MEDIUM.** Hardest assertion is `02-tabs` waiting for `main-nav` — must survive sidebar shift via shim.

### `a11y.spec.ts`
- **Selectors:** `input[type="file"]` (count > 0), `button` (every one needs aria-label OR text), `img` (every one needs alt), `h1` (exactly 1).
- **Sidebar drawer:** Hamburger trigger likely icon-only `<button><svg/></button>` — needs `aria-label="Navigation öffnen"` or per-button loop fails.
- **Multiple H1:** Sidebar Brand currently uses `<h1>` (`App.tsx:185`). If new Sidebar component ALSO emits `<h1>Bürger:innenrat</h1>` AND `Stage1Panel.tsx` renders a `<h1>`, `expect(h1Count).toBe(1)` fires. **Brand must be `<div>` or `<h2>`; only the active page emits `<h1>`.**
- **Removing the file input:** `fileInputs > 0` requires `<input type="file">` on home view. Don't replace dropzone-click with sample-picker only.
- **Risk: HIGH.** Three orthogonal traps in 30 lines.

### `beispiele-stage1.spec.ts`
- **Hash anchors:** asserts `await expect(page).toHaveURL(/#\/docs\/beispiele$/)` — depends on `Stage1Panel.tsx:400` `<a href="#/docs/beispiele" data-testid="stage1-beispiele-link">`. If redesign converts to `onClick` handler, URL never updates.
- **Risk: MEDIUM-HIGH** (long serial chain — early failure cascades).

### `csv-import.spec.ts`
- **getByRole heading:** `getByRole('heading', { name: 'Bürger:innenrat' })`. If Brand wordmark moved to non-heading element (e.g. `<div class="brand-words"><span>Bürger:innenrat</span>` like `styles.css:140-147`), this fails. **Keep `<h1>Bürger:innenrat</h1>` exactly somewhere.**
- **Risk: MEDIUM.**

### `docs.spec.ts`
- **Hash navigation:** `await expect(page).toHaveURL(/#\/docs$/)` after click — sidebar nav MUST write `window.location.hash`, not just set state.
- **Tile count:** `await expect(tiles).toHaveCount(7)` — keep all 7 docs tiles in docs-hub.
- **Risk: MEDIUM.**

### `mobile-touch-targets.spec.ts` — **CRITICAL RISK**
- **Viewport: 375×812.**
- **Test-IDs touched:** `tab-stage1`, `tab-docs`, `tab-stage3`, `docs-tile-{algorithmus,technik,verifikation,glossar,bmg46,limitationen}`, `docs-back-to-hub`, `trust-card-{algorithmus,verifikation,audit}`, `stage1-csv-upload`, `stage1-pool-summary`, `stage1-target-n`, `stage1-seed`, `stage1-run`, `stage1-csv-dropzone`, `stage1-strata-toggle`, `stage1-strata-table`.
- **Special asserts:**
  - `stage1-strata-table` parent must have `getComputedStyle().overflowX === 'auto'` (line 144).
  - `stage1-run` wrapper outerHTML must contain `safe-area-inset-bottom` (line 167).
- **Pill-bar must be visible at 375px** — sidebar collapses to drawer per CONTEXT.md, but the `tab-stage1/docs/stage3` 44×44 assertion requires actual visible pill-bar nav. **Drawer hamburger alone insufficient.**
- **`overflow-x: auto` parent of strata-table:** If executor adopts handoff `.tbl` (`styles.css:546-589`) without wrapping in `<div class="overflow-x-auto">`, the assertion fails.
- **`safe-area-inset-bottom` on run wrapper:** Handoff has no `env(safe-area-inset-bottom)` rule. **Run-button wrapper keeps `style="padding-bottom: env(safe-area-inset-bottom)"`.**
- **44px on inputs:** Handoff `.input { height: var(--row-h) /*40px*/ }` (`styles.css:368`) is BELOW 44px. Must override `--row-h: 44px` for inputs/buttons OR use `.input { min-height: 44px }`.
- **Risk: CRITICAL.**

### `smoke.spec.ts`
- `getByRole('heading', { level: 1 })` text === `'Bürger:innenrat'`. Same H1 risk as a11y.

### `stage1.spec.ts` (8 tests)
- **Test-IDs:** `tab-stage1`, `stage1-panel`, `stage1-csv-upload`, `stage1-pool-summary`, `stage1-bmg-hint`, `stage1-age-bands-editor`, `axis-checkbox-{district,age_band,gender}`, `stage1-target-n`, `stage1-preview`, `stage1-axis-breakdown-district`, `stage1-run`, `stage1-result`, `stage1-summary-cards`, `stage1-coverage-card`, `stage1-underfill-card`, `stage1-axis-breakdowns`, `stage1-strata-toggle`, `stage1-strata-table`, `stage1-audit-footer`, `audit-footer-sig-algo`, `stage1-download-csv`, `stage1-download-audit`, `stage1-download-md`, `stage1-step-header`.
- **Special asserts:**
  - `getByLabel('Stichprobengröße N')` resolves to `stage1-target-n` (line 120). **Keep explicit `<label for="targetN">` ↔ `<input id="targetN" data-testid="stage1-target-n">`.**
  - `expect(wrapper).toHaveCSS('position', 'sticky')` at line 189 — wrapper of `stage1-run` must be `position: sticky`. Keep existing sticky run-button pattern.
  - `tab-stage1` `title` attribute matches `/Melderegister/` and `tab-stage3` matches `/Antwortenden/`. Don't drop `title=` attributes on pill-tab shim.
- **Risk: HIGH.**

### `stage1-bands.spec.ts`
- `await expect(explainer).toHaveAttribute('open', '')` — depends on `<details open>` tag. **Keep StratificationExplainer using native `<details>`/`<summary>`.**
- **Risk: MEDIUM-HIGH.**

### `stage1-sample-size.spec.ts`
- All test-id based; should survive faithful re-skin. **Risk: LOW.**

### `trust-strip.spec.ts`
- Hash-routing: `await expect(page).toHaveURL(/#\/docs\/algorithmus$/)`. Trust-card click must write `window.location.hash`. **Risk: LOW.**

### `end-to-end.spec.ts`
- Stage-3 untouched per CONTEXT.md. **Risk: LOW.**

### Specs MOST at risk (combine ≥3 scenarios)
1. **`mobile-touch-targets.spec.ts`** — sidebar/drawer + viewport + height + sticky + overflow-x.
2. **`stage1.spec.ts`** — label/for + sticky + title + 24 test-IDs.
3. **`a11y.spec.ts`** — H1 uniqueness + icon aria-labels + file-input presence.

---

## 2. Bundle-Budget Enforcement

### Current baseline (from `BUNDLE_DELTA.md`, post-#64)
- `index-*.js` raw 132.82 KB / gzip 43.39 KB
- `index-*.css` raw 44.47 KB / gzip 7.41 KB
- HiGHS WASM 2.60 MB (outside budget — payload-on-demand)

Issue's `+50 KB raw / +18 KB gzip` budget is on JS+CSS combined → upper bound ~227 KB raw / ~69 KB gzip.

### Pitfalls

**2.1 — Tailwind PurgeCSS misses CSS-variable-driven utilities.** Arbitrary values like `bg-[var(--accent-soft)]` referenced only in `index.css` `@apply` blocks may not be matched. Use `@apply` with named utilities, OR `safelist`, OR write CSS variables directly.

**2.2 — Dead CSS branches.** `[data-theme="dark"]` and `[data-density="compact"]` blocks ship raw (not Tailwind, not purged). ~700 + ~300 bytes raw. Acceptable but document.

**2.3 — woff2 size assumption wrong in CONTEXT.md.** woff2 is already compressed; gzip yields ≤2% savings. CONTEXT.md says "600KB raw → 250KB after compression" — **this is wrong**. 600KB IS the deployed weight. Fonts don't count against JS/CSS gzip budget but DO count against download-size and Lighthouse perf.
- **Subset to Latin Extended only** (skip Cyrillic/Greek/Vietnamese).
- **Ship 3 weights per family**, not 4. Source Serif: 400/500/600. Inter: 400/500/600. JetBrains Mono: 400/500.
- **Consider variable fonts** — Inter ships `Inter-V.var.woff2` (~150KB covers all weights, less than 4 static).

**2.4 — `@kobalte/core` tree-shake misses.** Use subpath imports: `import { Dialog } from '@kobalte/core/dialog'`, never `import * from '@kobalte/core'`.

**2.5 — Solid `lazy()` chunks.** New `Overview.tsx` can be lazy-loaded. Sidebar+MobileDrawer load on every page. Bundle script must count BOTH `index-*.js` (main) AND `assets/Overview-*.js` (lazy chunk).

**2.6 — Source Serif 4 + Inter font-feature-settings overlap.** `index.css:13-17` sets `font-feature-settings: 'cv11', 'ss01', 'ss03'` on body. Source Serif 4 doesn't share these stylistic-set names. Scope to `body { font-family: var(--sans); font-feature-settings: ... } .display { font-family: var(--serif); font-feature-settings: 'titl' }`.

### Concrete measurement script
```bash
cd apps/web && rm -rf dist
VITE_BASE_PATH=/ pnpm build
echo '=== Post-redesign bundle ==='
du -sb dist/assets/index-*.js dist/assets/index-*.css 2>/dev/null
gzip -c dist/assets/index-*.js | wc -c
gzip -c dist/assets/index-*.css | wc -c
du -sb dist/assets/fonts/* 2>/dev/null || du -sb public/fonts/* 2>/dev/null
ls -la dist/assets/*.js | grep -v 'index-'
```

---

## 3. Font Self-Hosting Pitfalls

**3.1 — FOUT/FOIT on slow networks.** Add `<link rel="preload" as="font" type="font/woff2" href="/fonts/SourceSerif4-Regular.woff2" crossorigin>` for above-fold display weight. Same for Inter Regular. `font-display: swap`. Don't preload all 12 fonts.

**3.2 — Stale `font-feature-settings`.** `cv11` is Inter's "single-storey a". Source Serif 4 doesn't have it. Audit existing `index.css:13` and scope per family.

**3.3 — SIL OFL §5/§7 license attribution.** Place `OFL.txt` in each `apps/web/public/fonts/<family>/` directory. Vite copies `public/*` to `dist/*` at build. Per OFL §1: font names ("Source Serif 4", "Inter", "JetBrains Mono") are Reserved Font Names — keep upstream filenames.

**3.4 — `crossorigin` attribute on font preload.** Same-origin font preload still needs `crossorigin` attribute to be reused. Without it, browser fetches twice. Most common font self-hosting bug.

**3.5 — Inter v3 vs v4 stylistic-set numbering.** Inter v4 (Aug 2024) renamed `cv11` to `cv01`. Existing `font-feature-settings: 'cv11'` rule silently no-ops on v4. **Lock to Inter v3.19 OR upgrade rule names to v4.** Document version in `index.css` comment.

**3.6 — Atomic swap from rsms.me to self-hosted.** Delete rsms.me link AND add self-hosted fonts in same commit.

---

## 4. OkLCH Contrast Pitfalls

**4.1 — Civic-green on light bg.** `--accent: oklch(50% 0.14 145)` vs `--bg: oklch(98.4% 0.006 80)` → ~7.0:1 (passes WCAG AA). White text on accent (`.btn-accent`) → ~6.0:1 (passes AA normal text).

**4.2 — Dark-theme green at 72% lightness — too bright.** `--accent: oklch(72% 0.13 145)` is bright apple-green. **Recommend dropping to `oklch(68% 0.12 145)` for dark theme.**

**4.3 — `.banner.info` colors.** `--accent-soft: oklch(94% 0.04 145)` (pale mint), `--accent-ink: oklch(28% 0.13 145)` (deep forest) → ~9.5:1 contrast. Safe.

**4.4 — Hue 145 (green) perceptually brighter than hue 248 (blue) at same L*.** Drop `--accent` L from 50 to 48 to match original blue's visual weight. Verify warn (orange `oklch(58% 0.13 60)`) vs accent (green) distinction stays clear.

**4.5 — No PostCSS oklch fallback.** Firefox ESR 102 doesn't support oklch (Firefox 113+ required). All `var(--accent): oklch(...)` resolve to `inherit`/`unset`. Pages render white-on-white. Add `@supports not (color: oklch(0 0 0))` rule + browser-update banner. Verify browserslist excludes Firefox ESR 102.

---

## 5. Sidebar + Drawer Pitfalls

**5.1 — Drawer doesn't close on route change.** Use Solid `createEffect(() => { mode(); setDrawerOpen(false); })`.

**5.2 — Drawer doesn't trap focus.** Use `@kobalte/core/dialog` Dialog primitive — handles focus trap, ESC, restore-focus, `aria-modal` automatically.

**5.3 — `prefers-reduced-motion` ignored.** Wrap transitions in `@media (prefers-reduced-motion: reduce) { .drawer { transition: none; } }`.

**5.4 — 256px sidebar at 768px viewport — content cramped.** Sidebar 256px → 512px content. Inner `.stats-grid { repeat(4, 1fr) }` becomes 4×100px — too cramped. **Define breakpoint behavior:**
- Sidebar appears at `≥md` (768px); reduce to 220px between md and lg.
- `.stats-grid`: 4 cols ≥lg, 2 cols md-to-lg, 1 col <md.
- `.step-rail`: 6 cols ≥lg, 3 cols × 2 rows md-to-lg, vertical <md.

**5.5 — Body scroll lock not restored.** Kobalte Dialog handles. If hand-rolled, use `onCleanup` inside `createEffect`.

**5.6 — Active nav state flash on hash-routed first paint.** Read hash synchronously in signal initializer:
```ts
const [mode, setMode] = createSignal<AppMode>(parseHash(window.location.hash).mode);
```
Move `parseHash` out of `onMount`.

**5.7 — Two writers to drawer-open signal.** App.tsx is the orchestrator; children call setter only in onClick.

**5.8 — Outside-click handler leaks.** Use Kobalte Popover OR explicit `onCleanup` removal.

---

## 6. Audit Panel Rebind Pitfalls (Review C2)

**6.1 — DON'T copy handoff `audit.jsx` field labels verbatim.** Field-by-field mapping:
| Handoff label | schema 0.4 name |
|---|---|
| `algorithm` | `algorithm_version` |
| `prng` | (no equivalent) |
| `seed` | `seed` ✓ |
| `N` | `target_n` (with separate `actual_n`) |
| `axes` | `stratification_axes` |
| `input_sha` | `input_csv_sha256` |
| `input_rows` | `pool_size` |
| `strata` (count) | `strata[]` (array) |
| `created_at` | `timestamp_iso` |
| `signature` | `signature` + `signature_algo` + `public_key` |
| `tool_version` | NOT in schema |

Plus 13 dropped fields + 3 optional dropped. **Re-skin existing `apps/web/src/stage1/AuditFooter.tsx` visually; do NOT reauthor field set.**

**6.2 — Hard-coded `tool_version: buergerinnenrat@0.4.0` literal.** Source from `import.meta.env.VITE_APP_VERSION`. Add to `vite.config.ts`:
```ts
define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version) }
```
Do NOT add `tool_version` to schema 0.4 (CONTEXT.md says schema unchanged).

**6.3 — Fixed-height `.audit` card breaks on long arrays.** `selected_indices` (up to 300 IDs as JSON) needs collapsed `<details>`, not inline mono. Use `.audit` styling for labels + short fields only.

**6.4 — `audit-footer-*` test-IDs lost during rebind.** Preserve at same DOM level. `audit-footer-sig-algo` expects `not.toContainText('noch nicht signiert')`. Verify unsigned state still renders.

---

## 7. Print-CSS Preservation Pitfalls

**7.1 — Body-selector targets pill-bar by structure.** `index.css:165` `body > div > nav, [data-testid='tab-stage1'], ...`. If structure changes to `body > div > div > nav`, first selector breaks. Rewrite as `body nav[data-testid='main-nav']` OR add `@media print { .sidebar { display: none } }` explicitly.

**7.2 — New components added without print rules.** Sidebar, MobileDrawer, Overview hero need `@media print { display: none }`.

**7.3 — Test-ID print rules safe.** Existing `[data-testid^='docs-page-']` selectors survive automatically because test-IDs are contractually preserved.

---

## 8. Migration-Sequencing Pitfalls

**8.1 — Phase 1 → Phase 2 → Phase 3 mid-state visual inconsistency.** Each phase commits a self-coherent visual state. New classes alongside old, sweep consumers, delete old — three commits per phase.

**8.2 — `tailwind.config.cjs` change forces Vite restart, CI cache invalidation.** Verify CI cache key includes `tailwind.config.cjs`. Or `pnpm build` from clean state in CI.

**8.3 — `index.css` `.btn-primary` replaced before `Stage1Panel.tsx` updated.** Introduce new classes (`.btn-accent-v2`) in parallel; sweep consumers; delete old.

---

## 9. Static Deploy / GitHub Pages Pitfalls

**9.1 — Self-hosted fonts case-sensitive paths.** Use lowercase filenames (`/fonts/inter-regular.woff2`). Or build-time check `find apps/web/public/fonts -type f` matches `index.css` references.

**9.2 — `apps/web/public/fonts/` placement.** Vite copies `public/*` to `dist/*`. Verify `vite.config.ts` `base: '/'` if root-deployed. Use `import.meta.env.BASE_URL` for asset URLs.

**9.3 — `<title>` MUST stay** `Bürger:innenrat — Versand-Liste & Panel-Auswahl`. Don't change.

**9.4 — Favicon data URI.** Don't change `apps/web/index.html:11`. Brand mark stays per CONTEXT.md.

**9.5 — `BUNDLE_DELTA.md` at workspace root.** Append new section for #65 (don't replace existing #62/#64 sections).

---

## 10. Solid Signal-Loop Pitfalls

**10.1 — Drawer-open signal with two writers.** App.tsx owns; children call setter only in onClick.

**10.2 — `tweaks-panel.jsx` postMessage protocol — DO NOT IMPORT.** Plan task: "Do NOT import any file from `design_handoff_buergerinnenrat/reference/`." Optional safeguard: `vite.config.ts` `build.rollupOptions.external` rule.

**10.3 — Settings popover outside-click leak.** Use Kobalte Popover.

---

## 11. CSP / `wasm-unsafe-eval` Pitfalls

**11.1 — CSP location.** Production CSP in `docs/deploy.md:60-75` as `_headers` file convention (Cloudflare Pages), NOT meta tag. No `<meta http-equiv="Content-Security-Policy">` in current `index.html`. Don't accidentally add stricter CSP meta.

**11.2 — `style-src 'self' 'unsafe-inline'` already covers Tailwind.** No runtime inline styles — Solid's `class={...}` doesn't emit inline.

**11.3 — Self-hosted fonts and `font-src`.** No `font-src` directive — defaults to `'self'`. Self-hosted fonts at `/fonts/*.woff2` covered. DO NOT add Google Fonts CDN preconnect.

**11.4 — `connect-src 'self'` + font preload.** Font preload falls under `font-src` (defaults to `'self'`). Same-origin OK.

**11.5 — `worker-src 'self'`.** Don't add Web Workers (out of scope).

---

## Cross-Reference to Reviews

| Pitfall | Review finding |
|---------|----------------|
| 1.* | Claude H4 (test-ID enum), Claude C3 (mobile viewport), Codex C1 (mobile shell), Codex M3 (sidebar discards hash) |
| 2.* | Claude H2 (styles.css mass + bundle delta), Claude M1 (font CDN→self-host) |
| 3.* | Claude M1 |
| 4.* | Claude H6 (accent + contrast), Claude M2 (oklch fallback) |
| 5.* | Claude H5 (sidebar regression mobile), Codex C1, Codex M3 |
| 6.* | Claude C2 (audit-schema mismatch), Codex H3 (audit drift), Claude L5 (tool_version) |
| 7.* | Claude H4 (print-CSS test-ID dependency) |
| 8.* | Claude H2, Codex M1 (CSS collisions) |
| 9.* | Claude L2 (title), Claude L3 (favicon) |
| 10.* | Codex H1 (framework mismatch — React idioms don't translate) |
| 11.* | docs/deploy.md, CLAUDE.md L28 |

---

## Open Questions for the Planner

1. **Pill-bar shim visibility on mobile:** mobile-touch-targets requires `tab-stage1/docs/stage3` visible AND ≥44×44 at 375px. "Hidden" with `display: none` would fail `boundingBox()`. **Pill-bar MUST be visible on mobile.** Recommend: pill-bar visible <md (replaces drawer trigger; user gets 3 visible tabs as primary nav), drawer is supplementary or omitted entirely on iteration 1.
2. **H1 ownership:** Sidebar Brand uses `<div>` + `<span class="font-serif">`; page (Stage 1, Docs, Overview) owns single `<h1>`.
3. **Inter v3 vs v4:** Lock Inter v3.19 (last v3) to keep `cv11` compatible.
4. **Sticky run-button preservation:** Plan task to verify `style="padding-bottom: env(safe-area-inset-bottom)"` survives re-skin.
5. **Drawer scope:** Drawer at all in iteration 1, or just preserve pill-bar on mobile and ship sidebar at ≥md only? **Smaller scope → less risk → recommended.**

---

## Confidence Levels

| Area | Level | Reason |
|------|-------|--------|
| Test-ID enumeration | HIGH | Grep'd all 108 test-IDs; matched against every spec |
| Test-breakage matrix | HIGH | Read every spec file fully |
| Bundle baseline | HIGH | Read BUNDLE_DELTA.md directly |
| Bundle delta projections | MEDIUM | woff2 sizing approximate |
| Font pitfalls | HIGH | OFL, crossorigin, FOUT/FOIT well-known; Inter v3/v4 verified |
| OkLCH contrast | MEDIUM | Hand-calculated from L*; recommend executor verify with tool |
| Sidebar/drawer | HIGH | Kobalte/WCAG-documented |
| Audit rebind | HIGH | Field-by-field done in Claude review C2 |
| Print CSS | HIGH | Read `index.css` fully |
| Migration sequencing | MEDIUM | Patterns general; specific collisions need planner grep |
| Static deploy | HIGH | Verified `index.html`, `BUNDLE_DELTA.md`, `docs/deploy.md` |
| Solid signal-loop | MEDIUM | Common antipatterns; CONTEXT.md leaves ownership as discretion |
| CSP | HIGH | Read `docs/deploy.md`; verified `index.html` no meta CSP |
