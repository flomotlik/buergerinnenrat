# Research — #62 Altersgruppe-Derived + Bands-Editor + Pool-Filter

## Konkrete Touched-Locations

<interfaces>

### CSV-Parser (apps/web/src/csv/parse.ts)
- `ParsedCsv` interface — Feld `derivedColumns: string[]` ergänzen
- `parseCsvFile` — nach Parse, falls `geburtsjahr` in headers: per-Zeile altersgruppe-String berechnen, header `altersgruppe` an Liste anfügen
- Default-Bands (für Initial-Computation): `[unter-16, 16-24, 25-44, 45-64, 65+]` mit modes `[display, selection, selection, selection, selection]`
- `DEFAULT_GUESS` Map: `altersgruppe: 'age_band'` ergänzen (ist die einzige Mapping-Erweiterung)

### Neue Datei `apps/web/src/csv/derive.ts`
- `AgeBand` type: `{ min: number; max: number | null; label: string; mode: 'selection' | 'display-only' }`
- `DEFAULT_AGE_BANDS: AgeBand[]` — 5 Stück
- `deriveAltersgruppe(geburtsjahr: string, refYear: number, bands: AgeBand[]): string | null` — gibt Label des matchenden Bands zurück, null bei nicht-parsbar
- `validateBands(bands: AgeBand[]): string | null` — gibt Fehler-Message bei Overlaps/Lücken/Sortierungs-Bug, sonst null
- `recomputeAltersgruppe(rows, bands, refYear)` — re-derivied alle Zeilen

### AxisPicker / Bands-Editor (neue UI in Stage1Panel)
- `apps/web/src/stage1/AgeBandsEditor.tsx` — neue Komponente
  - Props: `bands: AgeBand[]; onBandsChange: (b: AgeBand[]) => void; refYear: number`
  - Pro Band: min-Input, max-Input (oder "open"), label-Input, mode-Toggle (Auswahl/Anzeige), entfernen-Button
  - Buttons: "Band hinzufügen", "Vorschlag wiederherstellen"
  - Validation-Anzeige
- Eingebunden in Stage1Panel.tsx unterhalb AxisPicker, nur sichtbar wenn `parsed().derivedColumns.includes('altersgruppe')`
- Bei Bands-Änderung: `recomputeAltersgruppe` wird aufgerufen, parsed-Signal aktualisiert

### Stage 1 Pipeline (Pool-Filter)
- Stage1Panel: vor `stratify()` filtere Pool nach Selection-Bands
- `runStage1` braucht zusätzlich: `bands: AgeBand[]` parameter
- Original-Pool-Größe + gefilterte Größe als Audit-Info aufbewahren

### Audit-Doc (packages/core/src/stage1/types.ts)
- `Stage1AuditDoc` neue optionale Felder:
  - `derived_columns?: Record<string, { source: string; description: string; bands?: AgeBand[] }>`
  - `pool_filter?: { original_size: number; filtered_size: number; filter_axis: string; excluded_bands: string[] }`
- AgeBand Type-Re-Export von packages/core

### Reporting für Info-only-Bands
- Stage1Panel Result-View: neue Sektion `<InfoOnlyBandsReport bands={...} originalPool={...} targetN={...}/>` 
- Pure Helper in core/reporting.ts: `infoOnlyBandsReport(bands, originalRows, geburtsjahrColumn, targetN)` — gibt pro display-only-Band: count, hypothetical_soll
- Markdown-Bericht erweitern

### Tests
- Vitest für derive.ts (alle Edge-Cases)
- Vitest für validateBands
- Vitest für CSV-parse mit derived
- Playwright: AgeBandsEditor sichtbar, default 4 selection + 1 display, Bands editierbar, ungültige Konfig disabled run, modus-Toggle ändert filtered-pool-Anzeige

</interfaces>

## Architektur-Empfehlung

Commit-Aufteilung:
1. `feat(csv): derive altersgruppe from geburtsjahr (#62)` — derive.ts + parse.ts + tests
2. `feat(stage1): age bands editor with selection vs display-only modes (#62)` — AgeBandsEditor.tsx + Stage1Panel-Integration + Pool-Filter
3. `feat(stage1): info-only bands report + audit transparency (#62)` — reporting + audit doc + UI footer + Markdown
4. `test(stage1): e2e for bands editor, default axes, pool filter (#62)` — Playwright

## Risiken

1. **State-Synchronisation**: Bands ändern → derived altersgruppe ändern → AxisPicker reaktiv → preview reaktiv. Solid-Reactivity sollte das transparent machen, aber Test sorgfältig.
2. **Validation während Tippen**: User tippt Min "1" und meint "10". Während des Tippens muss UI nicht panisch werden — nur on-blur validieren oder mit debounce.
3. **Default-Bands bei Datei ohne geburtsjahr**: AgeBandsEditor versteckt, AxisPicker default-Auswahl ohne altersgruppe. Sollte natürlich ohne crash funktionieren.
4. **Audit-Schema-Bumping**: schema_version 0.2 → 0.3 (breaking shape change). Alte signed audits können nicht mehr re-played werden.
