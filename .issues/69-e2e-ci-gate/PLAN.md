# PLAN — 69-e2e-ci-gate

## Objective

Wire the full Playwright e2e suite (~44 tests across 11 contract specs × 2 browsers = ~88 test invocations) into CI on `pull_request` AND `push` to main. Block deploy until e2e passes. Exclude `_visual-iteration*.spec.ts` non-contract specs first to avoid burning CI slots on screenshot-only tests.

## Skills

<skills>
  <!-- No workspace skills tagged. Conventions inlined. -->
</skills>

## Interfaces (verbatim from RESEARCH.md)

<interfaces>
// Files to TOUCH
//   .github/workflows/deploy.yml — add e2e job, change deploy needs
//   apps/web/playwright.config.ts — add testIgnore: ['**/_*.spec.ts']
//   .issues/68-test-coverage-gap-backlog/ISSUE.md — mark P0 #1 [x] + ref #69

// Files NOT to touch
//   apps/web/playwright-live.config.ts (live-smoke unchanged)
//   apps/web/tests/e2e/*.spec.ts (no test changes)
//   apps/web/tests/smoke-live/site-smoke.spec.ts (separate testDir)
//   any source file in apps/web/src

// Current job topology (deploy.yml)
//   build (PR + push): lint + typecheck + tests + build [+ pages-artifact if push]
//   deploy (push only, needs: build): deploy-pages
//   smoke (push only, needs: deploy): live playwright

// Target job topology
//   build (PR + push): unchanged
//   e2e (PR + push, needs: build, matrix: chromium + firefox):
//     install + browsers + build + playwright test --project=$BROWSER
//     upload traces + report on failure
//   deploy (push only, needs: [build, e2e]): unchanged
//   smoke (push only, needs: deploy): unchanged
</interfaces>

## Constraints (verbatim summary from CONTEXT.md)

- Single workflow file extended; no new file
- chromium + firefox matrix
- testIgnore via playwright.config.ts (Option A)
- Trace + HTML report uploaded only on failure
- `e2e: needs: build`, `deploy: needs: [build, e2e]`
- Live-smoke retained as second layer
- Cache key for Playwright browsers: `hashFiles('pnpm-lock.yaml')`
- No fake-bug-PR verification (trust green run)
- Update #68 backlog
- DO NOT touch source code, tests, or playwright-live config

## Tasks

<task id="1">
  <title>Exclude non-contract specs from default Playwright config</title>
  <action>
    Edit `apps/web/playwright.config.ts`. Add `testIgnore: ['**/_*.spec.ts']` to the top-level config object (next to `testDir: './tests/e2e'`). This excludes `_visual-iteration.spec.ts` and `_visual-iteration-65.spec.ts` from the default run while keeping them runnable via explicit path (`pnpm exec playwright test apps/web/tests/e2e/_visual-iteration-65.spec.ts`).

    Also add a one-line comment above `testIgnore` explaining the convention: `// _-prefixed specs are non-contract (screenshot generators); excluded from CI gate.`

    Do NOT change `testDir`, projects, webServer, or any other config field.
  </action>
  <verify>
    ```bash
    cd apps/web
    # Confirm visual-iteration specs are excluded:
    pnpm exec playwright test --list 2>&1 | grep -E '_visual-iteration' && echo 'FAIL: visual specs still listed' || echo 'OK: visual specs excluded'
    # Confirm contract specs remain:
    pnpm exec playwright test --list 2>&1 | grep -cE '\.spec\.ts$'  # expected: ~11 contract specs (× 2 projects = ~22 lines, plus per-test entries)
    # Sanity: list shouldn't include _visual-iteration:
    pnpm exec playwright test --list 2>&1 | grep -c '_visual-iteration'  # expected: 0
    # Manual override still works:
    pnpm exec playwright test apps/web/tests/e2e/_visual-iteration-65.spec.ts --list 2>&1 | grep -c '_visual-iteration-65'  # expected: > 0
    ```
  </verify>
  <done>
    `playwright test --list` shows contract specs only; visual-iteration specs are excluded; manual explicit-path invocation still picks them up.
  </done>
</task>

<task id="2">
  <title>Add e2e job to .github/workflows/deploy.yml + update deploy dependency</title>
  <action>
    Edit `.github/workflows/deploy.yml`:

    1. **Update the workflow header comment** to reflect the new topology:
       ```
       # Triggers:
       # - pull_request: build + e2e (no deploy/smoke)
       # - push to main: build + e2e → deploy → live-smoke
       # - workflow_dispatch: manual re-run.
       #
       # Job graph: build → e2e → deploy → smoke
       # e2e covers preview-server contract surface (apps/web/tests/e2e, ~44 tests
       # × 2 browsers); live-smoke covers production-deploy surface (CDN headers,
       # GitHub-Pages path, woff2 delivery).
       ```

    2. **Insert new `e2e` job** between the `build` job and the `deploy` job:
       ```yaml
       e2e:
         needs: build
         runs-on: ubuntu-latest
         strategy:
           fail-fast: false
           matrix:
             browser: [chromium, firefox]
         steps:
           - name: Checkout
             uses: actions/checkout@v4

           - name: Setup pnpm
             uses: pnpm/action-setup@v4

           - name: Setup Node.js
             uses: actions/setup-node@v4
             with:
               node-version: 20
               cache: pnpm

           - name: Install dependencies
             run: pnpm install --frozen-lockfile

           - name: Cache Playwright browsers
             id: playwright-cache
             uses: actions/cache@v4
             with:
               path: ~/.cache/ms-playwright
               key: playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
               restore-keys: |
                 playwright-${{ runner.os }}-

           - name: Install Playwright browsers (with deps)
             # --with-deps installs system libs; harmless if already cached.
             # We install the matrix browser only — the other one waits its turn.
             run: pnpm --filter @sortition/web exec playwright install --with-deps ${{ matrix.browser }}

           - name: Build web bundle
             # Required for vite preview to serve dist/. Build is fast (~5s warm).
             # We don't reuse the build job's pages artifact because that artifact
             # is gated on push events; running our own build keeps PR/push paths
             # symmetric.
             run: pnpm --filter @sortition/web build

           - name: Run Playwright e2e (${{ matrix.browser }})
             run: pnpm --filter @sortition/web exec playwright test --project=${{ matrix.browser }}

           - name: Upload Playwright traces on failure
             if: failure()
             uses: actions/upload-artifact@v4
             with:
               name: e2e-${{ matrix.browser }}-traces-${{ github.run_attempt }}
               path: apps/web/test-results/
               if-no-files-found: ignore

           - name: Upload Playwright HTML report on failure
             if: failure()
             uses: actions/upload-artifact@v4
             with:
               name: e2e-${{ matrix.browser }}-report-${{ github.run_attempt }}
               path: apps/web/playwright-report/
               if-no-files-found: ignore
       ```

    3. **Update `deploy` job dependency**: change `needs: build` to `needs: [build, e2e]` so deploy waits for both. Keep `if: github.event_name == 'push'` unchanged.

    4. Do NOT touch `build`, `smoke`, the concurrency block, or permissions block.
  </action>
  <verify>
    ```bash
    # Workflow YAML syntactically valid:
    python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))" && echo 'OK: yaml valid'

    # New e2e job present, after build, before deploy:
    grep -n '^\s*e2e:' .github/workflows/deploy.yml
    grep -n '^\s*deploy:' .github/workflows/deploy.yml
    grep -A1 '^\s*deploy:' .github/workflows/deploy.yml | grep -q 'needs: \[build, e2e\]' && echo 'OK: deploy needs both' || echo 'FAIL'

    # Matrix browsers present:
    grep -A2 'matrix:' .github/workflows/deploy.yml | grep -E 'chromium|firefox' | wc -l  # expected: 1 (line lists both)

    # Cache step present:
    grep -c 'actions/cache@v4' .github/workflows/deploy.yml  # expected: ≥ 1

    # Failure-upload steps present:
    grep -c 'if: failure()' .github/workflows/deploy.yml  # expected: ≥ 3 (existing smoke + 2 new e2e)

    # Live-smoke unchanged:
    grep -c 'playwright-live.config.ts' .github/workflows/deploy.yml  # expected: 1 (existing smoke)
    ```
  </verify>
  <done>
    Workflow file is valid YAML, e2e job inserted with chromium + firefox matrix + cache + failure uploads, deploy depends on both build and e2e, live-smoke unchanged.
  </done>
</task>

<task id="3">
  <title>Local smoke verification (run e2e once before pushing)</title>
  <action>
    From `apps/web/`, run the full default Playwright config locally once to confirm:
    1. The exclusion of `_visual-iteration*.spec.ts` works
    2. All ~44 contract tests pass on chromium (firefox optional locally if dev env doesn't have it installed)
    3. Wallclock is in the expected ≤6 min range

    ```bash
    cd apps/web
    rm -rf dist test-results playwright-report  # clean slate
    pnpm build
    time pnpm exec playwright test --project=chromium 2>&1 | tail -20
    ```

    Document the wallclock + pass/fail count in EXECUTION.md.

    If any spec FAILS that previously passed on main, this is a pre-existing flake. Document, don't block this issue on it. (The CI will surface the same.)

    If the wallclock is >8 min on chromium alone → STOP, document, escalate. Sharding is out of scope but might need to be reconsidered.
  </action>
  <verify>
    Manual: read the timing output. EXECUTION.md records wallclock + pass/fail/skip counts.
  </verify>
  <done>
    Local chromium e2e green within 6 min wallclock; documented in EXECUTION.md.
  </done>
</task>

<task id="4">
  <title>Update #68 backlog: mark P0 #1 [x] + reference #69</title>
  <action>
    Edit `.issues/68-test-coverage-gap-backlog/ISSUE.md`. Find the "P0 #1" section (`### 1. Volle Playwright e2e-Suite in CI gaten (PR + push)`) and:

    1. Add `**STATUS:** Implementiert via #69 (commit-range siehe dort).` as the first line under the `### 1.` heading.
    2. Convert the section's existing `[ ]` checkboxes (if any explicit AC checkboxes exist) to `[x]` for the items #69 ships. The section was structured as a description, not a checklist, so the change may be just adding the STATUS line — verify by reading the section first.

    Do NOT touch P0 #2 (Audit-signing round-trip — separate issue) or any P1/P2/P3 sections.
  </action>
  <verify>
    ```bash
    grep -A2 '### 1\. Volle Playwright' .issues/68-test-coverage-gap-backlog/ISSUE.md | grep -q 'STATUS.*#69' && echo 'OK: status line present' || echo 'FAIL'
    # P0 #2 untouched:
    grep -A1 '### 2\. Audit-Signing' .issues/68-test-coverage-gap-backlog/ISSUE.md | grep -v STATUS && echo 'OK: P0 #2 untouched'
    ```
  </verify>
  <done>
    #68 P0 #1 has a STATUS line referencing #69. P0 #2 and below untouched.
  </done>
</task>

<task id="5">
  <title>Update issue status + commit + run issue:review</title>
  <action>
    1. Commit each task as its own commit (per CONTEXT.md commit_artifacts: True default; per `.issues/config.yaml` commit format: conventional, no issue prefix on code commits, "65:"/"69:" prefix on docs(issues) commits).

    Suggested commit grouping:
    - Task 1: `chore(playwright): exclude _-prefixed specs from default config`
    - Task 2: `ci(deploy): add e2e job (chromium + firefox) gating deploy`
    - Task 3: (no commit — verification only)
    - Task 4: `69: docs(issues): mark #68 P0 #1 implemented via #69`

    2. Mark issue done:
       ```bash
       cd /root/workspace/.worktrees/69-e2e-ci-gate
       issue-cli store update-status 69-e2e-ci-gate in_progress --worktree "$(pwd)"
       issue-cli store update-status 69-e2e-ci-gate done --worktree "$(pwd)"
       git add .issues/69-e2e-ci-gate/ISSUE.md
       git commit -m "69: docs(issues): mark 69-e2e-ci-gate done"
       ```

    3. **Self-review via /issue:review** before declaring complete:
       ```bash
       cd /root/workspace/.worktrees/69-e2e-ci-gate
       # Spawn the review skill via issue-cli; defaults to all 3 LLMs
       # (claude + codex + gemini) but accepts --tool to single one if
       # rate-limited.
       ```
       The reviewer will examine the diff between `main` and `issue/69-e2e-ci-gate` and produce findings under `.issues/69-e2e-ci-gate/reviews/`. Address any Critical / High findings before shipping. Documented Medium / Low findings can be left in EXECUTION.md as known-followup.

    4. Final commit: `69: docs(issues): execution log for 69-e2e-ci-gate`
  </action>
  <verify>
    ```bash
    # All commits on branch:
    git log --oneline issue/69-e2e-ci-gate ^main

    # Status flipped:
    issue-cli store load 69-e2e-ci-gate --worktree "$(pwd)" --json | grep -q '"status": "done"' && echo 'OK: done'

    # Review artifacts exist:
    ls .issues/69-e2e-ci-gate/reviews/ | grep -E '\.md$' | wc -l  # expected: ≥ 1
    ```
  </verify>
  <done>
    All work committed in conventional commits. Issue status `done`. issue:review run, findings addressed or documented. EXECUTION.md complete.
  </done>
</task>

## Verification Strategy (overall)

- **YAML validity**: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))"`
- **Playwright list**: confirms testIgnore works
- **Local Playwright run on chromium**: validates the actual gate the CI will run
- **No source code changes**: `git diff --stat main...HEAD apps/web/src` should return 0 lines
- **No test file changes**: `git diff --stat main...HEAD apps/web/tests` should return 0 lines (only playwright.config.ts at apps/web/ root)
- **Issue:review pass**: external LLMs validate the workflow YAML changes

## Out of Scope

- Writing new e2e tests (#68 P1 #3, #5 — separate issues)
- A11y axe-core (#68 P1 #8)
- Sharding / parallelism beyond Playwright `fullyParallel`
- Per-PR test summary comment
- Cross-runtime parity (#68 P1 #6)
- Audit-signing round-trip (#68 P0 #2 — separate issue)

## Rollback

Revert the two code commits (`chore(playwright): exclude _-prefixed specs` and `ci(deploy): add e2e job`) on main; visual-iteration specs become CI-eligible again and the e2e job stops running. The change is additive — no destructive ops.

## Estimated Scope

**Small.** ~30 lines added to `.github/workflows/deploy.yml`, 2 lines added to `playwright.config.ts`, 1 line added to `.issues/68-...`/ISSUE.md. Should complete in <1 hour by the executor (most time spent on the local verification run + waiting for CI green on the resulting PR).
