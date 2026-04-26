---
id: 52
slug: stage1-group-reporting-ux
title: Stage 1 — Gruppen-Reporting-UX (welche Strata, Soll vs Ist visuell)
track: Z
estimate_pt: 2
status: open
depends_on: [45]
priority: high
priority_rationale: "Auswahl wird gemeinsam in der Gruppe vorgenommen — die Gruppe muss verstehen, welche Personen warum ausgewählt wurden"
---

# Stage 1 — Gruppen-Reporting-UX

## Kontext

Heute zeigt der Stage-1-Lauf eine flache Strata-Tabelle: Schlüssel | Pool | Soll | Ist. Das ist datenmäßig vollständig, aber für die **Gruppen-Sitzung** in der die Auslosung stattfindet zu spröde. Die Verfahrens-Begleiter:innen müssen vor und nach dem Lauf gegenüber Bürgermeister:in und Gemeinderat **erklären** können:

- Welche Stratifikations-Achsen wurden gewählt?
- Wie viele verschiedene Strata ergeben sich daraus?
- Welche Strata sind im Pool gut vertreten, welche dünn?
- Wie viele Personen werden pro Stratum gezogen, und warum genau diese Zahl (proportionale Allokation)?
- Sind alle Strata abgedeckt oder gibt's Underfills?

Das ist nicht primär eine Tabellen-Frage, sondern eine **visuelle Ergebnis-Aufbereitung** für eine Gruppen-Diskussion am Bildschirm.

## Ziel

Stage-1-Ergebnis-Bereich ergänzen um:

1. **Voraus-Reporting (vor dem Lauf):** sobald CSV importiert + Achsen + N gewählt → zeige berechneten "Was würde passieren?"-Vorschau:
   - Anzahl Strata insgesamt
   - Histogramm/Verteilung der Stratum-Größen im Pool (z.B. "5 große Strata mit >50 Personen, 12 mittlere mit 10-50, 23 kleine mit <10")
   - Proportionale Soll-Allocation pro Stratum (Hamilton-Vorschau)
   - Warnung wenn viele kleine Strata droht (z.B. ">30 % der Strata würden 0 Personen erhalten")

2. **Nach-Reporting (nach dem Lauf):** zusätzlich zur heutigen Tabelle:
   - Visuelle Achsen-Aufschlüsselung pro Achse einzeln: "Bezirk" → Balkendiagramm Soll vs Ist pro Bezirk
   - Aggregat-Ansichten pro Marginal (Bezirk gesamt, Alter gesamt, Geschlecht gesamt) — nicht nur Cross-Product-Zellen
   - Underfill-Liste prominent: welche Strata bekamen weniger als geplant, mit Erklärung "Pool hatte nur X Personen in diesem Stratum"
   - Coverage-Metrik: "x von y Strata erhielten mindestens 1 Person"

3. **Druckbarer/exportierbarer Bericht:** Ergebnis-Bereich druckfreundlich formatiert, optional Markdown-Export ("Ergebnisbericht als Datei"), damit die Gruppen-Sitzung ein Protokoll ablegen kann

## Acceptance Criteria

- [ ] **Vorab-Vorschau:** vor dem "Ziehen"-Button-Klick zeigt das UI eine kompakte Tabelle "Vorschau: Soll-Allokation pro Stratum" sobald N und Achsen gesetzt sind, in `apps/web/src/stage1/`
- [ ] **Visualisierung pro Achse:** `apps/web/src/stage1/AxisBreakdown.tsx` — pro Stratifikations-Achse ein Balkendiagramm (z.B. SVG, kein Chart-Lib) mit Soll vs Ist pro Achsenwert, aggregiert über andere Achsen
- [ ] **Aggregat-Sicht:** Marginal-Verteilungen (z.B. "Geschlecht insgesamt: Soll 50 % weiblich, Ist 49,7 %") werden angezeigt
- [ ] **Underfill-Hervorhebung:** unter-vertretene Strata erscheinen als gelb/rot markierte Karten oben in der Ergebnis-Liste mit Erklärungstext
- [ ] **Coverage-Metrik:** "Stratum-Abdeckung" als prominente Top-Zahl, z.B. "57 von 60 Strata abgedeckt"
- [ ] **Druckbar:** CSS `@media print` für Ergebnis-Bereich; alle Buttons und Eingabefelder werden im Druck ausgeblendet
- [ ] **Markdown-Export:** Button "Ergebnisbericht als Markdown" lädt eine `.md`-Datei mit menschenlesbarer Zusammenfassung herunter (Achsen, N, Seed, Strata-Tabelle, Aggregate, Underfills, Zeitstempel — keine PII, nur Gruppen-Statistik)
- [ ] **Tests:** mindestens 1 Vitest-Unit-Test für die Aggregat-Berechnungs-Logik (pure Funktion in `packages/core/src/stage1/`); Playwright-Test der den Vorab-Vorschau-Pfad und den Markdown-Export prüft
- [ ] **Bestehende Strata-Tabelle bleibt** als Detail-Ansicht (kollabierbar) — wer alle Cross-Product-Zellen sehen will, kann es

## Out of Scope

- Charting-Library (D3, recharts, etc.) — wir nutzen native SVG für maximale Bundle-Kontrolle
- Editierbarer Bericht im UI — Export ist Lese-Snapshot
- Excel-Export (CSV reicht aus, oder externes Tool aus Markdown)
- Real-Time-Updates während laufender Auswahl (Stage 1 ist sub-Sekunde, nicht nötig)
- Personen-Listen im Bericht (PII-Schutz; nur aggregierte Gruppen-Daten)

## Verweise

- Aktuelle Strata-Tabelle: `apps/web/src/stage1/Stage1Panel.tsx` (Result-Bereich)
- Algorithmus-Spec: `docs/stage1-algorithm.md`
- Produktkontext: `sortition-tool/08-product-redesign.md` ("simples aber starkes Tool" — die Visualisierung muss klar bleiben, keine Feature-Mast)
- Acceptance: User-Wunsch "die Auswahl wird gemeinsam in der Gruppe vorgenommen" — Bericht muss am Bildschirm in einer Sitzung erklärbar sein
