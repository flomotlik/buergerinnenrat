---
id: 54
slug: in-app-documentation
title: In-App Dokumentation — Algorithmus, Tech-Stack, Reproduzierbarkeit, Trust-Signale
track: Z
estimate_pt: 3
status: planned
depends_on: [45, 52, 53]
priority: high
priority_rationale: "3-LLM-Ideation-Konsens: ohne in-situ Doku entsteht kein Vertrauen, ohne Reproduzierbarkeits-Pfad keine externe Verifikation"
---

# In-App Dokumentation

## Kontext

Algorithmus + Audit-Chain stehen (#45/#52/#53), aber alle Erklärungen liegen in `docs/*.md` im Git-Repo — eine Verwaltungs-Mitarbeiter:in oder ein:e externe:r Auditor:in sieht das im Tool selbst nicht.

3-LLM-Ideation-Review (`.issues/in-app-docs-ideation/reviews/`, 3× PASS) ergab klaren Konsens:
- Dedicated `/docs` SPA-Tab mit Hub-Seite + Unterseiten
- Algorithmus-Seite mit visuellem Toy-Walkthrough
- Tech-Stack-Seite mit Build-Time-Manifest (Versions-Pinning)
- Reproduzierbarkeits-Anleitung für Auditor:innen
- Trust-Signale + Tooltips IN den Workflow integriert (nicht nur in `/docs` versteckt)

## Ziel

Zwei Vertrauens-Pfade, beide in der App selbst:
1. **Verwaltungs-Pfad**: Trust-Signale im Stage1Panel, kontextuelle Tooltips, "Wie funktioniert das?"-Links zu Plain-Language-Erklärungen
2. **Auditor-Pfad**: `/docs/technik` mit Versions-gepinntem Manifest, `/docs/verifikation` mit Schritt-für-Schritt-Reproduktions-Anleitung

## Acceptance Criteria

### Routing + Hub (P1, 3/3 MUST)

- [ ] `apps/web/src/App.tsx`: dritter Top-Level-Tab "Dokumentation" neben "Versand-Liste" und "Panel ziehen"
- [ ] `apps/web/src/docs/DocsHub.tsx`: Hub-Seite mit 5-7 Tile-Karten (Algorithmus / Technik / Verifikation / Glossar / BMG §46 / Limitationen)
- [ ] In-Tab-Navigation via Solid-Signal-State (kein neuer Router-Dep), URL-Hash-Sync (`#/docs/algorithmus`) für Bookmark-Fähigkeit

### Algorithmus-Seite (P2, 3/3 MUST)

- [ ] `apps/web/src/docs/Algorithmus.tsx`
- [ ] Toy-Beispiel: 100 Personen → 10 ziehen, 3 Bezirke × 2 Geschlechter = 6 Strata. Visuelle Hamilton-Allokation als SVG (Stratum-Boxen mit "8 Personen → Soll 0.8 → Floor 0 + Remainder 0.8 → +1 = 1 gezogen")
- [ ] Realistisches Beispiel: 6.000 Personen → 300 ziehen, Verlinkung zu `Stage 1` als "selbst ausprobieren"
- [ ] 5-Schritt-Erklärung (Bucketize → Hamilton → Lex-Order → Fisher-Yates → Output) als kollabierbare Detail-Sektion
- [ ] Externe Verlinkungen: Cochran ch. 5, Hamilton/Largest-Remainder Wikipedia, Sortition Foundation Methodik, Flanigan Nature 2021

### Tech-Stack-Seite (P3 Claude / P5 Codex / P2 Gemini, 3/3 MUST/SHOULD)

- [ ] `apps/web/src/docs/Technik.tsx`
- [ ] Build-Time-Manifest: `scripts/build-tech-manifest.ts` liest `package.json` + `pnpm-lock.yaml` und generiert `apps/web/src/generated/tech-manifest.ts`
- [ ] Manifest enthält: jede direkte Dependency (Solid, Vite, Tailwind, highs.wasm, Web Crypto API als Browser-Standard ohne Version, Mulberry32 als own-implementation), Version, Lizenz, kurze Begründung "wofür wird das genutzt"
- [ ] Algorithmen-Sektion (nicht Library, sondern Algorithmus): Hamilton-Apportionment, Fisher-Yates-Shuffle, Mulberry32-PRNG, Ed25519/ECDSA-Signatur — jeweils mit Quelle und "warum das hier"
- [ ] Build-Reproduzierbarkeit: pnpm-lock.yaml-Hash + Node-Version + Commit-SHA des Builds (aus `git rev-parse HEAD`) prominent angezeigt

### Reproduzierbarkeits-Seite (P5 Claude / P4 Codex / P3 Gemini, 3/3 SHOULD/MUST)

- [ ] `apps/web/src/docs/Verifikation.tsx`
- [ ] 3-Schritt-Anleitung: (1) Audit-JSON herunterladen, (2) Eingangs-CSV bereithalten, (3) `python3 scripts/stage1_reference.py` mit Parametern aus dem Audit-JSON laufen lassen + `selected_indices` byte-vergleichen
- [ ] Code-Snippets sind copy-paste-bereit
- [ ] Verlinkung zu `scripts/stage1_reference.py` und `scripts/stage1_cross_validate.sh` im Repo
- [ ] "Was kann ich noch prüfen?"-Sektion: Signatur mit `openssl`, Cross-Validation mit anderen Tools

### Trust-Strip im Stage1Panel (P4 Claude / P3 Codex)

- [ ] `apps/web/src/stage1/TrustStrip.tsx`: 3-Karten-Block direkt nach dem Schritt-Header
- [ ] Karte 1: "Algorithmus seit 1792" (Hamilton) → Link zu `/docs/algorithmus`
- [ ] Karte 2: "Cross-validiert mit Python-Referenz, 21/21 byte-identisch" → Link zu `/docs/verifikation`
- [ ] Karte 3: "Signiertes Audit-Protokoll, vollständig nachprüfbar" → Link zu `/docs/verifikation`
- [ ] Visuelle Differenzierung von der Werkbank — Trust-Signale, nicht Werkzeuge

### Glossar (P6 Claude / P7 Codex / P4 Gemini)

- [ ] `apps/web/src/docs/glossar.json`: Datenbasis (Bevölkerungsgruppe/Stratum, Soll/n_h_target, Ist/n_h_actual, Hamilton-Methode, Fisher-Yates, Mulberry32, etc., 15-25 Einträge)
- [ ] `apps/web/src/docs/Glossar.tsx`: Vollseite alphabetisch
- [ ] `apps/web/src/docs/Term.tsx`: Inline-Komponente — auf Hover/Touch zeigt Tooltip mit Kurzdefinition + Link zur Vollseite. Verwendung in Algorithmus-/Technik-/Verifikations-Seiten

### BMG §46 Erklär-Seite (P7 Claude / P6 Codex)

- [ ] `apps/web/src/docs/Bmg46.tsx`: kurze Erklärung "Warum kann ich nicht nach Bildung stratifizieren?" mit Auflistung der zulässigen Felder
- [ ] Verlinkt aus dem bestehenden BMG-Hint im Stage1Panel (zusätzlich zum existierenden externen Link auf gesetze-im-internet.de)

### Limitationen-Seite (P8 Claude)

- [ ] `apps/web/src/docs/Limitationen.tsx`: ehrlich, aber nicht alarmierend
- [ ] Inhalte: kein IPF, keine Soft-Constraints, kein Cross-Stratum-Minimum, Mulberry32 ist nicht crypto-grade (mit sozialer Mitigation), Pool-Größen-Skalierung
- [ ] Verlinkt aus Limitations-Hint und aus Underfill-Banner

### Print-friendly Doku (P9 Claude / P8 Codex)

- [ ] `apps/web/src/index.css`: print-Stylesheet erweitern für `/docs/*` — Navigation aus, klare Schrift-Größen, Seitenumbrüche

### Build-/Commit-Info im Footer

- [ ] Build-Time-Variable: `VITE_GIT_SHA` aus `git rev-parse --short HEAD`, in Vite-Config injiziert
- [ ] DocsHub-Footer: "Diese Doku gehört zu Build [SHA] vom [Date]"

### Tests

- [ ] Vitest-Test für Tech-Manifest-Generator
- [ ] Vitest-Test für Hamilton-Walkthrough-Datenstruktur (Beispiel-Inputs liefern erwartete Outputs)
- [ ] Playwright-Tests: Tab-Switch funktioniert, Hub-Karten klickbar, Algorithmus-Seite zeigt Toy-Beispiel-SVG, Tech-Seite zeigt mind. 5 Libraries mit Version, Verifikations-Seite zeigt copy-paste-Code-Snippets, TrustStrip im Stage1 ist sichtbar und klickbar
- [ ] Bestehende Tests (#45/#52/#53) bleiben grün
- [ ] Bundle-Delta unter +25 KB raw / +8 KB gzip dokumentieren

## Out of Scope

- Mehrsprachigkeit (Doku ist DE only)
- PDF-Export (Print-CSS reicht)
- Interaktiver Algorithmus-Playground (P11 Claude COULD — eigener Issue)
- Audit-JSON-Drag-and-drop-Reader (P11 Claude COULD — eigener Issue)
- "Über dieses Tool / Methodik-Bibliografie" als eigene Seite (P10 Claude COULD — kann später, Quellen sind inline pro Doku-Seite)

## Verweise

- Ideation-Reviews: `.issues/in-app-docs-ideation/reviews/review-*.md` (3× PASS, 24 Proposals total)
- Bestehende Markdown-Quellen für Inhalt: `docs/stage1-algorithm.md`, `docs/stage1-validation-report.md`
- Audit-Schema: `docs/audit-schema.json`, `packages/core/src/stage1/types.ts:54-86`
- BMG §46: `research/03-legal-framework-and-best-practices.md:200-280`, <https://www.gesetze-im-internet.de/bmg/__46.html>
- Hamilton/Largest-Remainder: <https://en.wikipedia.org/wiki/Largest_remainders_method>
- Fisher-Yates: Knuth TAOCP Vol. 2 §3.4.2
- Mulberry32: <https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32>
- Sortition Foundation: <https://www.sortitionfoundation.org/how>
- Flanigan et al. 2021 Nature: <https://www.nature.com/articles/s41586-021-03788-6>
- Cochran *Sampling Techniques* 3rd ed., Kapitel 5
