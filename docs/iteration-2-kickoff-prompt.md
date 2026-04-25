# Iteration-2 Kickoff-Prompt (zum Kopieren in neue Claude-Session)

Diesen Prompt nach `/clear` (oder in neuer Session) als ersten User-Input einfügen. Er enthält den vollen Kontext für autonome Iteration-2-Bearbeitung.

---

```
Arbeite alle aktiven Iteration-2-Issues in .issues/ komplett ab, in der
Bearbeitungsreihenfolge aus .issues/README.md. Modus: autonom. Iteration 1
ist abgeschlossen — siehe docs/iteration-1-autorun-2026-04-24.md und
docs/iteration-1-findings.md für den Stand.

Frag mich nur, wenn etwas die in den ISSUE.md-Akzeptanzkriterien nicht
abgedeckten Scope-Entscheidungen berührt oder eine Upstream-Realität den
Plan umwirft (z.B. Engine A Column Generation konvergiert mathematisch
nicht innerhalb akzeptabler Zeit, oder Pyodide+sortition-algorithms-Wheel
hat einen Build-Defekt). Sonst entscheide selbst nach CLAUDE.md und
docs/iteration-2-issue-synthesis.md.

Pro Issue:
  1. /issue:research <id>    Fakten + Quellen (URL, Datei:Zeile, Paketversion)
  2. /issue:plan <id>        PLAN.md mit konkreten, testbaren Schritten
  3. /issue:execute <id>     Worktree, Tests im gleichen Commit wie Code
  4. /issue:verify <id>      Akzeptanzkriterien pruefen
  5. /issue:ship <id>        PR-Stub lokal, merge nach main (kein Remote)
  6. /issue:cleanup <id>     Worktree weg, Issue-Ordner nach .issues/archived/

Iteration-2-Scope (rein technisch — keine Compliance, keine Akquise,
keine Recht):
- Track A (Algorithmus-Paritaet): #26, #40, #41, #42
- Track B (Vergleichs-Robustheit): #27, #28, #29, #30
- Track C (Engineering-Hygiene): #36, #39, #43, #44

Empfohlene Reihenfolge (aus .issues/README.md):
1. #26 Worker-Isolation (Voraussetzung fuer #42 + Performance-Tests)
2. #40 Engine A echte Column Generation (schliesst die 16%-Luecke direkt)
3. #27 Cross-Runtime-Person-Level-Drift (zeigt empirisch ob #40 reicht)
4. #28 Statistical Seed Sweep + #29 Property Tests + #30 Large-Pool
   Benchmark parallel
5. #42 Engine B Pyodide-Track (drei Phasen 42a/42b/42c — alternative
   Strategie zur Algorithmus-Paritaet)
6. #41 Pipage-Rounding (Determinismus-Schuld aus Iteration 1)
7. #43 LP-Solver-Tuning + #44 CI-Benchmark-Gate (Hygiene)
8. #36 Hash-Parity Golden-Test + #39 Panel-Ops UI

Projekt-Regeln aus CLAUDE.md (nicht verletzen):
- Dokumente Deutsch, Code und Commit-Messages Englisch
- Jede technische Behauptung mit Quelle belegen; "unbestaetigt" markieren
  wenn nicht belegbar
- Keine positive Affirmation; kritisch bleiben
- Keine Emojis, kein Tool-Attribution-Trailer in Commits
- Keine echten Melderegister-Daten in Repo oder Container-Image
- Lizenz GPL-3.0-or-later in package.json deklariert; nicht aendern

Gates mit Zwischen-Meldung an mich (weitermachen, aber kurz berichten):
- Nach #40: Engine A z* auf example_small_20 und kleinstadt-100 messen
  und mit Reference C vergleichen. Wenn Luecke immer noch > 5% min π,
  pausieren — die Heuristik-Hypothese stimmte nicht und wir muessen die
  Strategie neu denken (Engine B als Default, statt Engine A reparieren).
- Nach #27: Person-Level-Drift-Daten liegen vor — Bias-Bericht pro
  Quoten-Kategorie. Wenn ein systematischer Sub-Gruppen-Nachteil zu sehen
  ist, das ist ein Show-Stopper, melden.
- Nach #42 Phase 42a: Pyodide-Bundle laedt im Browser, sortition-
  algorithms importierbar. Bundle-Groesse messen.
- Nach #42 Phase 42c: drei Engines (A, B, C) parallel lauffaehig.
  Drei-Wege-Vergleich auf example_small_20 + kleinstadt-100.
- Nach #44: CI-Baseline gesetzt, Regression-Test funktional.

Pro-Issue-Fehler-Protokoll:
- Akzeptanzkriterien nicht erfuellbar: schreibe
  .issues/<NN-slug>/STATUS.md mit "blocked: <reason>", ueberspringe
  Issues die davon abhaengen, fahre mit unabhaengigen fort.
- Abhaengigkeit blockiert: Issue bleibt todo, skip fuer jetzt.
- Container-Fehler durch fehlende System-Dep: Dockerfile.claude
  anpassen, dokumentieren, neuer Image-Build als separater Commit.
  Nicht pausieren.
- Flaky Test: max. 2 Retries, dann als Bug in .issues/<NN>/NOTES.md
  festhalten und weiterarbeiten, nicht blind fixen.

Out-of-Scope-Schutz (nicht erweitern, nicht wegfallen lassen):
- Nur Maximin. Kein Leximin-Port (Issue #16 bleibt deferred).
- Chromium + Firefox Desktop. Kein iOS/WebKit (Pyodide-Issue #5428).
- Keine BITV-2.0-Vollkonformitaet (a11y-Smoke aus Iteration 1 reicht).
- Keine DSFA, kein Rechtsgutachten, keine Pilot-Akquise (alles in andere
  Workstreams ausgelagert).
- Keine Kommunen-Format-Adapter (EWO, MESO, VOIS), kein i18n DE/EN, kein
  Methodenblatt, keine kommunal-vergebenen Audit-Schluessel.
- Lizenz: GPL-3.0-or-later deklariert. Keine Apache-2.0-Diskussion hier.
- Bei #42 Pyodide: Bundle landet bei 30-40 MB, das ist OK fuer Iteration 2.

Container: ist gebaut. pnpm via corepack aktiv, Python 3.12 venv unter
/opt/sortition-venv mit sortition-algorithms + highspy + cvxpy,
Playwright-Browser unter /opt/playwright-browsers, cryptography fuer
Audit-Verifikation, fast-check ist im pnpm-Workspace verfuegbar (sonst
nachinstallieren). Bei Fehl-Deps: Dockerfile.claude ergaenzen, Commit,
neubauen.

Welche Iteration-1-Befunde fliessen in Iteration 2 ein:
- NF-1 (Engine A 17% Fairness-Luecke) → adressiert durch #40 + #42
- NF-2 (highs output_flag bricht parser) → bekannt, Workaround in
  feasible-committee.ts:110 dokumentiert
- NF-3 (Ed25519 nicht in allen Browsern) → ECDSA-Fallback ist da, in
  Iteration 2 nicht relevant
- NF-4 (Maximin-LP degenerate bei nicht-vollstaendiger Coverage) → wird
  durch echte Column Generation aus #40 strukturell geloest
- NF-5 (sortition-algorithms hat fehlende test-deps) → in Dockerfile
  schon nachgezogen

Engine-Wahl-Strategie nach Iteration 2:
- Wenn #40 die Luecke auf <2% min π schliesst: Engine A bleibt Default,
  Engine B als optionale "kanonische Verifikation"
- Wenn #40 die Luecke nicht schliesst: Engine B wird Default fuer reale
  Lose, Engine A bleibt fuer schnelle UI-Vorschau
- Drei-Wege-Vergleich (#27) entscheidet das datengetrieben

Start jetzt: /issue:work 26

End-Report (wenn alle 12 in archived oder blocked):
Schreibe docs/iteration-2-autorun-<timestamp>.md mit:
- Fertig vs blocked pro Issue mit Grund
- Test-Status pro Engine (A vor und nach #40, B, C) auf allen Fixtures
- Drei-Wege-Vergleichs-Tabelle: min π, Gini, Wall-Time pro Pool/Setup
  mit 95%-CI (n=30 Seeds)
- Person-Level-Drift Histogramme pro Pool-Setup-Kombination
- Welche Algorithmus-Strategie sich durchgesetzt hat (Engine A nach #40
  als Default, oder Engine B als Default)
- CI-Benchmark-Baseline-Werte
- Welche neuen Findings (NF-6+) aus Iteration 2 fuer Iteration 3 relevant
  sind
```

---

## Was bei der neuen Session zusaetzlich nuetzlich ist

Optional: vor dem obigen Prompt noch diese Files mitschicken (Drag-and-Drop
oder mit `@`-Verweis), damit Claude in der ersten Antwort schon den
vollen Kontext hat:

- `CLAUDE.md`
- `.issues/README.md`
- `docs/iteration-1-findings.md`
- `docs/iteration-2-issue-synthesis.md`

Wenn Claude im autonomen Modus laeuft, liest es das eh selbst — die
Drag-and-Drop-Variante spart nur die ersten paar Read-Calls.
