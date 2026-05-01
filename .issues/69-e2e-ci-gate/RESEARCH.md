# RESEARCH — 69-e2e-ci-gate

Small-scope CI-wiring change. No parallel research agents needed; surface mapped inline.

## User Constraints (from CONTEXT.md)

- Single workflow file (`.github/workflows/deploy.yml`), new `e2e` job
- `e2e: needs: build`, `deploy: needs: [build, e2e]`
- chromium + firefox matrix
- Visual-iteration excluded via `testIgnore: ['**/_*.spec.ts']` in playwright.config.ts
- Trace + report uploads on failure only
- Live-smoke retained as second layer
- Update #68 backlog

## Summary

Add a new `e2e` job to `.github/workflows/deploy.yml` that runs the default Playwright config (`apps/web/playwright.config.ts`) on chromium + firefox in a matrix. Boot the preview server via Playwright's `webServer` config (already present, points to `vite preview --port 4173`). Cache Playwright browser binaries at `~/.cache/ms-playwright`. Upload traces + report on failure. Make `deploy` depend on both `build` and `e2e` so push events deploy only after green e2e.

Pre-step: edit `apps/web/playwright.config.ts` to add `testIgnore: ['**/_*.spec.ts']` so the screenshot-generator specs (`_visual-iteration.spec.ts`, `_visual-iteration-65.spec.ts`) don't waste CI slots. They remain runnable manually by passing the explicit path.

Update `.issues/68-test-coverage-gap-backlog/ISSUE.md` to mark P0 #1 as `[x]` with `→ #69` reference.

## Codebase Analysis

### Interfaces (current)

<interfaces>
// .github/workflows/deploy.yml — current jobs (post-#65 + post-PR-trigger fix):
//   build:
//     runs-on: ubuntu-latest
//     steps: checkout → setup-pnpm → setup-node (with: cache: pnpm)
//            → pnpm install --frozen-lockfile
//            → pnpm --filter @sortition/web lint
//            → pnpm -r --filter './packages/**' --filter '@sortition/web' exec tsc --noEmit
//            → pnpm -r --filter './packages/**' test
//            → pnpm --filter @sortition/web test
//            → pnpm --filter @sortition/web build
//            → (if push) actions/configure-pages@v5
//            → (if push) actions/upload-pages-artifact@v3 (path: apps/web/dist)
//   deploy:
//     if: github.event_name == 'push'
//     needs: build
//     environment: github-pages
//     steps: actions/deploy-pages@v4
//   smoke:
//     if: github.event_name == 'push'
//     needs: deploy
//     runs-on: ubuntu-latest
//     steps: checkout → setup-pnpm → setup-node → pnpm install
//            → playwright install --with-deps chromium
//            → wait-for-live (poll deployed URL up to 5 min)
//            → playwright test --config=playwright-live.config.ts
//            → (if failure) upload smoke-traces

// apps/web/playwright.config.ts — current shape:
{
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4173', headless: true },
  webServer: {
    command: 'pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { VITE_BASE_PATH: '/' },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
}

// apps/web/package.json scripts that are CI-relevant:
//   "test:e2e": "playwright test"          ← ready to use as-is
//   "test:smoke-live": "playwright test --config=playwright-live.config.ts"
//   "build": "vite build"
//   "test": "vitest run"
</interfaces>

### Test inventory (what gets gated)

13 spec files in `apps/web/tests/e2e/` (per #68 review):
- `_visual-iteration.spec.ts` — screenshot generator, NOT contract → exclude via testIgnore
- `_visual-iteration-65.spec.ts` — screenshot generator, NOT contract → exclude via testIgnore
- `a11y.spec.ts` — 1 test, default viewport
- `beispiele-stage1.spec.ts` — 1 test, serial mode
- `csv-import.spec.ts` — 2 tests
- `docs.spec.ts` — 8 tests
- `end-to-end.spec.ts` — 1 test, serial, 60s timeout (Stage 3 engine)
- `mobile-touch-targets.spec.ts` — 7 tests, viewport 375×812
- `smoke.spec.ts` — 1 test
- `stage1-bands.spec.ts` — 6 tests, serial
- `stage1-sample-size.spec.ts` — 7 tests, serial
- `stage1.spec.ts` — 8 tests, serial
- `trust-strip.spec.ts` — 2 tests

After excluding `_*.spec.ts`: 11 spec files / ~44 tests in default config. With chromium + firefox matrix → ~88 tests gated. Estimated wallclock per browser: 4-5 min (Stage 3 single test dominates ~45s; rest are sub-second to ~5s). Total CI wall ≤ 6 min per browser if no parallelism — Playwright's `fullyParallel: true` (config L6) reduces it further.

### Cache key derivation

Playwright browser binaries live at `~/.cache/ms-playwright`. The version-pinning strategy:
- Lockfile-derived: `hashFiles('apps/web/pnpm-lock.yaml')` — too granular (every dep change invalidates)
- Package-derived: `hashFiles('apps/web/package.json')` — coarse but Playwright's cache is keyed by browser version, not package version, so this is fine
- Better: `hashFiles('pnpm-lock.yaml')` at workspace root (single file, changes only when @playwright/test bumps)

Recommendation: use `hashFiles('pnpm-lock.yaml')` for the cache key.

## Standard Stack (verified)

- `@playwright/test` 1.49.1 (apps/web/package.json:32)
- `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4` (already in workflow)
- `actions/cache@v4` for Playwright browsers
- `actions/upload-artifact@v4` for traces + report (already used in smoke job at L122)

No new dependencies. No new tooling.

## Don't Hand-Roll

- Don't write a custom test runner — use `pnpm --filter @sortition/web exec playwright test --project=$BROWSER`
- Don't manage Playwright browsers manually — use `playwright install --with-deps $BROWSER` (downloads if missing, no-op if cached)
- Don't write a custom preview server — `playwright.config.ts` `webServer` already boots `vite preview`

## Architecture Patterns

- **Job parallelism:** `e2e` matrix runs chromium + firefox in parallel as separate runners. Independent of the `build` job's artifact (the build artifact is only used by `deploy`; `e2e` runs its own `pnpm build` since the preview server needs `apps/web/dist` to exist).
- Wait — actually `vite preview` REQUIRES a prior `pnpm build`. The webServer command is `pnpm exec vite preview --port 4173` which fails if `dist/` doesn't exist. So either:
  - (a) `e2e` runs `pnpm build` itself before booting preview (simpler, ~15s extra per matrix entry)
  - (b) `e2e` downloads the build artifact from the `build` job (more complex, asymmetric — build only uploads on push events)
- **Recommendation: (a) — let `e2e` run its own build.** Reasons: matrix entries are independent, no asymmetric path between PR and push, simpler cache invalidation, build is fast (~5s warm).

- **Concurrency group:** the existing concurrency rule (`group: pages` for push, per-PR for pull_request) applies to the workflow as a whole. New `e2e` job inherits it. No additional locking needed.

- **Trigger gate for deploy:** since `deploy: needs: [build, e2e]` AND `deploy: if: github.event_name == 'push'`, on PR the deploy job is skipped (correct), and on push deploy waits for both build AND e2e green (correct gate).

## Common Pitfalls

1. **Playwright browser-version drift:** if `@playwright/test` is updated in `apps/web/package.json` but the cache key isn't invalidated, CI runs against stale browsers. Mitigation: cache key includes `pnpm-lock.yaml` hash.
2. **Preview server port collision:** `vite preview --strictPort` (config L13) will fail if 4173 is already bound. On a fresh CI runner this is fine. Mitigation: trust Playwright's `webServer` config to manage lifecycle.
3. **`webServer.reuseExistingServer: !process.env.CI`** (config L14) — in CI, Playwright always starts a fresh server. No issue, just confirming the config reads correctly in CI mode.
4. **Firefox + WebAssembly + HiGHS:** the Stage 3 e2e (`end-to-end.spec.ts`) loads HiGHS WASM. Verify it works on Firefox in CI (mostly likely yes, but Firefox WASM behavior on engine-a was earlier suspect per git log).
5. **`_visual-iteration*.spec.ts` testIgnore pattern:** double-check the glob matches both `_visual-iteration.spec.ts` and `_visual-iteration-65.spec.ts`. The pattern `**/_*.spec.ts` does match both (any directory + filename starting with `_`).
6. **Concurrency cancel-in-progress on PR:** existing concurrency at deploy.yml:23 has `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`. So if a PR is force-pushed mid-CI, the previous run cancels. That's correct — don't change it.
7. **Bundle-version `__GIT_SHA__` define:** the build step in CI may produce a different `__GIT_SHA__` than locally; this is fine for tests (tests don't assert against `__GIT_SHA__`).
8. **Failure artifact path:** Playwright writes `test-results/` and `playwright-report/` to the playwright `testDir` parent — i.e. `apps/web/test-results/` and `apps/web/playwright-report/`. Use these paths in upload-artifact.

## Environment Availability

- `actions/cache@v4`, `actions/upload-artifact@v4` — both already in repo workflows
- `pnpm/action-setup@v4`, `actions/setup-node@v4` — already in build job
- Playwright 1.49.1 binaries available for all three browsers via `playwright install`
- GH-hosted ubuntu-latest runner has 4 vCPU / 16 GB RAM — sufficient for the matrix

## Project Constraints (from CLAUDE.md)

- "Sprache der Dokumente: Deutsch" — workflow comments in English (per repo convention)
- "Keine positive Affirmation" — workflow comments stay factual
- "Daten bleiben lokal" — no telemetry leakage; Playwright doesn't phone home by default

## Sources

- HIGH — `.github/workflows/deploy.yml` (current state, read line-by-line)
- HIGH — `apps/web/playwright.config.ts` (current state)
- HIGH — `apps/web/playwright-live.config.ts` (separate testDir, no overlap)
- HIGH — `apps/web/package.json` (Playwright version + scripts)
- HIGH — `.issues/68-test-coverage-gap-backlog/ISSUE.md` P0 #1 (the spec for this issue)
- HIGH — `.issues/test-coverage-gap-audit/reviews/` (Claude C1, Codex C1, Gemini C1)
- HIGH — Playwright official docs on `webServer` + `testIgnore` config (matches our usage)
- MEDIUM — Wallclock estimate (4-5 min per browser) extrapolated from current local run; verify in execution

## Open Questions for Planner

1. **Confirm Firefox WASM works for Stage 3 engine** — if `end-to-end.spec.ts` already runs locally on firefox, we're fine. Quick local check before pushing.
2. **Build artifact reuse from build job:** kept as "let e2e run its own pnpm build". If wallclock pressure, switch to artifact-download in a follow-up.
3. **Whether to also add `pnpm typecheck` redundantly to the e2e job** — no, build job already does it; redundant typecheck wastes runner minutes.
