# Research — #64 Sample-Size-Vorschlag

> Schmaler Plan, fokussiert.

## Konkrete Touched-Locations

<interfaces>

### Neue pure-Funktion
- `packages/core/src/stage1/sample-size.ts`:
  - `OutreachMode = 'mail-only' | 'mail-plus-phone' | 'custom'`
  - `OUTREACH_DEFAULTS: Record<OutreachMode, { rateMin: number; rateMax: number; rateAvg: number; label: string }>` — vordefiniert
  - `SampleSizeProposal = { recommended: number; range: [number, number]; rateUsed: { min: number; max: number; avg: number }; safetyFactor: number }`
  - `suggestSampleSize(panelSize: number, mode: OutreachMode, customRates?: { min, max }, safetyFactor?: number): SampleSizeProposal`
- Re-export aus `packages/core/src/stage1/index.ts`

### Neue UI-Komponente
- `apps/web/src/stage1/SampleSizeCalculator.tsx` (Solid)
  - Props: `onChange: (recommended: number, proposal: SampleSizeProposal | null) => void`, `poolSize: number | null`
  - Internal Signals: panelSize, outreach, customMin, customMax
  - Live-Berechnung via createMemo
  - "Vorschlag übernehmen"-Button + Auto-Sync-Toggle (default an)

### Stage1Panel-Integration
- `apps/web/src/stage1/Stage1Panel.tsx`:
  - Neue Sektion zwischen "1. Melderegister-CSV hochladen" und "2. Stratifikation konfigurieren"
  - Schritt-Renumbering: "2. Bemessung der Stichprobe" / "3. Stratifikation" / "4. Stichprobengröße und Seed"
  - Auto-Sync mit setTargetN nach Vorschlag-Annahme
  - Manual-Override-Erkennung: wenn User N händisch ändert ABWEICHEND vom letzten Vorschlag → flag setzen

### Audit-Doc-Erweiterung
- `packages/core/src/stage1/types.ts`:
  - Schema-Bump 0.3 → 0.4
  - Neues optionales Feld `sample_size_proposal?` (typed)
  - Neues Feld `sample_size_overridden?: boolean` — true wenn manuell anders als Vorschlag

### UI: Audit-Footer + Markdown
- `apps/web/src/stage1/AuditFooter.tsx` neue Sektion "Bemessung" wenn proposal vorhanden
- `packages/core/src/stage1/reporting.ts` `stage1ToMarkdownReport` analog

</interfaces>

## Berechnungs-Detail

```
proposal:
  range_min = ceil(panelSize / rateMax)            // optimistisch
  range_max = ceil(panelSize / rateMin × safetyFactor)  // konservativ
  recommended = round(panelSize / rateAvg × safetyFactor / 10) × 10
```

Default-safetyFactor: 1.5

Beispiele:
- Panel 30, mail-plus-phone (avg 0.40), factor 1.5: rec = round(30/0.40 × 1.5 / 10) × 10 = round(112.5/10) × 10 = 110
- Panel 30, mail-only (avg 0.07), factor 1.5: rec = round(30/0.07 × 1.5 / 10) × 10 = round(642.86/10) × 10 = 640
- Panel 160, mail-plus-phone (avg 0.40), factor 1.5: rec = 600
- Panel 160, mail-only (avg 0.07): rec = 3.430

## Risiken

1. **State-Sync**: User ändert Vorschlag-Inputs → recommended ändert sich → soll N-Feld auto-updaten? Nur wenn User N noch nicht manuell editiert hat. Track `manualOverride: Signal<boolean>`.
2. **Pool zu klein**: bei kleiner CSV (z.B. 1.000) und großem Panel-Wunsch (30 mail-only → 640 Briefe nicht möglich). Warnung statt blockieren.
3. **Custom-Mode Edge**: customMin > customMax → Validation-Error.
4. **Schema-Bump 0.4**: alte 0.3-Audits valid bleiben. Lese-Code muss optional handlen.
