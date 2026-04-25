# Diskussion — Engine B Wert nach Zwei-Stufen-Analyse (2026-04-25)

## Anlass

`sortition-tool/07-two-stage-workflow-analysis.md` korrigiert die Pool-Größen-Annahme. Realer Stage-3-Pool ist 60–300 Personen.

## Auswirkung auf dieses Issue

**Engine B bleibt wertvoll**, aber aus anderen Gründen als ursprünglich begründet:

| Ursprüngliche Begründung | Status nach Reframing |
|---|---|
| "Engine A hat 17 % Fairness-Lücke, Engine B schließt sie" | Lücke vermutlich bei n≤150 deutlich kleiner. **Wert sinkt.** |
| "Kanonische Verifikations-Schiene für Audit" | Bleibt voll gültig. **Wert konstant.** |
| "Bundle 30–40 MB ist OK weil einmal pro Bürgerrat" | Bleibt richtig: Stage 3 läuft typischerweise einmal. **Wert konstant.** |
| "Drei-Wege-Vergleich A vs B vs C als datengetriebene Engine-Wahl" | Vergleich auf realer Pool-Größe (60–300) entscheidet jetzt zwischen "A reicht" und "B nötig". **Wert sogar gestiegen** als Entscheidungsgrundlage. |

## Konkrete Empfehlung

Phasen 42a/42b/42c unverändert ausführen, aber:

1. **Phase 42b**: sortition-algorithms-Aufruf auf realistischen Pool-Größen (60–150) testen, nicht nur 200+
2. **Phase 42c**: Drei-Wege-Vergleich mit Pool-Größen-Sweep `n ∈ {60, 100, 150, 200, 300}` statt nur "example_small_20 + kleinstadt-100"
3. End-Report-Empfehlung: "Engine A Default für UI-Vorschau, Engine B Default für finalen Audit" — **wenn** Lücke an n≤150 noch >2 % ist. Sonst Engine A komplett ausreichend.

## Pyodide-Bundle-Größe

Bleibt 30–40 MB. Das ist akzeptabel **wenn** Stage 3 nur einmal pro Bürgerrat läuft (Standard-Praxis). Wenn die App im interaktiven Stage-1-Mode (täglich, Vorab-Simulation) läuft, müsste Engine B lazy-geladen werden — Vorschlag für 42c: Engine-Wahl-Switch in UI, Pyodide nur bei expliziter Aktivierung laden.
