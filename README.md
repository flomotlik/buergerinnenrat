# Bürgerinnenrat — Sortition Tool

[![Deploy](https://github.com/flomotlik/buergerinnenrat/actions/workflows/deploy.yml/badge.svg)](https://github.com/flomotlik/buergerinnenrat/actions/workflows/deploy.yml)

Browser-natives Werkzeug für die stratifizierte Zufallsauswahl von Personen für Bürger:innenräte (Deutschland und Österreich). Alle Daten bleiben im Browser, kein Server-Backend.

**Live:** <https://flomotlik.github.io/buergerinnenrat/>

## Lokale Entwicklung mit Docker

Voraussetzung: Docker installiert (Linux, macOS, Windows-WSL).

```bash
make build-image     # Image bauen (~1.8 GB, dauert beim ersten Mal ~5 min)
make install         # pnpm install im Container
make dev             # → http://localhost:5173 (Vite mit HMR)
```

Vollständige Liste aller Targets: `make help`.

Power-User mit lokal installiertem Node 20 + pnpm + Playwright können
`NO_DOCKER=1` setzen, dann läuft alles direkt ohne Container:
`make NO_DOCKER=1 dev`.

## Beispiel-Daten ausprobieren

Du willst das Tool ohne eigene Melderegister-Datei testen? Auf der Live-Seite
findest du unter
[Doku → Beispiel-Daten](https://flomotlik.github.io/buergerinnenrat/#/docs/beispiele)
vier vor-generierte synthetische CSV-Dateien:

- `herzogenburg-melderegister-8000.csv` — Vollbevölkerung einer kleineren NÖ-Gemeinde
  nach Vorbild Herzogenburg (für Stage 1)
- `herzogenburg-versand-300.csv` — stratifizierte Versand-Stichprobe von 300 Personen
- `herzogenburg-antwortende-60.csv` — 60 Personen mit Selbstauskunfts-Feldern (für Stage 3)
- `kleinstadt-3000.csv` — kleineres Profil zum schnellen Testen

Alle Daten sind synthetisch erzeugt — keine echten Personen.
Generator + Reproduzier-Anleitung: `scripts/synthetic-meldedaten/`.

## Bürgerrat-Sortition (Hintergrund)

Planungs- und Research-Repository für eine **browser-native, backend-lose Sortition-Web-App** zur stratifizierten Zufallsauswahl von Teilnehmenden für Bürgerräte.

**Aktueller Status:** Planung. Masterplan v1 wurde extern reviewed (2× FAIL, 1× WARN) — Überarbeitung läuft.

## Einstieg

| Wenn du | Lies |
| --- | --- |
| neu in das Projekt kommst | `CLAUDE.md` → `sortition-tool/06-review-consolidation.md` |
| den Bürgerrat-Kontext verstehen willst | `research/00-synthesis.md` |
| wissen willst, was das Tool tun soll | `sortition-tool/00-masterplan.md` (v1, mit bekannten Mängeln) |
| die kritischen offenen Fragen kennen willst | `sortition-tool/06-review-consolidation.md` (Teil C, P0-Items) |
| die rechtliche Grundlage brauchst | `research/03-legal-framework-and-best-practices.md` |
| die externen Reviews im Detail willst | `reviews/` |

## Struktur

- `research/` — Vorfeld-Research zum Bürgerrat-Kontext, adhocracy+ als möglicher Begleit-Stack, Rechtsrahmen (§ 46 BMG, DSGVO), OECD-Methodik, bestehende Algorithmen (Sortition Foundation, panelot.org, "Es geht LOS").
- `sortition-tool/` — Produktplanung für die browser-native Sortition-App: WASM-Solver-Analyse, Pyodide-Machbarkeit, Port-Optionen, Frontend-Architektur, Lizenz-/Geschäftsmodell, Masterplan und Review-Konsolidierung.
- `reviews/` — Externe LLM-Reviews (Claude, Codex, Gemini) des Masterplans als Rohartefakte.

## Kern-Erkenntnisse

- **"Es geht LOS" nutzt nicht adhocracy+**, sondern eine eigene AWS-App (MaibornWolff 2022). Siehe `research/02-es-geht-los-analysis.md`.
- **adhocracy+ hat kein Losverfahren**, deckt nur die Deliberation ab. Für das Los-/Einladungsverfahren muss ein separates Tool her.
- **Der Nature-2021-Algorithmus (Leximin) ist MIP-pflichtig**, nicht LP-only. Im Browser heißt das: HiGHS via `highs-js` oder Pyodide-basierte Lösung.
- **`sortition-algorithms` liefert Leximin nur mit Gurobi** (upstream-verifiziert) — die Phase-0-Hypothese des Masterplans v1, Pyodide plus diese Library liefere "die volle Nature-Algorithmenfamilie browsertauglich", ist damit falsch.
- **Lizenz-Pfad nicht geklärt**: Pyodide + GPL-Library im Browser ist vermutlich combined work nach GPL + § 69c UrhG. MVP-Pfad realistisch GPL-3.0, Apache-2.0 erst nach vollständigem Clean-Room-TS-Port.

## Nächste Schritte

1. Upstream-Verifikation `sortition-algorithms` (Code-Lesen, 1 Tag)
2. DE-IT-Rechtsgutachten zu § 69c UrhG + GPL-Kombination anfragen
3. Masterplan v2 schreiben (`sortition-tool/00-masterplan-v2.md`)
4. Native Referenz-Benchmark (`pgoelz/citizensassemblies-replication`)
5. Marktvalidierung: Pilot-Kommune identifizieren

## Stage 1 — Versand-Liste ziehen

Seit Iteration 2 (Issue #45) enthält die Web-App einen neuen Bereich "Versand-Liste
ziehen" für den ersten Schritt eines realen Bürger:innenrats-Verfahrens: aus der
Melderegister-Eingabe wird eine **proportionale stratifizierte Zufallsstichprobe**
gezogen, die anschließend angeschrieben werden kann. Stage 3 (Maximin-Auswahl auf
dem Antwortenden-Pool) bleibt unverändert nutzbar — beide Wege erreichbar über
die Hauptnavigation.

**Ablauf:**

1. Melderegister-CSV hochladen (UTF-8, Win-1252 oder ISO-8859-1, automatisch erkannt)
2. Stratifikations-Achsen wählen (Defaults `district`, `age_band`, `gender` werden
   automatisch vorgeschlagen, wenn die Spalten existieren)
3. Stichprobengröße N und Seed eingeben (Default-Seed = aktuelle Unix-Sekunde,
   uint32-sicher für Mulberry32)
4. "Ziehen" klicken — sub-Sekunde für Eingaben bis 100.000 Zeilen
5. CSV der gezogenen Personen herunterladen (alle Original-Spalten erhalten,
   RFC-4180-konformes Quoting) sowie signierten Audit-Snapshot

**Algorithmus:** Largest-Remainder-Methode (Hamilton-Methode,
[Wikipedia](https://en.wikipedia.org/wiki/Largest_remainders_method)) für die
Bruchteil-Rundung pro Stratum (sum aller `n_h` = N exakt), Fisher-Yates-Shuffle
innerhalb jedes Stratums mit Mulberry32-PRNG. Vollständig deterministisch über Seed.

**Hinweis (BMG § 46):** Stratifikation kann nur über Felder erfolgen, die im
Melderegister enthalten sind. Bildung, Migrationshintergrund, Beruf sind nicht im
Melderegister — diese kommen erst nach Selbstauskunft hinzu. Quelle:
[§ 46 BMG](https://www.gesetze-im-internet.de/bmg/__46.html).

**Output:**

- CSV der gezogenen Personen, alle Original-Spalten erhalten
- Audit-JSON mit Seed, SHA-256 der Eingangs-CSV, Stratifikations-Achsen, Stratum-Tabelle
  (Soll vs. Ist), Zeitstempel, Ed25519-Signatur (mit ECDSA-P256-SHA256-Fallback)

Architektur-Hintergrund und Workflow-Begründung: `sortition-tool/08-product-redesign.md`.

## Sprache

Dokumentation auf Deutsch (User + Primärquellen deutsch). Code — wenn er irgendwann geschrieben wird — auf Englisch.

## Lizenz

GPL-3.0-or-later. Volltext in [LICENSE](LICENSE).

Diese Wahl spiegelt die Realität, dass Browser-Bundles mit GPL-Komponenten (`highs-js` ist
zwar MIT, aber spätere Pyodide-Integration könnte GPL-Code mitbringen) kombiniert sehr
wahrscheinlich GPL-Pflicht erzeugen — siehe Strategie-Entscheidung **S-1** in `CLAUDE.md`.
