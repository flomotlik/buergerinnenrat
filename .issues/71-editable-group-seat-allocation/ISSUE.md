---
id: '71'
title: 'Manuell editierbare Gruppen-Sitz-Allokation (Quoten-Override mit Audit)'
status: open
priority: high
labels:
- feature
- stage1
- stage3
- quotas
- audit
- ux
source: github
source_id: 5
source_url: https://github.com/flomotlik/buergerinnenrat/issues/5
---

## Kontext

Heute werden Quoten / Sitz-Allokationen pro Stratum (Geschlecht × Altersband × Bezirk × …) **statistisch aus der Pool-Verteilung abgeleitet** (proportional, mit Bounds aus `apps/web/src/quotas/model.ts:14-17`). Das ist der Default-Pfad: Bevölkerung → Sample → Quoten → Panel.

**Anforderung der zweiten Anwendungs-Organisation** (siehe #70): Sie wollen **gezielt von der proportionalen Verteilung abweichen** können. Konkretes Beispiel:

> "Mindestens 50 % aller ausgewählten Personen sollten unter 50 Jahre sein."

In der Bevölkerung sind je nach Gemeinde aber vielleicht nur 40 % unter 50. Eine rein proportionale Auswahl liefert dann 40 %. Die Anwender:innen wollen die statistische Auswertung als **Vorschlag** sehen, dann aber **manuell Sitze umschichten** können — z.B. "20 Sitze auf <50-Gruppe verschieben" — und dieses Override muss **vollständig nachvollziehbar im Audit** landen.

## Heutiger Stand im Code

- `apps/web/src/quotas/model.ts:14-17` — `QuotaConfig { panel_size, categories: CategoryQuota[] }` mit `bounds: Record<string, QuotaBound>` (min/max). Bounds sind heute schon manuell editierbar im `QuotaEditor.tsx`.
- `apps/web/src/quotas/QuotaEditor.tsx` — UI für die Quoten-Editing-Bounds existiert. **Was fehlt:** klare Anzeige der proportionalen Baseline, klarer Diff zur Override, Audit-Trail der Override-Operation.
- `apps/web/src/stage1/AxisBreakdown.tsx`, `Stage1Panel.tsx:982` — Stratum-Anzeige existiert ("Bevölkerungsgruppe (Stratum)" Spalte).
- Stage 3 (`packages/engine-a/src/engine.ts`) verwendet die Quoten als harte Constraints im Maximin-Solver.

**Was im Audit/Export heute steht** (zu prüfen): vermutlich nur die finale Quoten-Konfig, nicht "Baseline X / Override Y / Begründung Z".

## Ziel

Workflow-Erweiterung: Nach Stage-1-Sample und Quoten-Berechnung sieht der/die Anwender:in **klar nebeneinander**:

1. **Statistische Baseline** (proportionale Allokation aus Pool-Verteilung, aktuell die Default-Quote)
2. **Manueller Override** (editierbare Sitze pro Gruppe, mit Diff zur Baseline)
3. **Begründung** (Pflicht-Textfeld, wenn Override aktiv)

Override muss in **jedes Audit-Artefakt** einfließen: Manifest, signierte JSON-Exports, UI-Anzeige.

## Acceptance Criteria

### Daten-Modell

- [ ] `QuotaConfig` (oder neue Struktur `SeatAllocation`) erweitern um:
  - `baseline_seats: Record<string, number>` (statistisch berechnet, read-only nach Berechnung)
  - `override_seats: Record<string, number> | null` (vom User manuell gesetzt, sonst null = "kein Override")
  - `override_rationale: string | null` (Pflicht, wenn override_seats != null)
  - `override_timestamp: ISO-8601` (wann Override gesetzt)
- [ ] Validierung: `Σ override_seats == panel_size`, alle Werte ≥ 0, Begründung non-empty wenn Override aktiv
- [ ] Backward-Compat: bestehende QuotaConfig ohne diese Felder lesbar (Migration: alle drei Felder = null)

### UI — QuotaEditor / Stage1Panel

- [ ] **Drei-Spalten-Anzeige pro Gruppe**: Baseline | Override | Diff (mit Vorzeichen, Farbe)
- [ ] **Klarer "Override aktivieren"-Toggle** mit Warn-Hinweis: "Du weichst von der proportionalen Bevölkerungs-Verteilung ab. Diese Entscheidung wird im Audit dokumentiert."
- [ ] **Pflicht-Textfeld "Begründung"** — erscheint sobald Override aktiv, leer = Speichern blockiert
- [ ] **Constraint-Visualisierung**: wenn User auf Gruppe X +5 Sitze setzt, automatisch -5 auf andere Gruppen verteilen oder User explizit aufordern, anderswo zu reduzieren (Σ == panel_size)
- [ ] **Reset-Button** "Zurück zur statistischen Baseline" (override_seats = null, rationale = null)
- [ ] **Sichtbarkeit**: Override-Status auch in Stage 3 (Panel-Auswahl) und Ergebnis-View prominent angezeigt — nicht nur in Stage 1 versteckt

### Audit-Trail

- [ ] Audit-Manifest (`apps/web/src/stage1/audit-sign.ts` und Stage-3-Audit) enthält:
  - `seat_allocation.baseline` (proportionale Verteilung)
  - `seat_allocation.override` (manuelle Verteilung, falls gesetzt)
  - `seat_allocation.override_rationale` (Begründungs-Text, falls Override)
  - `seat_allocation.override_timestamp`
  - `seat_allocation.deviation` (pro Gruppe: Override − Baseline, in absoluten Sitzen UND in Prozent)
- [ ] **Signatur** (Ed25519/ECDSA, bestehend) deckt diese Felder mit ab — Override darf nicht ohne erneute Signatur geändert werden
- [ ] **CSV/JSON-Export** zeigt Override prominent — nicht nur in Manifest versteckt
- [ ] **Audit-Footer** (`apps/web/src/stage1/AuditFooter.tsx`) zeigt visuelle Indikation, wenn Override aktiv ist (z.B. Badge "Manuelle Sitz-Allokation aktiv — siehe Begründung")

### Algorithmus / Engine

- [ ] Engine A (`packages/engine-a/src/engine.ts:70-85`) akzeptiert override_seats als harte Constraint statt baseline_seats
- [ ] Falls override_seats infeasible (z.B. mehr Sitze für Gruppe X als Personen im Pool): klare Fehlermeldung **vor** Solver-Lauf, nicht erst durch ungelösten LP
- [ ] Quality-Metriken (`packages/metrics/`): zusätzlich zur min π auch `seat_allocation_drift` reporten (wie weit weicht Override von Baseline ab)

### Doku

- [ ] In-App-Doku-Eintrag (`apps/web/src/docs/`) beschreibt:
  - Wann Override sinnvoll ist (Beispiel: "min 50% unter 50")
  - Wann Override problematisch ist (verzerrt Repräsentativität — der Punkt von stratifizierter Auswahl)
  - Wie Override im Audit erscheint
- [ ] CLAUDE.md aktualisieren falls Workflow-Beschreibung ("ein-stufig vs. zwei-stufig") betroffen

### Tests

- [ ] Unit-Tests `quotas/model.test.ts`: Validierung override + baseline + rationale
- [ ] Engine-A-Tests: override constraints werden tatsächlich respektiert (klein-N golden tests)
- [ ] Playwright-e2e-Spec: kompletter Override-Flow (Toggle → Edit → Begründung → Sign → Export → Re-Verify)
- [ ] Audit-Verifikations-Test: ein Override-Manifest verifiziert sauber, ein manipuliertes (Override geändert ohne neue Sig) failt
- [ ] Test: Versuch Override zu speichern ohne Begründung → blockiert mit klarer Fehlermeldung

## Out-of-Scope

- Multi-User-Workflows (wer darf Override setzen? Approval-Chain?) — bleibt Single-User
- Override-History mit Undo-Stack — nur "letzter Override + Reset", keine Versionierung
- Algorithmische Auto-Justierung ("Wie viel Sitze muss ich shiften, damit min 50% unter 50 erreicht wird?") — könnte späteres Issue sein
- Keine Änderung an Stage-1-Sampling-Logik selbst — nur an der Sitz-Allokation in Stage 3

## Risiken / Offene Fragen

- **Repräsentativitäts-Trade-off**: Override widerspricht dem Prinzip der proportionalen Stratifikation. Doku muss diesen Trade-off klar benennen, sonst wird das Feature missbraucht.
- **Kombinatorik mit Bounds (min/max)**: heute haben Quoten min/max-Bounds. Override setzt einen exakten Wert. Verhältnis klären — überschreibt Override die Bounds, oder muss Override innerhalb von Bounds bleiben?
- **Mehr-dimensionale Strata**: Override pro 1-D-Achse (Alter ODER Bezirk ODER Geschlecht) ist ergonomisch. Override pro Stratum-Kombination (Alter × Bezirk × Geschlecht) explodiert kombinatorisch — vermutlich nur 1-D-Override anbieten, mit Auto-Verteilung über andere Achsen.
- **Audit-Signatur**: aktuell signiert Stage 1 die Versand-Liste, Stage 3 das Panel. Override gehört konzeptionell zu Stage 3 — dort einbauen.

## Bezug

- Folgt aus #70 (Personenauswahl-Use-Case) und #72 (Excel-Upload — die zweite Organisation lädt vermutlich Excel hoch)
- Berührt CLAUDE.md S-2 (Algorithmus-Scope) — Override-Constraints sind unabhängig von Maximin/Leximin-Wahl
