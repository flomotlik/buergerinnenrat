# Plan — #64 Stichprobengröße-Vorschlag

> Schmaler Plan, ein Commit am Ende.

## Tasks

<task id="1">
**Pure-Funktion `suggestSampleSize` + Outreach-Modi**

Datei: `packages/core/src/stage1/sample-size.ts`
- `OutreachMode = 'mail-only' | 'mail-plus-phone' | 'custom'`
- `OUTREACH_DEFAULTS: Record<...>`:
  - `mail-only`: rateMin 0.05, rateMax 0.10, rateAvg 0.07, label "Nur Briefe"
  - `mail-plus-phone`: rateMin 0.30, rateMax 0.50, rateAvg 0.40, label "Briefe + Telefon-Nachfasser"
- `SampleSizeProposal` Type
- `suggestSampleSize(panelSize, mode, customRates?, safetyFactor=1.5)`:
  - rates = mode==='custom' ? customRates : OUTREACH_DEFAULTS[mode]
  - validate rates: 0 < rateMin <= rateMax <= 1; sonst null
  - range_min = ceil(panelSize / rates.max)
  - range_max = ceil(panelSize / rates.min × safetyFactor)
  - recommended = round(panelSize / rates.avg × safetyFactor / 10) × 10
- Re-export aus `packages/core/src/stage1/index.ts`

**Vitest** in `packages/core/tests/stage1-sample-size.test.ts`:
- Panel 30, mail-plus-phone → recommended 110, range [60, 150]
- Panel 30, mail-only → recommended ~640, range [300, 900]
- Panel 160, mail-plus-phone → recommended 600
- Custom-Modi mit gültigen + ungültigen Rates
- Edge: panelSize=0 → range [0,0], recommended 0
- Edge: panelSize negativ → null

**Verify:** `pnpm --filter @sortition/core test`
</task>

<task id="2">
**SampleSizeCalculator UI-Komponente**

Datei: `apps/web/src/stage1/SampleSizeCalculator.tsx` (Solid)

Props:
```
{
  poolSize: () => number | null;
  onAccept: (recommended: number, proposal: SampleSizeProposal) => void;
  manualValue: () => number | null;
}
```

Internal Signals:
- panelSize (default 30)
- outreach (default 'mail-plus-phone')
- customMin / customMax (initial 0.10 / 0.20)
- safetyFactor (fixed 1.5 für jetzt, aus Const)

createMemo `proposal` aus suggestSampleSize.

UI:
- Number-Input "Ziel-Panelgröße" (data-testid="stage1-panel-size")
- Radio-Group "Outreach-Methode" (data-testid="stage1-outreach-mode")
- Bei custom: 2 Inputs für rateMin/rateMax in % (umrechnen 0.15 ↔ 15)
- Vorschlag-Box (data-testid="stage1-sample-suggestion"): "Empfohlen: ~110 Briefe — Range 60–150"
- "Wie wird das berechnet?" `<details>` mit Formel
- "Vorschlag übernehmen" Button (data-testid="stage1-accept-suggestion") — ruft onAccept mit recommended + proposal
- Pool-zu-klein-Warnung wenn proposal.recommended > poolSize: "Pool hat nur X, Vorschlag wäre Y."

**Verify:** Button rendert, Inputs reaktiv, Klick triggert onAccept.
</task>

<task id="3">
**Stage1Panel-Integration mit Schritt-Renumbering**

Datei: `apps/web/src/stage1/Stage1Panel.tsx`

Neue Signals:
- `sampleSizeProposal: Signal<SampleSizeProposal | null>` (Default null)
- `sampleSizeManuallyOverridden: Signal<boolean>` — true wenn User N nach Annahme händisch ändert auf abweichenden Wert

Logik:
- onAccept aus SampleSizeCalculator: setze targetN(recommended), proposal(p), manualOverride(false)
- onChange targetN von User-Eingabe: wenn current proposal && new value !== proposal.recommended → manualOverride(true); wenn === → manualOverride(false)

Layout-Änderungen:
- Neue Sektion "2. Bemessung der Stichprobe" eingefügt zwischen CSV-Upload und Stratifikation
- Bisherige Stratifikation: "3. Stratifikation konfigurieren"
- Bisherige N+Seed: "4. Stichprobengröße und Seed"
- Schritt-Header bleibt "Schritt 1 von 3 — Versand-Liste ziehen" (das ist ein anderer Kontext, der globale 3-Stages-Workflow)

**Verify:** Build + lokales Render sieht 4 nummerierte Sections.
</task>

<task id="4">
**Audit-Doc + Reporting + UI-Footer**

Datei: `packages/core/src/stage1/types.ts`
- Schema-Bump: `'0.3'` → `'0.4'`
- algorithm_version: `'stage1@1.1.0'` → `'stage1@1.2.0'`
- Neues optionales Feld:
```
sample_size_proposal?: {
  panel_size: number;
  outreach: 'mail-only' | 'mail-plus-phone' | 'custom';
  response_rate_min: number;
  response_rate_max: number;
  safety_factor: number;
  recommended: number;
  range: [number, number];
  manually_overridden: boolean;
};
```

Datei: `packages/core/src/stage1/audit-builder.ts`
- `BuildStage1AuditArgs` erweitern um optional `sampleSizeProposal`
- In Output durchreichen

Datei: `apps/web/src/stage1/runStage1.ts`
- Args-Type erweitern, an buildStage1Audit weiterleiten

Datei: `apps/web/src/stage1/AuditFooter.tsx`
- Neue Sektion "Bemessung" wenn proposal vorhanden:
  - "Panelgröße: 30 — Outreach: Briefe + Telefon-Nachfasser (30–50 % Rücklauf, Faktor 1.5)"
  - "Stichprobengröße: 110 (Vorschlag übernommen)" oder "Stichprobengröße: 200 (manuell überschrieben — Vorschlag war 110)"
- data-testid="audit-footer-sample-size"

Datei: `packages/core/src/stage1/reporting.ts`
- `stage1ToMarkdownReport` analog erweitern

**Vitest** für audit-builder mit/ohne proposal.

**Verify:** Audit-JSON enthält sample_size_proposal, Markdown enthält Bemessungs-Sektion.
</task>

<task id="5">
**Playwright e2e + Bestehende Tests**

`apps/web/tests/e2e/stage1-sample-size.spec.ts` (neu):
- Upload Beispiel-CSV, panel-size eingeben (30), outreach default mail-plus-phone, prüfe stage1-sample-suggestion zeigt "110" / "60" / "150"
- Klick "Vorschlag übernehmen" → stage1-target-n hat 110
- Custom-Modus mit 15-25% → recommended ändert sich (~225)
- Run mit übernommenem Vorschlag → Audit-Footer zeigt "Bemessung"-Sektion
- Manuell-Override: nach Annahme N auf 200 ändern → Audit zeigt "manuell überschrieben"
- Pool-zu-klein-Warnung erscheint wenn Vorschlag > Pool

Bestehende Tests:
- Tests die `stage1-target-n` direkt füllen ohne Calculator: bleiben grün, weil Calculator optional ist (User kann N manuell setzen ohne Calculator zu nutzen)
- Audit-Schema-Tests: 0.4 statt 0.3

**Verify:** `pnpm --filter @sortition/web exec playwright test --project=chromium`

**Bundle-Delta** dokumentieren in commit-msg (erwartet ~+2-3 KB gzip).
</task>

## Commit-Strategie

Single Commit am Ende:
```
feat(stage1): sample size suggestion from panel size + outreach method (#64)
```

Body listet die 5 Tasks + Bundle-Delta.

## Test-IDs (Vertragsschnittstellen)

- `stage1-sample-size-section`
- `stage1-panel-size`
- `stage1-outreach-mode` (Radio-Group container)
- `stage1-outreach-mail-only`, `stage1-outreach-mail-plus-phone`, `stage1-outreach-custom`
- `stage1-custom-rate-min`, `stage1-custom-rate-max` (sichtbar bei custom)
- `stage1-sample-suggestion` (Vorschlag-Anzeige)
- `stage1-accept-suggestion` (Button)
- `stage1-pool-too-small-warning` (sichtbar wenn proposal > pool)
- `audit-footer-sample-size`
