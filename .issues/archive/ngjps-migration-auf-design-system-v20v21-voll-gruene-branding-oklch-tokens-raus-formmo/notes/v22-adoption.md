# DS v2.2 Adoption — `.gat-table` / `.gat-dropzone` / `.gat-toolbar`

Stand: 2026-05-24, Folge-Iteration zur Phase-2-Migration (#14). Slug
`v22a-personenwahl-adopt-table-dropzone-toolbar`.

## Was migriert wurde

Aus dem `iteration-abschluss.md`-Backlog „Was bleibt offen → v2.2-Welle":

1. **`.app-table` -> `.gat-table` `--zebra` `--compact`** — 2 Instanzen in
   `apps/web/src/stage1/Stage1Panel.tsx`:
   - Stage-1-Strata-Detailtabelle (`data-testid="stage1-strata-table"`),
     `min-w-full text-xs`.
   - Info-Only-Bands-Report-Tabelle innerhalb des Stage-1-Ergebnis-
     Panels.
   - Zahlspalten (vorher `text-right tnum`) jetzt `gat-table__num` — DS
     liefert `text-align: right` + `font-variant-numeric: tabular-nums`
     + `white-space: nowrap` in einem Slot.
   - Scroll-Container `overflow-x-auto` → `gat-table-scroll` (DS-Wrapper
     mit Border + Radius). `mobile-touch-targets.spec` prüft `parent
     overflowX === 'auto'`; `.gat-table-scroll` ship't das.

2. **`.dropzone` -> `.gat-dropzone`** — 2 Instanzen:
   - `apps/web/src/import/FileImport.tsx` (Stage-3 Pool-Upload,
     `file-dropzone`).
   - `apps/web/src/stage1/Stage1Panel.tsx` (Stage-1 Melderegister-Upload,
     `stage1-file-dropzone`).
   - Markup: `.dropzone-icon` -> `<span class="gat-dropzone__icon">`
     (DS owned das Sizing 2.5 rem², SVG ist jetzt nur das Glyph),
     `.dropzone-label` -> `__label`, `.dropzone-hint` -> `__hint`.
   - DS-State-Klasse heisst `.is-dragover` (vorher lokal
     `.dropzone.is-drag`); in der App wird kein Drag-Feedback-Signal
     gesetzt, ein App-side Wiring-Wechsel ist nicht nötig. Falls später
     ein Drag-Hover-State landet, ist es das eine Klasse umbenennen.

3. **Sticky-Action-Footer (Audit A12) -> `.gat-toolbar`** — 1 Instanz in
   `Stage1Panel.tsx`, der Wrapper-`<div>` um `[data-testid="stage1-run"]`.
   Vorher: `sticky [bottom:env(safe-area-inset-bottom,0)] -mx-4 px-4
   pt-3 pb-3 bg-bg border-t border-line z-10 print:static …` —
   `.gat-toolbar` aus DS v2.2 deckt sticky + bottom 0 + border-top +
   box-shadow + flex + gap + z-index ab.
   Behalten als App-Override am Wrapper:
   - `-mx-4 px-4` — bleeds quer durch das umschliessende `.card`-Padding.
   - `[bottom:env(safe-area-inset-bottom,0)]` + inline
     `padding-bottom: env(safe-area-inset-bottom)` — iOS-Home-Indicator-
     Vertrag aus Issue #56. `mobile-touch-targets.spec` matcht
     `/safe-area-inset-bottom/` gegen das outerHTML; bleibt grün.
   - `print:static print:border-0 print:p-0 print:bg-transparent` —
     Print-Fallback (kein Sticky am Papier-Ausdruck).

4. **CSS-Cleanup in `apps/web/src/index.css`** — der lokale `.dropzone`-
   Block (35 Zeilen) und der `.app-table`-Block (34 Zeilen) sind raus,
   plus aktualisierte Component-Layer-Kopfzeile.

## Was bewusst NICHT migriert wurde

- **`.app-sample-grid` / `.app-sample-card`** (docs/Beispiele) — `.gat-card`
  ist `display: flex; gap; padding; radius` ohne Border und ohne
  neutralen Hover-Border-Pickup. Die Beispiele-Karten brauchen
  Border (`1px solid var(--line)`) und einen Klick-Affordance-Hover
  (`border-color: var(--accent)`). Ohne neutralen Card-Modifier in der
  DS wäre der Wechsel ein Look-Regress; bleibt lokal bis ein
  `.gat-card --interactive` / `--bordered` Modifier kommt.

- **Toast / Toaster** — die App rendert keine transienten
  Notifications; sowohl Fehler- als auch Erfolgsmeldungen leben in
  `.gat-callout`-Bändern innerhalb der Cards (`stage1-error`,
  `stage1-preview-error`, `stage1-axes-hint`, etc.). Kein Migrations-
  Kandidat ohne neue UX-Anforderung.

- **`.app-stats-grid` / `.app-stat`** (Stage-1-Ergebnis-KPI-Karten) —
  weiterhin offen wie im Phase-2-Abschluss notiert: `.gat-metric-card`
  trägt Ertrag/Aufwand-Semantik, der app-neutrale Modifier ist nicht
  da. Bleibt lokal.

- **`.app-step-rail`, `.app-audit`, `.app-callout`, `.prose-app`,
  `.app-sidebar`, `.app-doc-grid`, `.app-chip`, `.app-override-editor`,
  `.app-axis-breakdown`, `.btn-*`, `.pill-tab*`** — schon im Phase-2-
  Abschluss als „nicht v2.2" markiert. Unverändert.

## Test-Vertrag

- `pnpm test` (Vitest): 224/224 grün auf jedem Commit dieser Iteration.
- `pnpm test:e2e` (Playwright chromium + firefox): grün, inkl.
  - `stage1.spec.ts` „Run-Button ist sticky positioniert" — Wrapper
    `position: sticky`.
  - `mobile-touch-targets.spec.ts` „sticky run button uses
    safe-area-inset-bottom" — outerHTML `/safe-area-inset-bottom/`.
  - `mobile-touch-targets.spec.ts` Strata-Table-Parent `overflowX`.
- `pnpm typecheck`, `pnpm lint`, `pnpm build` — alle grün.

## Bundle-Effekt

`apps/web` `pnpm build`:

- Vorher (post-Phase-2): CSS 40.76 kB / gzip 7.98 kB.
- Nachher (post-v2.2): CSS 39.46 kB / gzip 7.73 kB. -1.30 kB / -3.2 %.
  Inline JS ist unverändert. DS-CDN absorbiert die equivalenten Regeln
  zur Laufzeit, sodass die Render-Pipeline keinen Druck verliert.

## Konsumenten-URL

Unverändert: <https://flomotlik.github.io/buergerinnenrat/>. Die DS-CSS
wird weiterhin über die externe URL eingebunden, kein Vendoring.
