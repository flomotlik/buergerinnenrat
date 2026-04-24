---
id: 01
slug: upstream-verify-sortition-algorithms
title: Upstream-Verifikation sortition-algorithms (Solver-Gating)
track: 0
estimate_pt: 1
deps: []
status: todo
blocks: [12, 15]
---

# Upstream-Verifikation `sortition-algorithms`

## Kontext

Die Phase-0-Hypothese des Masterplans v1 ("Pyodide + `sortition-algorithms` liefert die volle Nature-Algorithmenfamilie browsertauglich") wurde von Codex C1 unter Zitat von `committee_generation/leximin.py:9-15,54-56` und `core.py:322-325` als falsch markiert — Leximin ist Gurobi-gated. Siehe `sortition-tool/06-review-consolidation.md` Teil A1 und P1-3.

Bevor wir Engine B (Track 4) oder die native Referenz (Track 5) bauen, muss **empirisch durch Code-Lesen** geklärt sein, was exakt ohne Gurobi funktioniert.

## Ziel

Ein Dokument `docs/upstream-verification.md`, das mit Datei:Zeile-Präzision festhält:

- Welche Solver-Backends die Library unterstützt (SolverFactory o.ä.)
- Wo Gurobi hart-imported ist und welche Fallbacks existieren
- Welche Algorithmen ohne Gurobi nutzbar sind — Maximin? Nash? Initial-Committees?
- Welche Test-Fixtures/Beispiele die Library selbst für Maximin-ohne-Gurobi mitliefert

## Akzeptanzkriterien

- [ ] Clone von `sortitionfoundation/sortition-algorithms` liegt unter `vendor/sortition-algorithms-src/` (gitignored)
- [ ] `docs/upstream-verification.md` existiert, zitiert mindestens 10 Datei:Zeile-Referenzen aus dem Source
- [ ] Eindeutige Aussage: "Maximin läuft ohne Gurobi" ja/nein mit Beleg
- [ ] Eindeutige Aussage: "Leximin läuft ohne Gurobi" ja/nein mit Beleg
- [ ] Liste aller `import gurobipy` / `import mip` / `import highspy` Stellen
- [ ] Empfehlung: geht Track 4 (Engine B) wie geplant, oder braucht sie Anpassung, oder entfällt sie?

## Out of Scope

- Kein Code schreiben
- Kein Patch-PR ans Upstream
- Keine Performance-Messung (das ist #15)

## Verweise

- `sortition-tool/06-review-consolidation.md` Teil A1, P1-3
- `sortition-tool/02-pyodide-feasibility.md` Abschnitt 2
- `sortition-tool/03-algorithm-port.md` Abschnitt 1.1
