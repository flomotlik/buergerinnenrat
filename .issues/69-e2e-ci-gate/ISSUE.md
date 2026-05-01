---
id: '69'
title: Wire Playwright e2e suite into CI gate (PR + push)
status: done
priority: critical
labels:
- ci
- testing
- quality
- blocker
- from-#68
---

## Kontext

Erstes konkretes Sub-Issue aus dem Test-Coverage Backlog **#68 P0 #1**. Drei-LLM-Review (Claude Opus 4.7, Codex GPT-5.4, Gemini 3.1 Pro Preview) hat dies einstimmig als Critical-Finding markiert.

**Heutige Realität (2026-05-01):**

`.github/workflows/deploy.yml` Build-Job läuft `lint → typecheck → packages tests → web vitest run → web build`. Der einzige Playwright-Aufruf ist die Live-Smoke nach Deploy (`tests/smoke-live/site-smoke.spec.ts`, 1 Spec, 6 Tests). Die volle e2e-Suite (`apps/web/tests/e2e/`, 12 Spec-Files, ~80 Tests) läuft **gar nicht in CI** — weder auf PR noch auf Push.

**Konkretes Schadensbeispiel von heute:** Nach #65-Merge brach der Live-Smoke (5/6 Tests) weil `tab-stage1/docs/stage3` jetzt `md:hidden` ab Desktop-Viewport sind. Symptom wurde 30 min post-merge entdeckt (Live-Smoke-Run), Fix in Commit `cb9d6e1`. Hätte die e2e-Suite vor Merge gegated, wäre der Fail bei Code-Review-Time aufgefallen.

## Ziel

Volle Playwright-e2e-Suite in CI gate. Auf `pull_request` UND `push` zu main. Vor Deploy. Trace-Upload bei Failure.

## Acceptance Criteria

### Kern-Wiring

- [ ] Neuer Job `e2e` in `.github/workflows/deploy.yml`, läuft nach `build`-Job (oder nutzt dist-Artifact aus build)
- [ ] Trigger: `pull_request: branches: [main]` UND `push: branches: [main]`
- [ ] Browsers: chromium + firefox (matches `apps/web/playwright.config.ts:15-26`)
- [ ] `pnpm install --frozen-lockfile` + `pnpm --filter @sortition/web exec playwright install --with-deps chromium firefox`
- [ ] Run: `pnpm --filter @sortition/web exec playwright test --config=playwright.config.ts`
- [ ] Trace upload bei Failure: `actions/upload-artifact@v4`, path `apps/web/test-results/`, name `e2e-traces-${{ matrix.browser || 'all' }}`
- [ ] Deploy-Job dependency: `needs: [build, e2e]` so deploy nur nach grünem e2e läuft
- [ ] PR-Run (kein deploy/smoke) muss e2e-grün haben um mergebar zu sein

### Visual-Iteration-Specs ausschließen

- [ ] **Vor dem Wiring**: `_visual-iteration*.spec.ts` aus dem Default-Playwright-Config ausschließen (Konsens-Finding Claude L1 + Codex M4). Sie sind Screenshot-Generatoren ohne Contract-Assertions; im CI-Gate würden sie Slots verbrauchen ohne Signal zu liefern.
- [ ] Option A: `playwright.config.ts` `testIgnore: ['**/_*.spec.ts']`
- [ ] Option B: Specs nach `apps/web/tests/screenshots/` verschieben (aus `testDir`-Scope raus)
- [ ] Empfehlung: Option A (kleinerer Diff, Konvention `_*` als "non-contract" ist bereits in den Spec-Headern dokumentiert)

### Performance-Budget

- [ ] CI-Wallclock unter 8 min für e2e-Job (chromium + firefox parallel via Playwright `fullyParallel: true` aus playwright.config.ts:6)
- [ ] Optional: Sharding via `--shard 1/2 + 2/2` wenn nötig
- [ ] Browser-Install gecached via `actions/cache@v4` Key auf `playwright-version` aus pnpm-lock

### Live-Smoke beibehalten

- [ ] Live-Smoke (`tests/smoke-live/`) bleibt als zweiter Layer — verifiziert deployed CDN/Bundle, was preview-server e2e nicht kann (Cloudflare-Pages-Headers, woff2-Auslieferung, real GitHub-Pages-Pfad)
- [ ] Ablauf: PR/push e2e (preview server) → push deploy → push live-smoke (deployed URL)

### Verifikation

- [ ] Gefakter Bug einbauen + PR aufmachen → e2e schlägt fehl → CI rotgrün im PR-Status
- [ ] Bug rückgängig machen → grün
- [ ] Trace-Artifact in Failure-Run downloadbar
- [ ] Bestehender Build-Job läuft weiter (lint/typecheck/vitest)
- [ ] Bestehender Live-Smoke nach Deploy läuft weiter
- [ ] PR-Run NICHT deploy/smoke (nur build + e2e)

### Dokumentation

- [ ] PR-Beschreibung beschreibt warum e2e-in-CI matters (verweist auf #68 P0 #1, smoke-fail-Incident `cb9d6e1`)
- [ ] Update `.github/workflows/deploy.yml` Header-Kommentar mit der neuen Trigger/Job-Topologie
- [ ] Optional: kurze Notiz in `apps/web/tests/README.md` über `_*.spec.ts` Konvention (non-contract specs)

### Sub-Issue-Tracking

- [ ] In #68 ISSUE.md: P0 #1 als `[x]` markiert mit Verweis auf diese Issue (#69)

## Out of Scope

- Andere P0-Items aus #68 (z.B. Audit-Signing Round-Trip — eigene Issue)
- Neue e2e-Tests schreiben — nur das Wiring der bestehenden ~80 Tests in CI
- A11y-Upgrade (#68 P1 #8)
- Performance-Tuning der Tests selbst (separate Issue wenn nötig)
- TS↔Python Cross-Validation (#68 P1 #6)

## Verweise

- Tracking-Issue: #68
- Reviews: `.issues/test-coverage-gap-audit/reviews/` (Claude C1, Codex C1, Gemini C1)
- Auslöser-Incident: live-smoke fail nach #65-Merge (commit `cb9d6e1`)
- Aktuelle Workflow: `.github/workflows/deploy.yml`
- Default Playwright config: `apps/web/playwright.config.ts`
- Live-Smoke config: `apps/web/playwright-live.config.ts`
- Visual-iteration specs: `apps/web/tests/e2e/_visual-iteration.spec.ts`, `apps/web/tests/e2e/_visual-iteration-65.spec.ts`
