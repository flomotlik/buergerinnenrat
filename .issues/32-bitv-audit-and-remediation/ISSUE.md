---
id: 32
slug: bitv-audit-and-remediation
title: BITV-2.0-Konformitäts-Audit + Erklärung zur Barrierefreiheit (BGG §12a)
track: 7
estimate_pt: 3
deps: [archived/24, 33]
status: todo
blocks: [37]
source: review-2026-04-25 (Claude #32, Codex #30, Gemini #26-04 — alle drei einig)
---

# BITV-2.0-Konformität für Kommunal-Pilot

## Kontext

`apps/web/tests/e2e/a11y.spec.ts:3-31` ist explizit als "lightweight a11y smoke check" markiert. Issue #24 hat vollständige BITV-2.0-Konformität ausdrücklich aus dem Iteration-1-Scope ausgeschlossen (`.issues/archived/24-static-deploy-and-a11y-audit/ISSUE.md:18-19, 39-43`).

BITV 2.0 ≠ axe-Smoke. BITV verlangt WCAG-2.1-AA + EN 301 549 + Erklärung zur Barrierefreiheit auf der Website. Für öffentliche Stellen ist das Pflicht ab Tag 1 bei Beschaffung. Aktuelle UI-Lücken in den App-Komponenten:

- `apps/web/src/quotas/QuotaEditor.tsx` Tabellen ohne `<caption>`, ohne `scope="col"`/`scope="row"`
- `apps/web/src/run/RunPanel.tsx` Form-Inputs ohne `aria-describedby` für Validation-Errors
- Progress-Update ist nicht in einer aria-Live-Region (`apps/web/src/run/RunPanel.tsx:111-122`)
- Kein Skip-Link, keine systematischen Keyboard-Trap-Tests
- Kontrast-Werte für Tailwind-Default-Slate auf weiß sind nicht validiert

## Ziel

Vollständiger BITV-2.0-Audit-Bericht + Behebung aller blockierenden Verstöße im Hauptflow + Erklärungs-Vorlage für Kommunen.

## Akzeptanzkriterien

- [ ] **Automatisierter Audit**: axe-core über alle drei App-Schritte (Import, Quoten, Lauf) im Detail-Mode (alle Severities, nicht nur "critical"). Bericht in `docs/a11y/audit-2026-XX-XX.md`
- [ ] **Manueller Keyboard-Test**: Tab durch jede Aktion, Enter aktiviert, Escape schließt Dialoge. Protokolliert in `docs/a11y/keyboard-test.md`
- [ ] **Screenreader-Test**: NVDA (Windows) oder VoiceOver (macOS) durch Hauptflow. Protokoll im Doc; jeder Interaction-Step verbalisiert
- [ ] **Code-Fixes** (Acceptance: alle Severity ≥ moderate behoben):
  - Tabellen mit `<caption>` + `scope`-Attributen
  - Form-Errors über `aria-describedby` an Inputs gebunden
  - Live-Regions (`aria-live="polite"`) für Progress + Run-Status
  - Skip-to-main-Link
  - Sichtbarer Fokus-Ring auf allen interaktiven Elementen
  - Kontrast-Audit: alle Text-/Background-Kombinationen ≥ 4.5:1 (AA)
- [ ] **Erklärungsvorlage**: `docs/erklaerung-zur-barrierefreiheit.md` — Vorlage nach BGG §12a Abs. 1, ausfüllbar pro Kommune mit Restrisiken-Liste
- [ ] **CI-Gate**: `make a11y-ci` (Playwright + axe) scheitert bei Violations Severity ≥ moderate
- [ ] **Lighthouse-Score**: Accessibility ≥ 95, Best-Practices ≥ 95 (Smoke-Acceptance #24 forderte ≥ 90)
- [ ] **Erweiterung von `apps/web/tests/e2e/a11y.spec.ts`**: alle drei Hauptflow-Stati durchlaufen, axe-Audit in jedem

## Out of Scope

- Vollständige WCAG-AAA (AA reicht für BITV-Konformität)
- BITV-Test-Verfahren (offizielle Prüfstelle) — das ist Schritt 2 nach unserem internen Audit
- Übersetzung in einfacher Sprache (das ist #34 / #33 i18n-Layer)
- Multi-Language-Direction (RTL für Arabisch) — Iteration 3

## Verweise

- Aktueller Smoke: `apps/web/tests/e2e/a11y.spec.ts`
- #24 Scope: `.issues/archived/24-static-deploy-and-a11y-audit/ISSUE.md`
- BITV 2.0: https://www.bitvtest.de/bitv_test
- WCAG 2.1 AA: https://www.w3.org/TR/WCAG21/
