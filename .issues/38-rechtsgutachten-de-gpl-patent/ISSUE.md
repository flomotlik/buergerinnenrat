---
id: 38
slug: rechtsgutachten-de-gpl-patent
title: Rechtsgutachten DE — §69c UrhG, GPL/Pyodide-Kombination, Patent-FTO Procaccia/Flanigan
track: 7
estimate_pt: 2
deps: []
status: todo
blocks: [12, 37]
source: review-2026-04-25 (Claude #36, Gemini #26-07 (kombiniert))
---

# Rechtsgutachten DE

## Kontext

Strategische Entscheidungen S-1 + S-6 in `CLAUDE.md` sind offen. P1-6 in `sortition-tool/06-review-consolidation.md`. Ohne dieses Gutachten:

- bleibt **S-1 (Lizenz-Pfad)** blockiert. Die Iteration-1-Deklaration `GPL-3.0-or-later` ist Arbeitshypothese, nicht juristisch fundiert. Apache-2.0-Endziel ist nicht erreichbar ohne Klärung von §69c UrhG für Pyodide+GPL-Library-Bündel.
- bleibt das **Patent-Risiko (Procaccia/Flanigan, Nature 2021)** ungeklärt. Algorithm-Variant-Strategie ohne FTO-Prüfung ist Glücksspiel.
- weiß die Kommune nicht, ob **GPL-Auslieferung sie selbst zur GPL-Distribution zwingt** (relevant bei Forks, Anpassungen, Eigenbetrieb).

Das Issue ist "bestelle ein Gutachten" — die juristische Arbeit macht eine Anwaltskanzlei. Aber ohne Issue mit Owner passiert nichts.

## Ziel

Schriftliches Gutachten von einer DE-IT-Recht-Kanzlei mit OSS- und Patent-Erfahrung. Ergebnis schließt S-1 und S-6 in `CLAUDE.md`.

## Akzeptanzkriterien

- [ ] **Kanzlei-Auswahl**: 2–3 deutsche IT-Recht-Kanzleien mit OSS- und Patent-Erfahrung identifiziert. Kandidaten: JBB Rechtsanwälte (Berlin, Till Jaeger), Osborne Clarke (Köln), Olswang/CMS (Frankfurt), je nach Spezialisierung
- [ ] **Anfragepaket vorbereitet** in `docs/legal/anfrage-paket/`:
  - Repo-Snapshot (z.B. via `git archive --format=tar HEAD | gzip` als Anhang)
  - `sortition-tool/00-masterplan.md` + `06-review-consolidation.md`
  - `docs/upstream-verification.md` (welche Library mit welcher Lizenz)
  - `docs/iteration-1-findings.md` (warum die Frage relevant ist)
  - Konkrete Fragen-Liste:
    1. Ist Pyodide+`sortition-algorithms` (GPL-3.0) im Browser-Bundle ein "combined work" nach UrhG §69c und GPL §5?
    2. Wenn ja: Welche Lizenz darf der Auslieferungsstapel haben? GPL-3.0-only, GPL-3.0-or-later, dual-license?
    3. Verpflichtet die Auslieferung an eine Kommune diese zur GPL-Distribution bei Forks/Anpassungen?
    4. Welche Patente in der Procaccia/Flanigan-Linie (Nature 2021) sind in DE/EU registriert? FTO-Analyse für unsere Maximin-Implementation
    5. Mitigation-Optionen, falls Patent-Konflikt: Algorithm-Variant, Lizenzierung, Defensive-Patent-Network?
    6. Apache-2.0-§3-Klarstellung: schützt sie vor Contributor-Patenten oder auch vor Drittpatent-Klagen?
- [ ] **Kostenindikation**: Angebote von 2 Kanzleien eingeholt; Budget-Entscheidung dokumentiert in `docs/legal/budget.md`
- [ ] **Auftrag erteilt**: Bestätigung in `docs/legal/auftrag.md`
- [ ] **Gutachten erhalten** und abgelegt unter `docs/legal/rechtsgutachten-2026-XX.pdf` (oder Datum)
- [ ] **Folgeentscheidungen dokumentiert** in `docs/legal/folgerungen.md`:
  - Lizenz-Entscheidung S-1 abschließend (GPL-3.0-only, GPL-3.0-or-later, dual)
  - Wenn Patent-Risk: Mitigationsplan
  - Auswirkungen auf Engine B (#12-#14): geht der Pyodide-Ansatz oder muss Clean-Room-TS-Port priorisiert werden
- [ ] `CLAUDE.md` Strategische Entscheidungen: S-1 und S-6 markiert "geschlossen mit Verweis auf folgerungen.md"

## Out of Scope

- Markenrecht (separater Workstream, falls überhaupt nötig für Iteration 2)
- AGB-Erstellung (kommt mit S-5 Geschäftsmodell)
- Patent-Anmeldung (offensives Patent ist Iteration 3+)
- Verfassungsmäßigkeit Bürgerrats-Algorithmus (Forschungsfrage, kein Issue)

## Verweise

- S-1, S-6: `CLAUDE.md`
- P1-6, A2: `sortition-tool/06-review-consolidation.md`
- Lizenz-Stand Iteration 1: `package.json:5` und Kindern (alle GPL-3.0-or-later deklariert)
