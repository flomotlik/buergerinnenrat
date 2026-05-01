# Execution: 65-visual-redesign-design-handoff

**Started:** 2026-04-30 (run-1)
**Status:** complete — Phases 1, 2, 3, 5, 6, 7, 8, 9 shipped (run-1 + run-2 + run-final)
**Branch:** issue/65-visual-redesign-design-handoff

## Execution Log

- [x] Phase 1: Token foundation + self-hosted fonts — commit 70735a5 (run-1)
- [x] Phase 2: Component primitives in @layer components — commit d861674 (run-1)
- [x] Phase 3: Shell — Sidebar (md+) + Brand component + pill-tab compat shim — commit d69c23d (run-1)
- [~] Phase 4: OPTIONAL — Mobile drawer (Kobalte Dialog) — **deferred** to follow-up issue. Pill-tabs at <md cover navigation per CONTEXT.md L35; CONTEXT acceptance criterion is met without it. Drawer would add a Kobalte dependency, require extracting Sidebar content into a shared child component, and introduce a hamburger trigger that overlaps the pill-tab UX at <md. Not worth the surface-area increase for a supplementary nav.
- [x] Phase 5: Stage 1 reskin (step rail, cards, banners, stats grid) — commit 1597445 (run-1)
- [x] Phase 6: Audit panel rebind to schema 0.4 (21 mandatory + 4 optional + 3 signature fields) — commit 2d75e95 (run-2)
- [x] Phase 7: Docs typography (sticky 220px TOC + 68ch body) + DocsHub token migration + Beispiele sample-grid — commit 2046d05 (run-final)
- [x] Phase 8: Overview screen (#/overview lazy route, hero + workflow cards + Stage-2/4 outside-tool banner + 3 principles columns sourced from shared TRUST_PRINCIPLES export) — commit d730d14 (run-final)
- [x] Phase 9: BUNDLE_DELTA.md update + 10 visual smoke screenshots — commit 0aab2e7 (run-final)

## Verification Results

### Phase 1 (commit 70735a5)
- Static checks (grep `--accent: oklch(48% 0.14`, `--row-h: 44px`, font URLs, crossorigin, no rsms.me, OFL.txt × 3): PASS
- Capital ẞ (U+1E9E) presence in Source Serif 4 v4.005 Regular + Semibold: VERIFIED via `ttx -t cmap` — both files contain `<map code="0x1e9e" name="uni1E9E"/>`. No Vollkorn fallback needed.
- `pnpm typecheck`: PASS
- `pnpm build` (VITE_BASE_PATH=/): PASS — index-*.js 132.84 kB / gzip 43.40 kB; index-*.css 49.16 kB / gzip 8.18 kB
- Dev server boot smoke (`pnpm dev`): PASS — `VITE v6.4.2 ready in 399 ms` on http://127.0.0.1:5173/buergerinnenrat/
- `pnpm test` (Vitest): 145/145 PASS

### Phase 2 (commit d861674)
- Static checks (`.btn-primary`, `.dropzone`, `.banner`, `.step-rail`, `.audit`, `.sig-pill`, `.stats-grid`, `.chip`, `.tbl`, `.doc-grid`, `font-feature-settings: 'tnum' 1, 'calt' 0`): PASS
- Both `@media print` blocks present (existing #56 + new #65): PASS
- `pnpm typecheck` + `pnpm build` + `pnpm test`: PASS — index-*.css went 49.16 → 42.95 kB raw (legacy `prose-slate` dropped, new tokens net smaller).

### Phase 3 (commit d69c23d)
- Files exist: src/shell/{Brand,Sidebar,NavGroup}.tsx
- Static checks (`primary-nav`, `href="#/stage1"`, `href="#/overview"`, `aria-disabled="true"`, no `setMode(`, `main-nav` + `md:hidden` in App.tsx): PASS
- `pnpm typecheck` + `pnpm build` + `pnpm test` (145/145): PASS
- Targeted Playwright e2e (`a11y`, `mobile-touch-targets`, `csv-import`, `smoke`, `_visual-iteration` — chromium): 45/45 PASS

### Phase 5 (commit 1597445)
- Static checks (`step-rail`, `stage1-bmg-hint`, `safe-area-inset-bottom`, `stage1-report card`, `overflow-x-auto`, `id="stage1-target-n"` ↔ `for="stage1-target-n"`, `href="#/docs/beispiele"`, 8 `.banner` instances, `axis-checkbox-` testid + `sr-only` in AxisPicker): PASS
- `pnpm typecheck`: PASS
- `pnpm build` (VITE_BASE_PATH=/): PASS — index-*.js 135.39 kB / gzip 44.48 kB; index-*.css 46.00 kB / gzip ~7.80 kB
- `pnpm test` (Vitest): 145/145 PASS
- Full Playwright e2e (`pnpm exec playwright test --project=chromium`, all 12 spec files): **79 passed, 1 skipped** (the skipped test pre-existed)

### Phase 6 (commit 2d75e95)
- All 21 mandatory + 4 optional + 3 signature fields rebound from schema 0.4.
- Audit footer renders all schema fields, no missing slots.
- `pnpm typecheck` + `pnpm test` + targeted e2e (audit + stage1): PASS

### Phase 7 (commit 2046d05) — run-final
- Static checks: `class="doc-grid"` in DocsLayout, `class="doc-toc"` + `createEffect`, `class="sample-grid"` in Beispiele, 7 `docs-tile-` testids in DocsHub all present.
- `pnpm typecheck`: PASS
- `pnpm test` (Vitest): 145/145 PASS
- Playwright (`docs.spec.ts`, `trust-strip.spec.ts`, `beispiele-stage1.spec.ts` — chromium): 11/11 PASS
- TOC double-pass (queueMicrotask + setTimeout 50ms) confirmed lazy-loaded subpages get their `<h2>` headings into the TOC.

### Phase 8 (commit d730d14) — run-final
- `apps/web/src/Overview.tsx` exists; lazy-loaded via `lazy(() => import('./Overview'))`.
- AppMode extended with 'overview'; parseHash and hashFor handle `#/overview`.
- Default catch-all STAYS Stage 3 (parseHash final return).
- TRUST_PRINCIPLES exported from TrustStrip.tsx and re-imported in Overview.tsx — single source of truth.
- All testids present: `overview-page`, `overview-card-stage1`, `overview-card-stage3`, `overview-stages-2-4-note`, `overview-principles`, `overview-principle-{algorithmus,verifikation,audit}`.
- Hidden `<h1 sr-only>` shim suppressed on overview/docs routes since both render visible `<h1>` (a11y unique-h1 holds).
- `pnpm typecheck`: PASS
- `pnpm test` (Vitest): 145/145 PASS
- Full Playwright (`--project=chromium`, all spec files including new `_visual-iteration-65.spec.ts` was not yet present): **79 passed, 1 skipped** before adding it; **89 passed, 1 skipped** after.

### Phase 9 (commit 0aab2e7) — run-final
- `BUNDLE_DELTA.md` prepended new `## #65` section with pre/post numbers, lazy-chunk separate, fonts as separate "fonts" line.
- 10 PNGs in `.issues/65-visual-redesign-design-handoff/iteration/`: `01-sidebar-{desktop,mobile}.png`, `02-stage1-card-{desktop,mobile}.png`, `03-audit-panel-{desktop,mobile}.png`, `04-doc-layout-{desktop,mobile}.png`, `05-overview-{desktop,mobile}.png`.
- Bundle measurements (`VITE_BASE_PATH=/ pnpm build`):
  - `index-*.js` raw 137,396 B (137.40 KB) / gzip 44,658 B (44.84 KB) → **+4.58 KB raw / +1.45 KB gzip** vs post-#64 baseline.
  - `index-*.css` raw 44,997 B (45.00 KB) / gzip 8,839 B (8.83 KB) → **+0.53 KB raw / +1.42 KB gzip**.
  - **Combined JS+CSS delta: +5.11 KB raw / +2.87 KB gzip.** Budget +50 KB raw / +18 KB gzip — used **~10 % of raw / ~16 % of gzip headroom**. Well within budget.
  - `Overview-*.js` lazy chunk: 3,173 B raw / 1,447 B gzip — sub-2 KB on the wire.
  - Self-hosted fonts: 638.27 KB raw across 7 woff2 files (Inter ×3, Source Serif 4 ×2, JetBrains Mono ×2). Tracked separately under "fonts" line.
- Final test gate: Vitest 145/145 PASS; Playwright chromium 89/89 PASS (1 pre-existing skip); Firefox smoke (smoke + csv-import + docs + trust-strip subset) 13/13 PASS.

## Deviations from Plan

### Auto-fixed (Rules 1-3)

1. **[Rule 3 — blocker]** Reinstalled workspace dev dependencies (`NODE_ENV=development pnpm install --no-frozen-lockfile`) because the worktree had been created with `NODE_ENV=production` and `tsc` / `vite` were missing. No code change — environment fix only. (run-1)
2. **[Rule 3 — blocker]** Installed `brotli` into `/opt/sortition-venv` so `ttx -t cmap` could parse the woff2 font files for the ẞ-glyph validation. Tooling-only. (run-1)
3. **[Rule 1 — bug]** `_visual-iteration.spec.ts` step `02-tabs` (line 60) and final-shot `01-stage3-default` (line 93) anchored on `data-testid="main-nav"` which is now `display:none` at desktop viewport (per the new `md:hidden` rule on the pill-tabs nav). Switched anchors to `stage1-trust-strip` and `csv-dropzone` respectively — both stable at all viewports. The screenshot harness's purpose ("page is loaded") is unchanged. (run-1)
4. **[Rule 1 — bug]** Five e2e specs (`stage1.spec.ts` × 8 sites, `beispiele-stage1.spec.ts` × 2, `stage1-bands.spec.ts` × 1, `stage1-sample-size.spec.ts` × 1, `docs.spec.ts` × 1) called `getByTestId('tab-X').click()` to navigate routes. After Phase 3 the pill-tabs are `md:hidden` at the default desktop viewport (1280×720) so the click silently fails. Replaced each call with `await page.evaluate(() => { window.location.hash = '#/X' })` — drives the route via the production hashchange listener at `App.tsx:141-144`, viewport-agnostic. Per CONTEXT.md L73 this is the documented "test selector update" last-resort path; tests still verify the same target state. (run-1)

### Blocked (Rule 4)

None.

## Discovered Issues

- The previous executor run had created `apps/web/public/fonts/` (font files, OFL.txt) but never staged or committed them — they were sitting untracked. Phase 1 commit picked them up cleanly.
- The previous executor run had also modified `apps/web/index.html`, `apps/web/package.json`, `apps/web/src/index.css`, `apps/web/tailwind.config.cjs` (Phase 1 work product) but never committed. Phase 1 commit picked them up cleanly.
- `_visual-iteration.spec.ts` and `stage1.spec.ts` e2e specs invasively re-write screenshots into `.issues/56-ui-visual-redesign/iteration/*.png` — these files are tracked under the archived #56 issue and got overwritten during my test runs. I `git checkout`'d them back rather than committing (out of scope). The screenshots Playwright writes are diagnostic only. To prevent #56 PNG drift, the new `_visual-iteration-65.spec.ts` writes only into `.issues/65-…/iteration/`.

## Self-Check

- [x] All Phase 1+2+3+5+6+7+8+9 files exist and are committed (Phase 4 deferred, see log)
- [x] All commits exist on branch (verified via `git log --oneline d34f91a..HEAD`)
- [x] Full Vitest passes (145/145)
- [x] Full Playwright chromium e2e passes (89 passed, 1 pre-existing skip)
- [x] Firefox smoke subset passes (13/13)
- [x] No stubs / TODOs / FIXMEs introduced
- [x] No leftover `console.log` / `debugger` / `binding.pry`
- [x] Sticky run-button wrapper inline `style="padding-bottom: env(safe-area-inset-bottom)"` preserved (verified inline in Stage1Panel.tsx)
- [x] `<label for="stage1-target-n">` ↔ `<input id="stage1-target-n">` binding preserved
- [x] `<a href="#/docs/beispiele">` anchor preserved (NOT converted to onClick)
- [x] Native `<details>/<summary>` preserved in StratificationExplainer (untouched) and Stage1Panel strata-toggle
- [x] `.stage1-report` class preserved on result section (Phase 5 added `.card` alongside, kept `.stage1-report`)
- [x] All ~70 contract testids preserved at the same DOM nesting level (verified by 89/89 Playwright tests passing)
- [x] Pill-tabs visible at <md (mobile-touch-targets passes); sidebar visible at md+ (a11y passes)
- [x] DocsLayout owns its `<h1>{title}</h1>`; Overview owns its own visible `<h1>Bürger:innenrat</h1>`; Stage 1/3 routes have a single hidden `<h1 class="sr-only">Bürger:innenrat</h1>`; csv-import + smoke `getByRole('heading', { name: 'Bürger:innenrat' })` pass
- [x] No imports from `design_handoff_buergerinnenrat/reference/`
- [x] No touch on logic modules (runStage1.ts, audit-sign.ts, csv/parse.ts, csv/derive.ts, quotas/model.ts, run/runEngine.ts, run/audit.ts, packages/*)
- [x] Civic-green accent `--accent: oklch(48% 0.14 145)` in :root
- [x] Default landing stays `#/stage3` (parseHash returns mode='stage3' for `#`/`#/`/unknown — overview reachable only via explicit `#/overview`)
- [x] No UI toggles for theme/density/hue (tokens only)
- [x] Inter v3.19 (NOT v4 — cv11 preserved)
- [x] OFL.txt per font family
- [x] Bundle delta within budget: +5.11 KB raw / +2.87 KB gzip (budget +50/+18)
- [x] 10 visual smoke PNGs present at `.issues/65-…/iteration/`
- [x] BUNDLE_DELTA.md has new `## #65` section
- [x] TRUST_PRINCIPLES single source of truth (TrustStrip + Overview both consume the same export)
- [x] Stage 2/4 outside-tool note rendered on Overview (CLAUDE.md L37-44)
- **Result:** PASSED

**Completed:** 2026-04-30 (run-final)
**Commits this branch:** 8 (Phases 1, 2, 3, 5, 6, 7, 8, 9)

## Run-final summary

The post-rate-limit resume (run-final) shipped Phases 7, 8, 9 against
the existing Phases 1–3 + 5 + 6 baseline. Phase 4 (mobile drawer) is
the only deferred phase; pill-tabs at <md cover the navigation
contract per CONTEXT.md L35 and the optional `<done>` block in PLAN
explicitly accepts deferral. Total branch is now 8 commits on top of
main, JS+CSS combined +5.11 KB raw / +2.87 KB gzip vs post-#64
baseline (well within the +50/+18 budget). All 145 unit tests + 89
chromium e2e + 13 firefox smoke green; no regressions.

## Hand-off

- **#65 status:** done. PR-ready.
- **Optional follow-up:** Phase 4 mobile drawer (Kobalte dialog) can be
  picked up as a small follow-up issue if the supplementary mobile nav
  becomes a UX priority. Bundle headroom remaining: ~45 KB raw /
  ~15 KB gzip.
