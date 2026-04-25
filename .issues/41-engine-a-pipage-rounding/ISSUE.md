---
id: 41
slug: engine-a-pipage-rounding
title: Engine A — Pipage-Rounding für deterministische Panel-Auswahl
track: 2
estimate_pt: 1.5
depends_on: [40]
status: open
blocks: [27]
priority: high
priority_rationale: "P1 — war in #08-Akzeptanzkriterien, nicht implementiert"
---

# Engine A: Pipage-Rounding

## Kontext

Issue #08 (`/.issues/archived/08-engine-a-highs-maximin/ISSUE.md:32`) hatte als Akzeptanzkriterium: "Pipage-Rounding auf der resultierenden Verteilung". **Wurde nicht implementiert** — Iteration 1 sampled stattdessen ein Komitee aus der LP-Verteilung mit `seedrandom`. Beleg: `packages/engine-a/src/engine.ts:181-194`, plus eigener Kommentar in `engine.ts:31-37`:

> "Wir machen *nicht* Pipage-Rounding für Iteration 1 — sample ein Komitee aus der diskreten Verteilung gibt korrekte Marginale in Erwartung."

Das ist algorithmisch ehrlich, aber operativ schlechter:
- **Sampling** (heute): jeder Lauf zieht ein zufälliges Komitee aus der LP-Verteilung. Die Marginale stimmen "in Erwartung" über viele Läufe, aber pro einzelnem Lauf kann das Panel überraschende Quoten-Über-/Unter-Erfüllung haben (im Rahmen der Quota-Constraints, aber an den Rändern).
- **Pipage-Rounding** (Paper-Standard): deterministisches Verfahren, das aus der LP-Verteilung **ein** konkretes Panel mit minimaler quadratischer Abweichung von den LP-Marginalen produziert. Reproduzierbar, ohne Sampling-Varianz.

## Ziel

Pipage-Rounding-Algorithmus implementieren, als Default für die Panel-Auswahl. Sampling bleibt als optionaler Modus (für Multi-Seed-Vergleichsläufe).

## Acceptance Criteria

- [ ] `packages/engine-a/src/pipage-rounding.ts`:
  - Input: LP-Marginale `π: person_id → [0, 1]` + Komitees + ihre LP-Wahrscheinlichkeiten
  - Output: ein konkretes Panel als `Set<person_id>` mit `|Panel| = panel_size`
  - Algorithmus: iterativ, in jedem Schritt zwei fraktionale Marginale auf {0, 1} runden, so dass die Constraints erhalten bleiben
- [ ] `packages/engine-a/src/engine.ts` `RunResult` enthält neues Feld `selection_method: 'pipage' | 'sampled'` mit Default `'pipage'`
- [ ] CLI-Flag in `scripts/run_engine_a.ts`: `--selection sampling` für Vergleichsmodus
- [ ] Tests:
  - Unit: bei pure-integer LP-Lösung (alle π ∈ {0, 1}) ist Pipage-Output exakt der Integer-Vektor
  - Unit: pipage-output erfüllt alle Quoten-Constraints
  - Property: `|expected_marginals[i] - 1[i ∈ pipage_panel]| ≤ 1` (Pipage-Garantie)
  - Determinismus: gleicher LP-Output → gleiches Pipage-Panel (kein RNG)
- [ ] Audit-JSON-Schema-Update (`docs/audit-schema.json`): `selection_method`-Feld mit den zwei zulässigen Werten
- [ ] `docs/quality-comparison-iteration-1.md` ergänzt um Tabelle "Pipage vs Sampling" für `min_pi`-Varianz und Quoten-Abweichung

## Out of Scope

- Andere Rounding-Verfahren (z.B. Dependent-Rounding, BNS-Rounding) — Pipage reicht für Iteration 2
- Panel-Stratification über Pipage hinaus (ist im Paper als Erweiterung beschrieben, nicht Iteration-2-Ziel)

## Verweise

- Originale Forderung: `.issues/archived/08-engine-a-highs-maximin/ISSUE.md:32`
- Aktuelle Sampling-Logik: `packages/engine-a/src/engine.ts:181-194`
- Paper: Flanigan et al. 2021, Methods §"Pipage rounding"
