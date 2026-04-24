# Bürgerrat-Sortition

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

## Sprache

Dokumentation auf Deutsch (User + Primärquellen deutsch). Code — wenn er irgendwann geschrieben wird — auf Englisch.

## Lizenz

Noch nicht festgelegt. Siehe Strategie-Entscheidung **S-1** in `CLAUDE.md`. Bis zur Entscheidung gelten diese Research-Dokumente als urheberrechtlich geschützt; Teilen nur in Absprache.
