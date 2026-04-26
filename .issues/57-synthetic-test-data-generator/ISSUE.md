---
id: 57
slug: synthetic-test-data-generator
title: Synthetischer Testdaten-Generator nach Vorbild Herzogenburg (Niederösterreich)
track: Z
estimate_pt: 4
status: planned
depends_on: [45, 52, 53, 54, 55, 56]
priority: high
priority_rationale: "Ohne realistisch wirkende Beispiel-Daten kann eine Verwaltung den Workflow nicht ausprobieren — Tool wirkt sonst wie eine leere Hülle"
---

# Synthetischer Testdaten-Generator (Herzogenburg-Vorbild)

## Kontext

Das Tool ist live (`https://flomotlik.github.io/buergerinnenrat/`), aber wer es ausprobieren will braucht **eigene Eingangs-CSV** mit realistischer Struktur. Die heutige `packages/core/src/pool/generator.ts` produziert sehr abstrakte Daten (`person_id: kleinstadt-bezirkshauptort-0001`, `gender, age_band, education, migration_background, district` als Enum-Werte). Kein Vor- und Nachname, keine Haushalte, keine echten Bezirksnamen, keine Staatsbürgerschaft.

User-Anforderung: **Beispiel-Dateien zum Download von der Website**, die den ganzen Prozess durchspielbar machen, mit realistisch wirkenden Daten — Vor-/Nachnamen, Haushaltsstruktur, Mehr-Generationen, EU-Bürger:innen, kulturell unterschiedliche Namen (türkisch, Balkan), echten Sprengeln.

Vorbild: **Herzogenburg in Niederösterreich** (~8.400 Einwohner, mehrere Katastralgemeinden). Größe + Struktur einer typischen kleineren Gemeinde — perfekter Skala-Realismus für das Tool.

## Ziel

Drei Liefergegenstände:

1. **Generator-Skript** (`scripts/synthetic-meldedaten/`): Config-getriebene Erzeugung von realistisch-aussehenden Melderegister-CSV. Konfigurierbar pro Lauf (Größe, Sprengel-Layout, Demographie-Mix pro Sprengel, Haushalts-Verteilung, Staatsbürgerschafts-Mix, Namens-Pool-Mix).
2. **Eingebaute Konfigurationen** (Profile): `herzogenburg-niederoesterreich-8000`, `kleinstadt-3000`, `mittelstadt-15000`, `wiener-bezirk-25000`. User kann eigene Configs schreiben.
3. **Vor-generierte Beispiel-Dateien** im `apps/web/public/beispiele/` Ordner, herunterladbar von einer neuen Doku-Sub-Seite `/docs/beispiele` mit Erklärung was die Daten enthalten + warum sie synthetisch sind.

Alle drei integriert: Generator → Beispiel-Dateien → Website-Download.

## Acceptance Criteria

### Generator-Architektur

- [ ] `scripts/synthetic-meldedaten/generator.ts`: Hauptscript mit CLI: `tsx scripts/synthetic-meldedaten/generator.ts --config <path> --output <csv> [--seed N]`
- [ ] `scripts/synthetic-meldedaten/types.ts`: Config-Schema (TypeScript-Interfaces + Zod-Validation), `Profile`, `Sprengel`, `HouseholdRules`, `NamePool`, `CitizenshipDistribution`, `AgePyramid`
- [ ] Deterministisch über Seed (Mulberry32 wie Stage 1)
- [ ] Pure TypeScript, läuft in Node, KEIN Browser-Import (Generator läuft nur build-time / dev-time)
- [ ] Output: CSV mit Spalten `person_id, vorname, nachname, geburtsjahr, geschlecht, staatsbuergerschaft, sprengel, katastralgemeinde, haushaltsnummer` (BMG-§46-äquivalent für Österreich nach **MeldeG** — siehe Research)

### Demographische Realismen (alles aus Config steuerbar)

- [ ] **Haushalte**: Mehrere Personen pro `haushaltsnummer`. Verteilung der Haushaltsgrößen (1-Personen ~38 %, 2-Personen ~33 %, 3-Personen ~13 %, 4-Personen ~10 %, 5+-Personen ~6 % nach Statistik Austria-Verhältnissen für Niederösterreich)
- [ ] **Kinder + Eltern in einem Haushalt**: Wenn ein Haushalt Kinder hat, sind ein oder zwei Erwachsene plausibler Alters dabei (Mutter 25-50, Vater 25-55). Kinder bekommen einen Nachnamen aus dem Eltern-Haushalt
- [ ] **Mehr-Generationen**: kleiner Anteil Drei-Generationen-Haushalte (Großeltern bei Familie)
- [ ] **EU-Bürger:innen**: konfigurierbarer Anteil (z.B. 6 % EU-ohne-Österreich für Niederösterreich), zufällig aus EU-Mitgliedstaaten gewählt
- [ ] **Drittstaaten**: kleiner Anteil (z.B. 3-4 %), inkl. Türkei, Bosnien, Serbien, Nordmazedonien
- [ ] **Kulturelle Namens-Mischung**: Vor-/Nachnamen-Pools pro Herkunfts-Cluster (deutsch-österreichisch, türkisch, ex-jugoslawisch, polnisch, ungarisch, rumänisch). Person bekommt Vor-/Nachname konsistent zu ihrer Herkunfts-Zuordnung (nicht "Mehmet Müller", außer bei Heirat)
- [ ] **Heirats-/Mischehen**: kleiner Anteil Haushalte wo Eltern aus unterschiedlichen Namens-Pools kommen (Realismus: viele Namens-Mischungen in zweiter/dritter Generation)
- [ ] **Generationen-Lag bei Migrant:innen**: Personen unter 30 mit Migrant:innen-Hintergrund haben statistisch öfter österreichische Vornamen (Integration über Generationen) — optional via Config
- [ ] **Geburtsjahr-Pyramide**: Realistische Altersstruktur statt uniform — Verschiebung Richtung 40-65, weniger Junge (NÖ-Demografie)
- [ ] **Geschlecht**: ~51 % weiblich, ~49 % männlich, kleiner Anteil "divers" (z.B. 0.1 %, im Melderegister seit 2018 möglich)

### Sprengel/Katastralgemeinden-Layout

- [ ] Config kann Sprengel und/oder Katastralgemeinden definieren mit Anteil an Gesamt-Population
- [ ] Pro Sprengel/KG kann eine **leichte Abweichung** vom Durchschnitt definiert werden (z.B. "Sprengel-2 hat überdurchschnittlich viele 25-40-jährige weil dort die neuen Mietwohnungen sind", "Sprengel-7 hat überdurchschnittlich viele EU-Bürger:innen weil Industriegebiet")
- [ ] Generator respektiert diese Verschiebungen ohne sie zu erzwingen (statistisch, nicht deterministisch)

### Herzogenburg-Profil

- [ ] `scripts/synthetic-meldedaten/profiles/herzogenburg.json`: Real-strukturiertes Profil mit Herzogenburg-Katastralgemeinden (Herzogenburg-Stadt, St. Andrä, Ossarn, Wielandsthal, Oberwinden, Unterwinden, Gerersdorf, Schweinern, Inzersdorf — vollständige Liste aus Research), realistischer Bevölkerungsverteilung pro KG
- [ ] Population-Größe: 8.000 Personen (User-Vorgabe, nahe der echten ~8.400)
- [ ] Demografie nach Statistik-Austria-Werten für Niederösterreich (Altersverteilung, Geschlechter-Anteil, Citizenship-Mix)
- [ ] Namens-Pool-Mix: ~85 % deutsch-österreichisch, ~5 % türkisch, ~3 % ex-jugoslawisch, ~3 % osteuropäisch (Polen, Tschechien, Ungarn), ~4 % sonstige (entspricht NÖ-Migrationsstatistik)

### Namens-Listen

- [ ] `scripts/synthetic-meldedaten/names/` mit Subdateien pro Cluster:
  - `at-de-vornamen-weiblich.txt`, `at-de-vornamen-maennlich.txt`, `at-de-nachnamen.txt`
  - `tr-vornamen-weiblich.txt`, `tr-vornamen-maennlich.txt`, `tr-nachnamen.txt`
  - `ex-yu-vornamen-weiblich.txt`, `ex-yu-vornamen-maennlich.txt`, `ex-yu-nachnamen.txt`
  - `osteuropa-vornamen-weiblich.txt`, `osteuropa-vornamen-maennlich.txt`, `osteuropa-nachnamen.txt`
- [ ] Quellen: Statistik Austria veröffentlichte Vornamen-Statistiken, häufige Nachnamen-Listen aus Wikipedia/Wiktionary/türkischen/serbo-kroatischen Listen
- [ ] Mindestens 50 Vornamen pro Geschlecht pro Cluster, mindestens 100 Nachnamen pro Cluster
- [ ] Lizenz-Klärung: Listen sind Faktendaten (nicht urheberrechtlich geschützt); Quellen werden in `scripts/synthetic-meldedaten/names/SOURCES.md` dokumentiert

### Pre-generierte Beispiel-Dateien

- [ ] `apps/web/public/beispiele/herzogenburg-melderegister-8000.csv` (für Stage 1 — Versand-Auswahl)
- [ ] `apps/web/public/beispiele/herzogenburg-versand-300.csv` (Output von Stage 1, vorab für Demo)
- [ ] `apps/web/public/beispiele/herzogenburg-antwortende-60.csv` (für Stage 3 — synthetische Antwortenden mit Selbstauskunft-Feldern: Bildung, Migrationshintergrund — diese sind NICHT im Melderegister, hier nur als Stage-3-Demo)
- [ ] `apps/web/public/beispiele/kleinstadt-3000.csv` (kleineres Setup zum schnellen Testen)
- [ ] Alle CSVs UTF-8, deutsch-formatierte Header, Werte konsistent zur in-app-Verarbeitung
- [ ] Eine `apps/web/public/beispiele/README.md` die jede Datei erklärt (was steckt drin, wo verwendbar, warum synthetisch)

### Website-Integration

- [ ] Neue Doku-Sub-Seite `/docs/beispiele` (Solid-Komponente `apps/web/src/docs/Beispiele.tsx`)
- [ ] Hub-Tile in DocsHub.tsx für "Beispiel-Daten"
- [ ] Inhalt: Erklärung "Diese Daten sind synthetisch — keine echten Personen", Liste der Dateien mit Größe + Beschreibung + Download-Button (Direkt-Link auf `/buergerinnenrat/beispiele/...`)
- [ ] Download-Buttons mit `<a href="..." download>` (kein JS nötig)
- [ ] Stage 1-Panel: kleiner Hint "Keine eigenen Daten? Beispiel-Datei verwenden →" mit Link zu `/docs/beispiele`

### Tests

- [ ] Vitest für Generator: Determinismus mit Seed, Haushaltsstruktur (jede haushaltsnummer hat 1-N konsistente Personen), Citizenship-Verteilung in der Größenordnung der Config, Namens-Konsistenz pro Cluster (Vor/Nachname kommen aus dem zugewiesenen Cluster — modulo Mischungen)
- [ ] Smoke-Test: generate Herzogenburg-Profil, prüfe dass das CSV im Stage-1-Sampler problemlos verarbeitbar ist (axes auto-detected = sprengel + geburtsjahr-band + geschlecht ODER katastralgemeinde + ...)
- [ ] Playwright-Smoke: Stage 1 mit Beispiel-Datei (8000 Zeilen) lädt + zieht 300 + Download funktioniert
- [ ] Bestehende Tests (#45/#52/#53/#54/#56) bleiben grün
- [ ] Bundle-Delta unter +50 KB raw / +20 KB gzip — Beispiel-CSV-Dateien sind im public-Ordner, gehen nicht ins JS-Bundle

## Out of Scope

- Echte Melderegister-Anbindung — generieren nur synthetische Daten
- Visualisierung der Demographie-Verteilung im Generator-Output (das ist der Stage-1-Vorschau-Job)
- Mehr als 25.000 Personen pro Datei (Bürgerrat-Realität ist deutlich kleiner)
- Sonderzeichen-Verifikation für alle möglichen Schreibweisen (UTF-8 Standard reicht)
- Echte Adressdaten oder Geokoordinaten — nur abstrakte Sprengel/Katastralgemeinden
- Generator als Browser-Feature (das wäre eigener großer Issue, hier ist es Build-/CLI-Tool)

## Verweise

- Herzogenburg Wikipedia: <https://de.wikipedia.org/wiki/Herzogenburg>
- Statistik Austria: Vornamen <https://www.statistik.at/statistiken/bevoelkerung-und-soziales/bevoelkerung/vornamen>
- Statistik Austria: Bevölkerung nach Staatsangehörigkeit <https://www.statistik.at/statistiken/bevoelkerung-und-soziales/bevoelkerung/bevoelkerungsstand/bevoelkerung-nach-staatsangehoerigkeit-und-geburtsland>
- Statistik Austria: Privathaushalte <https://www.statistik.at/statistiken/bevoelkerung-und-soziales/bevoelkerung/familien-und-haushalte>
- Niederösterreich Demografie: <https://noe.gv.at/noe/Zahlen-Fakten-Statistik/>
- Österreichisches Meldegesetz (MeldeG): <https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10005799>
- Bestehender abstrakter Generator (zum Ablösen für Realismus, behalten für Test-Fixtures): `packages/core/src/pool/generator.ts`
