---
review_of: 69-e2e-ci-gate
review_type: issue
review_mode: implementation
reviewed_at: 2026-05-01T10-10-22Z
tool: claude
model: claude-opus-4-7
duration_seconds: 190
---

# Review — Issue #69 (e2e-ci-gate)

**Branch:** `issue/69-e2e-ci-gate`
**Reviewer:** Claude (Opus 4.7)
**Date:** 2026-05-01
**Scope:** 4 code commits (`87f0af9`, `cfc1951`, `aa5264f`, `a9dd94e`) + plan/research docs

## Summary

The change wires the full Playwright e2e suite (chromium + firefox) into the deploy
workflow as a hard gate before push-to-main deploy, and excludes
`_*-prefixed` non-contract specs from the default Playwright config. The
implementation is clean, the documentation is good, and the design choices
(rebuild over artifact reuse, matrix over sharding, cache + restore-keys, trace
upload only on failure) are all defensible. Findings below are mostly
Low/Info; one Medium around the choice of cache-key file.

---

## 1. YAML correctness

**No findings.**

Indentation is internally consistent across `build`, `e2e`, `deploy`, `smoke`.
`strategy:` / `matrix:` / `browser:` are nested correctly under the e2e job
(`deploy.yml:79-82`). All `${{ ... }}` interpolations are valid:

- `key: playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}`
  (`deploy.yml:104`) — interpolation in a key value, fine.
- `name: Run Playwright e2e (${{ matrix.browser }})` (`deploy.yml:126`) — fine.
- `run: ... --project=${{ matrix.browser }}` (`deploy.yml:127`) — fine.
- Artifact names with `${{ github.run_attempt }}` (`deploy.yml:133, 141`) —
  guarantees unique artifact names across re-runs of the same workflow. Good.
- `needs: [build, e2e]` (`deploy.yml:147`) — array-form, correct.
- `needs: deploy` on smoke (`deploy.yml:159`) — scalar, also correct.

Sanity-checked the file would parse as YAML by visual inspection; flow scalars
(`'/'`, `'pages'`) are quoted where ambiguity could arise (e.g.
`VITE_BASE_PATH: '/'` at `deploy.yml:123`).

## 2. Cache-key correctness for Playwright browsers

### Finding 2.1 — Cache key hashes pnpm-lock.yaml instead of the file that pins Playwright (Medium)

The cache key at `deploy.yml:104` is:

```yaml
key: playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
```

**Problem:** `pnpm-lock.yaml` mutates whenever any workspace dep version moves
(transitive deps, `@kobalte/core`, `vitest`, `tailwindcss`, etc.). In a
multi-package workspace this happens on a large fraction of PRs. Each such
change forces a cache miss for a key that has nothing to do with browser
versions. The workspace pins `@playwright/test` at exactly `1.49.1`
(`apps/web/package.json:30`), and that version moves rarely — that's the file
that should drive browser cache invalidation.

**Recommended fix:**

```yaml
key: playwright-${{ runner.os }}-${{ hashFiles('apps/web/package.json') }}
restore-keys: |
  playwright-${{ runner.os }}-
```

(Or specifically hash a Playwright-version-extracting expression; pinning to the
package.json that owns the dep is the simple, correct choice.)

**Why this is Medium and not High:** The `restore-keys: playwright-${{ runner.os }}-`
fallback (`deploy.yml:105-106`) means a cache miss falls back to the most-recent
older cache. After a stale-cache restore, `playwright install --with-deps`
detects existing browsers and is effectively a no-op, so this is wasted I/O
rather than a correctness bug. But over many PRs the false-invalidation
churn matters; it's also conceptually wrong (the cache says it's keyed on
"the thing that determines what Playwright needs", and pnpm-lock.yaml does not
actually represent that).

### Finding 2.2 — `--with-deps` reinstalls system libraries every run regardless of cache (Info)

`playwright install --with-deps` runs apt-get under the hood. The Playwright
browser binaries are cached at `~/.cache/ms-playwright`, but the system
dependencies (apt packages) are not — they reinstall on every job. ~30–60s per
matrix entry. Acceptable, but worth a comment in the YAML so a future reader
doesn't expect "cache hit = fast".

If you ever care, drop `--with-deps` after the first successful install
verifies that ubuntu-latest already has what's needed. Not blocking.

## 3. Job-dependency graph correctness

**No correctness findings.** Walking through the cases:

- **PR (push event = `pull_request`):** `build` → `e2e` (matrix) → both succeed →
  `deploy` evaluates `if: github.event_name == 'push'` → false → skipped.
  `smoke` `needs: deploy`; deploy was skipped, so smoke is skipped (skip
  cascade). Plus smoke has the same push-only `if:` belt-and-suspenders.
  Correct.

- **Push to main, e2e succeeds:** `build` → `e2e` (matrix, both green) →
  `deploy` runs (push event + `success()` over needs holds implicitly) →
  `smoke` runs.

- **Push to main, e2e fails:** GitHub's documented behavior is that a custom
  `if:` does NOT bypass the implicit `success()` over `needs:` UNLESS the
  expression contains a status function (`success()`, `always()`, `failure()`,
  `cancelled()`). `if: github.event_name == 'push'` contains no such function,
  so the implicit `success()` is still ANDed in. Net effect: deploy is skipped
  when e2e fails. Correct, but worth a comment in the YAML pinning this
  invariant — if a future maintainer ever rewrites this as
  `if: always() && github.event_name == 'push'`, they would silently lose the
  e2e gate.

### Finding 3.1 — Pin the failure-cascade invariant in a comment (Low)

Add at `deploy.yml:146` (above `if: github.event_name == 'push'`):

```yaml
# NOTE: Do not rewrite this `if:` to use always() / !cancelled() — the
# implicit success() over `needs: [build, e2e]` is what gates deploy on a
# green e2e. A status-function expression here would let deploy run even
# if e2e fails.
```

### Observation 3.2 — Could lint/typecheck/unit-tests run in parallel with e2e? (Info)

The `build` job (`deploy.yml:31-74`) does lint → typecheck → unit-tests → build
serially before e2e even starts. Splitting these into a parallel `verify` job
that runs alongside e2e (and gates deploy on `needs: [verify, e2e]`) would
shave wallclock; e2e at ~5 min becomes the long pole, today
~3 min of build-job preamble blocks it from starting.

Out of scope for this issue — flagging for a follow-up.

## 4. Re-running `pnpm build` in the e2e job

**No findings.** The tradeoff is documented in the YAML comments
(`deploy.yml:113-121`) and the right call was made. Specifically:

- The `build` job's pages artifact is push-only AND uses
  `base: '/buergerinnenrat/'` — neither suits e2e, which runs on PR and needs
  `base: '/'` to match `vite preview`'s default mount path.
- Splitting the build job into "build for deploy + build for e2e" would add
  artifact upload/download wallclock that's likely larger than the ~5 s warm
  rebuild it would save.
- The `VITE_BASE_PATH=/` env var (added in `aa5264f`) at the e2e build step
  (`deploy.yml:122-124`) correctly cooperates with
  `playwright.config.ts:21-23` — both build and preview see the same base path.
  Verified by reading `apps/web/vite.config.ts:36-37`:
  `base: process.env.VITE_BASE_PATH ?? '/buergerinnenrat/'`.

The original `cfc1951` commit was missing the `VITE_BASE_PATH` env, which would
have produced HTML with `/buergerinnenrat/` asset paths served from `/` — broken.
The follow-up `aa5264f` fixes it. Worth verifying once via a CI run that the
chromium e2e actually loads `index.html` on first push.

## 5. Subtle breakage risk to existing build/deploy/smoke jobs

**No correctness findings.**

- Header comment at `deploy.yml:3-11` accurately describes the new graph (PR =
  build + e2e; push = build + e2e → deploy → smoke).
- `deploy: needs: [build, e2e]` (`deploy.yml:147`) — no environment/permission
  side effects. The `environment: github-pages` (`deploy.yml:149-151`) is
  unchanged.
- Concurrency block (`deploy.yml:26-28`) still works:
  - On push: `group: 'pages'`, `cancel-in-progress: false` — multiple pushes
    queue, the e2e/build steps don't get cancelled mid-run.
  - On PR: `group: 'pr-{N}'`, `cancel-in-progress: true` — push a new commit
    to the PR, the prior run (including in-flight e2e matrix jobs) gets
    cancelled. This is the right behavior.
- `pnpm/action-setup@v4` without `version:` reads `packageManager` from
  `package.json` (`pnpm@9.12.3` per root `package.json:5`). Version is therefore
  consistent across all four jobs (`build`, `e2e`×2, `deploy`, `smoke`). Good.
- Live-smoke (`deploy.yml:157-213`) is byte-identical to its prior form aside
  from inheriting `needs: deploy` semantics from before. Unchanged.

## 6. Playwright config correctness

### Finding 6.1 — `testIgnore` glob is broad-by-convention (Low)

`testIgnore: ['**/_*.spec.ts']` (`apps/web/playwright.config.ts:6`) excludes
every `_`-prefixed `.spec.ts`. Today that means `_visual-iteration.spec.ts`
and `_visual-iteration-65.spec.ts`. The convention is documented inline at
`apps/web/playwright.config.ts:5` ("`_`-prefixed specs are non-contract
(screenshot generators); excluded from CI gate.") but is not enforced anywhere.

A future contributor adding an `_internal-helper.spec.ts` might unknowingly
opt out of CI. Two cheap mitigations:

- (a) Move screenshot specs into `apps/web/tests/screenshots/` and use
  `testIgnore: ['**/screenshots/**']` — explicit directory, no name prefix
  magic.
- (b) Add a CI check (or a comment on the spec template) that documents the
  convention.

(a) is a follow-up issue; not blocking #69.

### Note 6.2 — `testIgnore` and explicit-path runs

The PLAN.md (line 73) anticipated that explicit-path invocation
(`pnpm exec playwright test apps/web/tests/e2e/_visual-iteration-65.spec.ts`)
would still pick up the spec, but the actual Playwright behavior is that
`testIgnore` applies regardless of how the spec was selected. The plan's
verification command for that case would currently report 0 — that is a
documentation drift in the plan, not a code bug. Worth correcting in
EXECUTION.md so future readers don't get confused.

If you genuinely need to run the screenshot specs occasionally, you'd run them
with a different config (e.g. `--config=playwright-visual.config.ts`) or
override `testIgnore` on the CLI. Not urgent.

## 7. Anything else

### Finding 7.1 — Action versions are pinned to major (Info)

`actions/checkout@v4`, `actions/setup-node@v4`, `actions/cache@v4`,
`actions/upload-artifact@v4`, `pnpm/action-setup@v4`, `actions/configure-pages@v5`,
`actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`. All major-pinned,
all on current major versions. For a security-sensitive project (audit-signing
trust claim), consider pinning to immutable SHAs via dependabot — but that's a
broader workflow-hygiene policy and not specific to this PR.

### Finding 7.2 — No timeout on the e2e job (Low)

The e2e job has no `timeout-minutes:`. A hung `vite preview` or a runaway
test could chew the default 360-minute timeout. Recommend:

```yaml
e2e:
  needs: build
  runs-on: ubuntu-latest
  timeout-minutes: 15
  strategy:
    ...
```

15 min is comfortably above the expected ~5 min wallclock and bounds the worst
case. Same goes for the smoke job (5-min poll loop + tests; recommend
`timeout-minutes: 10`).

### Finding 7.3 — No `fullyParallel` in playwright.config.ts (Info)

`apps/web/playwright.config.ts` doesn't set `fullyParallel: true`. With
`workers` defaulting to half the available CPUs and tests running sequentially
within a file, GitHub-hosted runners (2-core ubuntu-latest) will have low
parallelism. Local arm64 timing was reportedly ~3.5 min on chromium; CI may
be slower. If you observe e2e wallclock >8 min in practice, add
`fullyParallel: true`. Not blocking.

### Finding 7.4 — Build output paths in upload steps look right (Info)

`apps/web/test-results/` (Playwright's default trace dir) and
`apps/web/playwright-report/` (Playwright's default reporter output) are
correct given the playwright.config.ts. Confirmed neither path was customized
in the config — they'll exist when failures happen.

### Observation 7.5 — STATUS line on #68 P0 #1 (Info)

`a9dd94e` adds the status line as planned. The diff is minimal and clean. No
issue.

---

## Severity tally

| Severity  | Count | Items                                                                  |
|-----------|-------|------------------------------------------------------------------------|
| Critical  | 0     | —                                                                      |
| High      | 0     | —                                                                      |
| Medium    | 1     | 2.1 cache-key file choice                                              |
| Low       | 3     | 3.1 invariant comment, 6.1 glob convention, 7.2 timeout-minutes        |
| Info      | 5     | 2.2, 6.2, 7.1, 7.3, 7.4, 7.5                                           |

## Recommended actions before merge

- **Optional, recommended:** apply Finding 2.1 (change cache hash to
  `apps/web/package.json`) — one-line change, real wallclock value.
- **Optional, low-cost wins:** Findings 3.1 (comment) and 7.2
  (`timeout-minutes: 15` on e2e, `timeout-minutes: 10` on smoke).

None of the findings are blocking. The change is mergeable as-is and the
observed CI green run (chromium + firefox both passing) on this branch confirms
the gate is functional.

---

<verdict value="pass" critical="0" high="0" medium="1">
Sound implementation of the e2e gate. Job graph, concurrency, matrix, and
artifact handling are all correct. One Medium suggestion to tighten the
Playwright cache-key (hash apps/web/package.json instead of the workspace
lockfile) and a few Low/Info follow-ups (timeout-minutes, invariant comment,
testIgnore convention enforcement). Mergeable as-is.
</verdict>

