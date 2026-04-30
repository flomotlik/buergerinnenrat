# Execution: 65-visual-redesign-design-handoff (run-1)

**Started:** 2026-04-30
**Status:** partial — Phases 1+2+3+5 shipped (run-1 MVP), Phase 4 + 6–9 deferred
**Branch:** issue/65-visual-redesign-design-handoff
**Pacing target:** Phases 1, 2, 3, 5 (run-1 MVP per orchestrator brief). All four phases shipped and verified.

## Execution Log

- [x] Phase 1: Token foundation + self-hosted fonts — commit 70735a5
- [x] Phase 2: Component primitives in @layer components — commit d861674
- [x] Phase 3: Shell — Sidebar (md+) + Brand component + pill-tab compat shim — commit d69c23d
- [ ] Phase 4: OPTIONAL — Mobile drawer (Kobalte Dialog) — deferred to follow-up executor run (pill-tabs at <md cover navigation per CONTEXT.md L35)
- [x] Phase 5: Stage 1 reskin (step rail, cards, banners, stats grid) — commit 1597445
- [ ] Phase 6: Audit panel rebind to schema 0.4 — deferred to follow-up executor run (run 2)
- [ ] Phase 7: Docs typography (sticky TOC + 68ch body) — deferred to follow-up executor run (run 2)
- [ ] Phase 8: Overview screen (#/overview) — deferred to follow-up executor run (run 3)
- [ ] Phase 9: Bundle delta + visual smoke screenshots — deferred to follow-up executor run (run 3)

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

## Deviations from Plan

### Auto-fixed (Rules 1-3)

1. **[Rule 3 — blocker]** Reinstalled workspace dev dependencies (`NODE_ENV=development pnpm install --no-frozen-lockfile`) because the worktree had been created with `NODE_ENV=production` and `tsc` / `vite` were missing. No code change — environment fix only.
2. **[Rule 3 — blocker]** Installed `brotli` into `/opt/sortition-venv` so `ttx -t cmap` could parse the woff2 font files for the ẞ-glyph validation. Tooling-only.
3. **[Rule 1 — bug]** `_visual-iteration.spec.ts` line 60 (step `02-tabs`) and line 93 (final-shot `01-stage3-default`) anchored on `data-testid="main-nav"` which is now `display:none` at desktop viewport (per the new `md:hidden` rule on the pill-tabs nav). Switched anchors to `stage1-trust-strip` and `csv-dropzone` respectively — both stable at all viewports. The screenshot harness's purpose ("page is loaded") is unchanged. Inline note left in the spec.
4. **[Rule 1 — bug]** Five e2e specs (`stage1.spec.ts` × 8 sites, `beispiele-stage1.spec.ts` × 2, `stage1-bands.spec.ts` × 1, `stage1-sample-size.spec.ts` × 1, `docs.spec.ts` × 1) called `getByTestId('tab-X').click()` to navigate routes. After Phase 3 the pill-tabs are `md:hidden` at the default desktop viewport (1280×720) so the click silently fails ("Element is not visible", even with `force: true`, because Playwright still has to scroll-into-view a zero-box element). Replaced each call with `await page.evaluate(() => { window.location.hash = '#/X' })` — drives the route via the production hashchange listener at `App.tsx:141-144`, viewport-agnostic. Per CONTEXT.md L73 this is the documented "test selector update" last-resort path; tests still verify the same target state. Noted inline in each spec.
5. **[Rule 1 — bug]** `pnpm install` was run twice — once with `NODE_ENV=production` (devDependencies skipped, missed `tsc`), then again with `NODE_ENV=development --no-frozen-lockfile` to pull dev deps. No commit, environment-only.

### Blocked (Rule 4)

None.

## Discovered Issues

- The previous executor run had created `apps/web/public/fonts/` (font files, OFL.txt) but never staged or committed them — they were sitting untracked. Phase 1 commit picked them up cleanly.
- The previous executor run had also modified `apps/web/index.html`, `apps/web/package.json`, `apps/web/src/index.css`, `apps/web/tailwind.config.cjs` (Phase 1 work product) but never committed. Phase 1 commit picked them up cleanly.
- `_visual-iteration.spec.ts` and stage1.spec.ts e2e specs invasively re-write screenshots into `.issues/56-ui-visual-redesign/iteration/*.png` — these files are tracked under the archived #56 issue and got overwritten during my test runs. I `git checkout`'d them back rather than committing (out of scope). The screenshots Playwright writes are diagnostic only.

## Self-Check

- [x] All Phase 1+2+3+5 files exist and are committed
  - `apps/web/src/shell/{Brand,Sidebar,NavGroup}.tsx` exist (Phase 3)
  - `apps/web/public/fonts/{inter,source-serif-4,jetbrains-mono}/` exist with OFL.txt + woff2 files (Phase 1)
- [x] All four commits exist on branch (verified via `git log --oneline d34f91a..HEAD`)
- [x] Full Vitest passes (145/145)
- [x] Full Playwright chromium e2e passes (79 passed, 1 pre-existing skip)
- [x] No stubs / TODOs / FIXMEs introduced
- [x] No leftover `console.log` / `debugger` / `binding.pry`
- [x] Sticky run-button wrapper inline `style="padding-bottom: env(safe-area-inset-bottom)"` preserved (verified inline in Stage1Panel.tsx)
- [x] `<label for="targetN">` ↔ `<input id="targetN">` binding preserved (the original file uses `id="stage1-target-n"` / `for="stage1-target-n"` — same intent)
- [x] `<a href="#/docs/beispiele">` anchor preserved (NOT converted to onClick)
- [x] Native `<details>/<summary>` preserved in StratificationExplainer (untouched) and Stage1Panel strata-toggle
- [x] `.stage1-report` class preserved on result section (Phase 5 added `.card` alongside, kept `.stage1-report`)
- [x] All ~70 contract testids preserved at the same DOM nesting level (verified by 79/79 Playwright tests passing)
- [x] Pill-tabs visible at <md (mobile-touch-targets passes); sidebar visible at md+ (a11y passes)
- [x] DocsLayout owns its `<h1>{title}</h1>`; non-docs routes have a single `<h1 class="sr-only">Bürger:innenrat</h1>`; csv-import + smoke `getByRole('heading', { name: 'Bürger:innenrat' })` pass
- [x] No imports from `design_handoff_buergerinnenrat/reference/`
- [x] No touch on logic modules (runStage1.ts, audit-sign.ts, csv/parse.ts, csv/derive.ts, quotas/model.ts, run/runEngine.ts, run/audit.ts, packages/*)
- [x] Civic-green accent `--accent: oklch(48% 0.14 145)` in :root
- [x] Default landing stays `#/stage3` (parseHash returns mode='stage3' for `#`/`#/`/unknown)
- [x] No UI toggles for theme/density/hue (tokens only)
- [x] Inter v3.19 (NOT v4 — cv11 preserved)
- [x] OFL.txt per font family
- **Result:** PASSED

**Completed:** 2026-04-30 (run-1)
**Duration:** ~30 min (post-rate-limit resume)
**Commits:** 4 (Phase 1 + 2 + 3 + 5)

## Hand-off to next runs

- **Run 2 should pick up:** Phase 6 (audit footer rebind to all 21+4+3 schema-0.4 fields) + Phase 7 (DocsLayout sticky 220px TOC + 68ch body).
- **Run 3 should pick up:** Phase 8 (`#/overview` route + Overview.tsx) + Phase 9 (BUNDLE_DELTA.md + 10 visual smoke screenshots + bundle measurement).
- **Phase 4 (mobile drawer)** stays optional/deferred — pill-tabs at <md cover navigation requirement.
