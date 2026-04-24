# Research: Upstream-Verifikation sortition-algorithms

**Quelle:** `sortitionfoundation/sortition-algorithms`, Commit `d8039dcda98ceefd8b1d596d16104fdd3d525c65` (2026-04-20, Tag-nächster Tip über 0.12.5), geklont unter `vendor/sortition-algorithms-src/`. PyPI 0.12.5 wurde parallel verifiziert: Dateien in `src/sortition_algorithms/committee_generation/` sind **byte-identisch** zur Vendor-Tip; Unterschiede nur in `__main__.py` (CLI) und `adapters.py` (Google-Sheets-Adapter), solverrelevant also keine.

## Feststellungen (mit Datei:Zeile-Beleg)

### 1. Solver-Backend-Katalog

`src/sortition_algorithms/settings.py:14`

```
SOLVER_BACKENDS = ("highspy", "mip", "mip-cbc", "mip-highs", "mip-gurobi")
DEFAULT_BACKEND = "highspy"
```

Die Library selbst kennt fünf Backend-Strings; `highspy` ist Default. `mip` ist die python-mip-Abstraktion mit eigenen Unter-Varianten (CBC/HiGHS/Gurobi intern).

`src/sortition_algorithms/committee_generation/solver.py:408-421` — `create_solver(backend=...)` routet:
- `highspy` → `HighsSolver` (Klasse ab `solver.py:157`, importiert `highspy` lazy bei Instanziierung in `solver.py:175`)
- `mip`, `mip-cbc` → `MipSolver(solver_name="CBC")`
- `mip-highs` → `MipSolver(solver_name="HIGHS")`
- `mip-gurobi` → `MipSolver(solver_name="GUROBI")` — braucht Gurobi-License
- alles andere → `ConfigurationError(unknown_solver_backend)`

### 2. Gurobi-Import: Leximin-exklusiv, hartes Gating

`src/sortition_algorithms/committee_generation/leximin.py:9-15`

```python
try:
    import gurobipy as grb

    GUROBI_AVAILABLE = True
except ImportError:
    GUROBI_AVAILABLE = False
    grb = None
```

Modul-Top-Level-Gurobi-Import. Der Library-Code selbst braucht Gurobi nicht zu importieren — nur dieses eine Modul.

`src/sortition_algorithms/committee_generation/leximin.py:54-56` — Direkter RuntimeError, wenn Gurobi fehlt, in `_dual_leximin_stage`:

```python
if not GUROBI_AVAILABLE:
    msg = "Leximin algorithm requires Gurobi solver which is not available"
    raise RuntimeError(msg, "gurobi_not_available", {})
```

`src/sortition_algorithms/committee_generation/leximin.py:330-333` — selber RuntimeError in `find_distribution_leximin`.

**Der gesamte Leximin-LP benutzt `grb.Model`, `grb.GRB.CONTINUOUS`, `model.setParam("Method", 2)` (Barrier), `Crossover=0`** (`leximin.py:60-77`). Das ist kein Wrapper um eine Abstraktion, sondern direkter Gurobi-Python-API-Aufruf. Ein Swap auf HiGHS oder CBC würde einen **Neu-Aufbau** des Moduls erfordern, nicht ein Backend-Flag.

### 3. Core-Level Auto-Fallback: wenn `leximin` angefragt, aber Gurobi fehlt, wird es stillschweigend zu `maximin`

`src/sortition_algorithms/core.py:322-325`

```python
# Check if Gurobi is available for leximin
if selection_algorithm == "leximin" and not GUROBI_AVAILABLE:
    report.add_message("gurobi_unavailable_switching")
    selection_algorithm = "maximin"
```

`src/sortition_algorithms/report_messages.py:55-57` — Message-Template:

```
gurobi_unavailable_switching: "The leximin algorithm requires the optimization library Gurobi to be installed ..."
```

Konsequenz: ein User, der "leximin" konfiguriert, in der Browser-Umgebung ohne Gurobi, bekommt Maximin **ohne Exception**, nur eine INFO-Meldung im RunReport. Für unsere App bedeutet das:
- Wenn wir Leximin jemals als Option einblenden, müssen wir diesen stillen Downgrade explizit kommunizieren.
- Der Nash-Algorithmus bleibt als zusätzliche Alternative nutzbar (siehe §5).

### 4. Maximin läuft vollständig ohne Gurobi

`src/sortition_algorithms/committee_generation/maximin.py` — **kein** `gurobi`-Import, **kein** `GUROBI_AVAILABLE`-Check.

`maximin.py:42,57,60` — `_find_maximin_primal` verwendet nur die generische `create_solver()`-Factory und `SolverSense.MAXIMIZE`/`solver.optimize()`.

`maximin.py:66-80` — Kommentarblock beschreibt das inkrementelle LP; implementiert über `Solver`-API, kein Solver-spezifischer Code.

**Empirische Bestätigung** (Container-venv, `GUROBI_AVAILABLE=False`):

```
$ pytest tests/test_committee_generation.py -k "maximin" -x
6 passed, 9 deselected in 1.71s
```

Vollständiger Test-Suite-Lauf der Library ohne Gurobi, ohne Diversimax-extras:

```
$ pytest tests/
419 passed, 9 skipped, 1 warning in 15.55s
```

Die 9 Skips sind die Leximin-Tests (die auf `GUROBI_AVAILABLE=True` geguarded sind — siehe `tests/test_committee_generation.py:12` und die pytest-Marker). Alle Maximin-, Nash-, Legacy- und Diversimax-Tests sind grün.

### 5. Nash welfare: cvxpy-basiert, funktioniert auch ohne Gurobi

`src/sortition_algorithms/committee_generation/nash.py:8` — `import cvxpy as cp`.

`pyproject.toml:31` — `cvxpy>=1.6.5` ist Required-Dependency. Die native CPU-Solver (Clarabel, SCS, ECOS) reichen.

Nash ist damit die **einzige fairness-orientierte Alternative** zu Leximin, die ohne Gurobi läuft — falls wir in einer späteren Iteration über Maximin hinaus wollen, ohne eigenen HiGHS-Umbau.

### 6. Diversimax: nicht relevant für Iteration 1

`src/sortition_algorithms/committee_generation/diversimax.py:11-18`

```python
try:
    import pandas as pd
    from sklearn.preprocessing import OneHotEncoder
    DIVERSIMAX_AVAILABLE = True
except ImportError:
    DIVERSIMAX_AVAILABLE = False
```

Optional-Extra über `pandas` + `scikit-learn`. Kein Gurobi nötig, aber out-of-scope für Iteration 1.

### 7. Legacy (Hennig/SF) — Random-Sample ohne LP

`src/sortition_algorithms/committee_generation/legacy.py` wird über `find_random_sample_legacy` aus `core.py:328-336` aufgerufen. Kein LP, kein Solver. Implementiert das alte gierige Sample-Verfahren. Funktioniert in jedem Environment. Für Produktion Iteration 1 **nicht ausreichend** (kein probabilistischer Fairness-Garant).

### 8. Initial-Committees (Phase-1 des Maximin-Algorithmus)

`src/sortition_algorithms/committee_generation/common.py` enthält `generate_initial_committees()` und `setup_committee_generation()`. Beide benutzen ausschließlich die `Solver`-ABC aus `solver.py`, keinen direkten Gurobi-Import. ✓ browsertauglich (über HiGHS).

## Zusammenfassung der Import-Stellen (für Lizenz-/Portabilitäts-Scan)

| Datei | Import | Pflicht? | Wirkung |
| --- | --- | --- | --- |
| `committee_generation/leximin.py:10` | `import gurobipy as grb` (try-except) | optional | setzt `GUROBI_AVAILABLE` |
| `committee_generation/solver.py:14` | `import mip as _mip_module` (try-except) | optional | setzt `MIP_AVAILABLE` |
| `committee_generation/solver.py:175` | `import highspy` (lazy in `HighsSolver.__init__`) | Pflicht für `highspy`-Backend | Default-Pfad |
| `committee_generation/nash.py:8` | `import cvxpy as cp` | Pflicht für Nash | core convex solvers |
| `committee_generation/diversimax.py:12-13` | `import pandas`, `sklearn.preprocessing.OneHotEncoder` | optional | `DIVERSIMAX_AVAILABLE` |

Keine weiteren Solver-spezifischen Imports. `import highspy` und `import cvxpy` sind die einzigen harten Pflicht-Solver-Dependencies für "alles außer Leximin" — beides Projekte mit nicht-GPL-Lizenzen (MIT/Apache-2.0 bzw. Apache-2.0).

## Test-Fixtures für Maximin ohne Gurobi

`tests/test_committee_generation.py:364-520` — sechs in-repository Maximin-Tests mit `example1`, `example3`, `example4` (infeasible-Path), `example5`, `example6`. Test-Helper unter `tests/helpers.py` und Example-Definitionen in denselben helper-Modulen bereit. Diese bilden die **in-tree-Gold-Standard-Fixtures**, gegen die Engine A (TS+highs-js) und Engine B (Pyodide+sortition-algorithms) in #09 bzw. #13 gematcht werden können.

## Abhängigkeits-Nachschuss für Container

Beim Ausführen der Upstream-Test-Suite mit `pytest` fehlten im bestehenden `SORTITION_VENV` drei Module:
- `tomli_w` — verwendet in `tests/helpers.py:7`
- `rich` — verwendet in `src/sortition_algorithms/progress_rich.py:6`
- `click` + `typer` — CLI-Adapter, verwendet in `src/sortition_algorithms/__main__.py`

Diese wurden in `Dockerfile.claude` nachgezogen (separater Commit).

## Empfehlung für Track 4 (Engine B, Pyodide) und Track 5 (native Python)

- **Track 4 geht wie geplant, aber nur mit Maximin.** `sortition-algorithms` lädt in Pyodide ohne Gurobi sauber, alle Maximin-Pfade funktionieren. Leximin darf per `selection_algorithm="leximin"` erlaubt werden; die Library fällt **stillschweigend auf Maximin zurück**. Unsere UI muss das explizit surface'n (INFO-Banner o.ä.), sonst ist der Mode-Schalter irreführend.
- **Track 5 (native Python) liefert ebenfalls nur Maximin** out of the box. Für die Drei-Wege-Vergleichstabelle in #19 brauchen wir eine **vierte** Referenz (Leximin), die entweder:
  - eine Gurobi-Academic-License-Runde benötigt (Issue #16 — "gurobi-free-leximin-reference"), ODER
  - auf gecachte Referenzwerte aus `pgoelz/citizensassemblies-replication` zurückgreift (Issue #17).

  Issue #16-Titel "gurobi-free-leximin-reference" ist vermutlich so gemeint: Umbau des Leximin-LP auf HiGHS/CBC. Das ist eine nicht-triviale Aufgabe (Barrier-Only + Crossover-Off haben in HiGHS andere Flags), aber implementierbar — das Leximin-LP ist algebraisch nicht Gurobi-spezifisch, nur das Python-API-Binding.

- **Track 4 entfällt NICHT.** Engine B ist gebaut als "wir nutzen dieselbe Library wie die native Referenz, nur in WASM" — das geht genau so, solange wir uns auf Maximin beschränken.

## Offene Fragen für später

1. **Leximin-Port auf HiGHS**: Die Kommentare in `leximin.py:74-77` ("optimize via barrier only", "deactivate cross-over") zeigen, dass die Wahl von Gurobi-Parametern für die numerische Stabilität des dualen LP wichtig ist. Ein HiGHS-Port muss die gleichen Eigenschaften reproduzieren oder dokumentieren, warum ein Solver-Swap okay ist. Das steht #16 bevor.
2. **Pyodide-Kompatibilität von `highspy`**: Nicht Teil dieses Issues, Gegenstand von #12.
3. **Pyodide-Kompatibilität von `cvxpy`**: Nash läuft nativ, aber in Pyodide ist `cvxpy` nicht in den offiziellen Paketlisten. Out of scope für Iteration 1 (wir machen kein Nash).

## Quellen

- Upstream-Repo: https://github.com/sortitionfoundation/sortition-algorithms
- Commit-Hash: `d8039dcda98ceefd8b1d596d16104fdd3d525c65` (geklont 2026-04-24)
- PyPI-Version zur Referenz: `0.12.5` (byte-identisch in `committee_generation/`)
- HiGHS Python-Binding: https://pypi.org/project/highspy/ (Version 1.11+)
- cvxpy: https://pypi.org/project/cvxpy/ (Version 1.6.5+)
- Gurobi Python: https://pypi.org/project/gurobipy/ (kommerziell, nicht-frei)
