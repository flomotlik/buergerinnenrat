---
review_of: 69-e2e-ci-gate
review_type: issue
review_mode: implementation
reviewed_at: 2026-05-01T10-21-25Z
tool: gemini
model: gemini-3.1-pro-preview
duration_seconds: 513
---

# Review of Issue #69 (e2e-ci-gate)

## 1. YAML correctness

- **Syntax & Indentation:** Correct. Matrix interpolation (`${{ matrix.browser }}`) and expressions (`if: failure()`) are well-formed and scoped correctly.
- **Structure:** The `e2e` job setup is standard and perfectly valid. `actions/cache@v4`, `actions/upload-artifact@v4`, and the Playwright installation steps are correctly configured.
- **Finding:** None. The YAML is robust.

## 2. Cache-key correctness for Playwright browsers

- **Cache Strategy:** The key `playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}` is structurally correct but will invalidate frequently (whenever *any* workspace dependency changes).
- **Impact:** While `hashFiles('pnpm-lock.yaml')` causes frequent exact-key misses, the `restore-keys: playwright-${{ runner.os }}-` fallback gracefully handles this. It restores the most recent browser cache, and `playwright install --with-deps` will see the binaries are already present (unless the Playwright version actually bumped), resulting in a near-instantaneous step.
- **Finding (Info / Low):** The caching strategy is safe and standard, though it will produce redundant cache entries on the GitHub Actions backend. No change required.

## 3. Job-dependency graph correctness

- **Graph logic:** `build → e2e → deploy → smoke`
- **PR Behavior:** `build` and `e2e` run. `deploy` is skipped because `if: github.event_name == 'push'` evaluates to false. `smoke` is skipped because it depends on `deploy`. Skipped jobs do not fail the pipeline, so the PR status check for `e2e` remains the blocking gate.
- **Push Behavior:** If `e2e` fails, `deploy` remains skipped (as it `needs` a successful `e2e`), safely preventing a broken build from reaching production.
- **Finding:** None. The dependency graph correctly achieves the required gating.

## 4. Whether re-running `pnpm build` in the e2e job is necessary or wasteful

- **Assessment:** Re-running `pnpm build` in the `e2e` job is strictly **necessary** and the correct architectural choice.
- **Rationale:** The `build` job's Pages artifact is built with the production base path (`/buergerinnenrat/`). The `e2e` job's preview server runs on `http://127.0.0.1:4173/` and expects assets at the root (`/`). By rebuilding with `VITE_BASE_PATH=/`, you ensure that `vite preview` serves the assets correctly for the tests.
- **Finding:** None. The ~5s warm rebuild is a very worthwhile tradeoff to maintain PR/push symmetry and correct asset paths.

## 5. Subtle breakage risk to existing build/deploy/smoke jobs

- **Assessment:** Safe. The live-smoke job was not modified and will run correctly after a successful deploy.
- **Tooling Versions:** `pnpm/action-setup@v4` correctly inherits the exact version (`9.12.3`) from the `packageManager` field in `package.json`, ensuring consistent environments across jobs.
- **Finding:** None. No regressions introduced to existing jobs.

## 6. Playwright config correctness

- **Assessment:** `testIgnore: ['**/_*.spec.ts']` successfully excludes the visual iteration specs from the CI run. However, the planner's assumption about manual execution is false.
- **Finding (High Severity):** The Plan states that visual-iteration specs "remain runnable manually via `pnpm exec playwright test apps/web/tests/e2e/_visual-iteration-65.spec.ts` (explicit path bypasses testIgnore)." **This is incorrect.** Playwright's `testIgnore` is absolute. Explicitly passing the file yields an `Error: No tests found` fatal exit. This breaks the local developer workflow for generating screenshots.
- **Suggested Fix:** Revert the `testIgnore` addition in `playwright.config.ts`. Instead, implement Option B from the issue: move the `_visual-iteration*.spec.ts` files out of the `testDir` entirely (e.g., into `apps/web/tests/screenshots/`). Alternatively, keep them in `testDir` but remove `testIgnore` and define a custom Playwright project for them, or use `--grep-invert` in the CI command. Moving the files is the cleanest and most robust solution.

## 7. Anything else

- **Artifacts:** Uploading both the Playwright trace and the HTML report on failure is excellent for maintainability and debugging. Including `github.run_attempt` and `matrix.browser` prevents artifact name collisions on retries.

<verdict value="fail" critical="0" high="1" medium="0">
FAIL: CI wiring is functionally perfect, but testIgnore fundamentally breaks manual execution of visual specs.
</verdict>
