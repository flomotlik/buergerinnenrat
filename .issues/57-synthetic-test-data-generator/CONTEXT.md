# Context — locked decisions for Issue #57

> Aus User-Brief 2026-04-26: "erstelle beispiel dateien die auch von der website runtergeladen werden koennen ... aehnlich zu den Katastralgemeinden Herzogenburgs, 8000 Personen, ... script dass mit input verschiedene Testdaten erstellen kann ... mehrere Personen pro Haushalt mit Kindern ... EU Bürger ... Beziehungen zwischen Personen ... kulturell unterschiedliche Namen ... e.g. türkischen oder balkan hintergrund ... unterschiedliche Sprengel oder Bereiche der Stadt unterschiedlich nach bestimmten Gruppen aufsetzen ... config file ... realistisch klingenden Namen."

## Verbindliche Design-Entscheidungen

### Anwendungs-Kontext: Österreich, NICHT Deutschland

- Der bisherige Code spricht von **BMG §46** (deutsches Bundesmeldegesetz). Herzogenburg ist in **Niederösterreich** — österreichisches Recht: **MeldeG (Meldegesetz)**.
- Beide Gesetze haben ähnliche Felder, aber NICHT identisch. Generator generiert **österreichische** Felder (`staatsbuergerschaft` statt `staatsangehoerigkeit`, `sprengel` statt deutscher Wahlbezirk-Begriff).
- Doku im Tool muss perspektivisch beide Kontexte unterscheiden — für #57 reicht es österreichisch zu generieren und im Header der CSV "Niederösterreich-Vorbild" zu vermerken.
- AT-spezifische Felder im Output: `vorname, nachname, geburtsjahr, geschlecht, staatsbuergerschaft, sprengel, katastralgemeinde, haushaltsnummer`. Keine **Anschrift** (Tool braucht sie nicht für Stage 1, würde nur PII-Risiko erhöhen wenn jemand die Beispiel-Datei für reale Daten verwechselt).

### Architektur: CLI-Tool, NICHT Browser-Feature

- Generator läuft als TypeScript-CLI (`tsx scripts/synthetic-meldedaten/generator.ts`)
- Pre-generierte Beispiel-Dateien werden ins `apps/web/public/beispiele/` Verzeichnis comittted (statisch, hosted via GH Pages)
- Website-Doku-Seite verlinkt zu diesen Dateien — kein Browser-side-Generation in Iteration 1
- Begründung: Generator ist Pflege-Aufgabe (selten), Browser würde Bundle-Größe und Komplexität explodieren lassen, statisch+commit ist transparent

### Namens-Listen: kuratiert + bezogen, NICHT scrape

- Wir holen Namens-Listen aus öffentlichen Quellen mit nachvollziehbarer Herkunft:
  - Statistik Austria: jährliche Vornamen-Listen (mindestens Top-50 pro Geschlecht, mehrere Jahre)
  - Wikipedia: Listen häufiger Nachnamen pro Sprachraum (deutsch-österreichisch, türkisch, serbo-kroatisch)
  - SPDX/CC-Lizenz-clean: alle Quellen sind Faktendaten oder CC-BY-SA — Lizenz-Clear
- Quellen werden in `scripts/synthetic-meldedaten/names/SOURCES.md` mit URL + Abrufdatum dokumentiert
- KEINE Lizenz-Header in den .txt-Dateien (Faktendaten)

### Cluster-Mix für Herzogenburg-Profil

User wollte die "Zusammensetzung von Städten wie Herzogenburg" recherchiert. Stand der Recherche (in RESEARCH.md vertieft):

**Statistik Austria + Niederösterreich-Demografie:**
- Niederösterreich: ~12-14 % Personen mit Migrations-Hintergrund (Mutter und Vater im Ausland geboren)
- Davon Hauptgruppen: ex-jugoslawisch, deutsch-rumänisch (Banater Schwaben + neue Migration), türkisch, polnisch, ungarisch
- Herzogenburg konkret: vermutlich ~10 % MH (kleinere Gemeinden NÖ liegen unter dem Landesschnitt)
- EU-Bürger:innen ohne Österreich: ~6-7 % der Bevölkerung NÖ
- Drittstaaten-Bürger:innen: ~4 % NÖ

**Cluster-Verteilung im Herzogenburg-Profil (locked):**
- ~85 % deutsch-österreichischer Namens-Cluster (inkl. AT-Staatsbürger:innen mit alten Migrations-Wurzeln, Namen sind eingedeutscht)
- ~5 % türkischer Cluster
- ~3 % ex-jugoslawischer Cluster (Bosnien, Serbien, Kroatien, Nordmazedonien)
- ~3 % osteuropäischer Cluster (Polen, Tschechien, Ungarn, Slowakei, Rumänien — neue EU-Mobilität)
- ~4 % "andere" (genauer Mix bleibt offen, Generator gibt zufälligen EU-Mitgliedstaat oder anderes Drittland)

Diese Verteilung ist **statistisch motiviert, nicht Herzogenburg-Daten-belegt** — das wird in den CSV-Header-Kommentaren so dokumentiert ("Cluster-Mix nach NÖ-Statistik-Schätzung, nicht reale Herzogenburg-Werte").

### Sprengel-Layout

- Herzogenburg hat laut Wikipedia **9 Katastralgemeinden**: Herzogenburg, St. Andrä an der Traisen, Ossarn, Wielandsthal, Oberwinden, Unterwinden, Gerersdorf, Schweinern, Inzersdorf-Getzersdorf
- Die Ortskern-KG "Herzogenburg" hat den Großteil der Bevölkerung (~5.000 von 8.400)
- Die kleinen KGs haben jeweils 100-700 Einwohner
- **Locked:** Generator-Profil definiert eine plausible Verteilung — exakte echte Zahlen nicht recherchierbar ohne Statistik-Austria-Detaildaten, daher schätzbasiert + dokumentiert
- Sprengel (Wahlsprengel) sind feiner als KG — wir nutzen primär KG, optional Sprengel-Untergruppen pro KG

### Haushalts-Modell

- Statistik Austria: durchschnittliche Haushaltsgröße ~2,2; Single-Haushalte ~38 %
- Locked: Generator zieht zuerst die Haushaltsgrößen-Verteilung, dann pro Haushalt Personen mit konsistenten Attributen:
  - **Einzelhaushalt**: 1 Person, beliebiges Alter
  - **Paar ohne Kinder**: 2 Erwachsene, oft ähnliches Alter (±10 J), gleicher oder gemischter Cluster
  - **Familie mit Kindern**: 1-2 Erwachsene 25-55 + 1-3 Kinder 0-18 (Kind-Vornamen jünger, Kind-Cluster meist == Eltern-Cluster, Nachname == Eltern-Nachname mit kleiner Wahrscheinlichkeit Doppel-Name)
  - **Mehrgeneration**: Familie + 1-2 Großeltern (kleinerer Anteil ~3 %)
  - **WG-artige Haushalte** (Erwachsene ohne Familie >2): kleiner Anteil ~2 %, Personen können unterschiedliche Cluster haben
- Beziehungen werden NICHT explizit als Spalte modelliert (das wäre out-of-scope), sondern implizit über `haushaltsnummer` + Alters-Verteilung

### Geschlechter-Anteil

- Locked: ~51 % weiblich, ~49 % männlich, ~0,1 % divers
- Im Output-Feld `geschlecht`: `weiblich`, `maennlich`, `divers` (deutsche Strings, nicht m/f/d Codes)

### Seed + Determinismus

- Locked: gleicher Mulberry32 wie Stage-1-Stratify
- Default-Seed: 4711 (klassisch und gut wiedererkennbar in Audit-Logs)
- CLI-Flag `--seed` überschreibt Default

### Output-Format

- CSV mit UTF-8, BOM optional via Flag (`--bom` für Excel-Kompatibilität)
- Spalten in fester Reihenfolge: `person_id, vorname, nachname, geburtsjahr, geschlecht, staatsbuergerschaft, sprengel, katastralgemeinde, haushaltsnummer`
- `person_id`: nicht vom Cluster abhängig, einfache laufende Nummer mit Profil-Prefix (`hzbg-00001` ... `hzbg-08000`)
- Optional `extra_fields` per Config: für die Antwortenden-Datei (Stage 3) gibt's ein zusätzliches Profil das `bildung` und `migrationshintergrund` als Spalten hinzufügt — das simuliert Selbstauskunft

### Zwei Stage-Profile

- **Stage 1-Profil** (Melderegister): nur MeldeG-Felder, keine Bildung/Migration
- **Stage 3-Profil** (Antwortende mit Selbstauskunft): plus `bildung` (4 Stufen), `migrationshintergrund` (`keiner | erste-generation | zweite-generation`), aber kleinere Population (z.B. 60 Personen, simuliert die Antwortenden auf eine 300er-Versand-Welle)
- Stage-3-Profil wird aus Stage-1-Output abgeleitet: 60 zufällige Personen aus den 8000 + Selbstauskunfts-Felder dazu-würfeln (mit Realismus: Bildung korreliert leicht mit Alter, Migrationshintergrund leicht mit Cluster)

## Was NICHT in den Scope gehört

- Adressen / Hausnummern / Geokoordinaten
- Heiratsstatus / Familienstand als Spalte (nur impliziert über Haushalt)
- Religion (in AT zwar erfassbar, aber kein BR-Auswahl-Kriterium und sensitiv)
- Beruf
- Browser-Generator
- Mehrere Sprachversionen der Beispiel-Datei (DE only)

## Test-Strategie

- Vitest für Generator-Determinismus + statistische Plausibilität (Anteile innerhalb ±2 % der Config-Vorgaben bei N=8000)
- Smoke-Test: generieren → ins Stage-1-Tool laden → ziehen → keine Crashes
- Playwright-Smoke gegen die deployed Beispiel-Datei nach Push (live-smoke-Spec ergänzen)

## Bundle-Budget

- Beispiel-CSVs landen in `public/`, NICHT im JS-Bundle — kein direkter Bundle-Impact
- Die neue Doku-Sub-Seite `/docs/beispiele` ist Lazy-loaded wie andere Doku-Seiten (#54-Pattern), Impact ~2-3 KB gzip

## Branch-Strategie

- Branch: `test-data-generator` (frisch von main)
- Bei Fertigstellung: PR → main → triggert Deploy-Workflow → Beispiel-Dateien landen automatisch unter `https://flomotlik.github.io/buergerinnenrat/beispiele/`

## Quellen die im Research-Schritt vertieft werden müssen

- Herzogenburg Katastralgemeinden + Bevölkerungs-Verteilung (Wikipedia + Statistik Austria-Atlas)
- Häufige Vornamen Statistik Austria letzten 5-10 Jahre (mehrere Geburtsjahrgänge)
- Häufige Nachnamen Niederösterreich (Wikipedia/Wiktionary)
- Türkische häufige Vor- und Nachnamen (Wikipedia "Liste der häufigsten ...")
- Serbokroatische / bosnische / mazedonische Namen
- Polnische / ungarische / tschechische / slowakische / rumänische Namen
- NÖ-Demografie nach Staatsbürgerschaft (Statistik Austria)
- Haushaltsgrößen-Verteilung NÖ (Statistik Austria)
