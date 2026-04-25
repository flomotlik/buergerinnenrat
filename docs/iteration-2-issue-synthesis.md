# Iteration-2 Issue-Synthese (rein technisch)

**Stand:** 2026-04-25.
**Methode:** `/issue:review --topic` mit Claude Opus 4.7, OpenAI Codex gpt-5-4 und Google Gemini 3 Pro Preview parallel. Reviews unter `reviews/iteration-2-issue-gaps/`. Anschließende Filterung auf rein technische Issues — Compliance, Recht, Akquise, soziale Aspekte sind explizit aus dem Scope.

## Verdikte (im ursprünglichen, breiten Kontext)

| Reviewer | Modell | Verdikt | Critical | High | Medium |
| --- | --- | --- | ---: | ---: | ---: |
| Claude | opus-4-7 | **FAIL** | 6 | 3 | 2 |
| OpenAI Codex | gpt-5-4 | **FAIL** | 4 | 4 | 0 |
| Google Gemini | gemini-3-pro-preview | **FAIL** | 3 | 4 | 2 |

Die FAIL-Verdikte beruhten zu einem erheblichen Teil auf nicht-technischen Punkten (DSFA, BITV, i18n, Lizenz-Gutachten, Pilot-Akquise). Bei rein technischer Betrachtung bleiben drei Kern-Lücken:

1. **Algorithmus-Lücke**: 16 % schlechteres min π in Engine A vs Reference C.
2. **Vergleichs-Belastbarkeit**: 5 Seeds × 2 kleine Pools ist statistisch dünn; Person-Level-Drift gar nicht gemessen.
3. **Engineering-Hygiene**: Worker-Isolation fehlt, kein Hash-Parity-Test, keine CI-Regression-Schutz.

## Iteration-2-Issues (rein technisch)

### Track A — Algorithmus-Lücke schließen

#### #40 Engine A echte Column Generation

Das ist der direkte Fix für die 16-%-Lücke. Die aktuelle Hybrid-Heuristik (`packages/engine-a/src/engine.ts:73-180`) ist keine korrekte Maximin-Implementierung — sie überspringt die Dual-Preis-getriebene Iteration der upstream `find_distribution_maximin`. #40 ersetzt sie durch echte Column Generation, die bis zur Konvergenz iteriert.

Erwartetes Ergebnis: Engine A min π innerhalb 1–2 % von Reference C.

#### #41 Pipage-Rounding

War in den Iteration-1-Akzeptanzkriterien (#08), wurde nicht implementiert. Aktuelle Lösung sampled aus der LP-Verteilung — korrekt im Erwartungswert, aber pro einzelnem Lauf hat das Panel unnötige Quoten-Varianz. Pipage-Rounding ist deterministisch und reproduzierbar.

#### #42 Engine B Pyodide-Track aktivieren

Konsolidiert die deferred Issues #12 (Pyodide-Bootstrap), #13 (sortition-algorithms-Integration), #14 (Engine-Swap). Engine B nutzt die kanonische `sortition-algorithms`-Library direkt im Browser via Pyodide — schließt die Fairness-Lücke definitionsgemäß auf 0 %, weil dieselbe Code-Basis läuft.

Bundle-Trade-off: Engine A nach #40 ~3 MB, Engine B mit Pyodide 30–40 MB (lazy-loaded). User wählt im UI.

### Track B — Vergleichs-Robustheit

#### #27 Cross-Runtime Person-Level-Drift

`scripts/compare_runs.py:121-154` aggregiert nur Skalare. Die fundamentale Frage "liefern Engine A und Reference C bei identischem Pool und Seed dieselben Marginale pro Person?" ist nicht messbar. Lösung: pro `person_id` ein `Δπ`, aggregiert nach Quoten-Kategorie — identifiziert systematischen Bias gegen Sub-Gruppen.

#### #28 Statistische Seed-Stichprobe ≥30

5 Seeds → Standardfehler ~0.45σ → Aussage "16 % schlechter" nicht von Rauschen unterscheidbar. ≥30 Seeds + paired-t-Test auf min-π-Differenz + 95-%-CI in der Tabelle.

#### #29 Engine A Property-Tests aktivieren

Pickup von #09. Die 11 Hand-Tests in `packages/engine-a/tests/` decken Edge-Cases nicht ab — insbesondere Coverage-Phase-Degeneration (NF-4) und `forceIn`/`forceOut`-Semantik in `panel-ops.ts`. fast-check-basierte Property-Suite mit 100 zufälligen Inputs pro Property.

#### #30 Native Large-Pool-Benchmark

`example_large_200` (n=2000) Reference C lief in Iteration 1 >20 min, kein Abschluss. Engine A nicht systematisch auf n=2000 gemessen. Dieses Issue klärt: ab welcher Pool-Größe ist welche Engine produktionsreif?

### Track C — Engineering-Hygiene

#### #26 Engine A Worker-Isolation

`apps/web/src/run/runEngine.ts:19-46` ruft `engine.run()` direkt im Main-Thread. Bei n ≥ 500 friert die UI ein, Cancel-Button wird unbedienbar. Issue #08 hatte das ursprünglich gefordert, wurde nicht umgesetzt.

#### #36 Hash-Parity Golden-Test

Codex hat einen konkreten Bug behauptet (TS/Python-Hash-Mismatch via Separator) — geprüft, ist falsch (beide nutzen leeren Concat). Aber: kein Test bewacht die Parität gegen Edge-Cases (Unicode, Float-Formatierung). #36 fügt einen Golden-Test hinzu.

Out of scope: kommunal-vergebene Schlüssel, Hardware-Token, PKI — alles nicht-technische / Iteration 3+.

#### #39 Panel-Ops UI

Engine-Logik (`panel-ops.ts`) und CLI (`scripts/panel_ops_cli.ts`) existieren. UI-Buttons fehlen. Im Bürgerrats-Workflow nicht-optional (Reroll, Replace bei Absage, Extend um N).

#### #43 LP-Solver-Tuning

Empirische Studie der HiGHS-Optionen (`solver: simplex|ipm`, `presolve`, `parallel`, `mip_rel_gap`, `primal_feasibility_tolerance`) auf Pools n=500–1000. Empfehlung pro Pool-Größenklasse. Schließt unbekannte Numerik-Edge-Cases.

#### #44 CI-Benchmark-Gate

Schützt #40 vor Regression. Reduzierter Benchmark (10 Seeds × 2 kleine Pools × 2 Engines) bei jedem Commit, fail bei min-π-Drift > 2 σ gegen Baseline.

## Was nicht als Iteration-2-Issue angelegt wurde

Bewusste Auslassung:

### Nicht-technisch (gehört nicht in technische Iteration 2)

- DSFA-Template, Datenflussdiagramm, VVT-Bausteine
- BITV-2.0-Audit, Erklärung zur Barrierefreiheit, WCAG-AA-Remediation jenseits Iteration-1-Smoke
- Methodenblatt für Bürger:innen (Verwaltungssprache, Leichte Sprache)
- i18n DE/EN-Foundation
- Pilot-Kommune-Akquise, LOI- und AVV-Templates
- Rechtsgutachten (§69c UrhG, GPL/Pyodide, Patent-FTO)
- Audit-Key-Management mit kommunal-vergebenen Schlüsseln (Hardware-Token, persistente Keys)
- Reale Kommunal-CSV-Adapter (EWO/MESO/VOIS) — Pilot-driven

### Iteration-3+

- Leximin-Port (#16 STATUS bleibt deferred — Forschungs-Issue, nicht Pilot-Block)
- Performance-Optimierungen über HiGHS-Defaults hinaus
- Service-Worker für Pyodide-Caching
- iOS-Safari-Support
- Bayesian Fairness Audits / Power-Analysen

## Total

**~21 PT rein technische Arbeit.** Bei Solo-Vollzeit 4–5 Wochen.

Empfohlene Reihenfolge: **#26 → #40 → #27 → #28 + #30 + #29 (parallel) → #42 → #41 → #43 + #44 → #36 + #39**. Reihenfolge ist optimiert für (1) frühe Beweisbarkeit der Algorithmus-Parität, (2) parallele Hygiene-Arbeit ohne Blockaden.
