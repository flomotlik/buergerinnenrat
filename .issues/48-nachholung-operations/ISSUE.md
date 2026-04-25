---
id: 48
slug: nachholung-operations
title: Nachhol-Operationen 3a/3b/3c (mehr Briefe, Replace, Reserve nachfüllen)
track: Z
estimate_pt: 2
status: open
depends_on: [45, 46, 47]
priority: high
priority_rationale: "Reale Verfahren brauchen alle drei Nachhol-Pfade — heute nur halb implementiert"
---

# Nachhol-Operationen

## Kontext

Bürger:innenrats-Verfahren in der Praxis brauchen drei Arten der Nachholung nach einer ersten Auswahl:

- **3a** "Brauche mehr Briefe in Bezirk X." — Versand-Liste erweitern, **disjunkt** zur ersten Welle, ggf. Stratum-Lücke schließen.
- **3b** "Eine Person aus dem Panel sagt ab." — Ersatz aus Reserve mit Stratum-Match; falls Reserve leer im Stratum, dann aus Antwortenden-Pool.
- **3c** "Reserve aufgebraucht." — Reserve neu ziehen aus Antwortenden-Pool, mit Force-Out auf alle bisher Ausgewählten.

Heute funktioniert nur eine vereinfachte Version von 3b ohne Stratum-Filter und ohne Reserve-Konzept (`packages/engine-a/src/panel-ops.ts:27-89`).

## Ziel

Drei Operationen als UI-Aktionen verfügbar, alle aufbauend auf einem geladenen Verfahren-State (#46):

- "Mehr Briefe ziehen" (3a) — re-stratifiziertes Sample, disjunkt
- "Person ersetzen" (3b) — markiere Person als Drop-out, ziehe Ersatz
- "Reserve nachfüllen" (3c) — neue Reserve aus verbleibendem Pool

## Acceptance Criteria

- [ ] **3a** in Stage-1-Bereich: Button "Welle erweitern", Eingabe N_zusatz, ziehe N_zusatz Personen die in der bisherigen Versand-Liste **nicht** vorkommen, mit gleicher Stratifikation; Verfahren-State um neue Welle erweitert
- [ ] **3a** Stratum-Lücken-Modus: "Bezirke X, Y unter-vertreten — gezielt dort nachziehen" als Option
- [ ] **3b** in Stage-3-Bereich: pro Panel-Person ein "Ersetzen"-Button; Klick zieht erst aus Reserve mit gleichem Stratum, fällt auf Antwortenden-Pool zurück, schreibt Replace-Operation in Verfahren-State
- [ ] **3b** wenn weder Reserve noch Antworten passend: klare Fehlermeldung "kein Stratum-Match möglich, Verfahren manuell entscheiden"
- [ ] **3c** Button "Reserve auffüllen", Eingabe Ziel-Reserve-Größe, erweitert Reserve aus verbleibendem Antwortenden-Pool mit Force-Out auf bisherige Auswahl
- [ ] Alle drei Operationen erweitern Verfahren-State-Datei (#46) mit eigenem Operation-Typ + signiertem Snapshot
- [ ] Tests pro Operation: korrekte Disjunktheit, Stratum-Match, Determinismus mit Seed
- [ ] Playwright-Smoke pro Operation

## Out of Scope

- Automatische Nachhol-Schwellen ("ziehe automatisch nach wenn Bezirk X unter 80 % Soll fällt")
- Mehr-Wellen-Optimierung über das ganze Verfahren (nur lokales Auffüllen pro Operation)
- Anschreiben der nachgezogenen Personen (extern)

## Verweise

- Architektur: `sortition-tool/08-product-redesign.md`
- Standard-Praxis Reserve-Replacement: `sortitionfoundation.org/how`
- Heutige (unvollständige) Replace-Logik: `packages/engine-a/src/panel-ops.ts:27-89`
- Abhängig von: #45 (Stage-1-Sampler), #46 (State-Datei), #47 (Reserve-Konzept)
