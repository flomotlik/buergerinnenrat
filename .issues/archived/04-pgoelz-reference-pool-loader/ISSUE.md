---
id: 04
slug: pgoelz-reference-pool-loader
title: Paper-Pools sf_a..sf_e als Referenz-Fixtures
track: 0
estimate_pt: 1
deps: []
status: todo
blocks: [15, 17, 19]
---

# Paper-Pools als Referenz-Fixtures

## Kontext

`pgoelz/citizensassemblies-replication` publiziert die Rohdaten zu Flanigan et al. (Nature 2021) unter den Labels `sf_a` bis `sf_e`. Das sind anonymisierte echte Bürgerrats-Pools — deutlich belastbarer als alles Synthetische, und zugleich die einzigen Datenpunkte, zu denen es publizierte native-Gurobi-Referenzzahlen gibt (u.a. `sf_e`: 4011,6 s ≈ 67 min, siehe `sortition-tool/06-review-consolidation.md` A3).

## Ziel

Die fünf Pools in unser internes CSV-Format überführen, inklusive Quoten-Konfigurationen aus dem Paper-Repo. Dokumentieren, was übernommen ist und was angepasst wurde.

## Akzeptanzkriterien

- [ ] `vendor/citizensassemblies-replication/` gecloned (gitignored, Skript dokumentiert)
- [ ] `tests/fixtures/paper-pools/{sf_a,sf_b,sf_c,sf_d,sf_e}.csv` im selben Spaltenschema wie #03
- [ ] Für jeden Pool: `tests/fixtures/paper-pools/{sf_*}.quotas.json` mit Paper-Quoten + Panel-Grösse
- [ ] `docs/paper-pools.md` mit Paper-Zitat, Daten-URL, Transformations-Beschreibung, Metadaten-Tabelle (N-Rückmelder, Panel, Kategorien)
- [ ] Python- + TS-Loader können die Fixtures in den Engine-Typ laden (nachträglich nach #07)

## Out of Scope

- Keine Qualitäts-/Performance-Messung (das ist #15 und #19)
- Keine Übersetzung der Paper-Metadaten ins Deutsche (Originalfeldnamen behalten, kommentieren)

## Verweise

- `sortition-tool/06-review-consolidation.md` P0-3 und Teil E Punkt 4
- Flanigan, Gölz et al. (2021). *Fair algorithms for selecting citizens' assemblies*. Nature.
- https://github.com/pgoelz/citizensassemblies-replication
