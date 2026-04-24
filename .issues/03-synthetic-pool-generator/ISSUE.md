---
id: 03
slug: synthetic-pool-generator
title: Synthetischer Meldedaten-Generator (Python + TS)
track: 0
estimate_pt: 1
deps: []
status: todo
blocks: [09, 15, 18, 19]
---

# Synthetischer Meldedaten-Generator

## Kontext

Echte Melderegister-Daten können wir in Iteration 1 nicht nutzen (DSGVO, keine Pilot-Kommune, kein AVV). Für Tests, Property-Checks und Benchmark-Läufe brauchen wir **deterministische synthetische Pools** in realistischer Form.

Realistisch heisst: Spalten wie in einem EWO-Export (Person-ID, Gender, Age-Band, Education, Migration-Background, District) mit einstellbarer Quoten-Tightness.

## Ziel

Eine Python-CLI + TS-Modul, die aus Parametern (Size, Seed, QuotaTightness) denselben CSV produzieren. "Denselben" bis auf Reihenfolge und Formatierung.

## Akzeptanzkriterien

- [ ] `python scripts/generate_pool.py --size 500 --seed 42 --tightness 0.7 --out pool.csv` produziert reproduzierbaren CSV
- [ ] TS-Äquivalent `tools/generate-pool.ts --size 500 --seed 42 --tightness 0.7 --out pool.csv` erzeugt byte-identischen Output (gleiche Zeilen, gleiche Reihenfolge nach Sortierung)
- [ ] Spalten: `person_id, gender, age_band, education, migration_background, district`
- [ ] Pool-Grössen 100, 500, 1000, 2000 als vorbereitete Fixtures unter `tests/fixtures/synthetic-pools/`
- [ ] Tightness-Parameter steuert, wie knapp die Quoten sind (0.5 = locker, 0.9 = sehr knapp) — dokumentiert in `docs/synthetic-pools.md`
- [ ] Pytest + Vitest prüfen Determinismus (gleicher Seed → gleicher CSV)

## Out of Scope

- Keine echten Meldedaten, keine Import-Schemas von Herstellersoftware (das ist P1-2, Iteration 2+)
- Kein Rauschen/Missing-Values-Simulator (das kommt mit realen Daten)
- Keine Quoten-Konfiguration selbst — nur Daten; Quoten sind #06

## Verweise

- `sortition-tool/06-review-consolidation.md` P0-3 (Benchmark-Matrix braucht synthetische Pools)
- `sortition-tool/06-review-consolidation.md` P1-2 (echte CSV-Formate sind Iteration-2-Thema)
