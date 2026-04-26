---
id: 49
slug: stage1-pandas-independent-comparison
title: Stage 1 — unabhängiger Vergleich gegen pandas/numpy (nicht-derivative Referenz)
track: Z
estimate_pt: 1
status: open
depends_on: [45]
priority: medium
priority_rationale: "External-review Konsens (claude H3 + codex M2): bestehende Cross-Validation ist Transcription, nicht unabhängige Verifikation"
---

# Stage 1 — Unabhängiger Vergleich gegen pandas/numpy

## Kontext

Die externe LLM-Review (Konsens claude opus-4-7 H3 + codex gpt-5.4 M2) hat festgestellt: `scripts/stage1_reference.py` ist **bewusst eine Transcription** der TS-Implementierung (eigener Header sagt "Mirrors the TypeScript implementation bit-for-bit"). Das ist eine Konformitäts-Prüfung zwischen zwei Artefakten desselben Designs, **keine unabhängige methodische Validierung**.

Wenn beide Implementationen denselben konzeptionellen Bug hätten, würde Cross-Validation ihn nicht finden.

Vollständige Review-Ergebnisse: `.issues/stage-1-stratified-sampling-algorithm-conceptual-fit/reviews/`.

## Ziel

Eine dritte, **konzeptionell unabhängige** Vergleichs-Implementierung gegen `pandas.groupby().sample()` + numpy-basierte Hamilton-Allokation. Vergleicht **nicht** byte-identische Outputs (anderer RNG, anderes Tie-Break) — vergleicht **statistische Equivalenz**:

1. **Allocations-Test:** Hamilton-Allocation pro Stratum byte-identisch (rein arithmetisch, kein RNG, jede korrekte Implementierung muss übereinstimmen)
2. **Strata-Counts-Test:** für `K` Trials mit verschiedenen Seeds — pro Stratum die Häufigkeitsverteilung der gezogenen Counts statistisch identisch (Chi²-Test)
3. **Per-Person-Frequenz-Test:** über `K` Trials beider Implementierungen sollte jede Person mit Wahrscheinlichkeit `n_h_target / N_h` gezogen werden — beide Implementierungen müssen das innerhalb statistischer Grenzen erreichen

## Acceptance Criteria

- [ ] `scripts/stage1_pandas_comparison.py` neu — pure Python ohne Wiederverwendung von `stage1_reference.py`. Nutzt `pandas.DataFrame.groupby().sample(n=n_h, random_state=...)` und eigene unabhängige Hamilton-Allokation
- [ ] CLI-Schnittstelle: `--input <csv> --axes a,b --target-n N --seed N --output <json>`
- [ ] Output-Schema unterscheidet sich vom TS-Reference (Hauptzweck: nicht den gleichen Algorithmus implementieren). Mindestens `{ allocations: {stratum_key: n}, selected_person_ids: [...], implementation: 'pandas-1.x' }`
- [ ] Unit-Test in Python: `scripts/tests/test_pandas_comparison.py` prüft Allocations-Identität für 5 Beispiel-Setups gegen `stage1_reference.py`
- [ ] Statistik-Vergleichs-Test: 100 Trials beider Implementierungen, pro Person Selection-Frequenz vergleichen, Chi²-Test akzeptiert H₀ (gleiche Verteilung) bei α=0.05
- [ ] `scripts/stage1_independent_validation.sh` — Wrapper-Script das alle drei Implementierungen (TS, derivative Python, unabhängige pandas) auf gleichen Eingaben laufen lässt und Vergleichsbericht in `docs/stage1-validation-report.md` einträgt
- [ ] Validation-Report-Update: dritter Validierungs-Pfad dokumentiert mit explizitem Hinweis "unabhängig vom Original-Design"

## Out of Scope

- Byte-identische Outputs zwischen pandas und TS (nicht erreichbar wegen anderem RNG, anderem Tie-Break)
- pandas-Implementation als Produktiv-Engine (Pandas läuft nicht im Browser)
- IPF-/Raking-Vergleich (eigener Issue, falls Bedarf)

## Verweise

- Review-Findings: `.issues/stage-1-stratified-sampling-algorithm-conceptual-fit/reviews/review-*-claude-opus-4-7.md` (H3) und `*-gpt-5-4.md` (M2)
- Bestehende derivative Referenz: `scripts/stage1_reference.py`
- Algorithmus-Doc: `docs/stage1-algorithm.md`
- Validation-Report: `docs/stage1-validation-report.md`
- pandas docs: `pandas.DataFrame.groupby().sample()` <https://pandas.pydata.org/docs/reference/api/pandas.core.groupby.DataFrameGroupBy.sample.html>
