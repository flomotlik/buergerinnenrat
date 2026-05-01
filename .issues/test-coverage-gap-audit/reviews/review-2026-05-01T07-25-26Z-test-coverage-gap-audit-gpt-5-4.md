---
review_of: test-coverage-gap-audit
review_type: topic
review_mode: topic
review_topic: Test coverage gap audit — unit / integration / e2e / smoke / CI
reviewed_at: 2026-05-01T07-25-26Z
tool: codex
model: gpt-5.4
duration_seconds: 357
---

<review>

<findings>

<finding severity="critical" id="C1">
  <title>Preview-server Playwright suite is not part of any CI gate</title>
  <location>.github/workflows/deploy.yml:51</location>
  <description>The build job runs lint, typecheck, package tests, web unit tests, and build only (.github/workflows/deploy.yml:45-58). The only Playwright invocation is the post-deploy live smoke job on push, and it targets apps/web/playwright-live.config.ts via `tests/smoke-live` (.github/workflows/deploy.yml:84-131; apps/web/playwright-live.config.ts:9-27). In contrast, the real browser suite is configured in apps/web/playwright.config.ts:3-27 to run the whole `apps/web/tests/e2e` directory against a local preview server in both Chromium and Firefox. That means regressions in apps/web/tests/e2e/stage1.spec.ts:16-307, stage1-sample-size.spec.ts:38-183, stage1-bands.spec.ts:33-144, end-to-end.spec.ts:14-58, docs.spec.ts:4-61, and the rest can merge on PRs and ship on push without any pre-deploy signal.</description>
  <fix>Add a dedicated PR/push Playwright job that builds once and runs `pnpm --filter @sortition/web exec playwright test --config=playwright.config.ts` before deploy; upload traces on failure; keep live smoke as a second layer, not the only browser gate.</fix>
</finding>

<finding severity="high" id="H1">
  <title>Post-#65 Overview and sidebar chrome ship without contract tests</title>
  <location>apps/web/src/Overview.tsx:20</location>
  <description>The new landing route renders workflow cards, the Stage-2/4 outside-tool note, and principle cards at apps/web/src/Overview.tsx:20-91, while the new md+ sidebar renders brand, grouped nav, active state, and disabled Stage-2/4 items at apps/web/src/shell/Sidebar.tsx:63-123 and Brand.tsx:13-43. I did not find any contract test that asserts `#/overview`, `nav-overview`, `primary-nav`, sidebar `aria-current`, or the disabled-hint behavior. The only direct Overview exercise is a screenshot anchor in apps/web/tests/e2e/_visual-iteration-65.spec.ts:62-99, whose header explicitly says it is “not a contract test” (apps/web/tests/e2e/_visual-iteration-65.spec.ts:1-16). The a11y and mobile suites also miss this surface: apps/web/tests/e2e/a11y.spec.ts:7-31 never leaves the default route, and mobile-touch-targets.spec.ts:50-168 checks only pill tabs, docs, and Stage-1 controls.</description>
  <fix>Add a `overview-sidebar.spec.ts` contract suite that covers `#/overview` routing from App.tsx:81-108, sidebar link clicks and active state, disabled Stage-2/4 hints, Overview card navigation to Stage 1/3, unique h1 behavior, and md+/mobile navigation expectations.</fix>
</finding>

<finding severity="high" id="H2">
  <title>AuditFooter renders schema-0.4 fields that the UI tests do not assert</title>
  <location>apps/web/src/stage1/AuditFooter.tsx:57</location>
  <description>The footer now renders the expanded schema-0.4 provenance surface, including `tie_break_rule`, `key_encoding`, `stratum_sort`, `seed_source`, `input_csv_filename`, `input_csv_size_bytes`, `actual_n`, `selected_indices`, `warnings`, `duration_ms`, and the signature/public-key chrome (apps/web/src/stage1/AuditFooter.tsx:57-130,200-226). Current browser assertions are much narrower: stage1.spec.ts:83-90 only checks that the footer exists, mentions SHA-256, and is signed; stage1-sample-size.spec.ts:99-133 only checks the optional Bemessung block; stage1-bands.spec.ts:100-123 only checks derived-columns and forced-zero blocks. The data object is well-covered in packages/core/tests/stage1-audit.test.ts:185-433, but the rendering layer can still mislabel, omit, or truncate mandatory fields without a failing test.</description>
  <fix>Add a focused AuditFooter test backlog item: one jsdom/component test with a fully-populated Stage1AuditDoc fixture, plus one e2e parity test that downloads the audit JSON and cross-checks visible footer values against it.</fix>
</finding>

<finding severity="high" id="H3">
  <title>Signature helpers are smoke-tested but never verified round-trip</title>
  <location>apps/web/src/stage1/audit-sign.ts:25</location>
  <description>The Stage-1 signer has separate Ed25519 and ECDSA-P256-SHA256 implementations and a runtime fallback chain (apps/web/src/stage1/audit-sign.ts:25-63,82-99). The corresponding unit file only checks that fields are populated, that the stripped canonical JSON is what gets signed, and that the input object is not mutated (apps/web/tests/unit/stage1-audit-sign.test.ts:35-62). There is no `crypto.subtle.verify` round-trip, no forced test of the Ed25519 branch, no forced test of the ECDSA fallback branch, and no known-vector coverage. Stage 3 has the same class of gap: apps/web/src/run/audit.ts:111-168 implements signing, but there is no direct test for `signAudit()` at all.</description>
  <fix>Add explicit verification tests for both algorithms: generate keys, sign a known canonical body, verify it with Web Crypto, and add a fallback-forcing test that proves the ECDSA path stays valid when Ed25519 is unavailable.</fix>
</finding>

<finding severity="high" id="H4">
  <title>Stage-3 RunPanel is covered only by smoke-level happy-path checks</title>
  <location>apps/web/src/run/RunPanel.tsx:20</location>
  <description>The Stage-3 panel owns start/cancel behavior, progress, logs, infeasibility messaging, quota-fulfillment rendering, selected-panel export, and audit export (apps/web/src/run/RunPanel.tsx:20-68,112-278). The only end-to-end Stage-3 spec, apps/web/tests/e2e/end-to-end.spec.ts:14-58, stops once a result appears and the export buttons are visible; csv-import.spec.ts:28-40 stops even earlier when `run-panel` becomes visible. No test asserts `run-cancel`, `run-progress`, `run-error`, log rendering, quota table correctness, selected row count vs panel size, or the JSON payload produced by apps/web/src/run/audit.ts:73-168.</description>
  <fix>Create a Stage-3 contract suite that covers success, cancel, infeasible quotas, and audit export content, and add direct unit tests for `buildAudit`, `inputSha256`, `selectedToCsv`, and `signAudit`.</fix>
</finding>

<finding severity="medium" id="M1">
  <title>CSV encoding contract mentions ISO-8859-1, but code and tests only prove UTF-8 and Windows-1252</title>
  <location>apps/web/src/csv/parse.ts:9</location>
  <description>`SupportedEncoding` advertises `utf-8 | windows-1252 | iso-8859-1` (apps/web/src/csv/parse.ts:9), but `decodeBuffer()` only ever returns `utf-8` or `windows-1252` (apps/web/src/csv/parse.ts:27-42). The unit suite matches that narrower reality: csv-parse.test.ts:18-56 exercises UTF-8, BOM, CRLF, separator detection, and a Windows-1252 fallback only. There is no ISO-8859-1 fixture, no separate decode branch, and no assertion that the third declared encoding is distinguishable.</description>
  <fix>Either add a real ISO-8859-1 fixture plus a code path that labels it explicitly, or remove `iso-8859-1` from the supported-encoding surface so the tests and implementation describe the same contract.</fix>
</finding>

<finding severity="medium" id="M2">
  <title>runStage1 has no direct golden-fixture integration test</title>
  <location>apps/web/src/stage1/runStage1.ts:55</location>
  <description>`runStage1()` is the browser-native glue that threads raw file bytes, derived age bands, forced-zero strata, audit building/signing, and CSV export together (apps/web/src/stage1/runStage1.ts:55-138). Core pieces are tested separately in packages/core/tests/stage1-stratify.test.ts:13-376 and stage1-audit.test.ts:91-433, while the browser e2e checks in apps/web/tests/e2e/stage1.spec.ts:91-110 only verify filenames for the downloads. There is no direct fixture test that feeds a known `File` through `runStage1()` and asserts the resulting CSV bytes, selected indices, and signed-audit structure as one pipeline.</description>
  <fix>Add golden-fixture tests for one direct-`age_band` CSV and one `geburtsjahr`-derived CSV, asserting selected CSV row order, derived/forced-zero audit metadata, and signature presence on the returned audit object.</fix>
</finding>

<finding severity="medium" id="M3">
  <title>Underfill warning coverage contains an admitted placeholder instead of a real assertion</title>
  <location>packages/core/tests/stage1-stratify.test.ts:205</location>
  <description>The test named “emits a warning when a constructed stratum is genuinely underfilled” does not exercise the branch; it ends with `expect(true).toBe(true)` after a long explanation (packages/core/tests/stage1-stratify.test.ts:205-235). That leaves the public warning path effectively uncovered, even though Stage1Panel renders a dedicated underfill banner from the stratify result at apps/web/src/stage1/Stage1Panel.tsx:855-877.</description>
  <fix>Add a real underfill fixture or a narrow integration seam that produces `n_h_actual &lt; n_h_target`, then assert both the emitted warning string and the Stage-1 underfill banner text.</fix>
</finding>

<finding severity="medium" id="M4">
  <title>Visual screenshot specs are mixed into the default Playwright contract config</title>
  <location>apps/web/playwright.config.ts:4</location>
  <description>The default Playwright config includes every `tests/e2e/*.spec.ts` file (apps/web/playwright.config.ts:4-26). Both `_visual-iteration.spec.ts` and `_visual-iteration-65.spec.ts` explicitly document that underscore means “not a contract test” and that the output is regenerated screenshots for issue work (apps/web/tests/e2e/_visual-iteration.spec.ts:1-20; apps/web/tests/e2e/_visual-iteration-65.spec.ts:1-16). If the team simply adds `playwright test` to CI, these artifact-producing visual specs will run alongside the real gate, increasing runtime and brittleness for no release-signal gain.</description>
  <fix>Split visual specs into a separate config or directory, or add `testIgnore: ['**/_*.spec.ts']` to the contract config before wiring Playwright into CI.</fix>
</finding>

<finding severity="medium" id="M5">
  <title>Component-level integration testing is effectively absent</title>
  <location>apps/web/vite.config.ts:75</location>
  <description>The web test config is ready for jsdom component tests and includes both `.test.ts` and `.test.tsx` patterns (apps/web/vite.config.ts:75-79), but the current suite is entirely helper- and browser-driven: pure logic examples include csv-parse.test.ts:17-148, derive.test.ts:10-127, and quota-model.test.ts:19-136, while there are no matching component tests for Overview.tsx:20-91, Sidebar.tsx:63-123, AuditFooter.tsx:49-232, or RunPanel.tsx:70-283. That leaves a large gap between pure function coverage and full Playwright coverage, exactly where cheap render/state regression tests should live.</description>
  <fix>Start a small Solid component-test layer in Vitest/jsdom for Overview, Sidebar, AuditFooter, and RunPanel so route and rendering regressions fail without booting full Playwright.</fix>
</finding>

</findings>

<strengths>
<strength>Stage-1 core logic is covered well at the pure-function layer: packages/core/tests/stage1-stratify.test.ts:13-23 proves deterministic selection for the same seed, :39-61 checks Hamilton sum correctness across axis combinations, :259-333 covers forced-zero allocation, and :336-375 covers codepoint sorting and tie-break parity.</strength>
<strength>Schema-0.4 audit-document data coverage is strong in packages/core/tests/stage1-audit.test.ts:185-206 and :209-433, including algorithm provenance, selected indices, sample-size proposal presence/absence, derived columns, forced-zero strata, timestamp, and input hash.</strength>
<strength>Recent Stage-1 feature deltas have meaningful browser coverage: apps/web/tests/e2e/stage1-bands.spec.ts:33-138 exercises derived `altersgruppe`, default band modes, forced-zero reporting, and invalid-band blocking; stage1-sample-size.spec.ts:99-183 covers accepted vs overridden proposals and audit JSON persistence.</strength>
<strength>Engine-A has a decent initial safety net in packages/engine-a/tests/engine.test.ts:42-105, covering feasibility, quota respect, marginal sums, infeasibility signaling, and same-seed determinism.</strength>
</strengths>

<traces>
<trace name="coverage-mapping">
Read all 14 web unit specs, all 13 `apps/web/tests/e2e` specs, the live-smoke spec, both Playwright configs, both GitHub workflows, and the Stage-1/Stage-3 source modules called out in the prompt. Cross-referenced those with package tests in `packages/core`, `packages/engine-a`, and `packages/engine-contract`, and used `playwright test --list` to quantify the local browser suite shape before judging the CI gap.
</trace>
</traces>

<recommendations>
<recommendation priority="P0">
  <title>Add preview-server Playwright to the PR/push CI gate and keep live smoke as a second layer</title>
  <scope>Wire `apps/web/playwright.config.ts` into `.github/workflows/deploy.yml` before deploy; build once, run contract e2e against Vite preview, upload traces on failure, and keep the existing post-deploy live smoke for CDN/deploy verification.</scope>
  <effort>M</effort>
</recommendation>
<recommendation priority="P1">
  <title>Split non-contract visual screenshot specs out of the default Playwright config</title>
  <scope>Exclude `_visual-iteration*.spec.ts` from the release gate so CI runs only contract tests while archived screenshot generators remain available on demand.</scope>
  <effort>S</effort>
</recommendation>
<recommendation priority="P1">
  <title>Add contract tests for `#/overview` and the new sidebar navigation chrome</title>
  <scope>Cover hash routing, sidebar active state, disabled Stage-2/4 hints, Overview card links, and unique-h1/a11y behavior for the new #65 surface.</scope>
  <effort>M</effort>
</recommendation>
<recommendation priority="P1">
  <title>Add schema-0.4 AuditFooter rendering/parity tests</title>
  <scope>Assert all newly-rendered mandatory fields plus signature/public-key chrome, and cross-check footer values against the downloaded audit JSON from a real Stage-1 run.</scope>
  <effort>M</effort>
</recommendation>
<recommendation priority="P1">
  <title>Add Stage-1 and Stage-3 signature verification round-trip tests</title>
  <scope>Verify Ed25519 and ECDSA signatures with Web Crypto, prove the fallback path, and add direct tests for `signAudit()` in Stage 3.</scope>
  <effort>M</effort>
</recommendation>
<recommendation priority="P1">
  <title>Add Stage-3 RunPanel success/error/cancel/export contract coverage</title>
  <scope>Exercise `run-start`, `run-cancel`, `run-error`, quota-fulfillment rendering, panel row count, and audit-export payload content.</scope>
  <effort>M</effort>
</recommendation>
<recommendation priority="P2">
  <title>Add golden-fixture integration tests for `runStage1()`</title>
  <scope>Feed known files through the full browser-native Stage-1 glue and assert selected CSV bytes, audit metadata, and signature presence as one pipeline.</scope>
  <effort>M</effort>
</recommendation>
<recommendation priority="P2">
  <title>Add a real underfill fixture and replace the placeholder warning test</title>
  <scope>Produce a deterministic underfill case that validates both `warnings[]` and the Stage-1 underfill UI banner.</scope>
  <effort>S</effort>
</recommendation>
<recommendation priority="P2">
  <title>Either implement ISO-8859-1 detection or drop it from the declared CSV support surface</title>
  <scope>Align `SupportedEncoding`, decode behavior, and fixtures so the encoding contract is explicit and test-backed.</scope>
  <effort>S</effort>
</recommendation>
<recommendation priority="P2">
  <title>Introduce a first Solid component-test layer for high-value UI modules</title>
  <scope>Start with Overview, Sidebar, AuditFooter, and RunPanel in jsdom to cover render/state regressions between helper-unit tests and full Playwright.</scope>
  <effort>M</effort>
</recommendation>
</recommendations>

<verdict value="fail" critical="1" high="4" medium="5">
CI has strong pure-logic Stage-1 coverage, but the real browser suite is not gated before merge and the new #65 UI surface plus audit/signing UI layers remain under-protected.
</verdict>

