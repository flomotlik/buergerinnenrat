---
id: 37
slug: pilot-akquise-loi-avv
title: Pilot-Kommune-Akquise + LOI-/AVV-Templates
track: 7
estimate_pt: 4
deps: [27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 38, 39]
status: todo
blocks: [12, 13, 14]
source: review-2026-04-25 (Claude #35, Gemini #26-07)
---

# Pilot-Akquise + Vertrags-Templates

## Kontext

Strategische Entscheidung S-4 in `CLAUDE.md` ist offen: keine identifizierte Pilot-Kommune. `docs/iteration-1-findings.md:103` empfiehlt explizit: "Vor weiterer Build-Investition" — das schließt insbesondere Engine B (#12-#14) ein. Solange S-4 offen ist, ist die ganze Iteration-2-Engineering-Investition spekulativ.

Ohne Issue für Pilot-Akquise passiert das nicht von allein. Mit Issue gibt es Owner + Deadline + nachverfolgbaren Fortschritt.

Das Issue ist kein "Engineering"-Issue im klassischen Sinn, sondern Vertrieb / Stakeholder-Management. Output ist ein konkreter Pilot-Vertrag mit einer deutschen oder österreichischen Kommune.

Dieses Issue blockt absichtlich Track 4 (`#12, #13, #14` Engine B) — die Engine-B-Investition macht erst dann Sinn, wenn (a) eine konkrete Pilot-Kommune existiert und (b) die Compliance-Pakete (#31-#34) das ermöglichen.

## Ziel

Mindestens 1 unterschriebener Letter of Intent (LOI) mit einer Kommune vor Engine-B-Bau. Plus ein Auftragsverarbeitungs-Vertrag-Template (AVV) zur sofortigen Verwendung mit jeder Pilot-Kommune.

## Akzeptanzkriterien

- [ ] `docs/pilot/zielkommunen-recherche.md`: Liste von 5–10 deutschen + österreichischen Kommunen mit existierender Bürgerrats-Praxis (Kontakte via "Es geht LOS"-Team, Mehr Demokratie e.V., Bertelsmann-Stiftung, OECD-DE)
- [ ] `docs/pilot/contact-log.md`: Kontakt zu mind. 3 davon protokolliert (E-Mails, Calls)
- [ ] `docs/pilot/pitch-deck.pdf` (5–7 Slides): "Was bekommen Sie", "Was kostet es", "Welche Risiken", "Was ist der Zeitplan", "Welcher Engineering-Schritt blockiert auf Ihrer Zusage"
- [ ] `docs/pilot/loi-template.md`: gegenseitige Absichtserklärung. Kommune sagt zu: anonymisierter Pool für Test, Feedback nach Pilot. Wir sagen zu: Support während Pilot, kostenfreie Nutzung, anonymisierte Veröffentlichung der Erfolgs-Kennzahlen
- [ ] `docs/pilot/avv-template.md`: AVV-Template nach Art. 28 DSGVO, abgestimmt mit `docs/dsfa/` (Issue #31). Klausel zur Datenminimierung (Browser-only-Verarbeitung), Auftragnehmer-Pflichten, Subunternehmer-Liste leer
- [ ] **Mindestens 1 unterschriebener LOI** dokumentiert in `docs/pilot/loi-signed/`
- [ ] Issue dokumentiert WHO ist Owner — Solo-Consultant oder externer Sales-Partner
- [ ] Pilot-Roadmap: vom LOI zum ersten realen Lauf in 8–12 Wochen, gegliedert in Vor-Pilot-Phase (DSFA-Abstimmung, Schulung), Pilot-Phase (Lauf, Begleitung), Nach-Pilot-Phase (Bericht, Nachbesprechung)
- [ ] Update `CLAUDE.md` Strategische Entscheidungen: S-4 geschlossen mit Hinweis auf konkrete Kommune

## Out of Scope

- Bezahlung / Vergütungsmodell (kommt mit Iteration 3 + S-5)
- Mehrere parallele Piloten (erstmal 1 Kommune fokussieren)
- Internationale Pilot-Kommunen (DE + AT reicht für Iteration 2)
- Vertragsänderungen zur Vergütungsphase (Iteration 3)

## Verweise

- S-4: `CLAUDE.md`
- iteration-1-findings: `docs/iteration-1-findings.md:103`
- Compliance-Voraussetzungen: #31, #32, #33, #34, #36
- Marktanalyse: `sortition-tool/05-product-and-licensing.md`
