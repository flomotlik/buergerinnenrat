# Issue-Index

## Iteration 1 (abgeschlossen 2026-04-24)

20 von 25 Issues abgearbeitet, alle Branches in `main` gemerged, Artefakte in `.issues/archived/`. Status-Bilanz in `docs/iteration-1-autorun-2026-04-24.md`, Findings in `docs/iteration-1-findings.md`.

5 Issues deferred mit STATUS-Notiz (kein Code, nur Pickup-Plan):
- `09-engine-a-property-tests/STATUS.md` — pickup mit #29
- `12-engine-b-pyodide-bootstrap/STATUS.md` — Track 4, blockiert auf #37 + #38
- `13-engine-b-sortition-algorithms-integration/STATUS.md` — abhängig von #12
- `14-engine-swap-config/STATUS.md` — abhängig von #13
- `16-gurobi-free-leximin-reference/STATUS.md` — Forschung, post-Pilot

## Iteration 2 (Vorschlag 2026-04-25, aus externem Review-Konsens)

Drei externe LLM-Reviews (Claude Opus 4.7, OpenAI Codex gpt-5-4, Google Gemini 3 Pro Preview, alle drei Verdikt **FAIL**) haben Iteration-1-Stand gegen "kürzeste Strecke zu (a) belastbare Vergleichsdaten, (b) erste reale Bürgerrats-Lose" geprüft. Reviews unter `reviews/iteration-2-issue-gaps/`. Synthese in `docs/iteration-2-issue-synthesis.md`.

### Phase A — Vergleichsdaten belastbar machen (Engineering-only)

| ID | Slug | Track | Est | Deps |
| ---: | --- | ---: | ---: | --- |
| 26 | engine-a-worker-isolation | 3 | 1.5 PT | archived/08, archived/10 |
| 27 | cross-runtime-person-level-drift | 5 | 2 PT | archived/15, archived/19, 26 |
| 28 | statistical-seed-sweep | 5 | 1.5 PT | archived/19, 27 |
| 29 | engine-a-property-tests-activate | 2 | 1 PT | archived/08, archived/22, archived/23 |
| 30 | native-large-pool-benchmark | 5 | 1.5 PT | archived/15, 26 |

**Phase-A-Total: ≈ 7,5 PT**. Output: belastbare Aussagen "Engine A liefert X ± Y % schlechteres min π gegenüber Reference C auf Pools bis n=2000, p < 0.01".

### Phase B — Compliance-Pakete (parallel, externe Wartezeit)

| ID | Slug | Track | Est | Deps |
| ---: | --- | ---: | ---: | --- |
| 31 | dsfa-template-and-dataflow | 7 | 3 PT | archived/24 |
| 32 | bitv-audit-and-remediation | 7 | 3 PT | archived/24, 33 |
| 33 | i18n-de-en-foundation | 7 | 2.5 PT | archived/05/06/10/11 |
| 34 | methodenblatt-buerger | 7 | 1.5 PT | — |
| 36 | audit-key-management-and-hash-parity | 7 | 1.5 PT | archived/11 |
| 38 | rechtsgutachten-de-gpl-patent | 7 | 2 PT (eigene) + Wartezeit | — |

**Phase-B-Total: ≈ 13,5 PT**. Output: Pilot-Kommune kann das Verfahren rechtssicher einsetzen.

### Phase C — Pilot-Operativ

| ID | Slug | Track | Est | Deps |
| ---: | --- | ---: | ---: | --- |
| 35 | real-csv-adapters | 1 | 3 PT | archived/03/05 |
| 39 | panel-ops-ui-completion | 6 | 2 PT | archived/11/21/22/23 |
| 37 | pilot-akquise-loi-avv | 7 | 4 PT | 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 38, 39 |

**Phase-C-Total: ≈ 9 PT**. Output: 1 LOI mit deutscher oder österreichischer Pilot-Kommune.

### Phase D — Track 4 entblockt (nach Phase A+B+C)

Track 4 (Issues #12–#14, Engine B) entblockiert sich, sobald #37 + #38 abgeschlossen sind. Engine B ist post-Pilot-Vorbereitung — die 17 %-Fairness-Lücke (NF-1) wird damit geschlossen.

| ID | Slug | Track | Est | Deps |
| ---: | --- | ---: | ---: | --- |
| 12 | engine-b-pyodide-bootstrap | 4 | 2 PT | 37, 38 |
| 13 | engine-b-sortition-algorithms-integration | 4 | 3 PT | 12 |
| 14 | engine-swap-config | 4 | 0.5 PT | 13 |

### Iteration 2 Total

**Phase A+B+C: ≈ 30 PT (6–8 Wochen Vollzeit)**, plus externe Wartezeit (Rechtsgutachten 4–8 Wochen Kanzlei-Durchlauf, Pilot-Akquise 6–12 Wochen Stakeholder-Management).

**Phase D Engine B: ≈ 5,5 PT** kommt hinzu, sobald A+B+C abgeschlossen.

### Empfohlene Bearbeitungsreihenfolge (kürzeste Strecke zu Pilot)

1. **Sofort + parallel** (kein Wartezeit-Risiko):
   - #38 (Rechtsgutachten — Anwalts-Wartezeit)
   - #31 (DSFA-Template — externer Reviewer-Wartezeit)
   - #29 (Property-Tests — kleine Aufgabe, Auditfest-Maker)
   - #34 (Methodenblatt — externer Reviewer-Wartezeit)

2. **Engineering-Block (Phase A)**: 26 → 27 → 28 + 30 (parallel) → 19 ist abgeschlossen, also nur 26-30. Erste 2–3 Wochen.

3. **Compliance-Block (Phase B)**: 33 → 32 → 36 (in dieser Reihenfolge wegen Bibliotheks-/Tool-Auswahl-Abhängigkeiten). Parallel zu Phase A.

4. **Operativ (Phase C)**: 35 → 39 → 37 erst NACH Phase A+B (sonst kein verkaufbares Pilotbild).

5. **Phase D entblockt** sobald #37 unterschrieben.

## Datei-Konvention

Jedes Issue lebt in `.issues/NN-slug/ISSUE.md`. RESEARCH.md, PLAN.md, NOTES.md, STATUS.md werden bei Bedarf vom Executor daneben abgelegt (Issue-Skill-Konvention).

Reviews unter `reviews/iteration-2-issue-gaps/` werden bei jeder größeren Plan-Revision wiederholt (drei externe LLMs).
