# Research — Issue #57 Synthetic Test Data Generator

> Konsolidierung aus 3 parallelen Research-Agents (Demografie / Namen / Codebase). Alle Quellen verifiziert mit URLs.

## User Constraints (verbatim aus CONTEXT.md)

- AT-Kontext (NICHT DE/BMG)
- CLI-Tool, Pre-generierte Beispiele committed in `apps/web/public/beispiele/`
- 4 Namens-Cluster: deutsch-österreichisch (~85%), türkisch (~5%), ex-yu (~3%), osteuropäisch (~3%), sonstige (~4%)
- Haushalts-Strukturen mit Eltern + Kindern, Mehrgeneration-Haushalte
- 8000 Personen für Herzogenburg-Profil
- Pre-generierte CSVs zum Download von Doku-Sub-Seite

## Summary

3 PASS-Outputs, sehr klare Datenbasis. Generator ist machbar als pure-TS-Skript mit Mulberry32-RNG. 4 Namens-Cluster mit je ~150 Einträgen sind ausreichend für Realismus. Herzogenburg hat **14 Katastralgemeinden + 9 Zählsprengel** (überraschend — Sprengel sind GRÖBER als KGs). Demografie-Zahlen für NÖ alle aus Statistik Austria primär verifizierbar.

Architektur-Empfehlung Commit-Strategie:
1. Namens-Listen (4 Cluster × 3 Dateien) + Quellen-Doc
2. Generator-Kern (types, household-builder, person-builder, csv-output)
3. Profile-Datei `herzogenburg.json`
4. Pre-generierte Beispiele (3-4 CSV-Dateien) + README
5. Doku-Sub-Seite + Download-Buttons
6. Stage-1-Hint + Tests + Bundle-Delta

## A. Demografie-Daten (Agent 1)

### Herzogenburg
- **Bevölkerung:** 7.990 (1.1.2025), 7.967 (1.1.2026). User-Vorgabe 8000 ist korrekt.
- **14 Katastralgemeinden:** Adletzberg, Angern, Ederding, Einöd, Gutenbrunn, Hameten, Herzogenburg, Oberndorf in der Ebene, Oberwinden, Ossarn, Pottschal, St. Andrä an der Traisen, Unterwinden, Wielandsthal.
- **9 Zählsprengel** (gröber als KGs!): Herzogenburg-Altstadt, Herzogenburg-Altst.-Umg-N, Herzogenburg-Altst.-Umg-S, Oberndorf-Nord und Ost, Oberndorf-Südwest, Ederding-Wielandsthal, Oberwinden-Ossarn, St. Andrä an der Traisen, Gutenbrunn.
- **KG-Bevölkerungs-Verteilung** (geschätzt — kein Detail-Datensatz öffentlich): KG Herzogenburg trägt ~4.500-5.000, die anderen 13 KGs jeweils 100-600.

### NÖ-Demografie (Stand 1.1.2025, Statistik Austria)
- 1.727.514 Einwohner gesamt
- **12,5 % Nicht-Österreicher** (215.208 Personen)
  - **6,9 % EU/EFTA + UK** (118.412)
  - **5,6 % Drittstaaten** (96.796)
- **Top-Herkunftsländer:** Rumänien (größte Gruppe, steigend), Deutschland, Türkei, Ungarn, Ukraine, Serbien, Slowakei, Bosnien
- **14,9 % Migrationshintergrund** (zweitniedrigster Wert nach Burgenland; AT gesamt: 27,8 %)

### Haushalte (NÖ-Werte / AT-Mittelwerte)
- Durchschnittliche Haushaltsgröße: **2,16** (NÖ leicht höher)
- 1-Personen: **38,2 %** (NÖ ~39,4 %)
- 2-Personen: ~**27,8 %**
- 3-Personen: ~**14 %**
- 4-Personen: ~**13 %**
- 5+: ~**6-7 %**
- Familien mit Kindern <18: ~**40 %** aller Familien
- Drei-Generationen-Haushalte: **<1 %**

### Altersstruktur NÖ
- Median: M 44, F 43
- Bänder (interpoliert):
  - 0-9: ~9 %, 10-19: ~10 %, 20-29: ~11 %, 30-39: ~13 %, 40-49: ~14 %, 50-59: ~15 %, 60-69: ~13 %, 70-79: ~10 %, 80+: ~5 %

### Geschlecht
- 50,8 % weiblich, 49,2 % männlich
- divers: <0,01 % (im ZMR seit 2018)

### Quellen
- <https://de.wikipedia.org/wiki/Herzogenburg>
- <https://www.herzogenburg.at/?kat=4190>
- <https://www.statistik.at/statistiken/bevoelkerung-und-soziales/bevoelkerung/bevoelkerungsstand>
- <https://www.migration-infografik.at/bev-stbg-2025/>
- <https://www.wko.at/statistik/bundesland/Privathaush.pdf>
- <https://www.statistik.at/fileadmin/publications/Migration-Integration_2025.pdf>

## B. Namens-Listen (Agent 2)

Pro Cluster: ~50 Vornamen weiblich + ~50 Vornamen männlich + ~50 Nachnamen. Gesamt ~600 Einträge über 4 Cluster.

**Cluster 1 — Deutsch-österreichisch** (Statistik Austria + Wikipedia "Familiennamen in Österreich"):
- Vornamen weiblich: Maria, Anna, Elisabeth, Johanna, Magdalena, Katharina, Sophie/Sophia, Theresa, Helena, ... (50 total, Mix Top-2024 + klassisch)
- Vornamen männlich: Johann, Josef, Franz, Karl, Friedrich, ... (50)
- Nachnamen: Gruber, Huber, Bauer, Wagner, Müller, Pichler, Steiner, Moser, Mayer, Hofer, ... (50)

**Cluster 2 — Türkisch** (Wikipedia "Turkish name"):
- Diakritika: ç, ş, ğ, ı, ö, ü
- Vornamen weiblich: Fatma, Ayşe, Emine, Hatice, Zeynep, Elif, ... (50)
- Vornamen männlich: Mehmet, Mustafa, Ahmet, Ali, Hüseyin, ... (50)
- Nachnamen: Yılmaz, Kaya, Demir, Şahin, Çelik, Yıldız, Yıldırım, ... (50)

**Cluster 3 — Ex-jugoslawisch** (Wikipedia Serbian/Croatian/Bosnian name):
- Diakritika: č, ć, đ, š, ž
- Vornamen weiblich: Marija, Ana, Ivana, Jelena, Milica, ... (50)
- Vornamen männlich: Marko, Stefan, Petar, Nikola, Aleksandar, ... (50, inkl. bosnisch-muslimische Namen Adnan, Emir, Haris)
- Nachnamen: Jovanović, Petrović, Nikolić, Marković, Đorđević, ... + bosnisch-muslimische -ović Endungen (Hadžić, Hodžić, Demirović, Hasanović) (50)

**Cluster 4 — Osteuropäisch (PL/CZ/SK/HU/RO)**:
- Diakritika: ł, ń, ó, ś, ż, č, š, é, í, ó, ú, ű, ő, ă, î, ș, ț
- Vornamen weiblich: Anna, Katarzyna, Magdalena, ... + Tereza, Kateřina, ... + Mária, Zuzana, ... + Erzsébet, Eszter, Zsuzsanna, ... + Maria, Ioana, Elena, ... (50 total, Mix aller 5 Länder)
- Vornamen männlich: ähnlich gemischt (50)
- Nachnamen: Nowak, Kowalski, ... + Novák, Svoboda, ... + Nagy, Kovács, Tóth, Szabó, Horváth, ... + Popa, Popescu, Ionescu, ... (50 total)

### Wichtige Generator-Logik (aus Agent 2)

1. **Cross-Cluster-Mix**: ~10-15 % Wahrscheinlichkeit für Mischehen (deutscher Vorname + slawischer Nachname für 2./3. Generation)
2. **Slawische Frauennamen-Endungen** (Generator-Logik, NICHT in den .txt-Listen):
   - Polnisch: `-ski → -ska`, `-cki → -cka`
   - Tschechisch/Slowakisch: append `-ová` (Novák → Nováková)
   - Serbisch/Kroatisch: keine Anpassung
3. **Frequenz-Gewichtung**: Listen sind grob nach Häufigkeit absteigend sortiert — Generator kann gewichtet ziehen (Zipf-Verteilung) oder uniform

### Lizenz
- Statistik Austria: Faktendaten / OGD CC-BY 4.0 — frei
- Wikipedia: CC-BY-SA 4.0 — Quellen-URL als Attribution genügt
- Listen sind <30-50 Stück = unwesentliche Datenbank-Auszüge (UrhG §87a)

### Volle Namens-Listen
Volle 600 Namen sind im Agent-2-Output dokumentiert; werden vom Executor in `scripts/synthetic-meldedaten/names/*.txt` Files extrahiert (eine Zeile pro Name).

## C. Codebase-Integration (Agent 3)

<interfaces>

### Bestehender Generator (NICHT ablösen)
- `packages/core/src/pool/generator.ts:50-175`: 6 abstrakte Profile (innenstadt-gross, kleinstadt-bezirkshauptort, etc.) mit gender/age_band/education/migration/district. Wird von Tests + iteration-1-Fixtures genutzt.
- **Empfehlung**: NEUER Generator als eigenständiges Tool unter `scripts/synthetic-meldedaten/`, nicht in core/. Zwei verschiedene Layer:
  - Alt: abstrakte Demografie für Algorithmus-Tests
  - Neu: realistische Namen + Sprengel + Haushalte für UI-Demos

### CSV-Auto-Mapping (apps/web/src/csv/parse.ts:115-130)

Heute erkannte Spalten:
| Output-Feld | Erkannte Header |
|---|---|
| person_id | person_id, id |
| gender | geschlecht, gender |
| age_band | age_band, alter, altersband |
| education | bildung, education |
| migration_background | migration, migration_background |
| district | bezirk, district, **sprengel** |

**Wichtig:**
- "sprengel" wird zu `district` gemapped — kann als Stratifikations-Achse genutzt werden ✓
- "katastralgemeinde" wird **NICHT** erkannt (`__ignore__`). Entweder:
  - (a) DEFAULT_GUESS um `katastralgemeinde: 'district'` erweitern (schnelle Lösung, ABER konfliktiert wenn beide Spalten in CSV sind)
  - (b) Generator-Output bietet beide Spalten — `katastralgemeinde` als zusätzliche freie Spalte (Stage 1 erkennt sie als wählbare Achse, auch wenn nicht in DEFAULT_GUESS)
- **Locked: Variante (b)** — Stage 1 zeigt im AxisPicker alle Header-Spalten als wählbar, Auto-Default greift nur "sprengel"

### Public-Folder
- `apps/web/public/` wird statisch ausgeliefert
- Vite base-path: `/buergerinnenrat/` für GH Pages
- Ziel-Pfade nach Build: `https://flomotlik.github.io/buergerinnenrat/beispiele/...`

### DocsHub-Erweiterung (apps/web/src/docs/DocsHub.tsx:42-130)

**Pattern für neue Tile:**
1. Lazy-import: `const Beispiele = lazy(() => import('./Beispiele'))`
2. TILES-Array erweitern: `{ slug: 'beispiele', title: 'Beispiel-Daten', description: '...', icon: <svg>... </svg> }`
3. TITLES-Map: `beispiele: 'Beispiel-Daten'`
4. renderSubpage-switch: `case 'beispiele': return <Beispiele />`
5. App.tsx DocsRoute Union: `... | 'beispiele'`
6. App.tsx DOCS_ROUTES Set: `'beispiele'`

### Sub-Page-Pattern
- Neue Datei `apps/web/src/docs/Beispiele.tsx`:
  ```tsx
  const Beispiele: Component = () => (
    <DocsLayout slug="beispiele" title="Beispiel-Daten" backTo={() => ...}>
      {/* content with download links */}
    </DocsLayout>
  );
  ```
- Test-IDs: `docs-tile-beispiele`, `docs-page-beispiele`

### Zod
- Heute nur in `packages/engine-contract/package.json:17-18`
- Für Generator-Config-Validation: entweder in scripts/ als devDep neu addieren, oder pure TS-Type-Guards verwenden (Vorschlag: pure TS reicht, kein neuer Dep)

</interfaces>

### Test-Pattern
- Vitest, environment 'node', `tests/**/*.test.ts`
- Bestehender Skript-Test: `apps/web/tests/unit/tech-manifest-generator.test.ts`
- Neuer Generator-Test: `scripts/synthetic-meldedaten/__tests__/generator.test.ts` ODER zentral unter `apps/web/tests/unit/synthetic-generator.test.ts` (Vitest-Config muss den Pfad erfassen)

## D. Architektur-Empfehlung

### Datei-Struktur

```
scripts/synthetic-meldedaten/
  generator.ts                  # CLI entry point
  types.ts                      # Profile, Sprengel, etc. + TS-Type-Guards
  rng.ts                        # re-export Mulberry32 from packages/core
  household-builder.ts          # build a household with N persons
  person-builder.ts             # build a person with cluster + names + age + ...
  cluster-pool.ts               # name-pool loading + slawische Endungs-Logik
  csv-writer.ts                 # CSV output with deutsche Header
  
  names/
    SOURCES.md                  # quellen + lizenz
    at-de-vornamen-weiblich.txt
    at-de-vornamen-maennlich.txt
    at-de-nachnamen.txt
    tr-vornamen-weiblich.txt
    tr-vornamen-maennlich.txt
    tr-nachnamen.txt
    ex-yu-vornamen-weiblich.txt
    ex-yu-vornamen-maennlich.txt
    ex-yu-nachnamen.txt
    osteuropa-vornamen-weiblich.txt
    osteuropa-vornamen-maennlich.txt
    osteuropa-nachnamen.txt
  
  profiles/
    herzogenburg.json
    kleinstadt-3000.json
  
  __tests__/                    # OR apps/web/tests/unit/
    generator.test.ts
    household-builder.test.ts
    cluster-pool.test.ts

apps/web/public/beispiele/
  README.md
  herzogenburg-melderegister-8000.csv
  herzogenburg-versand-300.csv
  herzogenburg-antwortende-60.csv
  kleinstadt-3000.csv

apps/web/src/docs/
  Beispiele.tsx                 # neue Doku-Sub-Seite

apps/web/src/stage1/
  Stage1Panel.tsx               # erweitern: Hint "Beispiel-Datei verwenden"
```

### CSV-Output-Spalten

```
person_id,vorname,nachname,geburtsjahr,geschlecht,staatsbuergerschaft,sprengel,katastralgemeinde,haushaltsnummer
```

- **Stage 1** nutzt `sprengel` als Default-Achse (wird auto-erkannt) und kann optional `katastralgemeinde` + `geburtsjahr-band` (computed) + `geschlecht` als zusätzliche Achsen erlauben
- **Stage 3-Profil** addiert Spalten `bildung, migrationshintergrund` (Selbstauskunft, nur 60 Personen)

### Profile-Schema (TypeScript)

```ts
interface Profile {
  name: string;                              // "herzogenburg" — used in person_id prefix
  totalPopulation: number;                   // 8000
  cityName: string;                          // "Herzogenburg"
  bundesland: string;                        // "Niederösterreich"
  
  katastralgemeinden: KatastralgemeindeDef[];
  sprengel: SprengelDef[];                   // optional — falls nicht: derived from KGs
  
  ageDistribution: AgeBandWeights;           // 0-9 → 0.09, 10-19 → 0.10, ...
  genderDistribution: { weiblich, maennlich, divers };
  
  citizenshipDistribution: {
    austria: number;                          // ~0.875 für Herzogenburg
    eu_other: number;                         // ~0.069
    third_country: number;                    // ~0.056
    eu_countries: string[];                   // ['DE','RO','HU','PL','SK',...] — pool
    third_country_countries: string[];        // ['TR','RS','BA','UA','MK',...]
  };
  
  nameClusterMix: {
    'at-de': number;                          // ~0.85
    'tr': number;                             // ~0.05
    'ex-yu': number;                          // ~0.03
    'osteuropa': number;                      // ~0.03
    'sonstige': number;                       // ~0.04 (uses random EU country, generic names)
  };
  
  householdDistribution: {
    1: number; 2: number; 3: number; 4: number; 5: number; 6: number;
  };
  familiesWithChildren: number;               // ~0.40 of multi-person households
  threeGenerationShare: number;               // ~0.01
  crossClusterMixProbability: number;         // ~0.12
  
  perKgOverrides?: Record<string, KgOverride>; // e.g. "Sprengel-2 has more 25-40 year olds"
}
```

### Generator-Algorithmus

1. Lade Cluster-Namens-Pools aus `names/*.txt`
2. Lade Profile aus JSON
3. Berechne Anzahl Haushalte: `totalPopulation / avgHouseholdSize` ≈ 3700 für Herzogenburg
4. Verteile Haushalte auf KGs proportional zur KG-Bevölkerung
5. Pro Haushalt:
   - Würfle Größe aus householdDistribution
   - Würfle Cluster-Zuordnung (mit ~12% Cross-Cluster bei Mehr-Personen-HH)
   - Würfle Staatsbürgerschaft (korreliert mit Cluster: AT-de fast immer austria, tr mehrheitlich austria + minorty türkisch, etc.)
   - Generiere Personen:
     - Single: zufälliges Alter aus AgeDistribution
     - Paar: 2 Erwachsene, ähnliches Alter ±10
     - Familie+Kinder: 1-2 Erwachsene 25-55 + 1-3 Kinder 0-18, gleicher Cluster + gleicher Nachname
     - Dreigeneration (1%): Familie + 1-2 Großeltern (60+)
   - Geschlecht für jede Person (51/49/0,1)
   - Vorname aus Cluster-Pool (geschlechts-spezifisch)
   - Nachname: für Familien gleicher Nachname (mit slawischer Frauen-Endungs-Logik)
6. Person-IDs: `{profile.name}-{padded-index}` (z.B. `hzbg-00001`)
7. Sortiere nach KG → Sprengel → Haushaltsnummer (lesbar)
8. Schreibe CSV

### Kommando

```bash
# Default Herzogenburg-Profil
tsx scripts/synthetic-meldedaten/generator.ts \
  --profile herzogenburg \
  --output apps/web/public/beispiele/herzogenburg-melderegister-8000.csv

# Custom config
tsx scripts/synthetic-meldedaten/generator.ts \
  --config /pfad/zur/eigenen.json \
  --output /tmp/eigene.csv \
  --seed 4711
```

## E. Implementierungs-Risiken

1. **Volle Namens-Liste-Extraktion aus Agent-2-Output:** Agent 2 hat 600 Namen geliefert; der Executor muss sie aus dem Bericht extrahieren in 12 .txt-Files. Risiko: copy-paste-Fehler. Mitigation: Vitest-Test "jede Liste hat ≥30 Einträge".
2. **Slawische Frauen-Endungen:** komplexe Logik (`-ski → -ska`, `+ -ová`). Test-Fall pro Endung.
3. **Cluster-Konsistenz vs Mischehen:** 12 % Mix gewünscht — Realismus, aber muss klar sein im Test (NICHT 100 % rein).
4. **Citizenship vs Name-Cluster:** Türkische Familien haben oft österreichische Staatsbürgerschaft (3.+ Generation). Muss korrelativ richtig modelliert werden — NICHT deterministisch "tr-Cluster = türkische Staatsbürgerschaft".
5. **AgeDistribution für Kinder vs Erwachsene** in Familien: spezielle Logik damit Eltern plausibel zu Kindern sind.
6. **CSV-UTF-8 mit Sonderzeichen:** alle Cluster nutzen Diakritika. Stage-1-CSV-Parser verarbeitet UTF-8 BOM-aware (verifiziert in Agent-3-Output).
7. **Bundle-Delta:** CSVs landen in `public/`, kein JS-Bundle-Impact. Doku-Sub-Seite + Download-Buttons: ~3 KB gzip.
8. **Tests-Realismus:** Statistische Plausibilität-Tests müssen Toleranzen haben (z.B. ±2% für Cluster-Anteile bei N=8000).

## F. Sources Index

- HIGH: alle Demografie-Zahlen Statistik Austria
- HIGH: Namens-Listen Wikipedia + Statistik Austria
- HIGH: Codebase-Pfade aus Agent 3 (verified)
- MEDIUM: Herzogenburg KG-Bevölkerungsverteilung (geschätzt, kein primär verifizierter Datensatz)
- MEDIUM: Generator-Profile-Schema (eigener Vorschlag, würde im Plan finalisiert)
