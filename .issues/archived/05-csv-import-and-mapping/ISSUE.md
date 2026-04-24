---
id: 05
slug: csv-import-and-mapping
title: CSV-Import + Spalten-Mapping-UI
track: 1
estimate_pt: 2
deps: [02]
status: todo
blocks: [10]
---

# CSV-Import + Spalten-Mapping

## Kontext

Deutschsprachige Melderegister-/Rückläufer-Exports sind heterogen: Separator (Komma/Semikolon/Tab), Encoding (UTF-8/Windows-1252/ISO-8859-1), BOM, CRLF/LF, Spalten-Benennung divergiert pro Herstellersoftware. Erst-Pilot droht an Datenbereinigung zu scheitern, nicht am Solver (Codex M4 in `sortition-tool/06-review-consolidation.md`).

Iteration 1 löst **Parsing** + **manuelles Mapping** — nicht Domänenharmonisierung. Das reicht für synthetische Pools und Paper-Pools.

## Ziel

UI-Komponente zum CSV-Upload (Drag-and-Drop + File-Picker), automatische Header-Detektion, Preview der ersten Zeilen, Spalten-Mapping von CSV-Header → semantischer Feldname (`person_id`, `gender`, `age_band`, `education`, `migration_background`, `district`). Alle Daten bleiben im Speicher des Browser-Tabs (kein IndexedDB in Iteration 1).

## Akzeptanzkriterien

- [ ] Datei-Upload akzeptiert `.csv` und `.txt` (Drag-and-Drop + `<input type="file">`)
- [ ] Papaparse erkennt Separator automatisch; Fallback manuell
- [ ] Encoding: UTF-8 (inkl. BOM), Windows-1252, ISO-8859-1 werden erkannt und korrekt dekodiert
- [ ] CRLF/LF beide unterstützt
- [ ] Preview der ersten 10 Zeilen mit Original-Headern
- [ ] Mapping-UI: Dropdown pro Spalte mit allen semantischen Feldern + "(ignorieren)"
- [ ] Validierung: `person_id` muss gemappt sein, andere optional; Duplikate in `person_id` werden angezeigt
- [ ] In-Memory-Only: kein `localStorage`, kein `IndexedDB`, keine `fetch`-Requests nach Upload
- [ ] Playwright-E2E: lädt Fixture-CSV (#03), mappt automatisch, zeigt Preview

## Out of Scope

- Keine Herstellersoftware-Format-Adapter (EWO, MESO, VOIS, …) — das ist P1-2, Iteration 2+
- Keine Dubletten-Auflösung (nur Anzeige)
- Keine Rücklaufstatistiken
- Kein Encoding-Autodetect mit ICU (simple chardet heuristic reicht)

## Verweise

- `sortition-tool/06-review-consolidation.md` Codex M4
- Papaparse Docs für Streaming bei grossen Files (>10k Zeilen)
