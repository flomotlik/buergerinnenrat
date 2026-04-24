# Plan: Upstream-Verifikation sortition-algorithms

Einzige Task: aus `RESEARCH.md` das Final-Dokument `docs/upstream-verification.md` destillieren, Vendor-Klon nicht eingecheckt, Issue-Ordner auf dem Feature-Branch.

## Tasks

<task id="01-01">
Schreibe `docs/upstream-verification.md` mit der Empfehlungsmatrix (Maximin/Leximin/Nash/Diversimax/Legacy × mit/ohne Gurobi), mindestens 10 Datei:Zeile-Zitate aus `vendor/sortition-algorithms-src/src/`, und einer eindeutigen Ja/Nein-Zeile für "Maximin ohne Gurobi" und "Leximin ohne Gurobi". Quelle: RESEARCH.md.
</task>

<task id="01-02">
Ergänze `.gitignore` um `vendor/` (schon geschehen) und `.worktrees/` für die Dauer der Iteration, damit versehentliche Checkins vermieden werden.
</task>

<task id="01-03">
Commit auf Feature-Branch: `chore(01): upstream verification — maximin works without gurobi, leximin is gurobi-gated` plus `RESEARCH.md`, `PLAN.md`, `docs/upstream-verification.md`, `.gitignore`.
</task>

<task id="01-04">
Nach Merge: Dockerfile-Ergänzung (`rich`, `click`, `typer`, `tomli_w`) auf main committen als eigenen Chore-Commit, weil die Dep-Zugänge über alle weiteren Issues Bestand haben müssen.
</task>

## Verifikation (Akzeptanzkriterien aus ISSUE.md)

- [x] Clone unter `vendor/sortition-algorithms-src/` — erledigt, gitignored
- [ ] `docs/upstream-verification.md` mit ≥10 Datei:Zeile-Refs — Task 01-01
- [ ] "Maximin ohne Gurobi" Ja/Nein mit Beleg — abgedeckt in Task 01-01
- [ ] "Leximin ohne Gurobi" Ja/Nein mit Beleg — abgedeckt in Task 01-01
- [ ] Liste aller Solver-Imports — abgedeckt in Task 01-01
- [ ] Empfehlung Track 4 — abgedeckt in Task 01-01

## Out of scope (aus ISSUE.md)

- Kein Code
- Kein Upstream-PR
- Kein Performance-Benchmark
