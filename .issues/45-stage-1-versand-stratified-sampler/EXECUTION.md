# Execution: Stage 1 — Versand-Auswahl per stratifizierter Zufallsstichprobe

**Started:** 2026-04-25T17:50:00Z
**Completed:** 2026-04-25T18:05:00Z
**Duration:** ~15 min
**Status:** complete
**Branch:** worktree-agent-ac76adcb
**Commits:** 8

## Execution Log

- [x] Task 1: Pure Stratifikations-Modul + Unit-Tests — commit `de0d2b5`
  - 13 tests in `packages/core/tests/stage1-stratify.test.ts`
  - `bucketize` + `largestRemainderAllocation` extracted as testable helpers
  - Edge cases: empty stratum, n_h_target>=N_h clamp, axes=[] SRS, throw on targetN>rows.length

- [x] Task 2: Audit-Builder + RFC-4180-CSV-Writer + Tests — commit `a38ebd8`
  - 11 audit tests + 14 CSV tests = 25 tests
  - `Stage1AuditDoc` schema (schema_version 0.1, operation 'stage1-versand')
  - `canonicalStage1Json` deep-sorts keys for stable signing
  - `sha256Hex` works in both Node 20+ and the browser (Web Crypto)
  - `stage1ResultToCsv` with RFC-4180 quoting (`,;\"\n\r`), CRLF endings,
    optional `gezogen` column with conflict-rename to `gezogen_2`

- [x] Task 3: Audit-Signatur-Wrapper im Web-Layer — commit `5c3bf9e`
  - `signStage1Audit` in `apps/web/src/stage1/audit-sign.ts`
  - Ed25519-then-ECDSA fallback chain (matches existing `run/audit.ts`)
  - 3 jsdom unit tests cover signing, body-json equality, no input mutation
  - Stretch refactor (extracting `signString` from run/audit.ts) NOT done —
    existing audit code path has no unit tests, so safer to duplicate
    ~30 lines than to risk silent regression

- [x] Task 4: UI-Komponenten — Stage1Panel, AxisPicker, runStage1 — commit `399abec`
  - `runStage1.ts`: glue layer with timing, stratify, audit build, sign, CSV
  - `AxisPicker.tsx`: pure view component with default-axis "vorgeschlagen" badges
  - `Stage1Panel.tsx`: full UI flow with strata table, warnings, downloads
  - Default seed = `Math.floor(Date.now()/1000)` (uint32-safe per RESEARCH.md risk 6)
  - All interactive elements get `data-testid`
  - **Task 6 bundled here** — BMG §46 hint embedded as info aside in Stage1Panel
    (avoided double-touching the file in two consecutive commits)

- [x] Task 5: Tab-Switcher in App.tsx — commit `386615a`
  - `mode` signal with default `'stage3'` (existing flow stays the landing page)
  - Two tab buttons with `data-testid="tab-stage1"` / `tab-stage3`
  - Stage 3 wrapped in `<div class="space-y-8">` so multiple sibling sections
    render correctly under one `<Show>`
  - State trees disjoint: Stage 1 owns its state inside `Stage1Panel`,
    Stage 3 keeps `pool`/`quotas`/`enginePool`/`engineQuotas`/`quotaValid`
  - No new dependency (no Solid Router)

- [x] Task 6: BMG-§46-Hinweistext im Stage-1-UI — bundled into commit `399abec`
  - `aside data-testid="stage1-bmg-hint"` in Stage1Panel between upload and AxisPicker
  - Verbatim CONTEXT.md wording, link to `gesetze-im-internet.de/bmg/__46.html`
    with `rel="noopener noreferrer"`
  - No hard block — purely informational

- [x] Task 7: Integrations-Test 6000 Zeilen via generatePool — commit `e8cdb1e`
  - 7 tests in `packages/core/tests/stage1-integration.test.ts`
  - Pool built once via `generatePool({ profile: PROFILES['kleinstadt-bezirkshauptort'], size: 6000, seed: 42, tightness: 0.7 })`
  - Verifies exactly-300 selection, ±1 stratum bound, sum exactness, determinism,
    no underfill warnings, valid+unique indices, total runtime <500 ms
  - Performance observed: ~70 ms total

- [x] Task 8: Playwright-Smoke für Stage-1-Workflow — commit `05c815d`
  - `apps/web/tests/e2e/stage1.spec.ts` — covers tab switch, upload, BMG hint,
    default axes preselected (district/age_band/gender), N=50 entry, ziehen,
    strata table, CSV download (`versand-*.csv`), audit download
    (`versand-audit-*.json`)
  - Passes on **both Chromium and Firefox** (Web Crypto Ed25519/ECDSA fallback works)
  - **Deviation Rule 5 fix (also in this commit):** I had renamed the App heading
    `"Sortition Iteration 1"` → `"Sortition Iteration 2"` in Task 5, which broke
    `apps/web/tests/e2e/smoke.spec.ts:5` and `csv-import.spec.ts:14`. Reverted the
    heading to keep existing tests green — the heading text was not part of the
    issue scope.

- [x] Task 9: README/Docs-Update zur Stage-1-Funktion — commit `2cacedc`
  - New "Stage 1 — Versand-Liste ziehen" section added to `README.md`
  - Covers: 5-step Ablauf, Algorithmus (Largest-Remainder + Fisher-Yates +
    Mulberry32), BMG §46 Hinweis verbatim from UI/CONTEXT.md, Output-Format,
    cross-reference to `sortition-tool/08-product-redesign.md`
  - No new doc files — only `README.md` extended (per CLAUDE.md rule)

## Verification Results

**Vitest (`pnpm -r test`):** all green
- `packages/engine-contract`: 6 tests (unchanged)
- `packages/core`: 51 tests (6 prior + 45 new in 4 new files)
- `packages/metrics`: 6 tests (unchanged)
- `packages/engine-a`: 11 tests (unchanged)
- `apps/web` Vitest unit: 26 tests (23 prior + 3 new)
- **Total Vitest: 100 tests, 100 passed**

**Playwright (`pnpm --filter @sortition/web exec playwright test`):** 12 passed
- chromium + firefox: a11y, csv-import, end-to-end, smoke, stage1 (6 tests each, 12 total)

**TypeScript (`pnpm -r exec tsc --noEmit`):** no errors

**Build (`pnpm --filter @sortition/web build`):** OK
- `dist/assets/index-*.js`: 75.57 kB (gzip 26.13 kB) — was 61.41 kB (gzip 21.90 kB) pre-Stage-1
- Net Stage 1 cost: ~14 kB raw / ~4 kB gzip — well under the 50 kB sanity bound

## Deviations from Plan

### Auto-fixed (Rules 1-3, 5)

1. **[Rule 5 - Pre-existing-test breakage from my own change] App heading reverted to "Sortition Iteration 1"**
   - Found during: Task 8 verification (full e2e run)
   - Issue: I had bumped `<h1>` text to "Iteration 2" in Task 5; this broke
     `apps/web/tests/e2e/smoke.spec.ts:5` and `csv-import.spec.ts:14`, which both
     literally assert the heading.
   - Fix: reverted the heading back to "Sortition Iteration 1". Heading text
     was not in issue scope — only the tab nav was.
   - File: `apps/web/src/App.tsx`
   - Commit: `05c815d` (squashed into the Task 8 commit because both touched the same area)

2. **[Tasks 4 + 6 commit-merge] BMG §46 hint built into Stage1Panel directly**
   - Found during: Task 4 implementation
   - Issue: PLAN had Task 6 as a separate commit modifying `Stage1Panel.tsx`
     just to add the BMG aside. Splitting that off would have meant
     touching the same file twice in two consecutive commits with the
     second commit being trivially small and the placeholder ugly.
   - Decision: implement the BMG aside directly in Task 4's `Stage1Panel.tsx`
     creation, with verbatim CONTEXT.md wording. Marked Task 6 done in
     EXECUTION.md and the bundled commit references both behaviors.
   - File: `apps/web/src/stage1/Stage1Panel.tsx`
   - Commit: `399abec`

### Stretch / refactor decisions

3. **`signString` extraction from `run/audit.ts` NOT done (Task 3 stretch)**
   - The plan invited optional generalization of the Ed25519+ECDSA helper.
   - Skipped: there are no unit tests covering `apps/web/src/run/audit.ts`,
     so any silent behavioral drift in the Stage 3 path would only be
     caught by the chromium e2e download check. The plan explicitly says
     "if even one test breaks, roll back".
   - Conservative duplicate (~30 lines) chosen instead.

### Blocked (Rule 4)

None.

## Discovered Issues

None outside the issue scope. The bundle size grew by ~14 kB raw, which is
expected for a new top-level UI section + glue + types — not a concern.

## Self-Check

- [x] All files from plan exist (15 new files: 4 stage1 sources + 4 stage1 tests in core,
      4 stage1 sources in web + 1 unit test + 1 e2e test, plus README extension and App.tsx mod)
- [x] All commits exist on branch (8 commits, log verified)
- [x] Full Vitest suite passes (100/100)
- [x] All Playwright e2e pass on Chromium and Firefox (12/12)
- [x] TypeScript strict check passes across all workspaces
- [x] No stubs/TODOs/placeholders/console.log in production code
- [x] No leftover debug code (only intentional `console.log(`stage1 e2e ok on ${browserName}`)`
      in the e2e spec for diagnostic output)
- [x] BMG §46 hint wording matches CONTEXT.md verbatim
- [x] Default seed is uint32-safe (Math.floor(Date.now()/1000))
- [x] Audit module path correction honored (apps/web/src/run/audit.ts is reused;
      pure builder lives in packages/core/src/stage1/audit-builder.ts)
- [x] Test path correction honored (packages/core/tests/stage1-*.test.ts,
      not packages/core/src/stage1/__tests__/)
- [x] Tab-switcher (Variante B) used, no Solid Router dependency added
- [x] Stage 3 default tab — existing functionality reachable without clicks
- [x] No SPDX header per file (kept project convention)
- [x] No claude attribution in commits
- **Result:** PASSED
