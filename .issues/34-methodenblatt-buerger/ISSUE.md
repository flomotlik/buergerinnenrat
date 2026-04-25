---
id: 34
slug: methodenblatt-buerger
title: Methodenblatt für Bürger:innen — Maximin in Verwaltungs- und Leichter Sprache
track: 7
estimate_pt: 1.5
deps: []
status: todo
blocks: [37]
source: review-2026-04-25 (Claude #34, Codex #32 (kombiniert), Gemini #26-03 (kombiniert))
---

# Methodenblatt: Erklärung für Bürger:innen

## Kontext

P1-4 aus `sortition-tool/06-review-consolidation.md`. `docs/iteration-1-findings.md:58-59` markiert als "open". Eine ausgeloste Bürger:in fragt: "warum ich? wie wurde ich ausgewählt? wie fair ist das?". Wenn die Kommune das nicht klar beantworten kann, leidet die Legitimität des gesamten Bürgerrats.

Es gibt drei Zielgruppen mit unterschiedlichem Sprachregister:
1. Verwaltung + Rat: Verwaltungssprache, fachlich korrekt
2. Eingeladene Bürger:innen: A2-Sprachniveau, vertrauensbildend
3. Bürger:innen mit Leichter-Sprache-Bedarf: A1-Niveau, geprüft gegen Leichte-Sprache-Regeln

## Ziel

Drei Dokumente unter `docs/methodenblatt/`, plus eine Vorlage für das Einladungs-Anschreiben, das auf das Methodenblatt verweist.

## Akzeptanzkriterien

- [ ] `docs/methodenblatt/maximin-verwaltungssprache.md` (1–2 Seiten):
  - Was Maximin tut (max-min der Auswahlwahrscheinlichkeit)
  - Wie Quoten reinspielen (min/max pro Kategorie, Panel-Größe)
  - Wie der Seed wirkt (Reproducibility, kein "Manipulationsraum")
  - Was das Audit-JSON ist (Beweis-Integrität, Signatur)
  - Engine-Wahl A vs C/B und was die Fairness-Lücke bedeutet (siehe `docs/quality-comparison-iteration-1.md`)
- [ ] `docs/methodenblatt/maximin-buergerinnen-bw.md` (1 Seite, A2):
  - "Sie wurden zufällig ausgewählt — wie beim Würfeln, aber so, dass die Gruppe Deutschland abbildet"
  - Klare FAQ-Antworten: warum wurde ich gewählt? was sind meine Rechte? darf ich ablehnen?
- [ ] `docs/methodenblatt/maximin-leichte-sprache.md` (1 Seite, A1):
  - Geprüft gegen Regeln des Netzwerks Leichte Sprache (kurze Sätze, eine Aussage pro Satz, keine Fremdwörter)
  - Externe Prüfung durch eine Person mit Leichter-Sprache-Erfahrung
- [ ] `docs/methodenblatt/faq.md`: 10–15 häufige Fragen + Antworten (warum ich, wie funktioniert das, was passiert mit meinen Daten, was bekomme ich, kann ich ablehnen, ...)
- [ ] `docs/methodenblatt/einladungsschreiben-vorlage.md` + `.docx`-Generator (oder Markdown-Vorlage zum Konvertieren): 1-seitiges Anschreiben, das das Methodenblatt zitiert + Datenschutz-Hinweis nach Art. 13 DSGVO
- [ ] **Externer Review**: durch eine Person mit Bürgerrats-Praxis-Erfahrung. Kontakte: "Es geht LOS"-Team, Mehr Demokratie e.V., Bertelsmann-Stiftung, OECD-DE-Übersetzungen
- [ ] Methodenblatt-Hinweis in der App-UI (Footer-Link auf die Doku) — kommt mit #33 i18n
- [ ] Leichte-Sprache-Logo + Prüfsiegel im Doc, falls Prüfung durchgeführt

## Out of Scope

- Übersetzung in weitere Sprachen (kommt mit #33-Erweiterung)
- Video-Erklärungen (Iteration 3)
- Workshop-Material für Verwaltung (Iteration 3)

## Verweise

- P1-4: `sortition-tool/06-review-consolidation.md`
- Findings: `docs/iteration-1-findings.md:58-59`
- Engine-Lücke-Daten: `docs/quality-comparison-iteration-1.md`
- Netzwerk Leichte Sprache: https://www.leichte-sprache.org/
