# Gecachte Leximin-Referenzen aus dem Flanigan-et-al.-Paper

## Was publiziert ist

Im Replikations-Repo `pgoelz/citizensassemblies-replication` (Commit-Tag der Nature-2021-Veröffentlichung) liegen unter `reference_output/`:

- `sf_a_35_prob_allocs_data.csv`
- `sf_b_20_prob_allocs_data.csv`
- `sf_c_44_prob_allocs_data.csv`
- `sf_d_40_prob_allocs_data.csv`
- `sf_e_110_prob_allocs_data.csv`

Jede Datei enthält drei Spalten: `algorithm, percentile of pool members, selection probability`. Algorithmen, die im Paper für jeden Pool durchgerechnet wurden:
- `Legacy` (Sortition-Foundation-Greedy, der Vor-Paper-Stand-of-the-Art)
- `LexiMin` (das Paper-Hauptergebnis, Gurobi-basiert)
- `k/n` (uniforme Referenz: Panel-Größe / Pool-Größe)

Die Werte sind **aggregierte Quantilskurven**: für jedes Perzentil der Pool-Population (sortiert nach Auswahlwahrscheinlichkeit) die zugehörige Wahrscheinlichkeit. Sie sind aus 10 000 wiederholten Algorithmus-Läufen pro Pool aggregiert (Paper Methods §"Comparing the algorithms").

## Was nicht publiziert ist

- **Per-Person-Marginale für sf_a..sf_e**: nicht im Repo, nicht im Supplementary. Begründung im README: aus Datenschutzgründen sind die Roh-Respondenten der echten SF-Pools nicht enthalten, also auch keine personenbezogenen Wahrscheinlichkeiten.
- **Konkrete Panel-Auswahl pro Lauf**: nicht im Repo. Was wir haben sind die *Verteilungen über Panels*, aggregiert.

## Konsequenz für Issue #19/#20 (Drei-Wege-Vergleich, Reporting)

- Wir können **unsere eigenen Engines (A, B, C)** auf `example_small_20` und `example_large_200` voll vergleichen — diese Pools haben Roh-Respondenten und unsere Engines liefern per-Person-Marginale.
- Für die **echten Paper-Pools `sf_a..sf_e`** vergleichen wir **Quantilskurven**, nicht Marginale: wir lassen unsere Engines mit synthetisierten Marginalen aus `sf_e_110_synthetic.csv` (#04) laufen und matchen die resultierende Quantilskurve gegen `LexiMin` aus dem Paper.
- Das ist **keine** Replikation von Flanigan et al. — die echten sf_a..sf_d-Pools sind nicht öffentlich. Es ist ein "Plausibilitäts-Check": liegt unsere Maximin-Kurve in der gleichen Größenordnung wie die Paper-Leximin-Kurve?

## Format der gecachten Fixtures

`scripts/cache_paper_leximin.py` liest die CSV-Dateien aus `tests/fixtures/paper-pools/reference-distributions/` und schreibt JSON pro Pool unter `tests/fixtures/paper-leximin-results/`:

```json
{
  "instance_id": "sf_a_35",
  "source": "Flanigan et al. 2021 (Nature) — citizensassemblies-replication, reference_output/",
  "format": "quantile_curve",
  "note": "...",
  "curves": {
    "Legacy": [{ "percentile": 0.0, "probability": 0.0022 }, ...],
    "LexiMin": [{ "percentile": 0.0, "probability": 0.0476 }, ...],
    "k/n": [{ "percentile": 0.0, "probability": 0.039 }, ...]
  }
}
```

## Tests

Unit-Test in `tests/python/test_leximin_cached.py` validiert:
- Alle fünf JSONs parsen
- Alle drei Algorithmen pro Pool vorhanden
- Quantil-Werte monoton steigend (Sanity)
- Wahrscheinlichkeiten in [0, 1]

## Out of Scope

- Kein eigener Leximin-Lauf — das wäre #16 ("gurobi-free-leximin-reference"), unabhängig davon ob die Cache-Daten vorhanden sind.
- Keine Paper-Replikation der Methodik — wir nutzen die publizierten Aggregate als-ist.
