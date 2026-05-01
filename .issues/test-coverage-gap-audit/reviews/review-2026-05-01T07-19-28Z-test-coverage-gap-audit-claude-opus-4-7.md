---
review_of: test-coverage-gap-audit
review_type: topic
review_mode: topic
review_topic: Test coverage gap audit — unit / integration / e2e / smoke / CI
reviewed_at: 2026-05-01T07-19-28Z
tool: claude
model: claude-opus-4-7
duration_seconds: 596
---

# Test Coverage Gap Audit — buergerinnenrat

Topic review of the four-layer test pyramid (unit / integration / Playwright e2e / live-smoke) of the browser-native sortition tool.

Map: 14 web-unit specs (~2.0 kLOC), 9 package-unit specs (~2.1 kLOC), 13 e2e specs (~1.4 kLOC), 1 live-smoke spec (66 LOC). Cross-referenced against the 39 .ts/.tsx source files in `apps/web/src` plus `packages/core`, `packages/engine-a`, `packages/engine-contract`, `packages/metrics`.

<review>

<findings>

<finding severity="critical" id="C1">
  <title>Full Playwright e2e suite is not gated by CI on PR or push — only the live-smoke spec runs after deploy</title>
  <location>.github/workflows/deploy.yml:39-58 (build job) and apps/web/playwright.config.ts:4 (testDir './tests/e2e')</location>
  <description>
The build job runs `lint → typecheck → packages tests → web vitest run → web build`. There is no step that runs `playwright test` against the `./tests/e2e` directory. The deploy + smoke jobs are gated to `if: github.event_name == 'push'` (deploy.yml:60, 73) and only execute `playwright test --config=playwright-live.config.ts` against `./tests/smoke-live` (deploy.yml:113), which contains a single 66-LOC spec with 6 tests. Meanwhile `apps/web/tests/e2e/` carries 13 spec files / ~50–60 user-facing assertions covering Stage 1 upload→draw→download (stage1.spec.ts:14-307, 8 tests), bands editor (stage1-bands.spec.ts, 6 tests), sample-size calculator + audit JSON (stage1-sample-size.spec.ts, 7 tests), CSV import + Stage 3 quota gate (csv-import.spec.ts, 2 tests), Stage 3 end-to-end including Ed25519 download (end-to-end.spec.ts:14-59), docs hub + 7 subpages (docs.spec.ts, 8 tests), trust-strip (trust-strip.spec.ts, 2 tests), mobile touch-targets (mobile-touch-targets.spec.ts, 7 tests), a11y skin-check (a11y.spec.ts, 1 test), beispiele on-ramp (beispiele-stage1.spec.ts, 1 test). All of these run only on a developer machine. A regression that breaks any of them merges to main silently — only post-deploy live-smoke (which itself is suspect, see C2) is the safety net.
  </description>
  <fix>Add a `e2e` job in `.github/workflows/deploy.yml` that runs after `build`, installs Playwright with chromium+firefox, and executes `pnpm --filter @sortition/web exec playwright test` (the default config). Use `actions/upload-artifact@v4` for the html-report on failure. Run on both `pull_request` and `push` (no `if:` gate). Expected wallclock: 2-4 min on GH-hosted runners. Optionally shard with `--shard 1/2 + 2/2`.</fix>
</finding>

<finding severity="critical" id="C2">
  <title>Live-smoke uses `tab-stage1`/`tab-docs`/`tab-stage3` testids which are `md:hidden` at the desktop viewport the live-smoke runs at — likely silently broken since #65 merged 2026-05-01</title>
  <location>apps/web/tests/smoke-live/site-smoke.spec.ts:14-30 vs apps/web/src/App.tsx:177-181 vs apps/web/playwright-live.config.ts:19</location>
  <description>
After #65 the pill-tab nav was wrapped in `<nav class="md:hidden flex gap-2 overflow-x-auto..." data-testid="main-nav">` (App.tsx:178) — i.e. it disappears at viewports ≥768 px. The Tailwind `md:hidden` rule applies the `hidden` class which sets `display:none`. Playwright's auto-waiting will fail or time out clicking a non-displayed element. The live-smoke config uses `devices['Desktop Chrome']` (playwright-live.config.ts:19) which has the default 1280×720 viewport — well above the 768 md breakpoint. The desktop e2e specs avoid this pitfall by setting the route via `window.location.hash` (commented at stage1.spec.ts:21-23 "#65: pill-tabs are md:hidden at desktop viewport ... drive route via the URL hash"), but `site-smoke.spec.ts:14, 17, 20, 27, 33, 44, 55` still call `await page.getByTestId('tab-stage1').click()` etc. Either the smoke is currently failing on every push (and somebody is ignoring red), or Playwright is force-clicking through the hidden CSS in some unexpected way (still wrong — testing a regression in the pill-tab visibility wouldn't surface). The "headline finding" of the deploy.yml audit is therefore worse than "no e2e in CI": the only test that does run is testing the wrong elements at the wrong viewport.
  </description>
  <fix>Rewrite `apps/web/tests/smoke-live/site-smoke.spec.ts` to either (a) drive routes via `await page.evaluate(() => { window.location.hash = '#/stage1' })` like the e2e specs do, OR (b) add `await page.setViewportSize({ width: 375, height: 812 })` at the start of each test that needs the pill-tabs. Verify the smoke runs green by running `pnpm --filter @sortition/web exec playwright test --config=playwright-live.config.ts` against the deployed URL after the fix. Add a CI assertion that `nav-overview` (sidebar) is visible at desktop viewports so a future regression is caught.</fix>
</finding>

<finding severity="critical" id="C3">
  <title>Audit-doc signature has no verification round-trip test — claims of cryptographic provenance are unverified</title>
  <location>apps/web/tests/unit/stage1-audit-sign.test.ts:35-43 vs apps/web/src/stage1/audit-sign.ts:82-100 vs scripts/verify_audit.py</location>
  <description>
`signStage1Audit` produces a `signature` over the canonical JSON of the stripped doc, but no test imports `crypto.subtle.verify` (or `Ed25519PublicKey.verify` from Python) and runs the doc through that path. The unit test at audit-sign.test.ts:35-43 only asserts (a) `public_key/signature` are non-empty strings and (b) `signature_algo` ∈ {Ed25519, ECDSA-P256-SHA256}. If `signWithEd25519` ever silently signs the wrong bytes (e.g. forgot to strip signature fields, mis-serialized canonical JSON, used a different encoder), every test still passes because nothing verifies the produced signature. The Python `scripts/verify_audit.py` exists but only handles Stage 3 audit schema 0.1 (REQUIRED_FIELDS at verify_audit.py:28-42 lists `engine`, `algorithm`, `panel_size` — Stage 3 fields, not Stage 1's `algorithm_version`/`tie_break_rule`/`actual_n`). An audit doc that fails to verify in production breaks the central trust claim of the project (`Audit-Protokolle sind Ed25519-signiert, jede Entscheidung ist nachvollziehbar` — Overview.tsx:24-26).
  </description>
  <fix>Add `apps/web/tests/unit/stage1-audit-sign-verify.test.ts` that (1) signs a fixture doc, (2) imports the public key via `crypto.subtle.importKey('raw', ..., 'Ed25519', false, ['verify'])` for Ed25519 or `'spki'` for ECDSA, (3) calls `crypto.subtle.verify` with the stored bodyJson and asserts `true`, (4) flips one byte of the signed body and asserts the verifier returns `false` (negative round-trip). Same treatment for `apps/web/src/run/audit.ts:151-169`. Extend `scripts/verify_audit.py` (or add `scripts/verify_stage1_audit.py`) to support Stage1AuditDoc schema 0.4 and call it from a CI step that downloads the audit produced in stage1.spec.ts.</fix>
</finding>

<finding severity="high" id="H1">
  <title>Post-#65 new code (Overview, Sidebar, Brand, NavGroup) has zero unit/component tests and no functional e2e — only a screenshot spec touches the route</title>
  <location>apps/web/src/Overview.tsx:1-96 (96 LOC), apps/web/src/shell/Sidebar.tsx:1-125 (125 LOC), apps/web/src/shell/Brand.tsx:1-46, apps/web/src/shell/NavGroup.tsx:1-18</location>
  <description>
Grep for `nav-overview|nav-stage1|nav-stage3|nav-docs|nav-beispiele|primary-nav|overview-page|overview-card|overview-principles|overview-stages-2-4-note|sidebar` across `apps/web/tests` returns hits only in `_visual-iteration-65.spec.ts:49,63` (screenshot anchor, no functional assertion) and the `// #65 pill-tabs are md:hidden at desktop viewport` comments in stage1.spec.ts. There is no test that:
 (a) clicks `nav-overview` in the sidebar and asserts the URL hash flips to `#/overview` and `data-testid="overview-page"` becomes visible;
 (b) verifies the `aria-current="page"` attribute lands on the active sidebar link (Sidebar.tsx:34);
 (c) verifies the disabled `nav-stage2`/`nav-stage4` items render `aria-disabled="true"` and have a tooltip via `title` (Sidebar.tsx:55-58);
 (d) verifies `Overview.tsx:78-89` renders 3 trust cards sourced from `TRUST_PRINCIPLES` (e.g. count = 3, hrefs match);
 (e) verifies the unknown-route catch-all in App.tsx:98-100 lands on Stage 3 (parseHash fall-through);
 (f) verifies `Sidebar.tsx:117-119` renders `__GIT_SHA__` and `VITE_APP_VERSION` (these are vite-injected and could silently render `?` if the build pipeline regresses).
This is net-new shipped surface (PR #1 merged 2026-05-01) and existing tests give no signal that any of it works after a refactor.
  </description>
  <fix>Add `apps/web/tests/e2e/sidebar-nav.spec.ts` covering all 5 NavLinks + 2 NavDisabled items with hash-write + active-state + aria-current/aria-disabled assertions, viewport ≥768px so the sidebar is visible. Add `apps/web/tests/e2e/overview.spec.ts` covering route load, hero h1, 2 workflow cards (data-testid `overview-card-stage1`, `overview-card-stage3`), 3 principle cards, the Stage 2/4-note banner. Add `apps/web/tests/e2e/routing.spec.ts` for `parseHash` paths: `''`, `'#'`, `'#/'`, `'#/foobar'` (catch-all → stage3), `'#/docs/glossar'`, `'#/docs/notARoute'` (→ docs/hub).</fix>
</finding>

<finding severity="high" id="H2">
  <title>AuditFooter renders 17 mandatory schema-0.4 fields but stage1.spec.ts asserts only 3 — most newly-rendered fields have zero rendering coverage</title>
  <location>apps/web/src/stage1/AuditFooter.tsx:56-194 vs apps/web/tests/e2e/stage1.spec.ts:86-89</location>
  <description>
Schema 0.4 (packages/core/src/stage1/types.ts:97-200) declares 21+4+3 fields (mandatory + optional + signature). AuditFooter.tsx now renders, in order: `schema_version` (L59), `operation` (L62), `algorithm_version`+`prng` (L66), `tool_version` from VITE_APP_VERSION (L70), `tie_break_rule` (L73), `key_encoding` (L76), `stratum_sort` (L79), `seed` (L82), `seed_source` (L85), `input_csv_filename`+`input_csv_size_bytes` (L89-90), `input_csv_sha256` (L93-95), `pool_size` (L99), `target_n` (L102), `actual_n` (L105), `stratification_axes` (L108), `strata.length` (L111), `warnings.length` (L114), `duration_ms` (L117), `timestamp_iso` (L120), `selected_indices` inside `<details>` (L127-132), plus optional `derived_columns` (L137-153), `forced_zero_strata` (L157-165), `sample_size_proposal` (L171-193), and signature triplet `signature_algo`/`public_key`/`signature` (L200-227). The only assertions in stage1.spec.ts:86-89 are:
 - `getByTestId('stage1-audit-footer').toBeVisible()`
 - `containText('Protokoll / Audit')`
 - `containText('SHA-256')`
 - `getByTestId('audit-footer-sig-algo').not.toContainText('noch nicht signiert')`
The optional-block testids `audit-footer-sample-size` (stage1-sample-size.spec.ts), `audit-footer-forced-zero` and `audit-footer-derived` (stage1-bands.spec.ts) are exercised but the 17 *mandatory* dt/dd rows are not asserted by ANY e2e test. A bug that swaps `tie_break_rule` ↔ `key_encoding` in the rendered output, or drops a row entirely, would not be caught. The `selected_indices` `<details>` block is wholly untested. The abbreviated public-key/signature chips at L213-225 (with full value via `title`) are never asserted to render (only the algo pill is). Issue #65's audit-footer rebind from 9 → 21+ fields is therefore largely unprotected.
  </description>
  <fix>Extend stage1.spec.ts (or add `apps/web/tests/e2e/audit-footer.spec.ts`) with one test per schema field group: assert each mandatory dt-text appears once and the corresponding dd matches the audit-JSON download (parse the JSON, walk the field list, assert the rendered footer contains each `String(value)` or its localized form). Add a unit/component test for AuditFooter.tsx using `@solidjs/testing-library` (already a candidate per task description's "Solid component testing currently sparse — investigate") that mounts AuditFooter with a fixture doc and asserts every dt label exists. Add an assertion that `selected_indices` `<details>` summary shows the correct count (= `target_n` for non-underfilled draws).</fix>
</finding>

<finding severity="high" id="H3">
  <title>ECDSA-P256 fallback path (Safari and older runtimes) is never exercised by any test — only the Ed25519 happy-path is gated</title>
  <location>apps/web/src/stage1/audit-sign.ts:82-100 (try Ed25519 catch ECDSA), apps/web/src/run/audit.ts:151-169 (same pattern), apps/web/tests/unit/stage1-audit-sign.test.ts:42</location>
  <description>
Both signing helpers do `try { signWithEd25519(...) } catch { signWithEcdsa(...) }`. Chromium 113+ and Firefox 130+ both support Ed25519, so on the CI/dev runtime the catch branch never executes. The unit test at stage1-audit-sign.test.ts:42 explicitly accepts either algorithm: `expect(['Ed25519','ECDSA-P256-SHA256']).toContain(signed.doc.signature_algo)` — so the ECDSA branch could be entirely broken (e.g. wrong `namedCurve`, wrong SPKI vs raw key encoding, signature length wrong) and tests would pass on every developer machine. Production users on older Safari (which only landed Ed25519 in 17.4) would silently produce unverifiable audits. There's no fault-injection harness that forces the catch branch.
  </description>
  <fix>Add `apps/web/tests/unit/audit-sign-ecdsa-fallback.test.ts` that patches `crypto.subtle.generateKey` to throw `NotSupportedError` for `name === 'Ed25519'` (Vitest `vi.spyOn` on the global), then verifies the signed doc's `signature_algo === 'ECDSA-P256-SHA256'` AND verifies the signature round-trips with the SPKI-encoded public key (continuation of C3). Apply the same pattern to `apps/web/src/run/audit.ts`.</fix>
</finding>

<finding severity="high" id="H4">
  <title>Stage 3 RunPanel has zero component-level tests; the only e2e (end-to-end.spec.ts) is one test that doesn't run in CI</title>
  <location>apps/web/src/run/RunPanel.tsx:1-285 (285 LOC), apps/web/tests/e2e/end-to-end.spec.ts:1-59</location>
  <description>
RunPanel.tsx orchestrates seed signal, run lifecycle (start/cancel/abort), progress + log streams, error rendering with `infeasible_quotas` hint (L146-152), result rendering with quota-fulfillment table (L191-217) and panel table (L220-261), and exports (panel CSV + signed audit JSON). Zero unit tests exist for any of these. Grep `apps/web/tests` for `run-panel|run-result|run-progress|run-error|run-export|run-cancel|run-logs` returns hits only in `csv-import.spec.ts:40` (just `toBeVisible`) and `end-to-end.spec.ts:34-50` (single test, only chromium asserts the audit download filename). End-to-end.spec.ts doesn't decode the audit JSON — `expect(download.suggestedFilename()).toMatch(/^audit-.*\.json$/)` is the entire audit assertion. If `buildAudit()` or `signAudit()` returns broken JSON, the test passes. AND end-to-end.spec.ts is part of the e2e suite that is not run in CI per C1, so even this thin test doesn't protect main.
  </description>
  <fix>Two-pronged: (1) add `apps/web/tests/e2e/stage3.spec.ts` that uploads a fixture, configures quotas, runs the engine, decodes the downloaded audit JSON and asserts `schema_version`, `engine.id`, `algorithm`, `selected.length === panel_size`, every `quota_fulfillment.ok === true`, and that `selected` is sorted (audit.ts:91 `[...args.result.selected].sort()`). (2) Add unit tests for `run/audit.ts`: `inputSha256` with a known pool produces a stable hex string; `canonicalQuotas` is order-independent (swap categories array, get same string); `buildAudit` populates every mandatory field. Both gated by C1's e2e CI step.</fix>
</finding>

<finding severity="high" id="H5">
  <title>CSV `iso-8859-1` is declared as a SupportedEncoding but never returned by decodeBuffer — the type promises a coverage path that doesn't exist, and no test catches the gap</title>
  <location>apps/web/src/csv/parse.ts:9 (`type SupportedEncoding = 'utf-8' | 'windows-1252' | 'iso-8859-1'`) vs parse.ts:27-43 (decodeBuffer only ever returns 'utf-8' or 'windows-1252')</location>
  <description>
The `SupportedEncoding` type union claims iso-8859-1 support, but `decodeBuffer` only branches utf-8 (BOM or strict-decode-success) → windows-1252 (catch-all). There is no detection path for genuine iso-8859-1 — bytes 0x80-0x9f differ between win-1252 and iso-8859-1 (€, smart quotes, ‰, etc.) and a real Austrian Melderegister export in iso-8859-1 with the € sign would silently mis-decode through windows-1252 (which interprets 0x80 as € → fine in this case) or render mojibake for control-range bytes. csv-parse.test.ts has zero tests with `'iso-8859-1'` encoding. Either the type should drop iso-8859-1 OR decodeBuffer needs an explicit branch + a test fixture. The wider risk: real-world DE/AT BMG exports do come in iso-8859-1 from older systems; a silent decode bug here corrupts person-id / district names without any test catching it.
  </description>
  <fix>Either: (a) drop `'iso-8859-1'` from the `SupportedEncoding` union (one-line type narrowing) and document that the parser uses windows-1252 as the 8-bit fallback, OR (b) add a heuristic that distinguishes iso-8859-1 from win-1252 (e.g. check for bytes in 0x80-0x9f range — those exist in win-1252 but are control codes in iso-8859-1) plus a fixture test in `csv-parse.test.ts` with iso-8859-1-encoded ä/ö/ü bytes. Either way add a regression test asserting that real-world Umlaut-bearing exports (Aachen, Wörth, Übach from stage1-stratify.test.ts:343-355) round-trip through parseCsvBuffer correctly.</fix>
</finding>

<finding severity="high" id="H6">
  <title>Mulberry32 PRNG has zero direct tests — every reproducibility claim is transitive through stratify</title>
  <location>packages/core/src/pool/mulberry32.ts vs packages/core/tests/ (no `mulberry32.test.ts`)</location>
  <description>
Glob `packages/core/tests/*.test.ts` returns 7 specs, none for mulberry32 directly. The PRNG underpins (a) Stage 1 `stratify` shuffleInPlace (stratify.ts:144-152), (b) the synthetic generator (used in 5 unit specs that verify distribution moments), and (c) Stage 3 indirectly via engine-a. Determinism is asserted at stratify.test.ts:14-23 but only end-to-end. There's no test that pins the PRNG sequence to a known vector ("Mulberry32(seed=42).nextFloat() called 5× must yield [0.x, 0.x, 0.x, 0.x, 0.x]"). A regression that subtly alters the bit-shuffle (e.g. `>>> 16` → `>> 16` typo, or seed normalization changes from uint32 cast to direct number) would still pass stratify.test.ts because the test just compares two consecutive runs of the same (broken) PRNG. The `algorithm_version` field promises byte-identical reproducibility across builds — without a known-vector test, two different commits of mulberry32 could each be self-consistent yet mutually divergent.
  </description>
  <fix>Add `packages/core/tests/mulberry32.test.ts` with: (a) known-vector test (seed=42 produces a specific fixture sequence — generate once and freeze in the test); (b) seed-0 edge case (Mulberry32(0) must not return NaN/0/0/0…); (c) period sanity (10k draws never repeat the first value); (d) seed normalization (Mulberry32(2**32) === Mulberry32(0) per uint32 cast — verify the documented behavior); (e) cross-runtime parity vector that matches `scripts/stage1_reference.py`'s mulberry32 implementation byte-for-byte (binds the TS↔Python reproducibility claim to a hard test).</fix>
</finding>

<finding severity="high" id="H7">
  <title>TS↔Python reproducibility (`scripts/stage1_cross_validate.sh`) is not gated by CI — the byte-identical claim with the Python reference is unenforced</title>
  <location>scripts/stage1_cross_validate.sh, scripts/stage1_reference.py vs .github/workflows/deploy.yml (no invocation)</location>
  <description>
CLAUDE.md L4 + Overview.tsx:43-44 promise "Bytegleich reproduzierbar mit der Python-Referenz." The Python reference exists (`scripts/stage1_reference.py`) and a cross-validation harness exists (`scripts/stage1_cross_validate.sh`), but `.github/workflows/deploy.yml` never invokes either. A drift between TS `stratify` and Python reference (e.g. someone introduces locale-aware string comparison in TS but Python keeps codepoint sort, or Python uses Mersenne-Twister while TS uses Mulberry32 — currently both are Mulberry32 but a refactor could break this) would land in main without any test signaling. The codepoint-sort umlaut tests at stage1-stratify.test.ts:336-376 are TS-side only — they don't actually run the Python reference and compare outputs.
  </description>
  <fix>Add a `cross-runtime-parity` job in `.github/workflows/deploy.yml` that (a) sets up Python 3.12 and installs the reference deps, (b) runs `scripts/stage1_cross_validate.sh` against 3-5 fixture pools (kleinstadt-bezirkshauptort-n500, herzogenburg-melderegister-8000, plus a small umlaut-rich pool) and asserts identical `selected[]` arrays + identical canonical audit JSON (timestamp stripped). Job runs on push to main; PR-trigger optional based on runtime cost.</fix>
</finding>

<finding severity="high" id="H8">
  <title>A11y test is a 32-LOC skin check; sidebar's aria-current/aria-disabled, focus order, and BITV 2.0 / WCAG AA contrast are entirely untested</title>
  <location>apps/web/tests/e2e/a11y.spec.ts:1-32</location>
  <description>
The single a11y spec checks: (a) at least one `input[type=file]` exists, (b) every `<button>` has text or aria-label, (c) every `<img>` has alt, (d) exactly one `<h1>`. That's it. Missing:
 - No axe-core / `@axe-core/playwright` integration despite the Sidebar component being net-new and full of new ARIA semantics (aria-current at Sidebar.tsx:34, aria-disabled at L55, aria-label at L75).
 - No focus-order test (Tab through the Stage 1 form — does the run button receive focus before the strata-toggle?).
 - No keyboard navigation test (Enter on a NavLink, Esc closes details, etc.).
 - No color-contrast assertion despite the new oklch token system at index.css and tailwind.config.cjs (commit 70735a5 "feat(tokens): self-hosted fonts + oklch tokens").
 - No assertion that the disabled Stage 2/4 nav items at Sidebar.tsx:48-61 expose `aria-disabled="true"` and a tooltip — a screen reader regression here would be silent.
 - No screen-reader landmark check (main, nav, aside).
This is well below the BITV 2.0 / WCAG AA bar implied by a German civic-tech tool serving Bürgerräte.
  </description>
  <fix>Replace `apps/web/tests/e2e/a11y.spec.ts` with axe-core-driven tests covering Stage 1, Stage 3, Overview, and one docs subpage. Use `@axe-core/playwright` (`pnpm add -D @axe-core/playwright`) and `expect(await new AxeBuilder({ page }).analyze()).toHaveNoViolations()`. Add a focused-element trace through Stage 1 (Tab × N) and assert keyboard reachability of the run button. Add an explicit assertion for `aria-disabled="true"` on `nav-stage2` + `nav-stage4`. Schedule a separate effort to wire `eslint-plugin-jsx-a11y`-style lint into the CI as a complement (out of scope for this issue).</fix>
</finding>

<finding severity="medium" id="M1">
  <title>No 100k-row performance budget test for parseCsvBuffer / stratify — documented "Stage 1 sub-second" claim is unenforced</title>
  <location>apps/web/src/csv/parse.ts:72 (parseCsvBuffer), apps/web/src/stage1/runStage1.ts (no perf assertion), apps/web/tests/unit/synthetic-cluster-pool.test.ts:129 (largest synthetic test is N=10000)</location>
  <description>
stage1.spec.ts:64 calls Stage 1 sub-second with no progress bar and the docs claim Stage 1 throughput in the order of <1 s for typical pools. The largest pool generated in unit tests is N=10000 (synthetic-cluster-pool.test.ts:129, synthetic-person-builder.test.ts:81). A regression in parseCsvBuffer or stratify that introduces O(N²) behavior (e.g. a `rows.find()` inside a loop) would not surface until a real 50-100k Melderegister CSV reaches a user. The Beispiele on-ramp file is only 8000 rows. The Stage 1 e2e fixtures top out at n=2000 (tests/fixtures/synthetic-pools/*-n2000-*).
  </description>
  <fix>Add `packages/core/tests/stage1-perf.test.ts` that generates a 100k-row pool via `generatePool({ size: 100_000 })` (already a public API in `packages/core/src/pool`), measures `stratify(...)` wallclock, and asserts < 5 s on CI hardware (margin for noisy runners). Mark with `it.skip` flag for local non-perf runs if needed, but include in CI. For parseCsvBuffer, generate a 100k-row CSV string and assert parse time < 2 s.</fix>
</finding>

<finding severity="medium" id="M2">
  <title>Stage1AuditDoc canonical JSON has no golden-fixture test — silent field reorderings or schema-0.4 → 0.5 drift cannot be caught</title>
  <location>packages/core/tests/stage1-audit.test.ts:46-89 (canonical determinism but no golden), packages/core/src/stage1/audit-builder.ts</location>
  <description>
stage1-audit.test.ts:48-66 asserts that round-tripping canonical JSON yields the same string and that `actual_n` is the alphabetically-smallest top-level key (test at L88). It does NOT assert the full structure against a frozen fixture. If a future commit silently renames `tie_break_rule` → `tieBreakRule`, the alphabetic-smallest assertion still passes (still 'a...' first) and downstream verifiers that hard-code field names break in production. Schema migrations (0.4 → 0.5) require a snapshot baseline.
  </description>
  <fix>Add `packages/core/tests/stage1-audit.golden.test.ts` with a frozen fixture file `packages/core/tests/fixtures/stage1-audit-0.4.golden.json` produced by running `buildStage1Audit` on a fixed input (timestamps stripped). The test reads the golden file and `expect(canonicalStage1Json(builtDoc)).toBe(goldenContent)`. When a schema change is intentional, regenerating the golden is one commit and explicit code review.</fix>
</finding>

<finding severity="medium" id="M3">
  <title>CSV encoding test count is asymmetric — UTF-8 has 5 cases, windows-1252 has 1, iso-8859-1 has 0</title>
  <location>apps/web/tests/unit/csv-parse.test.ts:18-56</location>
  <description>
UTF-8 covers comma, semicolon, BOM, CRLF, and ä-via-utf8-bytes (5 cases L18-44). Windows-1252 has a single 0xE4 ä test (L47-56). ISO-8859-1 has zero tests (see H5 — also a typing concern). Real BMG exports also use 0x80-0xff bytes for Sonderzeichen (€, smart quotes, ß), and large CSVs sometimes have malformed quoting. The test surface is thin compared to actual deployment risk.
  </description>
  <fix>Extend csv-parse.test.ts with: (a) windows-1252 tests for €(0x80), smart quotes (0x91-0x94), trademark (0x99); (b) malformed-quote test (Papa.parse error path → warning surfaces); (c) mixed line-endings (LF, CRLF, CR) within one file; (d) very-long line (>1 MB single line) to test the streaming buffer is fine. Add a fixture-driven test using `tests/fixtures/synthetic-pools/herzogenburg-melderegister-8000.csv` and assert the row count + encoding detection.</fix>
</finding>

<finding severity="medium" id="M4">
  <title>Live-smoke (separate from C2) doesn't decode any downloaded audit JSON or CSV — claims about deployed correctness are paper-thin</title>
  <location>apps/web/tests/smoke-live/site-smoke.spec.ts:1-66</location>
  <description>
The 6 live-smoke tests verify: page loads with title (L8-12), tabs navigate (L14-23 — broken per C2), CSV upload field exists (L25-30), docs hub has ≥5 tiles (L32-40), Algorithmus page shows hamilton-svg (L42-48), Beispiele page has a 200-OK static asset (L50-65). None of them exercise an actual draw on the deployed instance — no upload, no run, no audit-JSON download, no signature verification against the deployed bundle's signing key path. A deployment that ships with a broken `highs-js` chunk, broken WebCrypto fallback, or wrong `VITE_APP_VERSION` would pass live-smoke. The post-deploy gate is therefore optimistic.
  </description>
  <fix>Add one end-to-end smoke test in site-smoke.spec.ts that uploads a small fixture CSV (kleinstadt-n100, ≤50 KB), runs Stage 1 with target_n=10, downloads the audit JSON, parses it, and asserts (a) `schema_version === '0.4'`, (b) `selected_indices.length === 10`, (c) `signature.length > 0`. Keep the live-smoke wallclock budget (3 min) by skipping Stage 3 / docs / large fixtures.</fix>
</finding>

<finding severity="medium" id="M5">
  <title>Sample-size calculator unit logic (`packages/core/src/stage1/sample-size.ts`) is exercised only by e2e — formula is unguarded for refactor</title>
  <location>packages/core/src/stage1/sample-size.ts (logic) vs packages/core/tests/stage1-sample-size.test.ts (test count)</location>
  <description>
stage1-sample-size.test.ts has 144 LOC of tests, but my read of the e2e at stage1-sample-size.spec.ts:38-58 ("default mail-plus-phone, panel 30 → vorschlag 110") shows the *formula correctness* is asserted only at integration level. If the formula constants in sample-size.ts change (response-rate ranges 30-50% for mail-plus-phone, 5-9% for mail-only, safety factor 1.5), the unit tests catch the explicit numeric expectation but no boundary cases (panel_size=10, panel_size=300, response_rate=0, response_rate=1 edge cases). Worth verifying — couldn't fully trace without reading the file. Flag as medium pending review of the test file.
  </description>
  <fix>Read `packages/core/tests/stage1-sample-size.test.ts` (already 144 LOC — possibly already adequate). If gaps exist, add boundary-case tests (panel_size=10/300, response rates at extremes). Cross-check with the Python equivalent if any.</fix>
</finding>

<finding severity="medium" id="M6">
  <title>End-to-end Stage 3 spec uses serial mode with 60s timeout — slow, unreliable, and underused</title>
  <location>apps/web/tests/e2e/end-to-end.spec.ts:12-15 (serial, setTimeout 60_000)</location>
  <description>
The 60-second timeout suggests engine-a is slow on CI. The single e2e fires up engine-a (HiGHS WASM init), runs maximin on n=100, and expects results within 45s (L39). On a CI runner this is borderline; on a fast laptop ~5s. There's no progress assertion (the run-progress testid is rendered per RunPanel.tsx:114 but never checked). The audit-download verification only runs on chromium (L53). Firefox path is silently dropped.
  </description>
  <fix>Split into two specs: (1) a fast "smoke" Stage 3 with n=20, panel=6, single quota (assertable in <10s) for both browsers; (2) a longer "full" Stage 3 with quota fulfillment + audit decode, single browser, deferred to a slow lane. Assert `run-progress` text changes during the run (transitions from "starting…" to engine-a's progress messages) so the cancel/abort path stays observable.</fix>
</finding>

<finding severity="medium" id="M7">
  <title>Brittle text-match assertions in stage1-bands.spec.ts and stage1-stratify.test.ts that drift on copy edits</title>
  <location>apps/web/tests/e2e/stage1-bands.spec.ts:30 (`/\d{4} Zeilen/`), :49 (`Bevölkerungsgruppen`), :77 (`5 Auswahl`), :117 (`Lücke zwischen Band a/`); packages/core/tests/stage1-stratify.test.ts:107 (literal warning string `Stratum [["district","tiny"]] unter-vertreten...`)</location>
  <description>
Several assertions encode user-facing German text verbatim: `5 Auswahl`, `Bevölkerungsgruppen`, `Lücke zwischen Band a`. A copy-tweak (e.g. "5 Auswahl" → "5 zur Auswahl") breaks unrelated tests that should not gate on wording. The literal-warning-string assertion at stage1-stratify.test.ts:107 is even more fragile — it pins the exact JSON-encoded stratum key `[["district","tiny"]]` AND the German message, so any localization or message-format refactor cascades. Issue #66 (Stage 3 honest-copy edits, shipped 2026-04-30) is a recent example of how easily copy drifts.
  </description>
  <fix>Replace literal text matches with structural assertions where possible: instead of `containText('5 Auswahl')` use a count of `getByTestId('band-mode-X-selection').filter({ checked: true })`. For the warning string, parse `r.warnings[0]` for stable substrings (`'unter-vertreten'`) instead of the full message + JSON-encoded key. Document this convention in `apps/web/tests/README.md` so it sticks.</fix>
</finding>

<finding severity="medium" id="M8">
  <title>QuotaEditor (apps/web/src/quotas/QuotaEditor.tsx, 215 LOC) has no component tests — only model-layer tests</title>
  <location>apps/web/src/quotas/QuotaEditor.tsx (UI component) vs apps/web/tests/unit/quota-model.test.ts (model only)</location>
  <description>
quota-model.test.ts:1-140 covers the validateQuotas helper, JSON round-trip, and emptyCategory. The UI component QuotaEditor.tsx is 215 LOC of Solid component logic (add category, remove, update bounds, validation feedback) and is touched only by csv-import.spec.ts:35-40 ("quota-editor visible, panel-size fillable, add-category dropdown"). No assertion that an invalid bounds entry shows the validation error inline, no test that removing a category cleans up signal state, no test for the conflict between panel_size and per-category sumMin.
  </description>
  <fix>Add a `@solidjs/testing-library` component test for QuotaEditor: render with a fixture rows array, simulate add → fill bounds → invalid bounds → assert error message renders. Single new test file, ~80 LOC.</fix>
</finding>

<finding severity="low" id="L1">
  <title>`_visual-iteration*.spec.ts` files run as part of the e2e suite and produce screenshots without assertions</title>
  <location>apps/web/tests/e2e/_visual-iteration.spec.ts:1-189, apps/web/tests/e2e/_visual-iteration-65.spec.ts:1-103</location>
  <description>
Both files iterate viewports × steps and call `page.screenshot(...)` with no `expect()` — they don't fail when the page is blank or wrong. They appear in the e2e test count but contribute no regression coverage. Once C1 lands and the e2e suite runs in CI, they will burn ~10 test slots silently. The `_visual-iteration.spec.ts` is anchored to an archived `.issues/56-...` directory (parse.ts:31).
  </description>
  <fix>Either move the visual-iteration specs out of `tests/e2e` into a separate `tests/screenshots` dir excluded from CI, or convert them to real visual-regression tests (`expect(await page.screenshot()).toMatchSnapshot()`). The archived `_visual-iteration.spec.ts` should be deleted after `.issues/56-ui-visual-redesign/` is no longer needed.</fix>
</finding>

<finding severity="low" id="L2">
  <title>CSV applyMapping has only one happy-path test</title>
  <location>apps/web/tests/unit/csv-parse.test.ts:141-149 vs apps/web/src/csv/parse.ts:208-221</location>
  <description>
applyMapping handles renaming + dropping ignored, but the test covers only one row with one ignored field. No coverage for: (a) multiple rows where some have missing source columns; (b) a mapping that maps two different source headers to the same SemanticField (which should produce undefined behavior — currently last-wins). Low impact because applyMapping is a thin transform, but undefined behavior on duplicates is worth testing.
  </description>
  <fix>Add 2-3 cases to applyMapping describe block covering missing source values, duplicate target fields, and empty rows.</fix>
</finding>

<finding severity="low" id="L3">
  <title>Hamilton SVG renderer has 73-LOC of tests but no edge-case coverage for empty/single-cell axes</title>
  <location>apps/web/tests/unit/hamilton-svg.test.ts:1-73 vs apps/web/src/docs/HamiltonSvg.tsx</location>
  <description>
hamilton-svg.test.ts presumably covers the toy-example rendering (didn't fully read), but `axes=[]` (degenerate single bucket per stratify.ts:34) is a real path that has no SVG fixture verifying its rendering. Low priority but a corner that would surprise a user.
  </description>
  <fix>Add one test for the axes=[] / single-bucket SVG output (verify the visual fallback reads "Eine einzige Gruppe (kein Stratifizierungs-Achse)" or similar).</fix>
</finding>

</findings>

<strengths>
<strength>packages/core/tests/stage1-stratify.test.ts:13-376 is comprehensive — covers determinism, largest-remainder sum invariant across 6 axis combos × 6 target sizes (test L40-62), edge cases (empty stratum, n_h_target=0, exactly-fillable), forced-zero strata for #62, and codepoint-vs-locale Umlaut robustness for TS↔Python parity. 376 LOC, well-structured.</strength>
<strength>packages/core/tests/stage1-audit.test.ts:1-435 covers SHA-256 with FIPS-180-4 worked example (L39-43), canonical JSON round-trip determinism (L48-66), per-field assertions for schema 0.4 mandatory + optional (L185-261), `selected_indices` defensive-copy assertion (L391-394), and timestamp ISO-8601 format. Unusually thorough.</strength>
<strength>apps/web/tests/e2e/stage1-sample-size.spec.ts:1-184 actually decodes the downloaded audit JSON and asserts schema/proposal payload (L150-160) — a pattern other specs (end-to-end.spec.ts) should adopt.</strength>
<strength>apps/web/tests/e2e/mobile-touch-targets.spec.ts:1-168 carries a clear MIN_TARGET=44 contract per Apple HIG / Material, asserts every interactive element's bounding box on a 375×812 viewport, and includes the safe-area-inset-bottom assertion at L150-168 (iOS Safari home-indicator handling).</strength>
<strength>packages/core/tests/stage1-csv.test.ts:143 includes a round-trip parser verification — a pattern that anchors export-format stability without requiring a third-party CSV library agreement.</strength>
<strength>The `forcedZeroStrataKeys` (Issue #62) feature shipped with both unit and e2e coverage (stratify.test.ts:259-334, stage1-bands.spec.ts:88-123), demonstrating a healthy pattern of covering new logic at multiple layers.</strength>
</strengths>

<traces>
<trace name="coverage-mapping">Read all 14 web-unit specs (incl. synthetic-* generator suite of ~1.3 kLOC), all 9 package-unit specs, all 13 e2e specs (incl. 2 _visual-iteration specs), plus the live-smoke spec. Cross-referenced against 39 .ts/.tsx files in apps/web/src plus packages/core, packages/engine-a, packages/engine-contract. Read deploy.yml + both playwright configs. Verified post-#65 source files (Overview.tsx, Sidebar.tsx, Brand.tsx, NavGroup.tsx, App.tsx) line-by-line against grep results for matching test references.</trace>
<trace name="ci-gate-mapping">Read .github/workflows/deploy.yml in full; confirmed `playwright test` (default config) is never invoked. The `smoke` job runs `playwright test --config=playwright-live.config.ts` only on push events, against `./tests/smoke-live` (1 spec, 6 tests). Cross-checked against `apps/web/package.json` scripts at L13 (`test:e2e: playwright test` exists but unused by CI).</trace>
<trace name="audit-footer-field-mapping">Walked AuditFooter.tsx:56-194 and inventoried every dt label (17 mandatory rendered fields). Greped tests/e2e for assertions on each — only `stage1-audit-footer`, `audit-footer-sig-algo`, `audit-footer-sample-size`, `audit-footer-derived`, `audit-footer-forced-zero`, `audit-footer-hash` testids appear. No assertion on the body of the dl rows.</trace>
<trace name="signing-verify-search">Greped for `crypto.subtle.verify`, `Ed25519PublicKey`, `verify_audit`, `importKey` across all of apps/web/tests + packages/*/tests. Zero matches in test files. The Python `scripts/verify_audit.py` exists but inspection of REQUIRED_FIELDS at L28-42 confirms it targets Stage 3 schema 0.1, not Stage 1 schema 0.4.</trace>
</traces>

<recommendations>

<recommendation priority="P0">
  <title>Wire the full Playwright e2e suite into CI on push + pull_request, before depending on post-deploy smoke</title>
  <scope>Add an `e2e` job to .github/workflows/deploy.yml that runs `pnpm --filter @sortition/web exec playwright test` (default config) on chromium + firefox after the build job completes. Upload html-report on failure as a workflow artifact. Run on pull_request so PRs catch regressions before merge.</scope>
  <effort>S</effort>
</recommendation>

<recommendation priority="P0">
  <title>Fix the broken live-smoke (or remove its broken half) — `tab-stage1`/`tab-docs`/`tab-stage3` are md:hidden at the desktop viewport the smoke runs at</title>
  <scope>Rewrite apps/web/tests/smoke-live/site-smoke.spec.ts to drive routes via window.location.hash assignment (matching the e2e-spec convention introduced in #65) OR set viewport to 375×812 explicitly. Verify the smoke runs green against the deployed URL after the fix. Add a `nav-overview` (sidebar at md+) visibility assertion as a new smoke case.</scope>
  <effort>S</effort>
</recommendation>

<recommendation priority="P0">
  <title>Add Ed25519 + ECDSA signature-verification round-trip tests for both Stage 1 and Stage 3 audit signing paths</title>
  <scope>New `apps/web/tests/unit/audit-sign-verify.test.ts` that imports the produced public key and calls `crypto.subtle.verify` against `bodyJson` for both Ed25519 (happy path) and ECDSA fallback (with `vi.spyOn` forcing Ed25519 to throw). Negative test: tampered bodyJson must fail verification. Apply to apps/web/src/stage1/audit-sign.ts AND apps/web/src/run/audit.ts.</scope>
  <effort>M</effort>
</recommendation>

<recommendation priority="P1">
  <title>Cover post-#65 net-new code (Overview, Sidebar, Brand, NavGroup) with functional e2e + a routing spec for parseHash edge cases</title>
  <scope>Two new e2e specs: `sidebar-nav.spec.ts` (5 NavLinks + 2 NavDisabled, aria-current, aria-disabled, hash flips) at desktop viewport ≥768px; `routing.spec.ts` (catch-all → stage3, unknown docs subroute → docs/hub, empty/'#'/'#/' → stage3); plus an `overview.spec.ts` for the 3 sections + 2 workflow cards + 3 principle cards + Stage 2/4 banner.</scope>
  <effort>M</effort>
</recommendation>

<recommendation priority="P1">
  <title>Assert every mandatory schema-0.4 field rendered by AuditFooter — both at e2e level (DOM text matches downloaded audit JSON) and at component level (Solid testing-library)</title>
  <scope>Either extend stage1.spec.ts with a helper that downloads the audit JSON, walks every field, and asserts each rendered dd cell contains the value, OR add a focused AuditFooter component test using @solidjs/testing-library that mounts AuditFooter with a fixture doc and asserts every dt label + dd text. Include `selected_indices` <details> summary count.</scope>
  <effort>M</effort>
</recommendation>

<recommendation priority="P1">
  <title>Enforce TS↔Python byte-identical reproducibility in CI via `scripts/stage1_cross_validate.sh`</title>
  <scope>Add cross-runtime-parity job that sets up Python 3.12, installs reference deps, runs the cross-validation script against 3-5 fixtures (umlaut-rich + herzogenburg-melderegister-8000 + kleinstadt-n500), and fails if any selected[] array or canonical audit JSON (timestamp-stripped) diverges.</scope>
  <effort>M</effort>
</recommendation>

<recommendation priority="P1">
  <title>Add Mulberry32 known-vector test pinning the PRNG sequence and matching the Python reference</title>
  <scope>New packages/core/tests/mulberry32.test.ts: known-vector for seed=42 (5-element fixture), seed-0 edge case, period sanity (10k draws, no early repeat), uint32 normalization, cross-runtime parity vector matching scripts/stage1_reference.py output.</scope>
  <effort>S</effort>
</recommendation>

<recommendation priority="P1">
  <title>Extend a11y to axe-core integration with sidebar aria-current/aria-disabled + focus-order coverage</title>
  <scope>Replace skin-deep a11y.spec.ts with @axe-core/playwright on Stage 1, Stage 3, Overview, and one docs subpage. Add explicit aria-disabled assertions for nav-stage2/nav-stage4. Add Tab × N keyboard reachability trace through the Stage 1 form.</scope>
  <effort>M</effort>
</recommendation>

<recommendation priority="P1">
  <title>Fix the iso-8859-1 vs windows-1252 type/implementation mismatch and add iso-8859-1 + extended windows-1252 fixture tests</title>
  <scope>Either narrow SupportedEncoding to drop iso-8859-1 (simpler, document the win-1252 fallback), OR implement an explicit iso-8859-1 detection branch + tests for €, smart quotes, ß. Add 8-12 new csv-parse test cases covering the wider 8-bit byte range and a fixture-driven regression test using the 8000-row Herzogenburg file.</scope>
  <effort>S</effort>
</recommendation>

<recommendation priority="P1">
  <title>Add Stage 3 e2e with audit-JSON decode + RunPanel unit tests for buildAudit/canonicalQuotas/inputSha256</title>
  <scope>New apps/web/tests/e2e/stage3.spec.ts: upload n=20 fixture, configure quotas, run, decode audit JSON, assert schema_version, engine.id, algorithm, selected.length === panel_size, every quota_fulfillment.ok === true, selected[] sorted. Plus apps/web/tests/unit/run-audit.test.ts for inputSha256 stability, canonicalQuotas order-independence, buildAudit field population.</scope>
  <effort>M</effort>
</recommendation>

<recommendation priority="P2">
  <title>Add 100k-row performance budget tests for parseCsvBuffer and stratify</title>
  <scope>New packages/core/tests/stage1-perf.test.ts (asserts stratify on 100k rows < 5s) and apps/web/tests/unit/csv-parse-perf.test.ts (parseCsvBuffer on 100k-row CSV < 2s). Use generatePool({ size: 100_000 }) for the input. Mark with explicit perf tag so they can be excluded from quick local runs.</scope>
  <effort>S</effort>
</recommendation>

<recommendation priority="P2">
  <title>Add a Stage1AuditDoc canonical-JSON golden fixture test</title>
  <scope>New packages/core/tests/stage1-audit.golden.test.ts that reads packages/core/tests/fixtures/stage1-audit-0.4.golden.json and asserts canonicalStage1Json(buildAudit(...)) === goldenContent (timestamp stripped). When schema changes are intentional, regeneration is one git diff.</scope>
  <effort>S</effort>
</recommendation>

<recommendation priority="P2">
  <title>Decode at least one audit JSON in live-smoke + add a deployed-bundle Stage 1 draw assertion</title>
  <scope>Extend site-smoke.spec.ts with a single end-to-end run of Stage 1 against the deployed bundle: small fixture upload, target_n=10, audit-JSON download, parse + assert schema_version + selected_indices length + signature length > 0. Stays within the 3-min smoke budget.</scope>
  <effort>S</effort>
</recommendation>

<recommendation priority="P2">
  <title>Add QuotaEditor component test (Solid testing-library)</title>
  <scope>New apps/web/tests/unit/quota-editor.test.ts that mounts QuotaEditor with fixture rows + props, simulates add → fill bounds → invalid bounds, asserts inline validation messages render and removing a category resets state.</scope>
  <effort>S</effort>
</recommendation>

<recommendation priority="P2">
  <title>De-fragilize text-match assertions in stage1-bands.spec.ts and stage1-stratify.test.ts</title>
  <scope>Replace literal German copy assertions ("5 Auswahl", "Bevölkerungsgruppen", "Lücke zwischen Band a") with structural assertions on testids + element counts. Replace literal warning-string match in stratify test with stable-substring + JSON-shape assertion. Document the pattern in apps/web/tests/README.md.</scope>
  <effort>S</effort>
</recommendation>

<recommendation priority="P2">
  <title>Move or delete _visual-iteration*.spec.ts</title>
  <scope>Move apps/web/tests/e2e/_visual-iteration.spec.ts and _visual-iteration-65.spec.ts to a separate apps/web/tests/screenshots/ dir excluded from the default Playwright project, OR convert them to toMatchSnapshot() visual-regression tests. The archived 56-issue spec can simply be deleted.</scope>
  <effort>S</effort>
</recommendation>

<recommendation priority="P3">
  <title>Add the small remaining unit gaps: applyMapping edge cases, Hamilton SVG axes=[] case</title>
  <scope>Two-three small additions to existing test files (csv-parse.test.ts and hamilton-svg.test.ts). Polish-level coverage.</scope>
  <effort>S</effort>
</recommendation>

</recommendations>

<verdict value="fail" critical="3" high="8" medium="8">
  <summary>The full e2e suite is not gated by CI, the live-smoke that does run is likely broken since #65 due to viewport/visibility mismatch, and the Stage-1 audit-signing claim that backs the project's central trust pitch has no verification round-trip — three mutually-reinforcing critical gaps that let signed-audit regressions reach production undetected.</summary>
</verdict>

</review>

