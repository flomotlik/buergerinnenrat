# Stage 1 Algorithmus — vollständige Spezifikation

> Stand: 2026-04-26. Definierende Quellen: `packages/core/src/stage1/stratify.ts` (TypeScript-Implementierung), `scripts/stage1_reference.py` (Python-Referenz, byte-identisch). Validierungsergebnisse: `docs/stage1-validation-report.md`.

## Zweck

Aus einer großen Personenmenge (z.B. 6.000 Wahlberechtigte aus dem Melderegister) eine **kleinere repräsentative Stichprobe** (z.B. 300 Versand-Adressen) ziehen, deren Zusammensetzung pro Stratum proportional zur Eingangsverteilung ist. Vollständig deterministisch über einen Seed.

**Eingabe:** Liste von Personen-Datensätzen (CSV-Zeilen mit benannten Spalten), Liste der Stratifikations-Achsen (Spaltennamen), Zielgröße N, Seed.

**Ausgabe:** Liste der Indizes der ausgewählten Personen, Stratum-Tabelle (Soll vs Ist pro Kreuzkategorie), Liste der Warnungen bei unter-vertreten Strata.

## Algorithmus in 5 Schritten

### Schritt 1 — Bucketize: Personen in Strata einsortieren

Für jede Person wird ein **Stratum-Schlüssel** gebildet aus der Wertekombination der gewählten Achsen.

Beispiel mit Achsen `[district, age_band, gender]`:
- Person `(district=01-zentrum, age_band=25-34, gender=female)` → Schlüssel `[["district","01-zentrum"],["age_band","25-34"],["gender","female"]]`
- Person `(district=01-zentrum, age_band=25-34, gender=male)` → eigener Schlüssel
- Personen mit identischem Wertetupel landen im gleichen Stratum

**Schlüssel-Format:** JSON-Encoding eines Arrays von `[Achsenname, Wert]`-Paaren in der Reihenfolge der Achsen-Konfiguration. Format `JSON.stringify` ohne Whitespace.
- Vorteil: byte-identisch zwischen TS und Python (beide nutzen kanonisches JSON)
- Vorteil: leere Strings (`""`), Sonderzeichen, deutsche Umlaute eindeutig encodiert
- Vorteil: Achsen-Reihenfolge ist Teil des Schlüssels — `district→age_band` und `age_band→district` sind getrennte Gruppierungen

**Spezialfall:** Wenn die Achsen-Liste leer ist (`axes=[]`), gibt es genau **ein Stratum** mit allen Personen — degeneriert zu einer einfachen Zufallsstichprobe (Simple Random Sample, SRS).

**Komplexität:** O(N · |axes|) für N Eingangs-Personen.

### Schritt 2 — Stratum-Reihenfolge festlegen

Alle Stratum-Schlüssel werden **lexikographisch sortiert** (Codepoint-Order). Diese Reihenfolge ist die kanonische Reihenfolge für alle nachfolgenden Schritte.

**Warum lex-Sortierung?** Determinismus. Hash-basierte Map-Iteration ist in JS und Python implementations-spezifisch. Lex-Order ist eindeutig und in beiden Sprachen identisch (für ASCII-only Achsenwerte).

**Warnung für nicht-ASCII Werte:** TS `String.prototype.localeCompare` ist locale-abhängig, Python `sorted()` ist Codepoint-basiert. Für deutsche Achsenwerte (z.B. Bezirksnamen mit "ä", "ö", "ü") können die Reihenfolgen voneinander abweichen. Heute werden alle Achsenwerte in den Test-Fixtures ASCII-only gehalten; bei realen Daten sollte vor Stage 1 normalisiert werden (NFD oder Transliteration). **Bekannte Limitation, dokumentiert in #45 Out of Scope.**

### Schritt 3 — Largest-Remainder-Allokation (Hamilton-Methode)

Berechnet pro Stratum, wieviele Personen daraus gezogen werden sollen, sodass die Summe exakt N ergibt.

```
Eingaben:  stratum_keys  = [k_1, k_2, ..., k_K]  (lex-sortiert)
           stratum_sizes = [N_1, N_2, ..., N_K]  (Personen pro Stratum)
           target_N      = Gesamt-Stichprobengröße
Ausgabe:   allocation    = [n_1, n_2, ..., n_K]  mit sum(n_i) = target_N
```

**Schritt 3a — Bruchteilige Quoten berechnen.**
Für jedes Stratum h: `quota_h = target_N · N_h / N_total`.

Beispiel: target_N=100, N_total=1000, Stratum mit 87 Personen → `quota = 100 · 87 / 1000 = 8.7`.

**Schritt 3b — Abrunden.**
Pro Stratum: `floor_h = floor(quota_h)`. Im Beispiel: `floor = 8`.

**Schritt 3c — Verbleibende Plätze verteilen.**
`assigned = sum(floor_h)`, `delta = target_N − assigned`. Diese delta Plätze werden auf jene Strata verteilt, deren Bruchteil-Rest am größten ist.

**Tie-Break-Reihenfolge** (wenn Reste gleich groß sind):
1. Größerer Bruchteil-Rest zuerst
2. Bei Gleichstand: größeres N_h zuerst (große Strata bevorzugt)
3. Bei Gleichstand: lexikographisch kleinerer Stratum-Schlüssel zuerst

**Beispiel komplett:**
- target_N = 5
- 3 Strata mit Größen [3, 3, 4], total=10
- Quoten: [1.5, 1.5, 2.0]
- Floors: [1, 1, 2], assigned=4, delta=1
- Reste: [0.5, 0.5, 0.0]
- Tie-Break: Reste 0.5 vs 0.5 — größeres N_h gewinnt, also Stratum 3 (N_h=4)? Aber das hat Rest 0.0. Unter den 0.5-Resten ist N_h gleich (3 und 3) — also lex-kleinerer Schlüssel gewinnt.
- Allocation: [2, 1, 2] ODER [1, 2, 2] je nach Schlüssel-Order. Summe = 5. ✓

**Warum Hamilton statt z.B. Sainte-Laguë?** Hamilton ist die einfachste Methode mit garantiertem `sum(n_h) = target_N` und ist die DACH-Standard-Praxis in der amtlichen Statistik. Sainte-Laguë und d'Hondt haben andere Bias-Eigenschaften, die hier nicht gewollt sind (würden große Strata bevorzugen).

### Schritt 4 — Pro Stratum ziehen (Fisher-Yates mit Mulberry32)

Pro Stratum h in lex-Reihenfolge:

1. `n_h_actual = min(n_h_target, n_h_pool)` — kann ein Stratum die Soll-Zahl nicht erfüllen, ziehe alle vorhandenen
2. Wenn `n_h_actual = 0`: Stratum überspringen (auch keine RNG-Bewegung)
3. Wenn `n_h_actual > 0`: 
   - Personen-Indices des Stratums **in-place per Fisher-Yates shufflen**
   - Erste `n_h_actual` Indices als gezogen markieren

**Fisher-Yates-Variante (TS-Code-Treue):**
```
for i = len(indices) − 1 down to 1:
    j = floor(rng.next_float() · (i + 1))     // 0 ≤ j ≤ i
    swap indices[i] ↔ indices[j]
```

Diese Schleifenrichtung (von hinten nach vorn) und das Inkludieren von `j == i` als Möglichkeit (kein Selbstvermeidung) sind die kanonische unbiased Variante, gleich der Implementierung in `random.shuffle()` von Python und `Array.prototype.sort` mit `Math.random()` ist es **nicht** — Fisher-Yates ist die einzige unbiased Methode.

**RNG: Mulberry32.** 32-Bit deterministischer PRNG, identisch implementiert in TS (`packages/core/src/pool/mulberry32.ts`) und Python (`scripts/generate_pool.py:36-50`). Der RNG-State wird **einmal initialisiert** und über alle Strata **geteilt**. Strata werden in lex-Order durchlaufen — dadurch ist die Reihenfolge der RNG-Aufrufe deterministisch.

**Wichtige Determinismus-Regel:** Strata mit `n_h_actual=0` bewegen den RNG-State **nicht**. Das ist Absicht: ein leeres Stratum (z.B. weil das Soll mathematisch auf 0 gerundet hat) soll nicht den nachgelagerten Strata den RNG-State "verschieben". Diese Konvention ist in beiden Implementierungen identisch und in den Tests verifiziert.

### Schritt 5 — Output-Reihenfolge

Die gezogenen Indices werden ausgegeben in:
1. Lex-Reihenfolge der Strata
2. Innerhalb eines Stratums: aufsteigend nach ursprünglichem Row-Index

Das produziert eine **menschen-lesbare CSV-Reihenfolge** (Bezirk 01 vor Bezirk 02 vor ... innerhalb gleichem Stratum von Zeile 0 nach Zeile N).

**Stratum-Tabelle** wird parallel ausgegeben mit:
- `n_h_pool` (verfügbar)
- `n_h_target` (vom Hamilton-Verfahren zugewiesen)
- `n_h_actual` (tatsächlich gezogen)
- `underfilled` (true wenn `n_h_actual < n_h_target`)

**Warnungen** als deutscher Klartext pro under-vertretenes Stratum: `"Stratum {key} unter-vertreten: {actual} von {target} angefragt (Pool: {pool})."`

## Vollständigkeits-Garantien

| Eigenschaft | Garantie | Verifiziert durch |
|---|---|---|
| `sum(n_h_target) = target_N` | Mathematisch durch Largest-Remainder | Unit-Test `largest-remainder-sum` |
| `sum(n_h_actual) ≤ target_N` | Aus `n_h_actual = min(...)` | Unit-Test |
| Selektion ohne Wiederholung | Fisher-Yates über Index-Liste, slice der ersten n | Unit-Test `no-duplicates` |
| Determinismus mit gleichem Seed | Single shared RNG, lex-Order, Mulberry32 | Cross-Validation TS=Python (20/20) |
| Per-Person-Wahrscheinlichkeit = n_h/N_h | Fisher-Yates ist unbiased | Statistical Test (max z=3.72 über 2000 Trials) |
| Ausgabe für leere Achsen = SRS | Spezialfall in `bucketize` | Cross-Validation Case "0-axes (SRS)" |
| Korrekt bei `target_N = pool_size` | Wird zu vollständiger Permutation pro Stratum | Cross-Validation Case "target=200 (all)" |
| Korrekt bei `target_N = 0` | Frühe Returns, keine RNG-Bewegung | Cross-Validation Case "target=0" |
| Korrekt bei `target_N > pool_size` | Wirft Fehler vor jeglicher Verarbeitung | Unit-Test, throws |
| Korrekt bei `n_h_target > N_h` | Clamping mit Underfill-Warning | Cross-Validation Case "5-axes" |

## Bekannte Limitationen (bewusst)

1. **Kein Soft-Constraint-Modus.** Die Allocation ist hart-proportional, kein Toleranz-Korridor. Bei bestimmten Zahlenkonstellationen kann Stratum-Underfill auftreten, der als Warnung im Audit auftaucht.
2. **Keine Redistribution bei Underfill.** Wenn Stratum X 3 Plätze sollte aber nur 2 hat, wird der eine fehlende Platz **nicht** an ein anderes Stratum weitergegeben. Begründung: Determinismus-Erhalt + die Verwaltung sollte Underfills sehen, nicht weg-glätten.
3. **Locale-Sortierung von Stratum-Schlüsseln.** TS `localeCompare()` und Python `sorted()` unterscheiden sich bei Nicht-ASCII-Achsenwerten. Heute werden alle Test-Fixtures ASCII-only gehalten. Reale Eingangsdaten mit deutschen Umlauten in Bezirksnamen sollten vor Stage 1 transliteriert werden.
4. **Kein disjunktes Ziehen aus mehreren Wellen.** Wenn man "300 mehr Briefe disjunkt zur ersten 300er-Welle" braucht, ist das Issue #48 (Nachhol-Operation 3a), nicht in Stage-1-Scope.
5. **Kein Kreuz-Stratum-Constraint.** Z.B. "mindestens 5 Personen aus jeder Kombination Bezirk × Altersband" geht **nicht** mit Hamilton. Falls gewünscht, wäre Iterative Proportional Fitting (IPF) der nächste Schritt — nicht in Iteration 2.

## Verifikation auf einem Beispiel

Nachvollziehbar mit:
```bash
# Pool generieren
pnpm exec tsx -e "
import { generatePool, PROFILES } from './packages/core/src/index';
const p = generatePool({ profile: PROFILES['kleinstadt-bezirkshauptort'], size: 1000, seed: 42, tightness: 0.7 });
console.log('person_id,gender,age_band,education,migration_background,district');
for (const r of p) console.log([r.person_id, r.gender, r.age_band, r.education, r.migration_background, r.district].join(','));
" > /tmp/pool-1000.csv

# TS-Implementation laufen lassen
pnpm exec tsx scripts/stage1_cli.ts --input /tmp/pool-1000.csv \
  --axes district,age_band,gender --target-n 100 --seed 42 \
  --out /tmp/ts.json

# Python-Referenz laufen lassen
/opt/sortition-venv/bin/python scripts/stage1_reference.py --input /tmp/pool-1000.csv \
  --axes district,age_band,gender --target-n 100 --seed 42 \
  --output-json /tmp/py.json

# Vergleichen — sollte EMPTY (= identisch) ergeben
diff <(python3 -c "import json; print(json.dumps(json.load(open('/tmp/ts.json')), indent=2, sort_keys=True))") \
     <(python3 -c "import json; print(json.dumps(json.load(open('/tmp/py.json')), indent=2, sort_keys=True))")
```

Vollständige Cross-Validation: `bash scripts/stage1_cross_validate.sh` (20 Setups, byte-identisch).
Statistische Uniformitätsprüfung: `python3 scripts/stage1_statistical_test.py` (2000 Trials, max z=3.72).

## Datei-Übersicht

| Datei | Sprache | Zweck |
|---|---|---|
| `packages/core/src/stage1/stratify.ts` | TypeScript | Produktiv-Implementierung (Browser + Node) |
| `packages/core/src/pool/mulberry32.ts` | TypeScript | PRNG (von Stratify wiederverwendet) |
| `scripts/stage1_reference.py` | Python | Referenz-Implementierung, byte-identisch zum TS |
| `scripts/generate_pool.py:36-50` | Python | PRNG-Twin von mulberry32.ts |
| `scripts/stage1_cli.ts` | TypeScript | CLI-Wrapper für TS-Stratify (zur Vergleichbarkeit) |
| `scripts/stage1_cross_validate.sh` | Bash | 20-Setup-Cross-Validation TS vs Python |
| `scripts/stage1_statistical_test.py` | Python | Statistical-Bias-Test (2000 Trials) |
| `packages/core/tests/stage1-stratify.test.ts` | TypeScript (Vitest) | Unit-Tests Algorithmus |
| `packages/core/tests/stage1-integration.test.ts` | TypeScript (Vitest) | 6000-Pool-Integration-Test |

## Referenzen

- Largest-Remainder-Methode (Hamilton): <https://en.wikipedia.org/wiki/Largest_remainders_method>
- Fisher-Yates-Shuffle (canonical version): Knuth, *The Art of Computer Programming*, Vol. 2, §3.4.2
- Mulberry32-PRNG: <https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32>
- Stratifizierte Zufallsstichprobe (proportionale Allokation): Cochran, *Sampling Techniques*, 3rd ed., Kapitel 5
- Sortition-Foundation-Methode (für Vergleich Stage 1 vs Stage 3): <https://www.sortitionfoundation.org/how>
