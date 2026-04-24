---
id: 22
slug: replace-single-person-nachruecker
title: Nachrücker — Einzelperson ersetzen bei Absage
track: 6
estimate_pt: 2
deps: [11]
status: todo
blocks: [24]
---

# Nachrücker bei Absage

## Kontext

Eine eingeladene Person sagt ab. Das Panel muss nachbesetzt werden — durch eine Ersatzperson, die die **ursprünglichen Quoten weiter erfüllt**. Das ist eine der meistgefragten Praxis-Operationen im Bürgerrat-Workflow ("Wie finde ich einen Nachrücker, der die Ausgewogenheit erhält?").

Das ist **kein Re-Roll**. Das restliche Panel bleibt, nur eine Position wird neu besetzt — mit constrained Maximin auf dem reduzierten Problem.

## Ziel

Im Ergebnis-View eine "Person ersetzen"-Aktion pro Panel-Zeile. Liefert einen Nachrücker (single candidate), zeigt warum (Quoten-Erfüllung), pflegt Audit.

## Akzeptanzkriterien

- [ ] Button "Ersetzen" pro selected Person, mit optionalem Grund-Feld
- [ ] Algorithmus: löse Maximin auf `(pool \ selected) ∪ {removed_person}`, mit Quotas, wobei das Panel-Size-Feld auf `k` bleibt, aber `k-1` Positionen als fix gelten (nur eine frei)
- [ ] Umsetzung: bestehender Maximin-Lauf mit zusätzlichen harten Constraints `x_i = 1` für alle bereits selected minus dropped
- [ ] Wenn kein gültiger Nachrücker existiert (Quoten nicht mehr erfüllbar): klare Fehlermeldung mit Kategorie-Identifikation
- [ ] Ergebnis zeigt Nachrücker + Quoten-Status vorher/nachher
- [ ] Audit (#11) enthält den Ersetz-Vorgang als separate Event-Liste: wer, wann, warum, durch wen
- [ ] Werkt in Engine A (Engine B folgt wenn der Aufwand vertretbar)
- [ ] Playwright-E2E: Panel ziehen, eine Person entfernen, Nachrücker erscheint, Quoten passen

## Out of Scope

- Keine Batch-Ersetzung (mehrere gleichzeitig) — das ist #23-Richtung
- Keine Ranking-Liste "nächstbester Nachrücker" — nur ein Ergebnis
- Keine Benachrichtigungen/Mails (Iteration 2+)

## Verweise

- Bürgerrat-Praxis-Literatur: OECD *Innovative Citizen Participation* (2020)
- `sortition-tool/05-product-and-licensing.md` Marktanalyse — Nachrücker als Consulting-Request erwähnt
