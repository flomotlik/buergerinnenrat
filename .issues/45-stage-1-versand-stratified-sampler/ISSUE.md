---
id: 45
slug: stage-1-versand-stratified-sampler
title: Stage 1 — Versand-Auswahl per stratifizierter Zufallsstichprobe
track: Z
estimate_pt: 2
status: planned
depends_on: []
priority: critical
priority_rationale: "Voraussetzung für reale Verwaltungs-Nutzung — bisher fehlt der erste Verfahrensschritt komplett"
---

# Stage 1 — Versand-Auswahl

## Kontext

Reale Bürger:innenrats-Verfahren beginnen mit einer **Versand-Liste**: aus dem Melderegister (z.B. 6.000 Wahlberechtigte) wird eine repräsentative Stichprobe von z.B. 300 Personen gezogen, die dann angeschrieben und eingeladen werden. Die App heute springt direkt von "CSV importieren" zu "Maximin-Lauf auf Antwortenden-Pool" — der Stage-1-Schritt fehlt komplett.

Vollständige Architektur-Begründung: `sortition-tool/08-product-redesign.md`. Workflow-Analyse: `sortition-tool/07-two-stage-workflow-analysis.md`.

## Ziel

Neuer App-Bereich "Versand-Liste ziehen": Nutzer lädt Melderegister-CSV hoch, konfiguriert Stratifikation und Stichprobengröße, lädt CSV der gezogenen Personen plus signierten Audit-Snapshot herunter. Pure TypeScript, kein Solver, sub-Sekunde für jede Eingangsgröße bis 100.000.

## Acceptance Criteria

- [ ] Neue Route/Tab `/stage1-versand` in `apps/web/`, erreichbar aus Hauptnavigation
- [ ] CSV-Upload für Melderegister-Eingangs-Datei, wiederverwendet bestehenden CSV-Parser (`apps/web/src/csv/parse.ts`)
- [ ] Defaults für Stratifikations-Achsen: Tool erkennt aus CSV-Spalten `district`, `age_band`, `gender` (falls vorhanden) und schlägt diese drei als Default-Achsen vor. Nutzer kann Achsen abwählen oder weitere CSV-Spalten als Achsen hinzufügen.
- [ ] Eingabe Stichprobengröße N (numerisch, Pflicht)
- [ ] Algorithmus: proportionale stratifizierte Zufallsstichprobe ohne Zurücklegen, mit **Largest-Remainder-Methode** für die Bruchteil-Rundung (sum aller n_h = N exakt, auch bei Rundungs-Drift)
- [ ] Edge-Cases dokumentiert + getestet: leeres Stratum (n_h_target=0, kein Fehler), n_h_target > N_h (ziehe alle, weiter ohne Fehler, im Audit-Snapshot vermerken), nur ein Stratum (entartet zu einfacher Zufallsstichprobe)
- [ ] Deterministisch über Seed (Eingabefeld, Default = aktuelle Unix-Zeit). Wiederverwendet `Mulberry32` aus `packages/core/src/pool/mulberry32.ts`
- [ ] Output 1: CSV mit den gezogenen Personen, alle Original-Spalten erhalten, neue Spalte `gezogen` (true/false) optional
- [ ] Output 2: Audit-JSON mit Seed, Eingangs-CSV-SHA256, Stratifikations-Achsen, Ziel-N, tatsächlich-N, Stratum-Tabelle (n_h_target vs n_h_actual), Zeitstempel, Ed25519/ECDSA-Signatur (wiederverwendet bestehende Signatur-Logik aus `packages/core/src/audit`)
- [ ] Unit-Tests in `packages/core/src/stage1/__tests__/`: deterministisch-mit-Seed, Stratum-Counts korrekt, Largest-Remainder-Sum, Edge-Cases
- [ ] Integrations-Test: 6000-Zeilen-CSV (synthetisch) → 300 gezogen → Strata-Verteilung innerhalb ±1 vom Erwartungswert
- [ ] Playwright-Smoke: Upload, Defaults werden vorgeschlagen, Größe eingeben, Lauf, Download geht
- [ ] Bestehende Stage-3-Funktionalität (CSV → Quoten → Engine → Panel) bleibt unverändert nutzbar

## Out of Scope

- Direkte BMG-§46-API-Anbindung (Verwaltung exportiert CSV manuell aus Melderegister)
- Mehrstufige Stratifikation mit Interaktions-Constraints (nur unabhängige Achsen)
- Auswahl mit Quoten-**Korridoren** (das ist Stage 3, hier sind es harte proportionale Targets)
- Auto-Aggregation feiner Strata in gröbere bei kleinen Gemeinden (manuelle Achsen-Wahl reicht für Iteration 2)
- Disjunkt-Ziehen aus mehreren Versand-Wellen (das ist Issue #48, "Nachholung")

## Verweise

- Architektur-Doc: `sortition-tool/08-product-redesign.md`
- Workflow-Hintergrund: `sortition-tool/07-two-stage-workflow-analysis.md`
- BMG §46-Felder: `research/03-legal-framework-and-best-practices.md:200-280`
- Algorithmus: Largest-Remainder-Methode (Hamilton-Methode), `https://en.wikipedia.org/wiki/Largest_remainders_method`
- Wiederverwendbar: `packages/core/src/pool/mulberry32.ts`, `apps/web/src/csv/parse.ts`, bestehende Audit-Signatur in `packages/core/src/audit/`
