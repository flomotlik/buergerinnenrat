---
id: 23
slug: extend-panel-by-n-seats
title: Panel um N Plätze erweitern
track: 6
estimate_pt: 2
deps: [11]
status: todo
blocks: [24]
---

# Panel um N Plätze erweitern

## Kontext

Auch ein realer Use-Case: das Panel war auf 100 geplant, jetzt will der Rat auf 120 erhöhen. Die ursprünglichen 100 sollen bleiben, 20 neue sollen hinzukommen — unter Berücksichtigung der Quoten, die jetzt auf 120 Plätze neu verteilt sind.

Konzeptionell: constrained Maximin auf dem Rest-Pool mit den bestehenden 100 als fix und den Quoten **dynamisch angepasst** (skaliert oder explizit vom User neu gesetzt).

## Ziel

"Panel erweitern"-Aktion im Ergebnis-View mit der Option, N zusätzliche Plätze einzuplanen und neue Quoten anzugeben (oder skalierte Default-Quoten zu übernehmen).

## Akzeptanzkriterien

- [ ] Button "Panel erweitern" mit Eingabe `zusätzliche Plätze = N`
- [ ] Neue Quoten: entweder automatisch skaliert (`min_neu = round(min × (k+N)/k)`, `max_neu = round(max × (k+N)/k)`) oder manuell über Quoten-Editor anpassbar
- [ ] Algorithmus: Maximin mit `x_i = 1` für alle `i ∈ original_selected`, Panel-Grösse `k+N`, angepasste Quoten
- [ ] Wenn angepasste Quoten mit den fixierten nicht konsistent sind: Fehlermeldung mit betroffener Kategorie
- [ ] Ergebnis zeigt alte Auswahl + neue Ergänzung klar getrennt
- [ ] Audit-Event für die Erweiterung
- [ ] Werkt in Engine A (Engine B optional)
- [ ] Playwright-E2E: 30er-Panel ziehen, um 10 erweitern, Quoten-Check grün

## Out of Scope

- Keine Schrumpfung (Panel verkleinern) — selten gebraucht
- Kein UI-Assistent für Quoten-Skalierung (simple Regel + manuelle Korrektur reicht)

## Verweise

- `sortition-tool/03-algorithm-port.md` — constrained Maximin als kleine Variante
