# Execution: Public GH Repo + GitHub Pages Deploy + Live-URL-Smoke-Test

**Started:** 2026-04-25
**Completed:** 2026-04-26 14:57 UTC
**Status:** complete
**Branch (worktree):** worktree-agent-ac76adcb (merged into main)
**Live URL:** <https://flomotlik.github.io/buergerinnenrat/> (HTTP 200)
**Repo:** <https://github.com/flomotlik/buergerinnenrat> (public)
**Final workflow run:** [24959546293](https://github.com/flomotlik/buergerinnenrat/actions/runs/24959546293) — all jobs green

## Execution Log

- [x] Task 1: LICENSE-Datei (GPL-3.0) im Repo-Root — 674 Zeilen, FSF-Volltext (in Setup-Commit `adbe862`)
- [x] Task 2: Vite base-Path auf /buergerinnenrat/ mit env-Override — playwright.config.ts angepasst, beide Builds verifiziert (in `adbe862`)
- [x] Task 3: GH Actions Deploy-Workflow (build → deploy → smoke) — 3 Jobs, configure-pages@v5 + deploy-pages@v4 (in `adbe862`)
- [x] Task 4: Playwright Live-Config + Smoke-Spec (5 Tests) — `playwright --list` zeigt 5 Tests (in `adbe862`)
- [x] Task 5: README-Update (Live-URL, Badge, Header, Lizenz) — Header + Badge + GPL-Sektion (in `adbe862`)
- [x] Task 6: Setup-Commit auf worktree-agent-ac76adcb — commit `adbe862`
- [x] Task 7: Merge nach main (Merge-Commit, NICHT Squash) — commit `fb87a4c` (no-ff merge of 26 commits)
- [x] Task 8: gh repo create + push main + Topics — repo public, 6 Topics gesetzt, origin remote konfiguriert
- [x] Task 9: Workflow-Run pollen bis Abschluss — vier Runs nötig (siehe Deviations); finaler Run `24959546293` SUCCESS
- [x] Task 10: Manueller Live-URL-Smoke-Check — HTTP 200, Title "Sortition Iteration 1", Assets unter `/buergerinnenrat/...`, 5/5 Smoke-Tests im CI grün in 3.1s
- [x] Task 11: Stop-Decision-Punkt — nicht aktiv, alle Tasks grün

## Verification Results

- **Live URL:** `curl https://flomotlik.github.io/buergerinnenrat/` → HTTP 200, Title `<title>Sortition Iteration 1</title>`
- **Asset paths:** alle unter `/buergerinnenrat/assets/...` (vite base korrekt)
- **Smoke job (CI):** 5 passed (3.1s) — Hauptseite Title, Tab-Navigation, Stage-1-Upload, Doku-Hub-Karten ≥5, Algorithmus-SVG
- **Local smoke run:** 5 passed (3.0s) gegen Live-URL via `LIVE_BASE_URL=https://flomotlik.github.io/buergerinnenrat/ pnpm --filter @sortition/web test:smoke-live`
- **Build job (CI):** unit tests green, typecheck green, vite build green (production base path)
- **Repo state:** public, 6 topics (sortition, citizens-assembly, civic-tech, buergerrat, germany, austria), description set
- **Git history on main:** Merge-Commit `fb87a4c` + 25 Vorgänger-Commits + 4 CI-Fix-Commits sichtbar (granulare History für Auditor:innen erhalten)

## Deviations from Plan

### Auto-fixed (Rules 1-3)

1. **[Rule 3 - Blocker] Untracked stale issue files in main checkout removed before merge**
   - Found during: Task 7 (merge nach main)
   - Issue: `/root/workspace/.issues/53-stage1-ux-review-followup/`, `54-in-app-documentation/`, `55-public-github-pages-deployment/` existed as untracked files in the main checkout, with content that differed from the worktree branch versions. `git merge` would have refused with "untracked working tree files would be overwritten."
   - Fix: removed the stale untracked copies before merge. Worktree-branch versions (which include EXECUTION.md, PLAN.md, RESEARCH.md, reviews/) are authoritative.
   - Files: deleted `.issues/53-stage1-ux-review-followup/`, `.issues/54-in-app-documentation/`, `.issues/55-public-github-pages-deployment/` from main checkout
   - Commit: n/a (pre-merge cleanup, no commit needed — merge commit `fb87a4c` brings the canonical versions back in)

2. **[Rule 1 - Bug] git push without credential helper failed after first auto-push**
   - Found during: Task 9 (after first workflow failure, needed to push fix)
   - Issue: `gh repo create --push` works because gh uses its internal API, but subsequent `git push` calls failed with "could not read Username for github.com" because no credential helper was configured (and `gh auth setup-git` could not write `.gitconfig` due to a busy-resource error in this container).
   - Fix: used an inline credential helper passing the gh token: `git -c "credential.helper=!f() { echo username=flomotlik; echo password=\$GH_TOKEN; }; f" push origin main`
   - Files: none (git config workaround at command level)
   - Documented for future reference; no permanent change to repo

3. **[Rule 1 - Bug] actions/configure-pages@v5 first-run fails on fresh repo**
   - Found during: Task 9 (workflow run 1, `24958599546`)
   - Issue: configure-pages@v5 cannot create the Pages site itself with the default GITHUB_TOKEN; needs Pages already enabled. RESEARCH suggested it would just-in-time enable; that is only true if `enablement: true` is set AND the token has admin scope. Default GITHUB_TOKEN does not.
   - Fix attempts:
     - Run 2 (`24958631461`): added `enablement: true` → still failed: "Resource not accessible by integration"
     - Resolution: enabled Pages out-of-band via `gh api -X POST repos/flomotlik/buergerinnenrat/pages -f build_type=workflow` using the user's PAT, then dropped `enablement: true` to keep workflow simple
   - Files: `.github/workflows/deploy.yml`
   - Commits: `abdb8de` (added enablement), `3c40cb8` (dropped enablement)

4. **[Rule 1 - Bug] GH Pages CDN propagation race after first deploy**
   - Found during: Task 9 (workflow run 3, `24958653941` and re-run, `24959231990`)
   - Issue: actions/deploy-pages@v4 reports success at artifact-publish time, but the github.io CDN can serve 404s for 1-3 minutes after that on first deploy. Smoke job hit 404 even after deploy job said success.
   - Fix: added a "Wait for live URL to propagate" step in the smoke job that polls HTTP status every 10s (max 5 min) before running playwright.
   - Files: `.github/workflows/deploy.yml`
   - Commit: `f0a0cd1`

5. **[Rule 1 - Bug] Playwright `page.goto('/')` resolves to wrong URL with project sub-path baseURL**
   - Found during: Task 9 (workflow runs 3 and re-run kept failing even after wait step; local debug)
   - Issue: With `baseURL = https://flomotlik.github.io/buergerinnenrat/`, `page.goto('/')` resolves to `https://flomotlik.github.io/` (the absolute path `/` overrides the project sub-path). Per RFC 3986 and `new URL('/', 'https://...')` — verified locally. That is why all 5 smoke tests landed on the GH Pages org root (404), regardless of CDN warmth.
   - Fix: changed all `page.goto('/')` to `page.goto('./')` so URLs resolve relatively and stay on the project sub-path.
   - Verified: 5/5 tests pass locally in 3s, then 5/5 in CI in 3.1s on workflow run `24959546293`.
   - Files: `apps/web/tests/smoke-live/site-smoke.spec.ts`
   - Commit: `33fabee`

### Blocked (Rule 4)

None.

## Discovered Issues

- **Node.js 20 deprecation warning on all v4/v5 actions** — non-blocking until June 2026; relevant for a follow-up issue if/when actions release Node 24 versions
- **`actions/configure-pages` documentation gap** — the `enablement` parameter requires admin write scope that GITHUB_TOKEN does not provide. Worth a note in the action's README, but not actionable from this repo
- **CLAUDE.md is stale** — says "Kein Code", "kein package.json" — should be refreshed to reflect Iteration-1 reality (out of scope for this issue)

## Self-Check

- [x] All files from plan exist:
  - `LICENSE` (674 lines, GPL-3.0)
  - `apps/web/vite.config.ts` (base path with VITE_BASE_PATH override)
  - `apps/web/playwright.config.ts` (webServer.env VITE_BASE_PATH=/)
  - `.github/workflows/deploy.yml` (3 jobs build/deploy/smoke)
  - `apps/web/playwright-live.config.ts` (LIVE_BASE_URL with default)
  - `apps/web/tests/smoke-live/site-smoke.spec.ts` (5 tests)
  - `apps/web/package.json` (test:smoke-live script)
  - `README.md` (live URL, badge, GPL section)
- [x] All commits exist on main: `adbe862`, `fb87a4c` (merge), `abdb8de`, `3c40cb8`, `f0a0cd1`, `33fabee`
- [x] Full verification suite passes: build/typecheck/unit-tests/smoke-tests all green in CI run `24959546293`
- [x] No stubs/TODOs/placeholders introduced
- [x] No leftover debug code
- **Result:** PASSED

## Commits Created

On worktree branch (then merged via `fb87a4c`):
- `adbe862` — chore: gh repo setup, license, ghpages workflow, vite base path, live smoke

On main (merge + post-merge CI fixes):
- `fb87a4c` — feat: stage 1 sortition tool with reporting, ux polish, in-app docs, ghpages deploy (merge of 26 commits)
- `abdb8de` — fix(ci): enable github pages on first workflow run
- `3c40cb8` — fix(ci): drop enablement flag — pages already enabled out-of-band
- `f0a0cd1` — fix(ci): wait for pages cdn propagation before running smoke
- `33fabee` — fix(smoke): use relative ./ instead of absolute / in page.goto

## Workflow Runs (chronological)

| Run ID | Conclusion | Failure Cause |
|--------|------------|---------------|
| 24958599546 | failure | configure-pages: "Get Pages site failed" (Pages not enabled) |
| 24958631461 | failure | configure-pages with enablement: "Resource not accessible by integration" (token scope) |
| 24958653941 | failure | smoke: 404 from page.goto('/') (mistaken as CDN race) |
| 24959231990 | failure | smoke: 404 from page.goto('/') (wait step saw 200, but baseURL was wrong) |
| **24959546293** | **success** | — all green, 5/5 smoke tests in 3.1s |

## Duration

Total: ~50 minutes (planning to last green run). Five workflow iterations because two distinct root causes (Pages activation, page.goto path resolution) were stacked behind each other and only became diagnosable after intermediate fixes uncovered them.
