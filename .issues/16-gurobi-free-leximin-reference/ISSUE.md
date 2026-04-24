---
id: 16
slug: gurobi-free-leximin-reference
title: Gurobi-Free Leximin-Referenz (Size-Limit)
track: 5
estimate_pt: 1
deps: [15]
status: todo
blocks: [20]
---

# Gurobi-Free Leximin-Referenz

## Kontext

Für Frage 3 des Qualitätsvergleichs — "wieviel Qualität verlieren wir durch Maximin-only statt Leximin?" — brauchen wir eine Leximin-Referenz. Gurobi bietet eine kostenlose **size-limited** Version (ca. 2000 Variablen), die für kleine Pools (≤500 Personen) oft ausreicht.

Strategie: Skript versucht Gurobi zu laden; wenn vorhanden und die Pool-Grösse passt, läuft Leximin durch; sonst Skip mit klarer Meldung. Pfad (i) aus der Entscheidungsmatrix.

## Ziel

`scripts/reference_run_leximin.py` liefert Leximin-Panel + Marginale für Pools, bei denen das technisch geht, und dokumentiert ehrlich wann es nicht geht.

## Akzeptanzkriterien

- [ ] `scripts/reference_run_leximin.py --pool <csv> --quotas <json> --seed <int> --out <json>`
- [ ] Prüft beim Start `gurobipy` Import + License-Status; wenn nicht vorhanden: Exit 2 mit Meldung "Gurobi not installed — see docs/gurobi-setup.md"
- [ ] Wenn Pool > 2000 Variablen (schätzweise Panel-Size × Pool + Constraints): Exit 3 mit Meldung "Problem too large for free Gurobi size-limit"
- [ ] Wenn Gurobi vorhanden + Grösse passt: führt Leximin via `sortition-algorithms` aus, schreibt Engine-Contract-JSON
- [ ] `docs/gurobi-setup.md` beschreibt, wie man Gurobi lokal installiert (Academic/Free), und dass das **nicht im Container-Image** enthalten ist
- [ ] Dokumentiert auf welchen Paper-Pools die Referenz geht (`sf_a..sf_c` realistisch, `sf_d..sf_e` nicht)
- [ ] Exit-Codes in README dokumentiert

## Out of Scope

- Kein HiGHS-Leximin-Port (zu viel Arbeit für Iteration 1 — P1/P2)
- Keine Cloud-Gurobi (WLS)
- Kein Gurobi im Docker-Image (User installiert lokal, ausserhalb Container)

## Verweise

- `sortition-tool/06-review-consolidation.md` P0-1 und Teil E
- Gurobi Free / Academic Licensing: https://www.gurobi.com/academia/academic-program-and-licenses/
