# Stage 1 — Validierungsbericht

> Stand: 2026-04-26. Validiert die Stage-1-TS-Implementation gegen eine unabhängige Python-Referenz und prüft statistische Unbiasedness.

## Zusammenfassung

Die TypeScript-Implementation (`packages/core/src/stage1/stratify.ts`) wurde gegen eine unabhängige Python-Referenz (`scripts/stage1_reference.py`) auf **byte-identische Outputs** geprüft. Zusätzlich wurde die statistische Unbiasedness mit 2.000 Trials gemessen.

**Ergebnis: alle Tests bestanden.**

## Was geprüft wurde

### Test 1 — Cross-Runtime Byte-Identität (20 Setups)

`scripts/stage1_cross_validate.sh` führt 20 verschiedene Konfigurationen aus, vergleicht die JSON-Outputs der TS- und Python-Implementierung byte-für-byte.

**Variation:**
- 5 verschiedene Seeds: `1, 42, 12345, 999999, 2147483647` (uint32-Range-Abdeckung)
- 5 verschiedene Zielgrößen: `1, 50, 100, 300, 999`
- 4 verschiedene Achsen-Konfigurationen: 1, 2, 3 Achsen + 0 Achsen (SRS)
- 3 verschiedene Pool-Größen: 200, 1.000, 6.000 Personen
- Edge-Cases: `target_n = pool_size`, `target_n = 0`, fein stratifiziert mit Underfills

**Ergebnis:**
```
PASS: 20
FAIL: 0
```

Verglichen werden: `selected[]`-Indizes, vollständige Strata-Tabelle, Warnungen — jeweils nach JSON-Kanonisierung.

### Test 2 — Statistische Unbiasedness (2.000 Trials)

`scripts/stage1_statistical_test.py` zieht 2.000-mal aus dem gleichen 1.000-Personen-Pool mit verschiedenen Seeds (Ziel: 100 Personen, Achsen: district × age_band × gender). Pro Person wird die empirische Selektionsfrequenz mit der theoretischen Wahrscheinlichkeit `n_h_target / N_h` verglichen.

**Statistisches Modell:** unter Unbiasedness ist die Selektionsfrequenz pro Person Binomial-verteilt mit Parameter `(N_TRIALS, p)`. Erwartungswert `N · p`, Standardabweichung `sqrt(N · p · (1-p))`.

**Ergebnis:**
- 946 Personen mit `p > 0` getestet
- Maximum |z-score|: **3,72** (bei Person mit p=0.12)
- Personen außerhalb 4-Sigma-Grenze: **0**
- Mittlere relative Abweichung Beobachtet/Erwartet: **5,19 %**
- Stratum-Level Selektion-Summen: **alle exakt** = N_TRIALS · n_h_target (perfekt erwartungstreu, weil Hamilton-Allocation deterministisch ist)

**Bewertung:** Unter Unbiasedness erwarten wir bei 946 unabhängigen Tests im Mittel ~0,06 Verletzungen der 4-Sigma-Grenze (P(|z|>4) ≈ 6.3·10⁻⁵). Das beobachtete Maximum von |z|=3,72 ist konsistent mit zufälliger Variation. **Kein Hinweis auf systematischen Bias.**

## Was die Tests ausschließen

✓ Implementierungs-Bug in der Hamilton-Allocation (würde Bytefehler in Test 1 erzeugen)
✓ RNG-Implementierungs-Drift zwischen TS und Python (würde Bytefehler erzeugen)
✓ Fisher-Yates-Bias (würde im Statistical Test sichtbar werden)
✓ Off-by-One in Stratum-Iteration (würde Underfill- oder Overfill-Mismatches erzeugen)
✓ Locale-abhängige Sortier-Drift (für ASCII-Achsenwerte; Limitation für Nicht-ASCII bekannt und dokumentiert)
✓ RNG-State-Drift bei leeren Strata (Tests deckten "fein stratifiziert mit Underfills" ab)

## Was die Tests **nicht** ausschließen

✗ Algorithmus-Designfehler den beide Implementationen teilen — z.B. wenn die Stratum-Iteration grundsätzlich die falsche Methode wäre. Das wäre nur durch Vergleich mit einem dritten, konzeptionell anderen Algorithmus auszuschließen (z.B. SciPy-Stratified-Sampler aus `scipy.stats.qmc` oder R `sampling::strata`). Heute außerhalb des Test-Scopes.
✗ Numerische Drift bei sehr großen Pools (>100.000) — nicht gemessen.
✗ Verhalten bei UTF-8-Achsenwerten mit Sonderzeichen — siehe bekannte Limitation in `docs/stage1-algorithm.md`.

## Reproduktion

```bash
cd /root/workspace/.claude/worktrees/agent-ac76adcb

# Test 1: Byte-Identität (20 Setups, ~30 Sekunden)
bash scripts/stage1_cross_validate.sh

# Test 2: Statistische Unbiasedness (2000 Trials, ~2 Minuten)
/opt/sortition-venv/bin/python scripts/stage1_statistical_test.py
```

## Nächste Validierungs-Schritte (optional, nicht in #45 Scope)

1. **Vergleich mit `pandas.groupby().sample()`-Allokation.** Pandas verwendet andere Tie-Breaking-Konventionen, würde nicht byte-identisch sein, aber Strata-Counts müssten übereinstimmen. Sinnvoll als zweite Bestätigungs-Schicht.
2. **Vergleich mit R `sampling::strata`.** Würde R-Container voraussetzen — nicht heute.
3. **Property-basierte Fuzz-Tests** mit `fast-check`: zufällig generierte Eingabe-Pools, Achsen-Konfigurationen, Zielgrößen — verifiziere Invarianten (sum exact, no duplicates, deterministic-with-seed) auf 1000+ zufälligen Setups.
4. **Performance-Benchmark bei 100.000 Eingangs-Personen** mit Wallzeit-Aufzeichnung. Heutige Spec sagt `<1s`, ist aber nur an 6.000 empirisch belegt.
