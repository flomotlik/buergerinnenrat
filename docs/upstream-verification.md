# Upstream-Verifikation `sortition-algorithms`

**Stand:** 2026-04-24 gegen Commit `d8039dcda98ceefd8b1d596d16104fdd3d525c65` der Upstream-Repo `sortitionfoundation/sortition-algorithms` (identisch mit PyPI 0.12.5 in `committee_generation/`).

**Fragestellung:** Welche Algorithmen der Library sind browser-/Pyodide-tauglich, d.h. benötigen **kein Gurobi**?

## Eindeutige Antworten

| Algorithmus | Läuft ohne Gurobi? | Beleg |
| --- | --- | --- |
| **Maximin** | **Ja** | `committee_generation/maximin.py` enthält keinen einzigen Gurobi-Import; nur `create_solver()` aus der Solver-ABC. Upstream-Testsuite `tests/test_committee_generation.py::test_maximin_*` (6 Tests) passen im Container ohne `gurobipy`: `6 passed, 9 deselected`. |
| **Leximin** | **Nein** | `committee_generation/leximin.py:10` hat `import gurobipy as grb`; `leximin.py:54-56` und `leximin.py:330-333` werfen `RuntimeError("Leximin algorithm requires Gurobi solver which is not available", "gurobi_not_available")`. |
| **Nash** | Ja (nutzt cvxpy) | `committee_generation/nash.py:8` — `import cvxpy as cp`. `cvxpy` ist Pflicht-Dependency laut `pyproject.toml:31`. Kein Gurobi nötig; native Solver (Clarabel/SCS/ECOS) reichen. |
| **Diversimax** | Ja (optional-Extra) | `committee_generation/diversimax.py:11-18` benötigt `pandas` + `scikit-learn`, aber kein Gurobi. `DIVERSIMAX_AVAILABLE=False` im aktuellen Container, Default-Skip. |
| **Legacy** | Ja (keine LP) | `committee_generation/legacy.py` — klassisches iteratives Random-Sample ohne Solver. Aber: kein probabilistischer Fairness-Garant, für Iteration 1 nicht ausreichend. |

## Quellen mit Datei:Zeile-Präzision

1. `src/sortition_algorithms/settings.py:14` — `SOLVER_BACKENDS = ("highspy", "mip", "mip-cbc", "mip-highs", "mip-gurobi")`, `DEFAULT_BACKEND = "highspy"`.
2. `src/sortition_algorithms/committee_generation/leximin.py:9-15` — try/except für `import gurobipy as grb`, setzt `GUROBI_AVAILABLE`.
3. `src/sortition_algorithms/committee_generation/leximin.py:54-56` — RuntimeError-Raise in `_dual_leximin_stage`, wenn Gurobi fehlt.
4. `src/sortition_algorithms/committee_generation/leximin.py:60-77` — Der duale LP wird direkt auf `grb.Model`, `grb.GRB.CONTINUOUS`, `model.setParam("Method", 2)` (Barrier only), `model.setParam("Crossover", 0)` aufgesetzt. **Kein Solver-Abstraktions-Layer** im Leximin-Pfad.
5. `src/sortition_algorithms/committee_generation/leximin.py:210-221` — Primal-Stage ebenfalls Gurobi-direkt (`primal.addVar(vtype=grb.GRB.CONTINUOUS, ...)`).
6. `src/sortition_algorithms/committee_generation/leximin.py:330-333` — zweiter RuntimeError-Raise in `find_distribution_leximin`.
7. `src/sortition_algorithms/core.py:322-325` — Silent Auto-Fallback: wenn `selection_algorithm == "leximin"` und Gurobi fehlt, setzt Core `selection_algorithm = "maximin"` und fügt `gurobi_unavailable_switching` in den RunReport. **Keine Exception, nur INFO-Meldung.**
8. `src/sortition_algorithms/committee_generation/maximin.py:42,57,60` — `_find_maximin_primal` benutzt ausschließlich `create_solver()`, `SolverSense.MAXIMIZE`, `solver.optimize()` — kein Solver-spezifischer Code.
9. `src/sortition_algorithms/committee_generation/solver.py:157,175` — `HighsSolver`-Klasse importiert `highspy` lazy im Konstruktor; wird via `create_solver(backend="highspy")` aus `solver.py:408-409` instanziiert.
10. `src/sortition_algorithms/committee_generation/solver.py:14-19` — `try: import mip as _mip_module` — python-mip ist optional, Flag `MIP_AVAILABLE`.
11. `src/sortition_algorithms/committee_generation/nash.py:8` — `import cvxpy as cp`, Pflicht-Dependency.
12. `src/sortition_algorithms/report_messages.py:55-57` — Text-Template `gurobi_unavailable_switching`.
13. `src/sortition_algorithms/error_messages.py:87` — Text-Template `gurobi_not_available`.

## Empirischer Test

Container-venv `/opt/sortition-venv`, ohne Gurobi installiert:

```
$ python -c "from sortition_algorithms.committee_generation import GUROBI_AVAILABLE; print(GUROBI_AVAILABLE)"
False

$ pytest tests/test_committee_generation.py -k "maximin" -x
6 passed, 9 deselected in 1.71s

$ pytest tests/
419 passed, 9 skipped, 1 warning in 15.55s
```

Alle 9 Skips sind Leximin-Tests (guard auf `GUROBI_AVAILABLE`). Maximin, Nash, Legacy, Diversimax-Tests sind grün.

## Vollständige Liste solver-relevanter Imports

| Datei:Zeile | Import | Pflicht? |
| --- | --- | --- |
| `committee_generation/leximin.py:10` | `import gurobipy as grb` (try-except) | optional — Leximin-only |
| `committee_generation/solver.py:14` | `import mip as _mip_module` (try-except) | optional — `MIP_AVAILABLE` |
| `committee_generation/solver.py:175` | `import highspy` (lazy in `HighsSolver.__init__`) | Pflicht für Default |
| `committee_generation/nash.py:8` | `import cvxpy as cp` (modul-top-level) | Pflicht für Nash |
| `committee_generation/diversimax.py:12-13` | `import pandas`, `sklearn.preprocessing.OneHotEncoder` (try-except) | optional — Diversimax |

Keine weiteren Solver-Imports im Library-Source. `highspy` (MIT) und `cvxpy` (Apache-2.0) sind die einzigen harten Pflicht-Solver-Dependencies.

## Empfehlung für die Iteration-1-Tracks

### Track 4 (Engine B = Pyodide + sortition-algorithms): **GEHT WIE GEPLANT**

- `sortition-algorithms` in Pyodide mit `highspy` (WASM-Build existiert) reicht aus, um **Maximin vollständig** im Browser zu fahren.
- Leximin darf in der UI als Auswahl existieren, aber die Library macht einen stillen Downgrade auf Maximin. Das muss das Frontend **explizit** kommunizieren (Banner o.ä.), sonst ist die Wahl irreführend.

### Track 5 (native Python Referenz)

- Liefert out-of-the-box nur Maximin (+ Nash). Leximin-Referenz für #19 (Drei-Wege-Vergleich) muss aus zwei Quellen kommen:
  - **#16 "gurobi-free-leximin-reference"**: Umbau des Leximin-LP auf HiGHS. Nicht-trivial, weil Gurobi-Parameter (`Method=2`, `Crossover=0`) Äquivalent in HiGHS gefunden werden müssen. Machbar, nicht Teil dieser Iteration-1-MVP-Funktionalität.
  - **#17 "leximin-cached-from-paper"**: Verwendung der gecachten Leximin-Werte aus `pgoelz/citizensassemblies-replication` für `sf_a`..`sf_e`. Billig, deterministisch, keine eigene Solver-Arbeit.

### Track 4 entfällt NICHT

Das war die ursprüngliche Sorge aus dem Review-Konsolidat (Teil A1, P1-3). Empirisch widerlegt: Maximin via Pyodide+sortition-algorithms ist erwartungsgemäß der richtige Pfad.

## Konsequenzen für den Masterplan v2

- In `sortition-tool/00-masterplan.md` müssen die Formulierungen "Leximin läuft im Browser" ersetzt werden durch "Maximin läuft im Browser, Leximin ist auf Gurobi gepinnt".
- Die Go/No-Go-Schwellen in Phase 0 müssen explizit Maximin-only formulieren.
- Die Lizenz-Diskussion Apache-2.0 vs. GPL-3.0 wird dadurch **nicht** entschärft — `sortition-algorithms` selbst ist GPL-3.0-licensed (siehe `vendor/sortition-algorithms-src/LICENSE`), unabhängig davon, ob wir Leximin oder nur Maximin nutzen.
