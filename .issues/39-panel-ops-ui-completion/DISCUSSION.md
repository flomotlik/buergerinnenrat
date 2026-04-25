# Diskussion — Replace ohne Reserve-Liste ist halb (2026-04-25)

## Anlass

`sortition-tool/07-two-stage-workflow-analysis.md` zeigt: Replace gehört zu **Stage 4** (Mid-Process-Drop-Out). Standard-Praxis (Sortition Foundation, OECD): **Reserve-Liste** parallel zum Hauptpanel ziehen, bei Drop-out aus Reserve mit Stratum-Match nachziehen — **nicht** durch Re-Run der Sortition.

## Code-Stand

`packages/engine-a/src/panel-ops.ts:27-89` zieht heute Replacement aus dem **gesamten Pool**, ohne Stratum-Filter und ohne Reserve-Konzept. Das ist nicht das, was die Praxis macht — es ist eine simulierte Re-Selektion.

## Auswirkung auf dieses Issue

Die UI-Aktion "Replace" ist heute halb-funktional:
- ✓ Person markieren als "fällt aus"
- ✗ Stratum-passenden Ersatz aus **Reserve** ziehen (Reserve existiert nicht)
- ✓ Re-Lauf mit Force-In/Force-Out (das ist aber nicht das, was die Praxis macht)

## Optionen

**A.** Issue unverändert ausführen (Re-Run-Replace), als "Notlösung" markieren bis Reserve-Liste-Workflow (#48 vorgeschlagen) gebaut ist.

**B.** Issue erweitern: Replace nimmt einen **Reserve-Liste-Parameter**, fällt auf Re-Run nur als Fallback zurück. Voraussetzung: Datenmodell-Erweiterung um `is_reserve`-Flag oder eigene Reserve-Liste-Datenstruktur.

**C.** Issue pausieren bis Track Z (Stage 1 + Reserve) entschieden ist.

## Vorschlag

**A** für Iteration 2 ausführen (UX-Wert: User sieht zumindest, was passiert wenn jemand absagt), aber im End-Report explizit als "noch nicht praxis-konform — Track Z folgt" markieren.
