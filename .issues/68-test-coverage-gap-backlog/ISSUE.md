---
id: '68'
title: 'Test-Coverage Gap Backlog (3-LLM Audit nach #65)'
status: open
priority: high
labels:
- tracking
- backlog
- testing
- ci
- quality
---

## Kontext

**Tracking-Issue.** Sammelt alle Test-Coverage-Gaps, die ein Drei-LLM-Review (Claude Opus 4.7 + Codex GPT-5.4 + Gemini 3.1 Pro Preview) am 2026-05-01 nach dem Merge von #65 (visual redesign) identifiziert hat.

**Ausgelöst durch:** Live-Smoke nach #65-Merge ist gefailt — die Pill-Tabs (`tab-stage1`, `tab-docs`, `tab-stage3`) sind seit #65 `md:hidden` ab Desktop-Viewport und der Live-Smoke-Spec klickte sie weiter. Der Fail wurde inline gefixt (commit `cb9d6e1`), aber er deckte ein größeres CI-Gate-Problem auf: **die volle Playwright-e2e-Suite läuft überhaupt nicht in CI** — weder auf PR noch auf Push. Nur die kleine Live-Smoke (1 Spec, 6 Tests) läuft post-deploy.

Reviews: `.issues/test-coverage-gap-audit/reviews/` (alle drei FAIL, Konsens auf 1 Critical + 8 High + 8 Medium).

**Diese Issue ist kein Implementierungs-Auftrag.** Sie ist ein **Backlog-Anker** — Items werden in eigene Sub-Issues überführt, sobald Priorität sich verschiebt. Ähnlich wie #67 für Polish.

## P0 — sofort filebar (CI-Gate-Lücken, Reproduzierbarkeits-Claim)

### 1. Volle Playwright e2e-Suite in CI gaten (PR + push)

**STATUS:** Implementiert via #69 (commit-range siehe dort).

- **Konsens-Finding:** Claude C1, Codex C1, Gemini C1 — alle drei stimmen.
- **Status:** Build-Job in `.github/workflows/deploy.yml` läuft `lint → typecheck → vitest run → build`. **Kein** `playwright test` (default config). 12 e2e-Specs / ~80 Tests laufen nur lokal.
- **Was zu tun ist:** Neuen `e2e`-Job in deploy.yml nach build, der `pnpm --filter @sortition/web exec playwright test --config=playwright.config.ts` auf chromium + firefox läuft. Trace-Upload bei Failure via `actions/upload-artifact@v4`. Trigger auf `pull_request` UND `push`.
- **Caveat (Codex M4 + Claude L1):** Vor dem Wiring `_visual-iteration*.spec.ts` aus dem Default-Config ausschließen (sind keine Contract-Tests, regenerieren nur Screenshots). `testIgnore: ['**/_*.spec.ts']` oder separate dir.
- **Geschätzter Aufwand:** S (1-2h Konfig + Test-Run-Optimierung)
- **Risiko bei Ignorieren:** Hoch — Regressionen mergen ungebremst (live-smoke-Failure von 2026-05-01 ist genau das Pattern).

### 2. Audit-Signing Round-Trip-Verifikation (Stage 1 + Stage 3)

- **Konsens-Finding:** Claude C3, Codex H3, Gemini M1 — alle drei.
- **Status:** `signStage1Audit` (`apps/web/src/stage1/audit-sign.ts:82-100`) und `signAudit` (`apps/web/src/run/audit.ts:151-169`) erzeugen Signaturen, aber **kein Test importiert den Public Key + verifiziert** via `crypto.subtle.verify`. Der zentrale Trust-Claim des Projekts ("Audit-Protokolle sind Ed25519-signiert, jede Entscheidung ist nachvollziehbar" — Overview.tsx:24-26) ist unverifiziert.
- **Was zu tun ist:**
  - `apps/web/tests/unit/stage1-audit-sign-verify.test.ts` — happy path: signiere Fixture-Doc → importiere Public Key → `crypto.subtle.verify` → muss `true` zurückgeben.
  - Negativ-Test: ein Byte des signierten Body kippen → muss `false` zurückgeben.
  - Gleiches für `apps/web/src/run/audit.ts`.
  - `scripts/verify_audit.py` ist Stage-3-only (REQUIRED_FIELDS @ verify_audit.py:28-42 zeigt Stage-3-Felder). Schreiben/Erweitern: `scripts/verify_stage1_audit.py` für schema_version 0.4.
- **Geschätzter Aufwand:** M (1 Tag inklusive Python-Verifier-Erweiterung)
- **Risiko bei Ignorieren:** Hoch — wenn Signing intern bricht (z.B. falsche Bytes signiert, Encoder-Drift), produzieren wir unverifizierbare Audits in Production. Die zentrale Trust-Promise ist gebrochen, ohne dass irgendein Test feuert.

## P1 — nächster Sprint (post-#65-Lücken)

### 3. Post-#65-Komponenten testen (Overview, Sidebar, Brand, NavGroup)

- **Konsens-Finding:** Claude H1, Codex H1, Gemini H1 — alle drei.
- **Status:** Net-new Code aus PR #1 (gemerged 2026-05-01):
  - `apps/web/src/Overview.tsx` (96 LOC) — keine Tests
  - `apps/web/src/shell/Sidebar.tsx` (125 LOC) — keine Tests
  - `apps/web/src/shell/Brand.tsx` (46 LOC) — keine Tests
  - `apps/web/src/shell/NavGroup.tsx` (18 LOC) — keine Tests
  - Einziger Touchpoint: `_visual-iteration-65.spec.ts` als Screenshot-Anker (kein Contract).
- **Was zu tun ist:**
  - `apps/web/tests/e2e/sidebar-nav.spec.ts` (≥md viewport): 5 NavLinks + 2 disabled Items, `aria-current` aktive Items, `aria-disabled="true"` auf Stage 2/4, Hash flippt korrekt
  - `apps/web/tests/e2e/overview.spec.ts`: hero h1, 2 Workflow-Cards (`overview-card-stage1`, `overview-card-stage3`), 3 Prinzipien-Cards, Stage-2/4-Banner
  - `apps/web/tests/e2e/routing.spec.ts`: parseHash edge cases — `''`, `'#'`, `'#/'`, `'#/foobar'` (catch-all → stage3), `'#/docs/notARoute'` (→ docs/hub), `'#/docs/glossar/<slug>'` deep link
- **Geschätzter Aufwand:** M (1 Tag, ~3 Spec-Files)

### 4. AuditFooter schema-0.4 Field-Rendering-Parity

- **Konsens-Finding:** Claude H2, Codex H2, Gemini H2 — alle drei.
- **Status:** AuditFooter rendert 17 Pflicht-Felder + 4 optionale + 3 Signatur-Felder (`apps/web/src/stage1/AuditFooter.tsx:56-227`). Bestehende e2e-Assertions:
  - `stage1-audit-footer` toBeVisible
  - "Protokoll / Audit" containText
  - "SHA-256" containText
  - `audit-footer-sig-algo` not "noch nicht signiert"
  - `audit-footer-sample-size` (in stage1-sample-size.spec.ts)
  - `audit-footer-derived` + `audit-footer-forced-zero` (in stage1-bands.spec.ts)
  - **Die anderen 14+ Pflicht-Felder werden nirgends asserted.** `selected_indices` `<details>` ist komplett ungetestet.
- **Was zu tun ist:**
  - Option A (e2e): stage1.spec.ts erweitern — Audit-JSON download, parse, walk every field, assert each rendered dd-cell contains the value
  - Option B (component): `@solidjs/testing-library` Component-Test für AuditFooter mit Fixture-Doc, jeder dt-Label asserted, jeder dd-Wert asserted
  - Empfehlung: Option B (schneller, isolierter), Option A als zusätzliche Parity-Sicherung
- **Geschätzter Aufwand:** M (1 Tag)

### 5. Stage 3 RunPanel Contract-Coverage

- **Konsens-Finding:** Claude H4, Codex H4 — zwei.
- **Status:** RunPanel.tsx (285 LOC) hat null Component-Tests, einzige e2e ist end-to-end.spec.ts mit einem chromium-only Test der nur Filename-Pattern checkt (`/^audit-.*\.json$/`). Kein Test für `run-cancel`, `run-progress`, `run-error`, infeasibility-Hint, Quota-Fulfillment-Tabelle, Selected-Panel-Export, Audit-Export-Payload.
- **Was zu tun ist:**
  - `apps/web/tests/e2e/stage3.spec.ts`: upload n=20 fixture → quotas konfigurieren → run → Audit-JSON dekodieren → assert `schema_version`, `engine.id`, `algorithm`, `selected.length === panel_size`, jedes `quota_fulfillment.ok === true`, `selected[]` sortiert
  - `apps/web/tests/unit/run-audit.test.ts`: `inputSha256` stabil, `canonicalQuotas` order-independent, `buildAudit` populiert jedes Feld
  - Zusätzlich: cancel-Test (start → cancel → assert `run-error` mit "abgebrochen"-Text), infeasibility-Test (unmögliche Quoten → `infeasible_quotas`-Hint)
- **Geschätzter Aufwand:** M (1-2 Tage)

### 6. TS↔Python Cross-Validation in CI

- **Finding:** Claude H7 (uniquely identified — Codex/Gemini missed it).
- **Status:** Tools existieren — `scripts/stage1_cross_validate.sh`, `scripts/stage1_reference.py`. CLAUDE.md L4 + Overview.tsx:43-44 versprechen "Bytegleich reproduzierbar mit der Python-Referenz." Aber CI ruft das nie auf.
- **Was zu tun ist:** `cross-runtime-parity` Job in deploy.yml: Python 3.12 setup, ref-deps install, läuft Cross-Validate gegen 3-5 Fixture-Pools (incl. Umlaut-rich + herzogenburg-melderegister-8000), assert identische `selected[]` + canonical Audit-JSON (timestamp gestripped).
- **Geschätzter Aufwand:** M (1 Tag — Python-Setup-Caching, Fixture-Auswahl)

### 7. Mulberry32 Known-Vector + Cross-Runtime-Parity

- **Finding:** Claude H6.
- **Status:** PRNG hat keine direkten Tests. `packages/core/tests/mulberry32.test.ts` existiert nicht. Reproducibility-Claim ist nur transitiv über `stratify` getestet — eine subtile Bit-Shuffle-Regression (z.B. `>>> 16` → `>> 16` Tippfehler) könnte selbst-konsistent kaputt sein.
- **Was zu tun ist:** `packages/core/tests/mulberry32.test.ts` mit (a) known-vector seed=42 → 5-elem Fixture, (b) seed=0 edge case (kein NaN/0-Loop), (c) Period-Sanity (10k Draws ohne early repeat), (d) uint32-Normalisierung (`Mulberry32(2**32) === Mulberry32(0)`), (e) Cross-Runtime-Vector matched `scripts/stage1_reference.py`'s Mulberry32 byte-for-byte.
- **Geschätzter Aufwand:** S (½ Tag)

### 8. A11y-Upgrade mit axe-core

- **Konsens-Finding:** Claude H8 + Gemini M2.
- **Status:** `apps/web/tests/e2e/a11y.spec.ts` ist 32 LOC Skin-Check (input[type=file] zählt, button hat Text, img hat alt, ein h1). Fehlt: axe-core, Focus-Order, Keyboard-Nav, Color-Contrast (oklch token system!), `aria-disabled` auf nav-stage2/4, Landmark-Check.
- **Was zu tun ist:**
  - `pnpm add -D @axe-core/playwright`
  - a11y.spec.ts ersetzen — auf Stage 1, Stage 3, Overview, einer docs subpage je `expect(await new AxeBuilder({ page }).analyze()).toHaveNoViolations()`
  - Tab-Order-Trace durch Stage-1-Form
  - `aria-disabled="true"` Assertion auf Stage 2/4 nav items
- **Geschätzter Aufwand:** M (1 Tag)

### 9. Mobile Touch-Targets für #65-Sidebar erweitern

- **Finding:** Gemini M2.
- **Status:** `mobile-touch-targets.spec.ts:50-168` testet nur die alten Pill-Tabs + docs-Tiles + Stage-1-Controls. Sidebar-Items + Mobile-Toggle nicht abgedeckt.
- **Was zu tun ist:** Erweitern um Sidebar-NavLinks (≥md viewport, dann auch wenn jemand Phase-4-Drawer addiert).
- **Geschätzter Aufwand:** S (½ Tag)

## P2 — wenn Pilot-Kommune sich konkretisiert

### 10. ECDSA-P256 Fallback-Pfad forced-test

- **Finding:** Claude H3, Codex H3.
- **Status:** Beide Signing-Helper haben `try Ed25519 catch ECDSA`. Auf CI/Dev-Runtimes (Chromium 113+, Firefox 130+) feuert der catch nie. Test akzeptiert beides (`expect(['Ed25519','ECDSA-P256-SHA256']).toContain(...)`). Older-Safari-Pfad könnte komplett broken sein, ohne Test-Signal.
- **Was zu tun ist:** `apps/web/tests/unit/audit-sign-ecdsa-fallback.test.ts` — `vi.spyOn(crypto.subtle, 'generateKey')` patcht für Ed25519 → throws `NotSupportedError` → assert `signature_algo === 'ECDSA-P256-SHA256'` + Round-Trip-Verifikation (siehe P0 #2).
- **Geschätzter Aufwand:** S (paar Stunden)

### 11. iso-8859-1: drop oder add detection

- **Konsens-Finding:** Claude H5, Codex M1.
- **Status:** `SupportedEncoding = 'utf-8' | 'windows-1252' | 'iso-8859-1'` (parse.ts:9), aber `decodeBuffer` returns nur utf-8 oder windows-1252 (parse.ts:27-43). iso-8859-1 hat 0 Tests. Real-world DE/AT BMG-Exporte aus alten Systemen kommen in iso-8859-1 — silent decode bug korrupiert Daten.
- **Was zu tun ist:** Entweder (a) iso-8859-1 aus dem Type droppen (1-Liner) und in der Doku win-1252-Fallback dokumentieren, ODER (b) Detection-Heuristik (0x80-0x9f Byte-Range = win-1252-only, sonst iso-8859-1) + Fixture-Tests (€, smart quotes, ß).
- **Geschätzter Aufwand:** S

### 12. `_visual-iteration*.spec.ts` aus Default-Config ausschließen

- **Konsens-Finding:** Claude L1, Codex M4.
- **Status:** Beide visual-iteration-Specs sind in tests/e2e/ und werden vom Default-Playwright-Config gepickt. Sie sind keine Contract-Tests, sondern Screenshot-Generatoren.
- **Was zu tun ist:** `playwright.config.ts` `testIgnore: ['**/_*.spec.ts']` setzen, ODER specs nach `apps/web/tests/screenshots/` verschieben. Vor P0 #1 erledigen, sonst burnen sie CI-Slots.
- **Geschätzter Aufwand:** S (15 min)

### 13. runStage1 Golden-Fixture-Integration

- **Finding:** Codex M2.
- **Status:** `runStage1()` (apps/web/src/stage1/runStage1.ts:55-138) ist Browser-native Glue: Bytes → derived bands → forced-zero → audit build/sign → CSV export. Pieces einzeln getestet, Pipeline-Test fehlt.
- **Was zu tun ist:** Golden-Fixture-Tests für (a) direct-`age_band` CSV, (b) `geburtsjahr`-derived CSV. Assert resulting CSV bytes, selected indices, derived/forced-zero audit metadata, signature presence.
- **Geschätzter Aufwand:** M

### 14. Underfill-Warning Real-Test (statt Placeholder)

- **Finding:** Codex M3.
- **Status:** `packages/core/tests/stage1-stratify.test.ts:205-235` Test "emits a warning when a constructed stratum is genuinely underfilled" endet mit `expect(true).toBe(true)`. Echter Branch ist nicht exercised.
- **Was zu tun ist:** Real Underfill-Fixture oder integration seam erzeugen, assert warning string + Stage-1-UI-Banner-Text.
- **Geschätzter Aufwand:** S

### 15. Solid Component-Test Layer für UI-Module

- **Finding:** Codex M5.
- **Status:** Vitest config ist jsdom-ready (`vite.config.ts:75-79` `.test.tsx` patterns), aber Suite ist komplett helper- + browser-getrieben. Keine Component-Tests für Overview, Sidebar, AuditFooter, RunPanel.
- **Was zu tun ist:** `pnpm add -D @solidjs/testing-library`. Foundation: AuditFooter (P1 #4), Overview (P1 #3), QuotaEditor (P2 #19), RunPanel (P1 #5). Cheap render/state-regression layer zwischen pure-function-tests und Playwright.
- **Geschätzter Aufwand:** M (Foundation), dann S pro Component

### 16. Stage1AuditDoc Canonical-JSON Golden-Fixture

- **Finding:** Claude M2.
- **Status:** stage1-audit.test.ts asserted Round-Trip-Determinism + alphabetisch-kleinster Top-Level-Key. Aber kein Snapshot gegen frozen Fixture. Schema-Migration (0.4 → 0.5) hätte keinen Baseline.
- **Was zu tun ist:** `packages/core/tests/fixtures/stage1-audit-0.4.golden.json` + `packages/core/tests/stage1-audit.golden.test.ts` mit `expect(canonicalStage1Json(builtDoc)).toBe(goldenContent)` (timestamp stripped). Schema-Bump = explizites Regen-Commit.
- **Geschätzter Aufwand:** S

### 17. 100k-Row Performance-Budget Tests

- **Finding:** Claude M1.
- **Status:** Größter synthetischer Test ist N=10000. Doku verspricht "Stage 1 sub-second". Eine O(N²)-Regression würde erst bei realer 50-100k Melderegister-CSV auffallen.
- **Was zu tun ist:** `packages/core/tests/stage1-perf.test.ts` (stratify auf 100k < 5s) + `apps/web/tests/unit/csv-parse-perf.test.ts` (parseCsvBuffer auf 100k-row CSV < 2s).
- **Geschätzter Aufwand:** S

### 18. Live-Smoke decodes Audit-JSON

- **Finding:** Claude M4.
- **Status:** Live-Smoke verifiziert nur dass Seite lädt, Tabs navigieren, CSV-Upload-Field existiert. Kein actual draw, keine Audit-Verifikation gegen deployed Bundle.
- **Was zu tun ist:** Eine zusätzliche Live-Smoke: small fixture upload, target_n=10, audit-JSON download, parse + assert `schema_version === '0.4'`, `selected_indices.length === 10`, `signature.length > 0`. Bleibt im 3-min Smoke-Budget.
- **Geschätzter Aufwand:** S

### 19. QuotaEditor Component-Test

- **Finding:** Claude M8.
- **Status:** quota-model.test.ts deckt validateQuotas ab. QuotaEditor.tsx (215 LOC UI-Logik) ist nur via csv-import.spec.ts:35-40 toBeVisible exercised.
- **Was zu tun ist:** `@solidjs/testing-library` Component-Test: render mit Fixture-Rows, simulate add → fill bounds → invalid bounds → assert error message inline rendert. ~80 LOC.
- **Geschätzter Aufwand:** S (depends on #15)

### 20. De-fragilize Text-Match-Assertions

- **Finding:** Claude M7.
- **Status:** `stage1-bands.spec.ts:30,49,77,117` und `stage1-stratify.test.ts:107` asserten verbatim deutsche Strings ("5 Auswahl", "Bevölkerungsgruppen", "Lücke zwischen Band a", literal warning string `[["district","tiny"]] unter-vertreten...`). Copy-Edit-Drift bricht unrelated tests.
- **Was zu tun ist:** Replace mit Strukturassertions (`getByTestId`-Counts, parsed `r.warnings[0]` substring instead of full message). `apps/web/tests/README.md` mit Konvention.
- **Geschätzter Aufwand:** S

## P3 — Polish

### 21. End-to-End.spec.ts Split (fast/slow)

- **Finding:** Claude M6.
- **Status:** end-to-end.spec.ts hat 60s Timeout, läuft engine-a HiGHS-WASM init + maximin n=100, audit-Download nur chromium.
- **Was zu tun ist:** Split in (a) fast smoke n=20/panel=6 single quota für beide Browser, (b) full quota+audit single-browser slow lane. `run-progress` text changes asserten.
- **Geschätzter Aufwand:** S

### 22. applyMapping Edge-Cases + Hamilton-SVG empty axes

- **Finding:** Claude L2 + L3.
- **Status:** Beide Low-Priority Coverage-Holes.
- **Was zu tun ist:** 2-3 Cases zu `csv-parse.test.ts:141-149` (missing source values, duplicate target fields, empty rows). 1 Case zu `hamilton-svg.test.ts` für `axes=[]`-degenerate-bucket.
- **Geschätzter Aufwand:** S

## Akzeptanz-Kriterium für diese Issue

- [ ] Diese Issue bleibt offen, bis alle 22 Items entweder in Sub-Issues überführt, abgelehnt, oder mitgemerged wurden
- [ ] Bei Sub-Issue-Erstellung: in dieser Issue als Erledigt markieren (Checkbox + Verweis)
- [ ] Issue wird **nicht** zu einer Sammel-PR — jedes Item ist eigene Implementierung

## Verweise

- Reviews: `.issues/test-coverage-gap-audit/reviews/` (Claude FAIL 3C/8H/8M, Codex FAIL 1C/4H/5M, Gemini FAIL 1C/2H/2M)
- Auslöser: live-smoke fail nach #65-Merge (commit `cb9d6e1` fixt das Symptom; diese Issue trackt die strukturellen Lücken)
- Verwandte Issues: #67 (future polish), #65 (visual redesign — gemerged), #66 (Stage-3 honest copy — gemerged)
- CI: `.github/workflows/deploy.yml` (PR-Trigger gerade hinzugefügt, e2e-Suite NICHT gegated)
