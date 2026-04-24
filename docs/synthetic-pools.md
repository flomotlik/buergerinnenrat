# Synthetische Pools für Iteration 1

## Warum

Echte Melderegister-Daten dürfen wir in Iteration 1 nicht nutzen (DSGVO-Auftragsverarbeitungsvertrag fehlt, keine Pilot-Kommune). Für Algorithmus-Tests, Property-Checks, Browser-Engine-Vergleiche und Benchmark-Läufe brauchen wir aber Pools, die in Größe und Form realistisch sind.

Die Lösung: ein deterministischer Generator, der aus Parametern (Größe, Seed, Tightness, Community-Profil) einen CSV ausspuckt — implementiert **doppelt** in Python (`scripts/generate_pool.py`) und TypeScript (`packages/core/src/pool/generator.ts` + `tools/generate-pool.ts`). Beide Implementierungen produzieren bei gleichen Parametern **byte-identische CSVs**, weil sie denselben PRNG (Mulberry32) verwenden.

## Spalten

```
person_id, gender, age_band, education, migration_background, district
```

- `person_id`: `<community>-NNNN`, zero-padded auf min. 4 Stellen oder mehr (je nach Größe)
- `gender`: `female | male | diverse`
- `age_band`: `16-24 | 25-34 | 35-44 | 45-54 | 55-64 | 65-74 | 75+`
- `education`: `compulsory | vocational | matura | tertiary` (≈ Pflichtschule / Lehre / Matura / tertiär)
- `migration_background`: `none | second_gen | first_gen` (kein / 2. Generation / 1. Generation)
- `district`: gemeinde-spezifischer Sub-Bezirk / Sprengel-Ersatz, je Profil zwei bis vier Werte

## Community-Profile

Sechs stilisierte österreichische Profile, gewählt um die für stratifizierte Sortition relevanten Achsen abzudecken (Größe, Altersstruktur, Bildung, Migrationsanteil, Stadt-Land-Achse).

| Code | Inspiration | Typ. Größe | Profil |
| --- | --- | --- | --- |
| `innenstadt-gross` | Wien-Innere Stadt-artig | 1500 | jung, hochgebildet, hoher Migrationsanteil (≈ 50%), 4 Sprengel-Codes |
| `aussenbezirk-mittelgross` | Wien-Floridsdorf-artig | 1000 | familiengeprägt, mittlere Bildung, Wohnring-Charakter |
| `kleinstadt-bezirkshauptort` | Tulln-artig | 600 | mittleres Alter, Stadtkern + 2 Katastralgemeinden |
| `bergdorf-tourismus` | Sankt Anton-artig | 250 | älter, niedrige formale Bildung im Schnitt, Streusiedlung |
| `wachstumsgemeinde-umland` | Mödling-artig | 500 | jung-familiär, hochgebildet, viele Neubaugebiete |
| `industriestadt-klein` | Steyr-Stadtteil-artig | 400 | älter, mittlerer Migrationsanteil, Werkssiedlung |

Alle Werte sind **stilisierte Plausibilitätswerte**, keine geprüften statistischen Parameter — der Generator dient dem Testen des Algorithmus, nicht der demographischen Forschung. Quellen für die Plausibilität (Statistik Austria, Mikrozensus 2024) sind nicht zitiert; siehe Iteration 2 für seriös fundierte Verteilungen.

## Tightness-Parameter

`--tightness` ∈ [0, 1] interpoliert linear zwischen:
- `0.0` = perfekt uniform über alle Kategorien (Profil ignoriert) — hier braucht Maximin **knappe Quoten**, weil viele Kombinationen vorkommen werden, die für die Auswahl nicht nötig sind. Das wird zur **Worst-Case-Last** für den Solver.
- `1.0` = exakt die Profil-Gewichte, kein Rauschen — die Quoten lassen sich leicht erfüllen, der Solver wird vermutlich schnell terminieren.

Empfehlung für realistische Tests: `0.6`–`0.8`. Property-Tests und Solver-Stress-Tests nutzen die Sweep-Fixtures `sweep-kleinstadt-n500-s7-t030.csv`, …`-t090.csv`.

## Reproduzierbarkeit

- **Seed**: ein uint32 (`--seed`); gleicher Seed + gleiche andere Parameter → byte-identischer CSV.
- **Sortierung**: alle Zeilen werden nach `person_id` lexikographisch sortiert, damit die Implementations-Sprache (Python vs. TS) keine Reihenfolge-Drift einbringt.
- **Cross-Lang-Identität**: ist Teil des Vitest- und Pytest-Testlaufs. Der Smoke-Test in CI ruft beide Generatoren mit identischen Parametern auf und vergleicht `sha256(csv)`.

## Vorbereitete Fixtures

`scripts/build_fixtures.sh` legt 28 CSVs unter `tests/fixtures/synthetic-pools/` an:
- 6 Profile × 4 Größen (100, 500, 1000, 2000) × seed=42, tightness=0.7 = 24 CSVs
- 4 Tightness-Sweep-Varianten (`sweep-kleinstadt-n500-s7-t030.csv` … `-t090.csv`) = 4 CSVs

Die Fixtures sind klein (≤ 2000 Zeilen, ≤ 200 KB) und werden eingecheckt, damit Engine-Vergleiche reproduzierbar sind, ohne dass jeder CI-Lauf den Generator anwerfen muss.

## Was nicht abgedeckt ist (Iteration 2+)

- Kein "Missing-Value"-Simulator: jeder CSV-Eintrag hat alle Spalten gefüllt. In echten EWO-Exports kommt `unknown` für `migration_background` und Bildung häufig vor.
- Keine Adress-Spalte: `check_same_address` aus `sortition-algorithms` ist deshalb in Iteration 1 deaktiviert; siehe `docs/upstream-verification.md`.
- Keine echten EWO-/MESO-Spaltenformate: das ist P1-2 (Iteration 2).
- Keine Haushaltsstruktur: alle Personen sind unabhängig.
