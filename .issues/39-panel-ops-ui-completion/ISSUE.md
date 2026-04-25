---
id: 39
slug: panel-ops-ui-completion
title: Reroll/Replace/Extend als UI-Aktionen — #21/#22/#23 in den Browser bringen
track: 6
estimate_pt: 2
deps: [archived/11, archived/21, archived/22, archived/23]
status: todo
blocks: [37]
source: review-2026-04-25 (Claude #37)
---

# UI für Panel-Operationen

## Kontext

`docs/iteration-1-autorun-2026-04-24.md:30-32` markiert Issues #21/22/23 als "partial — UI-Action fehlt". Engine-Logik existiert in `packages/engine-a/src/panel-ops.ts` (`replaceSinglePerson`, `extendBy`); CLI-Wrapper existiert (`scripts/panel_ops_cli.ts`); aber `apps/web/src/run/RunPanel.tsx` hat keine entsprechenden Buttons.

Im realen Bürgerrats-Pilot-Workflow:

1. Lose ziehen → Einladungen verschicken
2. Erfahrungsgemäß ~30 % der Eingeladenen sagen ab
3. Nachrücker-Operation: Person ersetzen, Quoten halten (#22)
4. Auf Wunsch des Rats: Panel um N Plätze erweitern (#23)
5. Bei politischen Bedenken: neuer Lauf mit anderem Seed + Diff (#21)

Ohne diese drei UI-Aktionen ist die App im Pilot **operativ nicht ausreichend**. `archived/22-replace-single-person-nachruecker/ISSUE.md:14` selbst: "eine der meistgefragten Praxis-Operationen".

## Ziel

Drei zusätzliche Aktionen pro Run-Result im RunPanel: "Person ersetzen", "Panel erweitern", "Neu losen mit Diff". Audit-JSON erweitert um Operation-Historie.

## Akzeptanzkriterien

### UI

- [ ] `apps/web/src/run/RunPanel.tsx` erhält drei zusätzliche Aktionen pro Result-View:
  - **Replace** pro Panel-Zeile: "ersetzen"-Button → Dialog mit Grund-Feld → Result zeigt Nachrücker
  - **Extend** global: "Panel erweitern um N"-Button → Dialog mit N + Quoten-Skalierung-Vorschlag (gemäß `archived/23.../ISSUE.md:27-28`)
  - **Reroll** global: "Neu losen mit anderem Seed"-Button → neuer Seed + Diff-View
- [ ] **Replace-Dialog**: Person aus Panel auswählen, Grund-Feld optional. Result zeigt Nachrücker + Quoten-Status vorher/nachher (gemäß `archived/22.../ISSUE.md:30-31`)
- [ ] **Extend-Dialog**: N zusätzliche Plätze, Quoten-Skalierung mit Default-Vorschlag (linear) + Override-Möglichkeit. Result zeigt added members + alle ursprünglichen
- [ ] **Reroll-Diff-View**: zwei Panels nebeneinander, Diff-Liste "in 1, in 2, in beiden" (gemäß `archived/21.../ISSUE.md:25-27`)

### Audit-Erweiterung

- [ ] Audit-JSON-Schema erweitert um `events[]`:
  - Pro Operation: `{ type: 'reroll'|'replace'|'extend', timestamp, person_id?, n?, reason?, ... }`
- [ ] `docs/audit-schema.json` entsprechend erweitert
- [ ] `scripts/verify_audit.py` adaptiert: zeigt Operation-Historie in der Verifikations-Ausgabe

### Tests

- [ ] Unit-Tests für die UI-Komponenten (Vitest)
- [ ] Playwright-E2E pro Operation:
  - Replace: Person aus Panel entfernen, Nachrücker erscheint, Quoten ✓
  - Extend: 5 → 8 Personen, Diff sichtbar, Quoten ✓
  - Reroll: zwei Panels nebeneinander, Diff-Liste sichtbar
- [ ] Property-Test (zusammen mit #29): Replace/Extend halten Invarianten

## Out of Scope

- Multiple sequentielle Operations mit Audit-Chain (Iteration 3)
- Rückgängig-Operationen (kein Undo für Lose; das ist Audit-Sinn)
- Bulk-Replace (mehrere Absagen gleichzeitig) — Iteration 3
- Ablehnungsgründe-Statistik (out of scope der App)

## Verweise

- Iteration-1-Status: `docs/iteration-1-autorun-2026-04-24.md:30-32`
- Engine-Logik existiert: `packages/engine-a/src/panel-ops.ts`
- CLI-Wrapper: `scripts/panel_ops_cli.ts`
- Original-Issues: `.issues/archived/21-reroll-with-new-seed/ISSUE.md`, `.issues/archived/22-replace-single-person-nachruecker/ISSUE.md`, `.issues/archived/23-extend-panel-by-n-seats/ISSUE.md`
