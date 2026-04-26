# Beispiel-Daten

Diese CSV-Dateien sind **synthetisch erzeugt** — sie enthalten **keine echten
Personen**. Sie dienen ausschließlich dazu, das Tool ohne eigene
Melderegister-Daten ausprobieren zu können.

## Übersicht

| Datei | Größe | Personen | Stage | Beschreibung |
|---|---|---|---|---|
| `herzogenburg-melderegister-8000.csv` | ~620 KB | 8000 | Stage 1 | Vollbevölkerung einer NÖ-Gemeinde nach Vorbild Herzogenburg |
| `herzogenburg-versand-300.csv` | ~24 KB | 300 | Stage 1 Output | Stratifizierte Versand-Stichprobe von 300 Personen |
| `herzogenburg-antwortende-60.csv` | ~5 KB | 60 | Stage 3 Input | Antwortende mit Selbstauskunfts-Feldern (Bildung, Migration) |
| `kleinstadt-3000.csv` | ~230 KB | 3000 | Stage 1 | Kleineres Profil zum schnellen Testen |

## Datei-Details

### `herzogenburg-melderegister-8000.csv`

8000 Personen verteilt auf 14 Katastralgemeinden + 9 Wahlsprengel,
nachgebildet nach den real existierenden KGs Herzogenburgs (Wikipedia).

Spalten:
- `person_id` — laufende ID mit Profil-Prefix (`hzbg-00001`)
- `vorname`, `nachname` — Namen aus 4 kulturellen Clustern
  (deutsch-österreichisch, türkisch, ex-jugoslawisch, osteuropäisch)
- `geburtsjahr` — vier-stellig, abgeleitet aus dem NÖ-Altersprofil
- `geschlecht` — `weiblich`, `maennlich`, `divers`
- `staatsbuergerschaft` — ISO-3166-1-α2 (z.B. `AT`, `DE`, `TR`, `RS`)
- `sprengel` — Wahlsprengel-ID
- `katastralgemeinde` — KG-ID
- `haushaltsnummer` — synthetische Haushalts-ID; Personen einer Familie
  haben dieselbe Nummer

### `herzogenburg-versand-300.csv`

Output einer Stage-1-Stratifikation auf der 8000er-Vollbevölkerung:
300 Personen, gezogen über die Achsen `sprengel × geburtsjahr-band ×
geschlecht` mit Hamilton-Allokation. Spalten identisch zur
Vollbevölkerungs-Datei.

### `herzogenburg-antwortende-60.csv`

60 Personen aus der Versand-Liste, die "geantwortet" haben (synthetisch
gezogen). Zusätzlich zu den Stage-1-Spalten enthält jede Zeile zwei
Selbstauskunfts-Felder:

- `bildung` — eine von vier Stufen: `pflicht`, `lehre`, `matura`,
  `hochschul` (jüngere Personen häufiger `matura`/`hochschul`)
- `migrationshintergrund` — `keiner`, `erste-generation`,
  `zweite-generation` (heuristisch korreliert mit Vornamen-Cluster)

**Wichtig:** Diese Felder sind **nicht im Melderegister** enthalten.
Im realen Workflow füllen die Antwortenden sie selbst auf einem
Anmeldeformular aus.

### `kleinstadt-3000.csv`

Kleineres Profil mit 3000 Personen, 4 generischen KGs, gleicher
NÖ-Demografie. Schnellerer Testlauf für UI-Demos.

## Warum synthetisch

Die Cluster-Verteilung (~85 % deutsch-österreichisch, ~5 % türkisch,
~3 % ex-jugoslawisch, ~3 % osteuropäisch, ~4 % sonstige) ist eine
**statistisch motivierte Schätzung auf Basis von Statistik-Austria-Daten
für Niederösterreich**. Sie sind **nicht** die realen Werte für
Herzogenburg — exakte KG-Detaildaten sind ohne Statistik-Austria-Zugriff
nicht öffentlich verfügbar.

Vollständige Demografie-Quellen:
[`research/00-synthesis.md`](../../../research/00-synthesis.md) und
[Issue-RESEARCH.md §A](../../../.issues/57-synthetic-test-data-generator/RESEARCH.md).

## Reproduzierbarkeit

Alle Dateien wurden deterministisch mit dem Generator erzeugt:

```bash
pnpm tsx scripts/synthetic-meldedaten/generator.ts \
    --profile herzogenburg \
    --output apps/web/public/beispiele/herzogenburg-melderegister-8000.csv \
    --seed 4711

pnpm tsx scripts/synthetic-meldedaten/generator.ts \
    --profile kleinstadt-3000 \
    --output apps/web/public/beispiele/kleinstadt-3000.csv \
    --seed 4711

pnpm tsx scripts/synthetic-meldedaten/derive-versand.ts \
    --input apps/web/public/beispiele/herzogenburg-melderegister-8000.csv \
    --output apps/web/public/beispiele/herzogenburg-versand-300.csv \
    --n 300 --seed 4711

pnpm tsx scripts/synthetic-meldedaten/derive-antwortende.ts \
    --input apps/web/public/beispiele/herzogenburg-versand-300.csv \
    --output apps/web/public/beispiele/herzogenburg-antwortende-60.csv \
    --n 60 --seed 4711
```

- **Default-Seed:** `4711`
- **Generator-Commit zum Zeitpunkt der Erzeugung:** `92dca6b`
- **SHA-256-Stabilität:** Bei gleichem Seed produziert jeder Re-Run
  byteweise identische Dateien.

## Lizenz

Die hier ausgelieferten CSV-Dateien sind als reine synthetische
Konstruktion **Public Domain (CC0)**. Quellen der Namens-Listen siehe
`scripts/synthetic-meldedaten/names/SOURCES.md` im Repository.
