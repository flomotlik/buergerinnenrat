---
id: 40
slug: engine-a-real-column-generation
title: Engine A — echte Dual-Preis-Column-Generation statt Hybrid-Heuristik
track: 2
estimate_pt: 3
deps: [archived/08, 26]
status: todo
blocks: [27, 41]
priority: P0 — schließt die 16% min-π-Lücke zu Reference C
---

# Engine A: echte Column Generation

## Kontext

Iteration 1 Engine A (`packages/engine-a/src/engine.ts`) ist eine **Hybrid-Heuristik**, keine echte Maximin-Implementierung:

1. **Coverage-Phase** (Zeilen 92-119): MIP mit positivem Coef auf uncovered + negativem auf covered, bis alle Personen in mindestens einem Komitee sind. Funktioniert, aber nutzt **nicht die LP-Dual-Preise**.
2. **Dual-Preis-Phase** (Zeilen 121-127): nur 5 Iterationen Default. Wird abgebrochen, sobald keine Verbesserung > eps. Aber: oft wird die Dual-Preis-Phase nie erreicht, weil Coverage-Phase die Iterations-Quota verbraucht.

Das Ergebnis: **z\* = min π** ist ~16 % unter dem, was Reference C (kanonisches `find_distribution_maximin`) liefert. Beleg: `docs/quality-comparison-iteration-1.md`:
- `example_small_20`: Engine A 0.0833 vs Reference C 0.1000 (−16,7 %)
- `kleinstadt-100`: Engine A 0.0930 vs Reference C 0.1111 (−16,3 %)

Das Upstream-Paper-Algorithmus (Flanigan et al. 2021, Methods §"Column generation for maximin") ist deutlich strikter:

```
Initialisiere: 1 oder mehrere zulässige Komitees C
Loop:
  1. Solve Primal-LP  →  z*, π*
  2. Hole Dual-Preise y_i aus Constraint-Rows
  3. Solve MIP: max Σ y_i × x_i  s.t. Quoten + |C| = k, x_i ∈ {0,1}
  4. If MIP-Optimum > z* + ε:
       Add new Komitee zu C, repeat
     Else:
       z* ist optimaler Maximin-Wert über alle zulässigen Komitees
```

**Unsere aktuelle Implementation überspringt Schritt 2 in der Coverage-Phase und limitiert Schritt 4 in der Dual-Phase.** Das ist die Quelle der 16-%-Lücke.

## Ziel

Engine A implementiert echte Column Generation, die **bis zur Konvergenz iteriert** (kein hartes Iteration-Limit, nur Eps-Abbruch + Safety-Cap bei z.B. 200 CG-Iterationen). Erwartetes Resultat: min π innerhalb von 1–2 % der Reference C.

## Akzeptanzkriterien

- [ ] **`packages/engine-a/src/maximin-lp.ts`** korrekt: extrahiert die Dual-Preise aus den `Rows[i].Dual`-Werten der Agent-Constraints. Heute schon vorhanden, aber Reihenfolge und Sign-Konvention dokumentiert in JSDoc
- [ ] **`packages/engine-a/src/engine.ts`** umgebaut:
  - Initial: 1 zufälliges zulässiges Komitee (statt 6 mit zufälligen Objektiven)
  - CG-Loop:
    - Solve Primal-LP → z\*, π\*, agent_duals
    - MIP mit `objective = agent_duals` → finde Komitee C' mit Σ y_i × x_i maximal
    - Wenn `Σ y_i × x_i > z* + eps_improve` → C' zum Set hinzufügen, weiter
    - Sonst → konvergiert, raus
  - Safety-Cap: max. 200 CG-Iterationen (Schutz gegen Numerik-Endlosschleifen)
  - Stalled-Detection: 3 aufeinanderfolgende Iterationen ohne neues Komitee → raus mit Warning-Event
- [ ] **Coverage-Sonderfall**: wenn Initial-Komitee nicht alle Agenten überdeckt (Standard-Fall), startet z\*=0. Die ersten paar CG-Iterationen sind dann automatisch "Coverage durch Dual-Preise", weil uncovered-Agents y_i = 1 / |uncovered| haben. Verifizieren via Test, dass das natürlich konvergiert
- [ ] **EPS-Toleranz** als CLI-Parameter: Default 1e-6, kann gelockert werden auf 1e-4 für schnellere Approximation
- [ ] **Tests** in `packages/engine-a/tests/`:
  - Unit: kleines Toy-Beispiel (10 Personen, 3 Panel) hat bekannten optimalen z* = X (manuell verifizierbar) — Engine A muss innerhalb 1e-6 davon liegen
  - Integration: auf `kleinstadt-100`-Fixture liegt z* innerhalb 1 % von Reference C (gemessen)
  - Determinismus: gleicher Seed + gleiches Pool → identische Komitee-Liste (modulo Reihenfolge) und identisches z*
- [ ] **Performance-Caps**: Engine A bleibt für n ≤ 500 unter 5 s, für n ≤ 2000 unter 60 s (Akzeptanz-Zielwert; bei Überschreitung Issue als "performance regression" markieren, nicht akzeptieren)
- [ ] **`docs/quality-comparison-iteration-1.md`** Folge-Tabelle: nach Bauen von #40, ein neuer Vergleichslauf zeigt Engine A's neue z*-Werte vs Reference C — Lücke sollte ≤ 2 % sein

## Out of Scope

- **Pipage-Rounding** — separates Issue #41
- **Parallelisierung** der MIP-Solves (kein Performance-Block in Iteration 2)
- **Warm-Start** zwischen verwandten Runs (Issue #44 später)
- **Integer-Programming-Reformulierung** (Cuts, Branch-and-Bound-Tuning) — out of scope, wir vertrauen HiGHS Default-Settings

## Verweise

- Aktuelle Implementation: `packages/engine-a/src/engine.ts:73-180` (Hybrid-Heuristik)
- Reference C: `scripts/reference_run.py` ruft `find_distribution_maximin` aus `sortition-algorithms`
- Upstream-Algorithmus: vendor/sortition-algorithms-src/src/sortition_algorithms/committee_generation/maximin.py:_setup_maximin_incremental_model + find_distribution_maximin
- Paper: Flanigan et al. 2021, Methods §"Column generation for maximin"
- Iteration-1-Lücken-Daten: `docs/quality-comparison-iteration-1.md`
