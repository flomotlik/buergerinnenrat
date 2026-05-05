# EXECUTION — 70-rebrand-personenauswahl

Started: 2026-05-04T00:00:00Z
Plan: 5 tasks (Phase A wordmark + test-id, Phase B copy, Phase C use-case-hub, Phase D readmes, Phase E final)

## Tasks

- [x] Task 1: Wordmark-Rename + Test-ID-Migration — commit 1934254
- [x] Task 2: UI-Copy generisch reformulieren — commit 3e6bf22
- [x] Task 3: Use-Case-Hub — commit 3c50ed2
- [x] Task 4: README + CLAUDE.md + Code-Kommentare — commit b0153d8
- [x] Task 5: Final wrap — commit afaaf00

## Deviations

- Build with `VITE_BASE_PATH=/` is required before running Playwright e2e
  (production build defaults to `/buergerinnenrat/` per `vite.config.ts`,
  which is out-of-scope per CONTEXT.md). The Playwright webServer-Hook only
  sets the env for `vite preview`, not for the build. Workflow-relevant
  for all subsequent task verifications.

- **Cross-worktree port collision (Task 5 final verification):** The parallel
  `issue/71-editable-group-seat-allocation` worktree was running its own
  `vite preview` on `127.0.0.1:4173` (the same port hardcoded in
  `apps/web/playwright.config.ts:15`). With `reuseExistingServer:
  !process.env.CI = true`, our Playwright run picked up #71's stale build
  (which still had the old `Bürger:innenrat` branding and `/buergerinnenrat/`
  base path), causing 60 chromium failures (ALL specs failed because
  `getByTestId('brand')` couldn't find the wordmark — wrong build served).

  **Resolution (test-infra workaround, not a code change):** ran `vite
  preview --port 4175` against our own dist (built with `VITE_BASE_PATH=/`)
  and pointed Playwright at `http://127.0.0.1:4175` via a temporary
  `/tmp/playwright-isolated.config.ts`. With this isolation the full e2e
  suite passes:
    - chromium: 83 passed, 1 skipped (5.9s clock, 15.9s wall)
    - firefox:  83 passed, 1 skipped (17.3s)
  The skip is the same pre-existing intentional skip on both browsers.

  **No code action taken** — port collision is a workspace-level concern
  introduced by running two worktrees in parallel; #70's code is correct.
  Suggestion for future: parameterise `playwright.config.ts:15` baseURL via
  `PLAYWRIGHT_PORT` env var so concurrent worktrees can pick free ports.
  Not in scope for this issue.

## Final verification

- `pnpm --filter @sortition/web typecheck` — green
- `pnpm --filter @sortition/web test` — 165 unit tests pass (17 files)
- `VITE_BASE_PATH=/ pnpm --filter @sortition/web build` — green; new
  `UseCases-*.js` lazy chunk emitted (5.80 kB / 2.30 kB gzip)
- `playwright test --project=chromium` (against isolated preview on 4175)
  — 83 passed, 1 skipped
- `playwright test --project=firefox` (against isolated preview on 4175)
  — 83 passed, 1 skipped
- Brand-Sweep: no `Bürger:innenrat`/`Bürgerinnenrat` strings in `apps/web/src/shell/`,
  `apps/web/src/Overview.tsx`, `apps/web/index.html`. No `Bürgerrats-Methodik`
  in `Stage1Panel.tsx`. `Personenauswahl` present in `apps/web/src/`,
  `README.md`, `CLAUDE.md`.
- Out-of-scope guards intact: `vite.config.ts` still uses `/buergerinnenrat/`,
  workflows untouched, `design_handoff_buergerinnenrat/` directory present.

## Summary

5/5 tasks complete on branch `issue/70-rebrand-personenauswahl`.
6 commits ahead of `main` (1 from issue creation + 5 task commits).

Commit log:
- `1934254` Task 1: brand wordmark + test-id migration
- `3e6bf22` Task 2: stage1 generic copy
- `3c50ed2` Task 3: use-cases docs hub
- `b0153d8` Task 4: README + CLAUDE.md + code comments
- `afaaf00` Task 5: mark issue done

Status: complete.
