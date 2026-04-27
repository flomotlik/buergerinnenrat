---
id: 64
slug: sample-size-suggestion
title: Stichprobengröße-Vorschlag aus Panelgröße + Outreach-Methode
track: Z
estimate_pt: 0.5
status: researched
depends_on: [62]
priority: high
priority_rationale: "User soll Panelgröße eingeben (was er kennt), nicht Briefe-Anzahl (was er ableiten muss). Hilft Verwaltungs-Erstnutzer:innen ohne Bürgerrat-Erfahrung."
---

# Stichprobengröße-Vorschlag

## Kontext

Heute fragt das Tool nur nach "Stichprobengröße N" — also wie viele Briefe rausgehen. Verwaltungs-Mitarbeiter:innen ohne Bürgerrat-Erfahrung kennen aber primär:
- **Ziel-Panelgröße** (z.B. 30 Personen für Gemeinde-Bürgerrat, 160 für Bundes-Bürgerrat)
- **Outreach-Methode** (nur Briefe vs. Briefe + Telefon-Nachfasser)

Aus diesen zwei Eingaben ergibt sich die Stichprobengröße direkt:
- Panel ÷ erwarteter Rücklauf × Sicherheitspuffer

## Empirische Werte (research/03-legal-framework-and-best-practices.md, Bürgerrat-Praxis)

| Outreach-Methode | Rücklaufquote | Quelle |
|---|---|---|
| Nur Briefe | 5–10 % (avg 7 %) | Sortition Foundation, kommunale Bürgerräte AT |
| Briefe + Telefon-Nachfasser | 30–50 % (avg 40 %) | Bürgerrat-Praxis bei aktivem Outreach |
| Bürgerrat Ernährung 2023 (Bundes-Niveau) | 11.5 % (19.327 → 2.220 → 160) | bundestag.de Pressemitteilung |

Sicherheitspuffer ~1.5× üblich, damit nach Drop-outs in Stage 3 noch genug Antwortende da sind.

## Ziel

Im Stage-1-Panel eine neue Sektion "Bemessung der Stichprobe" zwischen CSV-Upload und Stratifikation. User gibt Panelgröße + Outreach-Methode ein, Tool schlägt Stichprobengröße N live vor (editierbar). Audit-Doc dokumentiert die Annahmen.

## Acceptance Criteria

### Berechnungs-Logik

- [ ] Pure-Funktion `suggestSampleSize(panelSize, responseRateMin, responseRateMax, safetyFactor): { min, max, recommended }` in `packages/core/src/stage1/sample-size.ts`
- [ ] Sicherheitspuffer Default 1.5
- [ ] Range-Berechnung: `min = ceil(panel / responseRateMax)`, `max = ceil(panel / responseRateMin × safetyFactor)`
- [ ] `recommended` = gerundet auf vernünftige Zehner: `Math.round(panel / ((responseRateMin + responseRateMax) / 2) × safetyFactor / 10) × 10`
- [ ] Vitest mit Beispiel-Werten: Panel 30 + (0.30, 0.50) + 1.5 → range 60–150, recommended ~110

### Outreach-Modi (vordefiniert)

- [ ] In `sample-size.ts`: 3 Default-Modi:
  - `mail-only`: 5–10 % (Default 7 %)
  - `mail-plus-phone`: 30–50 % (Default 40 %) — empfohlen
  - `custom`: User gibt eigene min/max %-Werte
- [ ] Default-Wahl: `mail-plus-phone` (häufigster realistischer Bürgerrat-Workflow)

### UI: neue Sektion "Bemessung der Stichprobe"

- [ ] `apps/web/src/stage1/SampleSizeCalculator.tsx` neue Komponente
- [ ] Position: in Stage1Panel.tsx zwischen CSV-Upload (Schritt 1) und Stratifikation (Schritt 2). Wird zu Schritt 2, Stratifikation rückt zu Schritt 3
- [ ] Felder:
  - **Ziel-Panelgröße** number-input mit label "Wieviele Personen sollen im Panel sitzen?"
  - **Outreach-Methode** Radio-Buttons: 3 Optionen (mail-only / mail-plus-phone / custom)
  - **Bei custom**: zwei Number-Inputs für min/max Rücklaufquote
  - **Vorschlag-Anzeige**: "Empfohlen: ~110 Briefe (Range 60–150)" mit kleinem Hilfe-Aufklapper "Wie wird das berechnet? ▾"
- [ ] **Stichprobengröße N** wird beim Klick auf "Vorschlag übernehmen"-Button ODER automatisch wenn Vorschlag sich ändert befüllt — User kann immer manuell überschreiben
- [ ] Bei Änderung an Pool-CSV (neue Datei): Vorschlag bleibt erhalten falls geringer als Pool-Größe; sonst Reset
- [ ] Edge-Case Pool zu klein: Vorschlag > Pool → Warnung "Pool hat nur X Personen, Vorschlag braucht Y. Empfohlen: Faktor reduzieren oder Panelgröße verringern."

### Stage1-Panel-Integration

- [ ] Bestehende "Stichprobengröße N"-Eingabe bleibt — wird einfach von der neuen Sektion vorbefüllt
- [ ] Sektion-Nummerierung im UI bewusst:
  - Schritt 1: CSV hochladen
  - Schritt 2: Bemessung der Stichprobe (NEU)
  - Schritt 3: Stratifikation konfigurieren (war 2)
  - Schritt 4: Stichprobengröße + Seed (war 3) — die N-Eingabe ist hier weiterhin manuell editierbar, aber zeigt den von Schritt 2 vorbefüllten Wert
- [ ] Mobile-tauglich (Stack-Layout)

### Audit-Doc

- [ ] `Stage1AuditDoc` erweitert um optional:
  - `sample_size_proposal?: { panel_size: number; outreach: 'mail-only' | 'mail-plus-phone' | 'custom'; response_rate_min: number; response_rate_max: number; safety_factor: number; recommended: number; range: [number, number]; }`
- [ ] Schema-Bump: 0.3 → 0.4
- [ ] Audit-Footer-UI zeigt: "Stichprobengröße basiert auf Panelgröße 30, mail-plus-phone (30-50% Rücklauf, Faktor 1.5)" wenn Proposal genutzt
- [ ] Markdown-Bericht analog
- [ ] Wenn User die Stichprobengröße manuell überschreibt UND der Wert nicht dem Vorschlag entspricht: Audit dokumentiert das transparent ("manuell überschrieben: Vorschlag war 110, gewählt 200")

### Tests

- [ ] Vitest pure für `suggestSampleSize` mit allen Modi + Edge-Cases
- [ ] Vitest UI-Logik (extracted helper) für Auto-Befüllung + Manuell-Override-Detection
- [ ] Playwright: Default-Mode mail-plus-phone, Panel 30 → Vorschlag ~110, User klickt "Übernehmen", N-Feld zeigt 110, Run funktioniert
- [ ] Playwright: User wählt custom mode, gibt 15-25% ein, Vorschlag ändert sich live
- [ ] Bestehende Tests bleiben grün

## Out of Scope

- Multi-Wellen-Bemessung (z.B. "300 Briefe in 3 Wellen à 100") — kommt mit Issue #48 Nachholung
- Direkte Integration mit Stage 3 (Maximin-Quoten-Erfüllbarkeit aus Stage-1-Vorschlag) — eigener Issue
- Kosten-Schätzung pro Brief / Telefonat
- A/B-Vergleich verschiedener Outreach-Methoden mit historischen Daten

## Verweise

- Bürgerrat-Praxis-Daten: `research/03-legal-framework-and-best-practices.md`
- Bürgerrat Ernährung 2023 (empirisch 11.5 % Rücklauf): bundestag.de Pressemitteilung 13.07.2023
- Sortition Foundation Methodik: <https://www.sortitionfoundation.org/how>
- Heute Stage1Panel.tsx-Struktur: 4 Schritte (Upload, Konfiguration, Stichprobengröße, Lauf)
