# CONTEXT — 69-e2e-ci-gate

Decisions locked without interactive discussion (consistent with prior pipeline runs). Scope is small + ISSUE.md already prescriptive.

## Decisions (locked — research/planner must follow)

### Workflow topology

- **Single workflow file** `.github/workflows/deploy.yml` extended with new `e2e` job. Do NOT create a new workflow file. Reasons: (a) deploy chain `build → deploy → smoke` already gates on `build`, and the new `e2e` chain belongs in the same dependency graph; (b) one source of truth for triggers; (c) lighter to reason about.
- **Job dependency:** `e2e: needs: build` (parallel with current downstream of build) and `deploy: needs: [build, e2e]` (deploy waits for both). PR runs only build + e2e (deploy/smoke gated to push events as already configured).
- **Browsers in matrix:** chromium + firefox. Reuse playwright.config.ts:15-26 projects. Use `strategy.matrix.browser: [chromium, firefox]` and pass `--project=${{ matrix.browser }}`.
- **Cache strategy:** Reuse `actions/setup-node` pnpm cache (already configured at deploy.yml:30-31). Add `actions/cache@v4` for Playwright browsers keyed on the playwright version from `apps/web/package.json` (`@playwright/test` ^1.49.x). Restore key `playwright-${{ runner.os }}-${{ hashFiles('apps/web/package.json') }}`.

### Visual-iteration specs

- **Strategy: `testIgnore` in playwright.config.ts** (Option A from ISSUE.md). Pattern: `testIgnore: ['**/_*.spec.ts']`. Reasons: (a) zero file moves → minimal diff; (b) the `_` prefix already documents non-contract intent in the spec headers; (c) future non-contract specs follow the same convention without config changes; (d) the live-smoke spec lives in a separate `testDir` and isn't affected.
- Visual-iteration specs remain runnable manually via `pnpm exec playwright test apps/web/tests/e2e/_visual-iteration-65.spec.ts` (explicit path bypasses testIgnore).

### Performance budget

- **Target wallclock per browser: ≤6 min** (8 min total upper bound with both in matrix). Use `fullyParallel: true` (already in playwright.config.ts:6). If we blow the budget, document the worst spec and add to a follow-up issue (out of scope to optimize spec runtime here).
- **No sharding in this issue.** ~80 tests across 2 browsers in parallel typically ≤ 5 min on GH-hosted runners. Sharding is premature optimization.
- **Flaky retries:** keep `retries: process.env.CI ? 2 : 0` from playwright.config.ts:7. Rely on existing config.

### Trace + report uploads

- **Upload strategy:** `actions/upload-artifact@v4` only on `if: failure()`. Path: `apps/web/test-results/`. Name: `e2e-${{ matrix.browser }}-traces-${{ github.run_attempt }}`. Retention: default (90 days — overrides at repo level).
- **HTML report:** Playwright generates `apps/web/playwright-report/`. Also upload on failure under name `e2e-${{ matrix.browser }}-report`. Two artifacts because they answer different questions (traces = "what happened in the failing test", report = "which tests overall").

### Live-smoke positioning

- Live-smoke stays as second layer (post-deploy verification of CDN/bundle/headers). The `e2e` job covers the preview-server contract surface; live-smoke covers production-deploy surface. They don't overlap.
- Document in deploy.yml header comment: `e2e (preview server) → deploy → live-smoke (deployed URL)`.

### Verification of the gate itself

- **No fake-bug-PR test in this issue.** It's nice-to-have but adds two PRs to the history (open, fail, close, fix, merge, close). Trust the green run after the change as evidence the wiring works. The ACTUAL gate-effectiveness test happens when a real future regression hits it.
- **Manual smoke during execution:** locally run `pnpm --filter @sortition/web exec playwright test --config=playwright.config.ts` once before pushing; verify ≤6 min wallclock and all pass. If a spec fails locally that previously passed, it's a pre-existing flake; document in EXECUTION.md and don't block this issue on it.

### #68 backlog tracking

- Update `.issues/68-test-coverage-gap-backlog/ISSUE.md` to mark P0 #1 with `[x]` + `→ #69` reference. Commit on this branch.

## Claude's Discretion (planner can refine)

- Exact YAML formatting (multi-line vs inline `with:` blocks, comment style)
- Whether to keep cypress-style `pnpm playwright install --with-deps` or split into `install-deps` + `install` for finer caching
- Job name: `e2e` vs `e2e-tests` vs `playwright`. Default `e2e`.
- Browser-install caching key precision (whether to also hash `pnpm-lock.yaml`)

## Deferred (out of scope for this issue)

- New e2e tests (P1 #3 #5 in #68 — separate issues)
- A11y axe-core integration (#68 P1 #8)
- Shard-based parallelism (defer until wallclock proves it's needed)
- Dependabot/renovate for Playwright version (separate ops concern)
- Per-PR comment with test summary (Playwright reporters → GH actions output is fine for now)
- Cross-runtime parity job (#68 P1 #6, separate issue)

## References

- Tracking-Issue: #68 P0 #1
- Reviews: `.issues/test-coverage-gap-audit/reviews/` (Claude C1, Codex C1, Gemini C1)
- Auslöser: live-smoke fail nach #65 Merge → commit `cb9d6e1`
- Files to touch: `.github/workflows/deploy.yml`, `apps/web/playwright.config.ts`, `.issues/68-test-coverage-gap-backlog/ISSUE.md`
- Files NOT to touch: `apps/web/tests/e2e/*` (no test changes), `apps/web/playwright-live.config.ts` (live-smoke unchanged), `apps/web/tests/smoke-live/` (separate testDir)
