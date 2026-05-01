---
review_of: test-coverage-gap-audit
review_type: topic
review_mode: topic
review_topic: Test coverage gap audit — unit / integration / e2e / smoke / CI
reviewed_at: 2026-05-01T07-28-12Z
tool: gemini
model: gemini-3.1-pro-preview
duration_seconds: 165
---

<review>

<findings>

<finding severity="critical" id="C1">
  <title>Playwright e2e suite is entirely disconnected from CI</title>
  <location>.github/workflows/deploy.yml:39</location>
  <description>The full Playwright e2e suite (`apps/web/tests/e2e/`, ~12 specs) does not run on PR or push. The CI workflow builds the bundle and runs vitest unit tests (`pnpm --filter @sortition/web test`), but skips Playwright entirely until post-deployment live smoke. Regressions in user flows can merge silently.</description>
  <fix>Add an e2e testing job to deploy.yml using Playwright's web server configuration before the build job completes, gating PR merges.</fix>
</finding>

<finding severity="high" id="H1">
  <title>Post-#65 redesign components have zero test coverage</title>
  <location>apps/web/src/Overview.tsx:1</location>
  <description>The new components introduced in Issue #65 (`Overview.tsx`, `Sidebar.tsx`, `Brand.tsx`, `NavGroup.tsx`) have neither unit nor e2e assertions. Routing, mobile-pill-shim state, active navigation styling, and rendering of the `#overview` route are untested.</description>
  <fix>Write component tests for NavGroup and Sidebar active states, and add e2e assertions for `/` routing to the new overview dashboard.</fix>
</finding>

<finding severity="high" id="H2">
  <title>Audit footer UI missing assertions for new schema 0.4 fields</title>
  <location>apps/web/tests/e2e/stage1.spec.ts:86</location>
  <description>The e2e test only checks that the `stage1-audit-footer` is visible and contains 'SHA-256' and the signature algorithm. The 12+ newly-rendered mandatory fields from schema 0.4 (`tie_break_rule`, `key_encoding`, `stratum_sort`, `selected_indices`, `warnings`, `duration_ms`, `public_key`, etc.) are entirely unasserted in the UI.</description>
  <fix>Extend stage1.spec.ts to explicitly locate and assert the presence of the new audit fields in the DOM footer.</fix>
</finding>

<finding severity="medium" id="M1">
  <title>Audit signatures are not round-trip verified</title>
  <location>apps/web/tests/unit/stage1-audit-sign.test.ts:33</location>
  <description>The audit-sign unit test verifies that a signature and public key are populated and the stripped JSON matches canonical serialization. However, there is no verification test to mathematically ensure the generated signature actually validates against the public key and canonical document using Ed25519/ECDSA primitives.</description>
  <fix>Add a verification step using SubtleCrypto or a known library to round-trip the signed document in the unit test.</fix>
</finding>

<finding severity="medium" id="M2">
  <title>Mobile touch targets miss new #65 Sidebar components</title>
  <location>apps/web/tests/e2e/mobile-touch-targets.spec.ts:36</location>
  <description>The touch-target e2e spec still only tests the old `tab-stage1` pills and docs-hub tiles. It does not test the new sidebar nav items (`NavGroup.tsx`) or mobile-pill-shim layout introduced in the redesign, leaving new mobile interactions at risk of violating the 44x44 rule.</description>
  <fix>Update mobile-touch-targets.spec.ts to assert the new Sidebar links and mobile toggle states meet Apple/Material 44px minimums.</fix>
</finding>

</findings>

<strengths>
<strength>Algorithm Reproducibility (packages/core/tests/stage1-stratify.test.ts:14): Byte-identical determinism and PRNG seeding are robustly tested, including backward compatibility guards for structural changes.</strength>
<strength>CSV Pipeline and Derivation (apps/web/tests/unit/derive.test.ts:13): Strong coverage of UTF-8/Win-1252 parsing, `geburtsjahr` boundary derivations, and schema mappings.</strength>
<strength>Stage 3 e2e (apps/web/tests/e2e/end-to-end.spec.ts:11): End-to-end traversal of import -> quotas -> engine-a run -> results export is mapped and functioning.</strength>
</strengths>

<traces>
<trace name="coverage-mapping">
Read deploy.yml CI triggers. Used grep/wc to map all 14 unit specs, 12 e2e specs against apps/web/src components. Analyzed `stage1.spec.ts`, `stage1-audit-sign.test.ts`, `derive.test.ts`, `stage1-audit.test.ts`, and a11y tests line-by-line against schema 0.4 definitions and post-#65 UI file histories.
</trace>
</traces>

<recommendations>
<recommendation priority="P0">
  <title>Add full Playwright e2e suite to CI gate (preview-server based)</title>
  <scope>Configure playwright to start a local preview server and run the e2e test suite on `pull_request` inside deploy.yml.</scope>
  <effort>S</effort>
</recommendation>
<recommendation priority="P1">
  <title>Add component and routing e2e tests for post-#65 navigation</title>
  <scope>Add coverage for `Overview.tsx`, `Sidebar.tsx`, and `NavGroup.tsx`.</scope>
  <effort>M</effort>
</recommendation>
<recommendation priority="P1">
  <title>Expand Stage1 UI tests to assert all 0.4 AuditFooter fields</title>
  <scope>Update stage1.spec.ts to select and assert `tie_break_rule`, `key_encoding`, `duration_ms` and other new footer datums.</scope>
  <effort>S</effort>
</recommendation>
<recommendation priority="P2">
  <title>Add mathematical verification round-trip to audit-sign tests</title>
  <scope>Validate the resulting signature against the canonical document using the generated public key.</scope>
  <effort>M</effort>
</recommendation>
<recommendation priority="P2">
  <title>Update mobile touch-target tests for new sidebar layout</title>
  <scope>Add assertions for the new mobile navigation elements to ensure they meet the 44px minimum target size.</scope>
  <effort>S</effort>
</recommendation>
</recommendations>

<verdict value="fail" critical="1" high="2" medium="2">
  <summary>Critical gap: The e2e test suite is completely missing from the CI pipeline, leaving the newly added but untested UI components from Issue #65 vulnerable to regressions.</summary>
</verdict>

</review>
```
