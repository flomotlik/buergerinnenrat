# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt in einem Satz

Machbarkeitsstudie + Produktplanung für eine **browser-native, backend-lose Sortition-Web-App** zur stratifizierten Zufallsauswahl von Teilnehmenden für Bürgerräte (Deutschland/Österreich). Aktuell sind nur Planungsdokumente hier — noch kein Code.

## Aktueller Stand (2026-04-24)

- Der ursprüngliche Recherche-Bogen zu "Bürgerrat auf adhocracy+" hat ergeben: adhocracy+ deckt nur die Deliberation, das Los-/Einladungsverfahren fehlt. Siehe `research/`.
- Das daraus abgeleitete Produktkonzept "browser-native Sortition-App" wurde in fünf Fachreports + einem Masterplan ausgearbeitet (`sortition-tool/00-masterplan.md`).
- Der Masterplan **v1** wurde von drei externen LLMs (Claude Opus 4.7, OpenAI Codex gpt-5.4, Google Gemini 3 Pro Preview) reviewed. Ergebnis: **2× FAIL, 1× WARN** — nicht freigabefähig. Die Reviews liegen in `reviews/`.
- Die Konsolidierung der Reviews mit priorisiertem Änderungs-Backlog (P0/P1/P2, 16 Items) liegt in `sortition-tool/06-review-consolidation.md`. Das ist das aktuellste Dokument und der Einstiegspunkt.

## Wenn du hier einsteigst — lies in dieser Reihenfolge

1. `sortition-tool/06-review-consolidation.md` — was stimmt nicht am aktuellen Plan, welche Änderungen stehen an
2. `sortition-tool/00-masterplan.md` — v1 des Plans (mit bekannten Mängeln, siehe Review-Konsolidierung)
3. `research/00-synthesis.md` — Bürgerrat-Kontext und Gesamteinordnung
4. Die Fachreports je nach Bedarf (jeder mit TL;DR)

## Kritische Erkenntnisse, die du im Kopf haben musst

- **Die Phase-0-Hypothese des Masterplans ist widerlegt.** `sortitionfoundation/sortition-algorithms` implementiert Leximin nur mit Gurobi (siehe `committee_generation/leximin.py` upstream). Im Browser ist ohne eigenen Solver-Umbau nur Maximin möglich.
- **Die Lizenz-Aussage "Apache-2.0 ist klar" ist es nicht.** Pyodide + GPL-Library in einem ausgelieferten Browser-Bundle ist sehr wahrscheinlich combined work nach GPL §5/§6 und UrhG §69c. Der Phase-1-MVP müsste realistisch GPL-3.0 sein, Apache-2.0 erst ab vollständigem Clean-Room-TS-Port.
- **Report 04 (Frontend-Architektur) ist als tragende Grundlage verworfen** — drei unabhängige Sachfehler (glpk.js-Lizenz, CSP vs. fetch, Pyodide-Bundle-Größe). Ersetzen, nicht patchen.
- **Die Go/No-Go-Laufzeitschwellen sind gesetzt, nicht hergeleitet.** Native Gurobi-Referenz (`sf_e`) liegt bei 67 min für vergleichbare Pools — Browser-HiGHS-Ampeln <3 min sind unrealistisch.

## Solver-Entscheidung (Stand v1, nicht revidiert)

- **HiGHS via `highs-js`** — MIT, MIP-fähig, aktiv gepflegt, einziger produktionstauglicher WASM-Kandidat.
- `glpk.js` rausfallen lassen — GPL-3.0-Copyleft, blockiert freie Lizenzwahl.
- `python-mip` / CBC — keine WASM-Builds verfügbar, daher nur indirekt über Pyodide + `highspy`.

## Arbeitsmodus

- **Sprache der Dokumente: Deutsch.** User ist deutschsprachig, Quellen (BMG, DSGVO, OECD-DE-Übersetzungen) sind deutsch.
- **Kommentare im Code: Englisch** (wie in adhocracy-plus).
- Keine positive Affirmation — Reviews fanden substanzielle Probleme; weitere Arbeit muss kritisch sein, nicht bestätigend.
- Jede technische Behauptung mit **Quelle (URL, Paketversion, Datei:Zeile)** belegen. Die Review-Runde hat gezeigt, dass lose Schätzungen sofort zerrissen werden.
- Bei Unsicherheit **"unbestätigt"** markieren statt raten.

## Offene strategische Entscheidungen

| ID | Entscheidung | Status |
| --- | --- | --- |
| S-1 | Lizenz-Pfad: GPL-3.0-MVP vs. Apache-2.0-erst-nach-Clean-Room-Port | Offen — Rechtsgutachten DE/GPL Pflicht |
| S-2 | Algorithmus-Scope Phase 1: nur Maximin, oder Leximin über eigenen HiGHS-Umbau | Offen — Aufwandsspike nötig |
| S-3 | Deployment-Primär: Hosted PWA (statisch) oder signiertes ZIP | Masterplan v1 sagt beides — vor MVP auf eins festlegen |
| S-4 | Erst-Pilot-Kommune | Nicht identifiziert — Build nicht starten, bis das steht |
| S-5 | Geschäftsmodell: OSS + Consulting (Report 05) oder Ablehnung | Tendenz OSS + Consulting, nicht freigegeben |
| S-6 | Zielsprache Code: TypeScript + Pyodide (Phase 1) oder reines TypeScript (Clean-Room) | Abhängig von S-1 und S-2 |

## Unmittelbare nächste Schritte (aus `06-review-consolidation.md` Teil E)

1. **Upstream-Verifikation `sortition-algorithms`** (1 Tag, nur Code-Lesen) — entscheidet S-2.
2. **DE-IT-Rechtsgutachten anfragen** zu §69c UrhG, GPL-Kombination im Browser, Patent-FTO (Procaccia/Flanigan) — entscheidet S-1.
3. **Masterplan v2 schreiben** als `sortition-tool/00-masterplan-v2.md` (v1 bleibt als historisches Artefakt).
4. **Native Referenz-Benchmark** (`pgoelz/citizensassemblies-replication` lokal, `sf_d`/`sf_e` mit HiGHS) — liefert Datengrundlage für neue Go/No-Go-Ampeln.
5. **Marktvalidierung** parallel — ohne konkrete Pilot-Kommune keine Build-Entscheidung.

## Ordnerstruktur

```
.
├── CLAUDE.md                       # dieses Dokument
├── README.md                       # Projekt-Readme
├── research/                       # Bürgerrat-Kontext-Research
│   ├── 00-synthesis.md             # Einstieg, Gesamteinordnung
│   ├── 01-codebase-analysis.md     # adhocracy+ Gap-Analyse
│   ├── 02-es-geht-los-analysis.md  # "Es geht LOS" — nutzt nicht adhocracy+, eigene AWS-App
│   ├── 03-legal-framework-and-best-practices.md   # § 46 BMG, DSGVO, OECD-Methodik
│   ├── 04-gap-analysis-and-implementation.md      # Gap-Analyse + Umsetzungsvarianten
│   └── 05-sortition-algorithm.md   # Sortition Foundation stratification-app
├── sortition-tool/                 # Produktplanung (browser-native App)
│   ├── 00-masterplan.md            # v1, mit Mängeln (siehe 06)
│   ├── 01-wasm-solver-landscape.md # HiGHS vs. glpk.js vs. others
│   ├── 02-pyodide-feasibility.md   # nachzubessern — Versionsstand-Mismatch
│   ├── 03-algorithm-port.md        # nachzubessern — GPL-Fixture-Widerspruch
│   ├── 04-frontend-architecture.md # VERWORFEN — drei Sachfehler
│   ├── 05-product-and-licensing.md # Marktanalyse solide
│   └── 06-review-consolidation.md  # AKTUELLSTES — Review-Findings + Backlog
└── reviews/                        # externe LLM-Reviews (Rohartefakte)
    ├── review-...-claude-opus-4-7.md   # WARN, 7 high, 8 medium
    ├── review-...-gpt-5-4.md           # FAIL, 2 critical, 4 high, 5 medium
    └── review-...-gemini.md            # FAIL, 3 critical, 2 high, 1 medium
```

## Was dieses Repo (noch) nicht enthält

- Kein Code — weder Prototyp noch MVP. Nur Planung.
- Kein `package.json`, kein Build-Setup. Entscheidungen aus S-1 bis S-6 stehen vor jedem `npm init`.
- Keine Testdaten. Synthetische kommunale CSVs müssen vor Phase 0b angelegt werden (siehe `06-review-consolidation.md` P1-2).
- Keine Mandantenkontakte. Marktvalidierung ist pendenz.

## Kontext aus dem Ursprungsworkspace

Dieser Ordner wurde aus einem adhocracy-plus-Workspace ausgegliedert, nachdem die Research ergeben hatte, dass adhocracy+ selbst das Losverfahren nicht abdecken kann. Beide Systeme sollen perspektivisch komplementär einsetzbar sein (wie im Referenz-Setup Tengen): adhocracy+ für die deliberative Phase, dieses Tool für die Los-Auswahl davor. Die adhocracy+-Gap-Analyse (`research/01-codebase-analysis.md`) bleibt deshalb Teil dieses Repos.
