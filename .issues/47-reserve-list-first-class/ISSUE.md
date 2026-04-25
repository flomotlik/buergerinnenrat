---
id: 47
slug: reserve-list-first-class
title: Reserve-Liste als first-class Konzept (parallel zum Hauptpanel ziehen)
track: Z
estimate_pt: 1.5
status: open
depends_on: [46]
priority: high
priority_rationale: "Standard-Praxis bei realen Verfahren — Replace ohne Reserve ist nicht praxis-konform"
---

# Reserve-Liste

## Kontext

Sortition Foundation und alle DACH-Bürger:innenrats-Träger arbeiten mit einer **Reserve-Liste** parallel zum Hauptpanel: typischerweise gleich groß (30 Panel + 30 Reserve). Wenn ein Panel-Mitglied absagt, wird aus der Reserve nachgezogen, mit Stratum-Match. Heute zieht die App Replacement aus dem gesamten Pool ohne Stratum-Filter (`packages/engine-a/src/panel-ops.ts:27-89`) — das ist nicht das, was die Praxis macht.

## Ziel

Bei jedem Stage-3-Lauf wird optional auch eine Reserve-Liste konfigurierbarer Größe gezogen, mit der gleichen Stratifikation wie das Hauptpanel. Reserve wird im Verfahren-State (#46) persistiert. Drop-out-Replacement zieht erst aus Reserve, dann aus Antwortenden-Pool als Fallback.

## Acceptance Criteria

- [ ] Stage-3-Run akzeptiert Parameter `reserve_size: number` (Default = panel_size)
- [ ] Engine wählt Hauptpanel (panel_size Personen) **plus** Reserve (reserve_size Personen) in einem Lauf, alle disjunkt, alle quotenkonform
- [ ] Reserve-Personen sind im Audit-Output explizit als `role: "reserve"` markiert, Hauptpanel als `role: "panel"`
- [ ] UI zeigt zwei Listen: "Panel" (30 Personen) und "Reserve" (30 Personen), beide exportierbar
- [ ] Verfahren-State (#46) speichert beide Listen mit Stratum-Annotation pro Person
- [ ] Replace-Operation (siehe #48) zieht erst aus Reserve mit Stratum-Match, fällt erst dann auf Re-Run zurück
- [ ] Tests: Hauptpanel + Reserve sind disjunkt, beide quotenkonform, Reserve hat Stratum-Verteilung kompatibel zum Hauptpanel
- [ ] Falls Pool zu klein für panel + reserve: klare UI-Fehlermeldung "Pool zu klein, max. mögliche Reserve-Größe ist X"

## Out of Scope

- Mehrstufige Reserve (Reserve der Reserve)
- Reserve mit anderen Quoten als Hauptpanel
- Reserve-Personen anschreiben/benachrichtigen (extern)

## Verweise

- Standard-Praxis: `sortitionfoundation.org/how`
- Aktuelle Replace-Implementierung: `packages/engine-a/src/panel-ops.ts:27-89`
- Architektur: `sortition-tool/08-product-redesign.md`
- Abhängig von: #46 (State-Datei muss Reserve-Liste persistieren können)
