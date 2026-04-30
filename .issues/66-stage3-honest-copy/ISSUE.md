---
id: '66'
title: 'Stage-3 Copy: Falsche Leximin/HiGHS-''Bereit''-Claim entfernen'
status: done
priority: critical
labels:
- ui
- docs
- copy
- correctness
---

## Kontext

Im Design-Handoff (`design_handoff_buergerinnenrat/`) macht Stage 3 (`reference/components/stage3.jsx`) und die Docs-Seite (`reference/components/docs.jsx`) Aussagen, die der dokumentierten Wahrheit dieses Projekts widersprechen:

- `stage3.jsx:72-77`: Solver-Card mit `<h2 class="card-title">HiGHS · Leximin</h2>` und grünem `sig-pill` "Bereit / Ready"
- `stage3.jsx:79-86`: animierter `solver-step is-active` "04 · Leximin-Iterationen · 3 / 24"
- `stage3.jsx:43-44`: "Stage 3 wird in Iteration 3 implementiert (Solver: HiGHS via highs-js)"
- `docs.jsx:40-43`: "Maximin / Leximin nach Flanigan et al. (Nature 2021). Solver: HiGHS via highs-js, im Browser."
- `docs.jsx:140-143`: "In-browser solver: HiGHS via highs-js (MIT). Pyodide-Pfad mit upstream sortition-algorithms ist als Alternative verifiziert worden, scheidet aber wegen Gurobi-Pflicht für Leximin-Garantie aus."

Per `CLAUDE.md:34-37` und `sortition-tool/06-review-consolidation.md`:

> "**Die Phase-0-Hypothese des Masterplans ist widerlegt.** `sortitionfoundation/sortition-algorithms` implementiert Leximin nur mit Gurobi (siehe `committee_generation/leximin.py` upstream). Im Browser ist ohne eigenen Solver-Umbau nur Maximin möglich."

Plus: Engine B (Pyodide) ist nicht gebaut — Track 4 in CLAUDE.md ist explizit unabgearbeitet (`.issues/12-engine-b-pyodide-bootstrap/` un-archived). Iteration 3 hat **keine** committed Solver-Stack-Entscheidung (S-2 in CLAUDE.md ist offen).

Die Drei-LLM-Review (`.issues/design-handoff-buergerinnenrat-redesign-review/reviews/`) hat das als Critical-Finding C1/C2 markiert (Claude FAIL, Codex FAIL).

## Risiko

Wenn die Stage-3-Mockup-Texte unkorrigiert in irgendein User-facing Artefakt gelangen (Screenshot, Live-Preview, neue UI-Iteration), setzt das **falsche Erwartungen** mit Verwaltungs-Stakeholdern und widerspricht der Projekt-Position. Das ist eine **Marken-/Vertrauens-Frage**, nicht nur Copywriting.

## Scope

Diese Issue ist klein und **bewusst von #65 (Visual Redesign) getrennt**, weil:

1. Die Korrektur muss **vor** jeder Live-Preview oder jedem Stakeholder-Demo passieren — sie kann nicht auf den vollständigen Redesign warten
2. Sie ist eine Copy-Änderung in 2 Dateien plus möglicherweise einer existing UI-Komponente, nicht ein architektonischer Eingriff
3. Sie ist unabhängig mergebar

## Acceptance Criteria

### Im Design-Handoff-Folder (Referenz, kein Production-Code)

- [ ] `design_handoff_buergerinnenrat/reference/components/stage3.jsx`: "HiGHS · Leximin" → "Maximin (Phase 1)" oder "Solver — Auswahl S-2 offen"
- [ ] Grüner `sig-pill` "Bereit / Ready" entfernt (oder ersetzt durch grauen "In Planung / Planned"-Pill)
- [ ] Animierter `solver-step is-active` "Leximin-Iterationen · 3 / 24" entfernt oder umbenannt zu "Maximin-Iterationen"
- [ ] Vorschau-Mockup-Banner-Text (`stage3.jsx:37-45`) angepasst: "Stage 3 wird in einer kommenden Iteration implementiert. **Solver-Wahl ist offen** (CLAUDE.md S-2). Eine Browser-Leximin-Garantie ist nicht zugesagt — Upstream-Leximin (Sortition-Foundation) erfordert Gurobi."
- [ ] `design_handoff_buergerinnenrat/reference/components/docs.jsx:35-47`: Stage-3-Workflow-Card-Beschreibung umformulieren — keine "HiGHS via highs-js"-Versprechen
- [ ] `design_handoff_buergerinnenrat/reference/components/docs.jsx:136-143` (Docs-Section "Stage 3"): umformulieren auf:
  - "Phase 1 zielt auf Maximin im Browser. Konkrete Solver-Wahl (HiGHS via highs-js MIT-Kandidat, oder andere) ist Strategie-Entscheidung S-2 — siehe CLAUDE.md."
  - "Leximin-Garantie ist explizit **nicht** Phase-1-Scope. Upstream-Leximin (`sortitionfoundation/sortition-algorithms`) erfordert Gurobi und ist im Browser kein gelöstes Problem."
  - "Pyodide-Pfad mit upstream-Library wurde als Alternative geprüft (Issue #12-#14 in `.issues/`), aber nicht implementiert. Status: offen."
- [ ] Handoff-`README.md:4` ("Stage 3 draws a maximin/leximin final panel from respondents") → "Stage 3 zieht den finalen Pool — Algorithmus Maximin (Phase 1); Leximin nicht Phase-1-Scope"

### In der bestehenden App (falls Mock-Inhalte mit ähnlicher Falsch-Claim existieren)

- [ ] `apps/web/src/run/RunPanel.tsx` und `apps/web/src/docs/Algorithmus.tsx` + `Limitationen.tsx` + `Verifikation.tsx` durchsuchen nach "Leximin"-, "highs-js"-, "HiGHS"-Erwähnungen
- [ ] Jede Erwähnung prüfen: ist sie ehrlich (z.B. "Phase 1 ist Maximin; Leximin ist offen") oder wishful (z.B. "Solver: HiGHS")? Wishful-Erwähnungen korrigieren.
- [ ] Cross-Check: `docs/iteration-1-findings.md` und `sortition-tool/06-review-consolidation.md` Wording als Source-of-Truth verwenden.

### Doku

- [ ] PR-Beschreibung enthält ein Absatz "Was diese Issue **nicht** macht": neuen Solver bauen / Engine B / Iteration 2/3 — nur Copy.
- [ ] Verweis auf CLAUDE.md S-2 + L36-37 + L9 + Issue #12-#14 in PR
- [ ] Verweis auf Review-Findings C1/C2 in `.issues/design-handoff-buergerinnenrat-redesign-review/reviews/`

## Out of Scope

- Implementierung von Stage 3 oder eines Solvers
- Engine B / Pyodide-Track
- Visuelles Stage-3-Redesign (das ist #65, und #65 darf Stage 3 visuell nicht anrühren bevor #66 gemerged ist)
- Änderungen an der Algorithmus-Auswahl

## Verweise

- Reviews: `.issues/design-handoff-buergerinnenrat-redesign-review/reviews/` (Findings C1/C2)
- CLAUDE.md L9, L34-37 (Phase-0-Hypothese widerlegt)
- CLAUDE.md S-2 (Algorithmus-Scope-Entscheidung offen)
- `sortition-tool/06-review-consolidation.md`
- Verwandt: #65 (Visual Redesign — wartet auf diesen Fix), #67 (Future Polish), abgelöste #56
- Engine-B-Track-Issues (un-archived): #12, #13, #14
