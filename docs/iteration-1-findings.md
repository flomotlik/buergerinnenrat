# Iteration-1 Findings — Input für Masterplan v2

**Stand:** 2026-04-24, nach Abschluss der 25-Issue-Iteration aus `.issues/`.
**Was passierte:** Browser-native Sortition-App in einem aufgeteilten 25-Issue-Backlog gebaut. Alles in Worktrees, je Issue ein Branch, am Ende auf `main` gemerged. Code, Tests und Daten unter `apps/`, `packages/`, `scripts/`, `tests/fixtures/`, `docs/`.

Dieses Dokument ist **kein Masterplan v2**, sondern der Input. Pro Backlog-Item aus `sortition-tool/06-review-consolidation.md` Teil C: Status + Beleg.

## Backlog P0 — Muss vor v2-Freigabe geklärt sein

### P0-1 — Phase-0-Roadmap auf Maximin als PoC umschreiben
**Status: answered.**
- Issue #01 hat empirisch (Code-Lesen + Test-Suite-Lauf) bestätigt: Maximin läuft ohne Gurobi, Leximin nicht. Beleg: `docs/upstream-verification.md` mit Datei:Zeile-Referenzen, plus `pytest tests/` der Upstream-Lib im Container ergibt `419 passed, 9 skipped` (alle 9 Skips sind Leximin-Gurobi-gated).
- Engine A (TS) und Engine C (native Python) sind in Iteration 1 beide auf Maximin umgesetzt; Leximin-Pfad ist explizit als separater Track via Issue #16 markiert.

### P0-2 — Lizenz fixieren (Phase 1 GPL-3.0)
**Status: partially answered, deklaratorisch.**
- Alle `package.json`-Dateien deklarieren `"license": "GPL-3.0-or-later"` (Beleg: `apps/web/package.json:5`, `packages/*/package.json`).
- Strategische Entscheidung S-1 in `CLAUDE.md` ist **nicht** durch ein Rechtsgutachten geschlossen. Die Iteration setzt GPL-3.0 als Arbeitshypothese; Apache-2.0 bleibt langfristiges Ziel mit Clean-Room-Port-Pfad.

### P0-3 — Go/No-Go-Matrix mit harter Datengrundlage
**Status: partially answered.**
- Synthetische Pools: 6 Profile × 4 Größen + 4 Tightness-Sweeps = 28 Fixtures liegen in `tests/fixtures/synthetic-pools/`. Generator deterministisch, Python+TS byte-identisch (Issue #03).
- Paper-Pools: `example_small_20`, `example_large_200` aus `pgoelz/citizensassemblies-replication`. `sf_a..sf_d` Roh-Respondenten **nicht öffentlich** — siehe `.issues/archived/04-pgoelz-reference-pool-loader/STATUS.md`.
- Gemessene Laufzeiten (Median, 5 Seeds, Container `cpu`):

| Pool | Engine A | Reference C | Faktor |
| --- | ---: | ---: | ---: |
| `example_small_20` (200 / 20) | 267 ms | 7690 ms | A 28× schneller |
| `kleinstadt-100` (100 / 20) | 166 ms | 854 ms | A 5× schneller |
| `example_large_200` (2000 / 200) | nicht gemessen | **>17 min, nicht abgeschlossen** | — |

  Die `example_large_200`-native-Referenz lief im Test-Setup länger als 17 Minuten und wurde vor dem Schreiben dieses Reports nicht beendet. Das bestätigt empirisch die Befürchtung aus Review A3 (sf_e: 67 min nativ Gurobi): bei 2000-er Pools sind Browser-Ampeln <3 min nicht erreichbar, **auch nicht mit nativer Toolchain**.

### P0-4 — Phase 0 auf 4–6 Wochen verlängern
**Status: nicht zutreffend.** Die Iteration ist nicht "Phase 0", sondern eine umgesetzte Iteration 1. Der Plan-Item bleibt für Masterplan v2 relevant, weil Iteration 1 nur die Maximin-Toy-Validierung liefert; ein "Entscheidungs-Benchmark mit Browser-Matrix" ist Iteration 2 (siehe P0-3 partial).

### P0-5 — CSP korrigieren (`connect-src 'self'`)
**Status: answered.**
- `docs/deploy.md` definiert die empfohlene Hosted-CSP. `connect-src 'self'` ist enthalten, `wasm-unsafe-eval` ist drin (Pflicht für HiGHS-WASM-Instanziierung).
- Ein Data-Exfiltration-Audit (Playwright-Netzwerk-Assert) ist nicht explizit umgesetzt — Iteration 2.

### P0-6 — Report 04 obsolet markieren
**Status: nicht-technisch, formal-Status.** Ist eine Plan-Doku-Aktualisierung, gehört in Masterplan v2.

## Backlog P1 — Vor Phase-1-MVP verpflichtend

### P1-1 — DSFA + BITV 2.0
**Status: open.** Iteration 1 implementiert minimalen a11y-Smoke-Test (`apps/web/tests/e2e/a11y.spec.ts`): h1 unique, alle Buttons haben accessible names, alle inputs/imgs gelabelt. Das ist **nicht** BITV-2.0-Konformität — das ist Smoke. DSFA-Template existiert nicht. Beides Iteration 2.

### P1-2 — CSV-Adapter-Track
**Status: explicitly out of scope für Iteration 1, partially scoped.**
- Iteration 1 hat einen UTF-8/Windows-1252-resistenten CSV-Parser (`apps/web/src/csv/parse.ts`) mit Auto-Separator und Auto-Encoding-Detection — adressiert Codex M4 für synthetische und Paper-Pool-Daten.
- Echte Hersteller-Format-Adapter (EWO, MESO, VOIS) sind nicht implementiert. Bleibt Iteration 2.

### P1-3 — Pluggable-Solver verifizieren
**Status: answered.** Issue #01: solver-Backend-Liste in `settings.py:14`, Routing in `committee_generation/solver.py:408-421` (HighsSolver, MipSolver mit Sub-Modes). Maximin nutzt Solver-ABC, Leximin **nicht** (direkter `gurobipy`-API-Aufruf). Dokumentiert in `docs/upstream-verification.md`.

### P1-4 — Laien-Erklärung von Leximin/Maximin
**Status: open.** Iteration 1 enthält keine Methodenblätter. Die UI-Texte sind Verwaltungs-Deutsch. Bleibt Iteration 2.

### P1-5 — i18n-Roadmap
**Status: open.** Texte sind hart kodiert auf Deutsch. Out of scope für Iteration 1.

### P1-6 — Patent-FTO
**Status: open.** Nicht-technisch.

## Backlog P2 — Vor Produktiveinsatz

### P2-1 — Wartungs-/Security-Modell
**Status: open.** Owner-Doku, CVE-Update-Fenster — Iteration 2.

### P2-2 — Pyodide-Versionierung
**Status: nicht zutreffend.** Engine B (Pyodide) ist nicht in Iteration 1 enthalten (Issues #12-#14 pending). Wenn Engine B kommt, muss Pyodide-Version gepinnt werden (siehe `Dockerfile.claude` ENV `SORTITION_VENV` — Python 3.12 ist die avisierte Pyodide-Parität).

### P2-3 — Clean-Room-Pfad
**Status: open.** Bleibt für Iteration 2.

### P2-4 — Haftung/Disclaimer
**Status: partial.** Audit-JSON enthält Ed25519/ECDSA-Signatur, `docs/audit-schema.json` definiert das Format, `scripts/verify_audit.py` verifiziert. UI hat keine prominente "no warranty"-Klausel — Iteration 2.

## Neue Findings aus Iteration 1 (in den Reviews nicht vorhergesehen)

### NF-1 — TS-Maximin-Heuristik liefert ~17 % schlechteres min π als nativer Maximin
Engine A nutzt eine Hybrid-Heuristik (siehe `packages/engine-a/src/engine.ts` — Coverage-Phase + Dual-Preis-Iteration), die nicht voll konvergent ist. Auf `example_small_20` liefert sie min π = 0.0833 vs. 0.1000 von Reference C, auf `kleinstadt-100` 0.0930 vs. 0.1111 — also einen **Fairness-Verlust von 15–17 %** für die Browser-Geschwindigkeit (5–28× schneller). **Implikation:** für Production-Lose ist Engine A allein nicht ausreichend; Engine B (Pyodide+native Maximin) oder Server-side-Reference C ist nötig.

### NF-2 — `highs` npm-Package: `output_flag: false` bricht den Solution-Parser
Empirisch entdeckt beim Engine-A-Bau (`packages/engine-a/src/feasible-committee.ts:113-115`-Kommentar): das `highs@1.8.0` npm-Package parsed Stdout-Text der WASM-Module für die Solution. Wenn man `output_flag: false` als Option setzt (was naheliegend für eine UI-Library wäre, um Konsolen-Spam zu vermeiden), gibt es nichts zu parsen → "Unable to parse solution. Too few lines." Das ist ein Upstream-Designfehler des Packages; Workaround: Option weglassen.

### NF-3 — Ed25519 in Web Crypto ist Browser-abhängig, ECDSA-Fallback nötig
Ed25519 ist erst in Chromium 113+ und Firefox 130+ verfügbar. Playwright-Chromium in unserem CI-Setup unterstützt es nicht zuverlässig. Implementiert: `signAudit()` in `apps/web/src/run/audit.ts` versucht Ed25519, fällt automatisch auf ECDSA-P256 zurück. Audit-JSON-Schema hat ein `signature_algo`-Feld, das Verify-Skript (`scripts/verify_audit.py`) versteht beide. **Implikation:** "Ed25519 via Web Crypto, kein externes Signaturpaket" aus dem Masterplan ist halbwahr — die Realität ist "Ed25519 wenn verfügbar, sonst ECDSA-P256".

### NF-4 — Maximin-LP wird degeneriert wenn nicht alle Agenten in mindestens einem Komitee sind
Wenn die initialen K Komitees plus Column-Generation-Iterationen nicht ALLE Pool-Mitglieder einschließen, gibt der Maximin-LP z* = 0 und putzt das gesamte LP-Gewicht auf ein einziges Komitee (degenerate corner). Konsequenz: 470 von 500 Marginale = 0, max Marginal = 1. Workaround in Engine A: Coverage-Phase (positive Coefs auf uncovered, stark negative auf covered Agenten) bis alle gedeckt sind, dann Dual-Preis-Phase. Das ist nicht im Upstream-Code so explizit; eine kleine theoretische Beobachtung mit praktischen Konsequenzen für jeden eigenen Maximin-Implementierer.

### NF-5 — `sortition-algorithms` Test-Suite hat undeklarierte Test-Deps
Beim Lauf der Upstream-Test-Suite im Container fehlten `tomli_w`, `rich`, `click`, `typer`. Sind im `pyproject.toml` der Library nicht als Test-/Dev-Dep deklariert. Hinzugefügt zu `Dockerfile.claude` (Commit ab45618 + cef725e). Upstream-PR potentiell wert — out of scope dieser Iteration.

## Go/No-Go-Empfehlung für Iteration 2 (nicht bindend)

| Frage | Empfehlung |
| --- | --- |
| Engine B (Pyodide) bauen? | **Ja**, in Track 4 (Issues #12-#14 noch nicht angegangen). Coverage-Frage ist beantwortet (Maximin-only via Pyodide ist machbar — Issue #01 zeigt es bekannt). Das schließt NF-1 (Fairness-Lücke). |
| Leximin-Port bauen? | **Nein in Iteration 2 V1**, ja in Iteration 2 V2. Issue #16 ist nicht trivial (Gurobi-Parameter `Method=2`, `Crossover=0` haben in HiGHS andere Semantik). Erst Pilot-Kommune sicherstellen, dann Aufwand investieren. |
| Echte SF-Pools `sf_a..sf_d`? | **Nicht ohne DSGVO-konformen Bezug.** Mit den Autor:innen oder der Sortition Foundation in Kontakt treten; ggf. NDA, lokales Replikations-Setup. Bis dahin: `example_large_200` als Maximal-Test. |
| Pilot-Kommune? | **Vor weiterer Build-Investition**. Strategische Entscheidung S-4 in `CLAUDE.md` bleibt offen. Marktvalidierung ist Iteration-2-Vorbedingung, nicht Iteration-2-Inhalt. |
| Lizenz-Pfad? | **Rechtsgutachten anfragen** zu §69c UrhG / GPL-Pyodide-Kombination, parallel zu Iteration 2 starten. Ergebnis bestimmt, ob Apache-2.0-Endziel haltbar ist. |
| BITV 2.0? | **Pflicht-Workstream Iteration 2**. Kommunale Beschaffung blockiert sonst. axe-core-CI mit Score ≥ 90 für Production-Audit (BITV-2.0-Konformitäts-Erklärung) ist Bedingung, nicht Wunsch. |

## Cross-Links

- [`docs/upstream-verification.md`](upstream-verification.md) — Frage P0-1
- [`docs/quality-comparison-iteration-1.md`](quality-comparison-iteration-1.md) — Daten zu P0-3
- [`docs/paper-pools.md`](paper-pools.md) — Frage P0-3 (sf-Pools-Verfügbarkeit)
- [`docs/audit-schema.json`](audit-schema.json) — P2-4
- [`docs/deploy.md`](deploy.md) — P0-5
- [`docs/synthetic-pools.md`](synthetic-pools.md) — P1-2
- [`sortition-tool/06-review-consolidation.md`](../sortition-tool/06-review-consolidation.md) — Original-Backlog
