---
id: 15
slug: native-python-reference-runner
title: Native Python Reference Runner (Referenz C)
track: 5
estimate_pt: 1
deps: [01, 03, 04]
status: todo
blocks: [16, 18, 19]
---

# Native Python Reference Runner (Referenz C)

## Kontext

Drittes Setup neben Engine A (TS) und Engine B (Pyodide): `sortition-algorithms` in nativer CPython-Umgebung (im Container). Nützt HiGHS via `highspy` nativ, keine WASM-Overhead. Dient als **Ground Truth für Engines A und B**.

## Ziel

CLI-Skript `scripts/reference_run.py`, das Engine-Contract-JSON liest, den Maximin-Pfad der Library nativ aufruft, und Engine-Contract-JSON zurückschreibt — strukturell identisch zu dem, was Engine A/B liefern.

## Akzeptanzkriterien

- [ ] `scripts/reference_run.py --pool <csv> --quotas <json> --seed <int> --out <json>` läuft im Container
- [ ] Output-JSON validiert gegen Engine-Contract-Schema (#07)
- [ ] Läuft auf allen Paper-Pools `sf_a..sf_c` (kleinere) in <5 min mit nativem HiGHS
- [ ] Dokumentierte Laufzeit auf `sf_d` und `sf_e` (mit Timeout bei 30 min für `sf_e` ist OK — Zahlen sind der Punkt, nicht Vollständigkeit)
- [ ] `ruff check`, `mypy --strict`, `pytest` grün für diese Script-Familie
- [ ] `scripts/reference_run.py --help` dokumentiert alle Optionen

## Out of Scope

- Kein Leximin (das ist #16)
- Keine Parallelisierung von Multi-Seed-Runs (das ist #19)
- Keine GUI
- Kein Web-Dienst

## Verweise

- `sortition-tool/06-review-consolidation.md` Teil E Punkt 4 (Native Referenz-Benchmark)
- Ergebnis von #01 bestimmt, wie Maximin aufgerufen wird
