# Paper-Pool-Fixtures (`pgoelz/citizensassemblies-replication`)

## Quelle

- **Paper**: Bailey Flanigan, Paul Gölz, Anupam Gupta, Brett Hennig, Ariel D. Procaccia. *Fair algorithms for selecting citizens' assemblies*. **Nature**, 596:548–552 (2021). DOI 10.1038/s41586-021-03788-6.
- **Replikations-Repo**: https://github.com/pgoelz/citizensassemblies-replication (zuletzt geklont 2026-04-24).

## Was öffentlich verfügbar ist

| Instanz | Roh-Respondenten? | Größe | Panel | In dieser Iteration nutzbar als |
| --- | --- | --- | --- | --- |
| `example_small_20` | **ja** (200 respondents) | 200 | 20 | UI-Smoke-Test, schneller Engine-Vergleich |
| `example_large_200` | **ja** (2000 respondents) | 2000 | 200 | Lasttest, realistischer Vergleichslauf |
| `sf_e_110` | **nein, nur Intersections-Marginalen** | n/a (synth 600) | 110 | Marginalen-Sanity-Check, kein echter Vergleich |
| `sf_a_35`, `sf_b_20`, `sf_c_44`, `sf_d_40`, `sf_e_110` | **nein** | — | — | nur aggregierte Probability-Allocation-Kurven aus `reference_output/` |

**Kritische Befund:** Die Roh-Respondenten der fünf "echten" SF-Pools (`sf_a..sf_e`) sind **nicht** im öffentlichen Repo; das Paper veröffentlicht aus Datenschutzgründen nur die aggregierten Verteilungen. Issue #04 verlangt diese als Fixtures — das **lässt sich nicht erfüllen ohne separaten DSGVO-konformen Bezug bei den Autor:innen**. Wir lassen das offen und nutzen stattdessen `example_small_20` und `example_large_200` als die einzigen öffentlich vorhandenen Real-Pools.

## Konvertierung in unser Schema

`scripts/load_paper_pools.py` liest:
- `vendor/citizensassemblies-replication/data/<instance>/respondents.csv`
- `vendor/citizensassemblies-replication/data/<instance>/categories.csv`

und schreibt:
- `tests/fixtures/paper-pools/<instance>.csv` mit Header `person_id, <feature_columns…>`
- `tests/fixtures/paper-pools/<instance>.quotas.json` mit Panel-Größe, Source-URL und der vollen Feature-Hierarchie

Die `person_id` ist `<instance>-NNNN`, zero-padded — analog zum synthetischen Generator (#03).

## `sf_e_110_synthetic.csv` — Achtung

Was im Repo als `data/sf_e_110/intersections.csv` liegt, sind **paarweise Marginalen**: Zeilen der Form `(category 1, feature 1, category 2, feature 2, population share)`. Es gibt **keine** identifizierbaren Personen. Wir bauen daraus einen 600-Personen-Pool:

1. Aus den paarweisen Einträgen werden per-(category, value)-Marginalen gebildet (Mittelung über alle Pair-Vorkommen, dann renormalisiert).
2. Mit deterministischem LCG-Seed werden 600 Pseudo-Respondenten gezogen, die in jeder Kategorie unabhängig die Marginalen reproduzieren.
3. Quoten werden als `share × panel_size × [0.9, 1.1]` gebildet.

**Was das ist und was nicht:**
- Es ist ein deterministischer, reproduzierbarer Test-Pool, der die **marginalen** Verteilungen von sf_e abbildet.
- Es ist **keine** Replikation der echten sf_e-Joint-Verteilung — die Korrelationen zwischen Kategorien gehen verloren.
- Es darf **nicht** für Vergleichszahlen mit der publizierten Gurobi-Leximin-Performance verwendet werden. Für solche Vergleiche ist nur die aggregierte `reference-distributions/sf_e_110_prob_allocs.csv` aussagekräftig (Probability-Allocation-Kurve, kein per-Respondent-Output).

## `reference-distributions/`

Direkte Kopie aus `vendor/.../reference_output/`:

```
reference-distributions/sf_a_35_prob_allocs.csv
reference-distributions/sf_b_20_prob_allocs.csv
reference-distributions/sf_c_44_prob_allocs.csv
reference-distributions/sf_d_40_prob_allocs.csv
reference-distributions/sf_e_110_prob_allocs.csv
```

Format: drei Spalten `algorithm, percentile of pool members, selection probability`. Algorithmen: `Legacy` und `Leximin`. Diese Kurven sind die Referenz, gegen die unser Maximin-Output in #17 (Issue "leximin-cached-from-paper") verglichen wird.

## Status der Akzeptanzkriterien

| Kriterium | Status | Anmerkung |
| --- | --- | --- |
| `vendor/citizensassemblies-replication/` gecloned | ✅ | gitignored, geklont über `git clone --depth 1` |
| `tests/fixtures/paper-pools/{sf_a..sf_e}.csv` | ⚠️ **partial** | nur `example_small_20`, `example_large_200`, `sf_e_110_synthetic`; `sf_a..sf_d` sind nicht öffentlich |
| `*.quotas.json` mit Paper-Quoten + Panel-Größe | ✅ | je vorhandenem Pool |
| `docs/paper-pools.md` | ✅ | dieses Dokument |
| Python-/TS-Loader für Engine-Typ | offen für #07 | Loader-Code wird mit Engine-Interface zusammen gebaut |

## Weiterführend

- Issue #15 (native Python Reference Runner) sollte über `example_large_200` laufen, weil das die einzige öffentlich-vorhandene Roh-Pool-Instanz mit nicht-trivialer Größe ist.
- Issue #17 (leximin-cached-from-paper) verarbeitet `reference-distributions/sf_*_prob_allocs.csv` direkt und vergleicht Quantilskurven, **nicht** per-Respondent-Allocations.
- Für eine echte sf_a..sf_d-Replikation müsste man bei den Autor:innen anfragen oder einen DSGVO-konformen Bezug bei der Sortition Foundation organisieren — das ist Iteration 2.
