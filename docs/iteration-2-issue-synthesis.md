# Iteration-2 Issue-Synthese aus externem LLM-Review

**Stand:** 2026-04-25.
**Methode:** `/issue:review --topic` mit Claude Opus 4.7, OpenAI Codex gpt-5-4 und Google Gemini 3 Pro Preview parallel. Reviews unter `reviews/iteration-2-issue-gaps/`.

## Verdikte

| Reviewer | Modell | Verdikt | Critical | High | Medium |
| --- | --- | --- | ---: | ---: | ---: |
| Claude | opus-4-7 | **FAIL** | 6 | 3 | 2 |
| OpenAI Codex | gpt-5-4 | **FAIL** | 4 | 4 | 0 |
| Google Gemini | gemini-3-pro-preview | **FAIL** | 3 | 4 | 2 |

**Konsens: alle drei sagen, der aktuelle Iteration-1-Stand ist nicht pilot-tauglich.** Die genaue Liste der Lücken konvergiert weitgehend.

## Konvergente Findings (alle drei einig)

### F1 — Worker-Isolation fehlt

`apps/web/src/run/runEngine.ts:19-46` ruft `engine.run()` direkt im Main-Thread. Issue #08 hatte das ursprünglich gefordert, wurde nicht umgesetzt. Bei Pool-Größe ≥ 500 friert die UI ein, Cancel-Button wird unbedienbar. **→ Issue #26.**

### F2 — Statistische Belastbarkeit unzureichend

5 Seeds × 2 kleine Pools ist zu dünn für eine Aussage "Engine A weicht um X % ab" (Standardfehler ~0.45σ, nicht von Rauschen unterscheidbar). **→ Issue #28.**

### F3 — Cross-Runtime Person-Level-Drift unbeantwortet

`scripts/compare_runs.py:121-154` aggregiert nur Skalare. Die wissenschaftlich fundamentale Frage "bekommen Sub-Gruppen mit Engine A substanziell andere Auswahlchancen als mit Reference C?" ist nicht messbar. **→ Issue #27.**

### F4 — Property-Tests fehlen

#09 ist deferred (`.issues/09-engine-a-property-tests/STATUS.md`). Die 11 Hand-Tests in `packages/engine-a/tests/` decken Edge-Cases nicht ab. Vor Audit-fähigem Pilot Pflicht. **→ Issue #29.**

### F5 — DSFA fehlt komplett

P1-1 aus `06-review-consolidation.md`. Eine deutsche Kommune darf die App ohne DSFA nicht für Melderegister-Verarbeitung einsetzen. **→ Issue #31.**

### F6 — BITV 2.0 nur Smoke

`apps/web/tests/e2e/a11y.spec.ts:3-31` ist explizit "lightweight smoke check". Echte BITV-Konformität verlangt WCAG-2.1-AA + EN 301 549 + Erklärung zur Barrierefreiheit. **→ Issue #32.**

### F7 — i18n fehlt komplett

UI ist hart-kodiert deutsch. ~80–250 Strings (Codex zählte 247, Gemini 49 Schlüssel-Strings) in 6 Source-Dateien. **→ Issue #33.**

### F8 — Methodenblatt fehlt

P1-4. Bürger:innen können das Verfahren nicht eingeordnet bekommen. **→ Issue #34.**

## Findings nicht-trivial

### F9 — Echte Kommunal-CSV-Adapter (Codex, Gemini einig)

`apps/web/src/csv/parse.ts` handled UTF-8/Win-1252 + Auto-Separator, aber keine Format-Presets. EWO/MESO/VOIS-Exports der Kommunen sind komplexer. **→ Issue #35.**

### F10 — Audit-Key-Management ist Demo-Niveau (Codex, Gemini einig)

Frische Ephemeral-Keypairs pro Lauf. Für Audit-Compliance braucht's kommunal-vergebene Schlüssel. Plus: keinen Golden-Test, der TS- und Python-Hash-Implementierungen vergleicht. **→ Issue #36.**

### F11 — Pilot-Akquise als Prozess fehlt (Claude, Gemini einig)

S-4 in `CLAUDE.md` offen. Ohne Owner + Deadline passiert keine Akquise. **→ Issue #37.**

### F12 — Rechtsgutachten fehlt (Claude, Gemini einig)

S-1 + S-6. GPL-3.0 ist deklariert, aber nicht juristisch fundiert. Apache-2.0-Endziel ohne Gutachten unerreichbar. **→ Issue #38.**

### F13 — UI für Replace/Extend/Reroll (Claude only, aber Pilot-Operativ-blockend)

Engine-Level-Logik existiert (`packages/engine-a/src/panel-ops.ts`). UI-Schicht fehlt. Im Bürgerrats-Workflow nicht-optional. **→ Issue #39.**

### F14 — Native-HiGHS Large-Pool-Benchmark (Claude only)

`example_large_200` (n=2000) Reference C >20 min, kein Abschluss. Pool-Größen, ab denen welche Engine produktionsreif ist, sind nicht festgestellt. **→ Issue #30.**

## Codex-Behauptung, die sich als falsch erwies

Codex behauptete einen konkreten Bug: TS- und Python-Implementierungen von `input_sha256` würden Pool und Quotas mit unterschiedlichen Separatoren joinen. **Geprüft im Code (`apps/web/src/run/audit.ts:68-71` vs. `scripts/verify_audit.py:113-115`)**: beide nutzen leeren String-Concat. Der konkrete Separator-Mismatch existiert nicht.

**Aber**: die generelle Codex-Aussage "es gibt keinen Golden-Test, der die beiden Hash-Implementierungen byte-für-byte vergleicht" stimmt. Edge-Cases in Unicode/Float-Formatierung könnten zu echtem Drift führen. **→ Issue #36 enthält den Golden-Test.**

## Priorität (kürzeste Strecke zum Pilot)

Synthese aus den drei "priority_order"-Listen der Reviewer:

### Sofort + parallel (externe Wartezeit absorbieren)

1. **#38 Rechtsgutachten** — Kanzlei-Durchlauf 4–8 Wochen
2. **#31 DSFA-Template** — externer Reviewer 2–4 Wochen
3. **#34 Methodenblatt** — Bürgerrats-Praxis-Reviewer + Leichte-Sprache-Prüfung 2–4 Wochen

### Engineering-Block Phase A (Vergleichsdaten)

Reihenfolge: **#26 → #27 → #28 + #30 parallel → #29**. Etwa 7,5 PT, 2–3 Wochen Vollzeit.

### Compliance-Block Phase B

**#33 → #32 → #36** parallel zu Phase A. Etwa 7 PT für 33+32+36, 2–3 Wochen.

### Pilot-Operativ Phase C

**#35 → #39 → #37**. #37 (Pilot-Akquise) ist Wartezeit-dominiert, läuft schon ab Tag 1 latent — der Akquise-Block beginnt aber erst, wenn #31, #32, #33, #34 ein verkaufbares Compliance-Pflanzenpaket bilden.

### Phase D — Engine B nur nach Phase A+B+C

**#12 → #13 → #14**. Engine-B-Investition macht erst Sinn, wenn (a) Pilot-Kommune steht, (b) Compliance-Paket existiert, (c) #38 zeigt, dass GPL-Pyodide-Pfad rechtlich tragfähig ist.

## Was nicht als neues Issue angelegt wurde

Bewusste Auslassung folgt der "Über-Engineering-Schutz"-Heuristik aus dem Review-Prompt:

- **#16 Gurobi-free-Leximin-Port**: bleibt Iteration-3-Forschung. Vor Pilot kein Wert.
- **Multi-Threading** der TS-Engine jenseits Worker: kein Issue. Aktueller Single-Thread+Worker reicht für n≤2000.
- **Bayesian Fairness Audits / Power-Analysen**: Iteration 3.
- **Internationale Pilot-Kommunen**: DE+AT reicht für Iteration 2.
- **Hardware-Token / PKI**: Iteration 3+.
- **API-Pull aus Melderegister-Systemen**: Iteration 4+.

## Iteration-2-Total

**30 PT Engineering + Wartezeit Rechtsgutachten/Pilot-Akquise.** Realistisch 8–12 Kalenderwochen bei Solo-Consultant-Einsatz.

Engine B (Phase D, +5,5 PT) kommt nach erstem Pilot.
