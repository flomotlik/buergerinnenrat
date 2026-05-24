# Iteration-Abschluss — Migration auf design-system v2.0/v2.1

Stand: 2026-05-23, nach Merge Phase 0 (PR #13) + Phase 2 (PR #14).

## Was migriert wurde

Die App war zu Beginn der Iteration **vollstaendig pre-DS** (siehe
`notes/audit.md`): ~895 Zeilen lokale OkLCH-Hue-145-Token-Schicht plus
eine umfangreiche eigene Komponenten-Schicht (`.btn-*`, `.card-*`,
`.banner`, `.tbl`, `.status-pill`, `.sig-pill`, `.stats-grid`,
`.step-rail`, `.audit`, `.dropzone`, `.chip`, `.sample-grid`, `.doc-grid`,
`.callout`, `.sidebar`). Heute liegt sie auf dem DS-Stack auf, die App-
spezifischen Bausteine sind sauber als `.app-*`-Namespace markiert.

### Phase 0 (PR #13, Quick-Wins)

1. `tailwind.config.cjs`-Kommentar: civic-tech-neutral-Note entfernt.
2. `CLAUDE.md`: aktueller Code-Stand reflektiert (Iteration 1 ist gebaut).
3. DS-CSS-Link im `apps/web/index.html`.
4. Gruenes Bund-Logo via DS-CDN (`Brand.tsx`).
5. Schrift-Umstellung: Inter / Source Serif 4 / JetBrains Mono raus,
   Barlow Semi Condensed + Vollkorn via DS-Stack.
6. `.gat-skiplink` als erstes fokussierbares Element auf jeder Seite
   (`App.tsx`).
7. `AxisBreakdown.tsx`: hartkodierte Slate-Hex (`#94a3b8`, `#3b82f6`)
   durch DS-Chart-Palette (`lib/ds-palette.ts`) ersetzt.
8. `RunPanel.tsx`-Drift behoben (`bg-slate-900` → `bg-accent`,
   `bg-red-700` → `bg-err`).
9. Inline-Tailwind-`amber-*`/`slate-*`/`sky-*`-Status-Bloecke durch
   `.banner.warn` (lokal) ersetzt.

### Phase 2 (PR #14, Voll-Migration)

7 atomare Commits:

1. **`refactor(tokens)`** — OkLCH-Hue-145-Token-Schicht weg. Die Aliase
   `--bg`, `--ink`, `--accent`, `--ok`, `--warn`, `--err`, `--gap-*`,
   `--radius*` sind heute duenne Passthroughs auf `--gat-web-*` /
   `--gat-color-*` / `--gat-space-*` aus der DS. Brand-Aliase
   (`brand.DEFAULT`, `brand.accent`, `accent-warm`, `accent-cool`) aus
   `tailwind.config.cjs` entfernt; `DocsHub.ICON_CLASS` von
   `text-brand-accent` auf `text-accent` umgestellt.
2. **`refactor(forms)`** — `.input-base` / `.input-label` / `.field` /
   `.field-label` ersetzt durch die DS-v2.1 `.gat-input` /
   `.gat-textarea` / `.gat-field__label`. SampleSizeCalculator,
   AgeBandsEditor, Stage1Panel und OverrideEditor lesen jetzt die
   DS-Form-Layer; ad-hoc-`border rounded px-1 w-16`-Inputs im
   OverrideEditor sind durch `.gat-input` ersetzt.
3. **`refactor(banner)`** — 14 `.banner.info` / `.banner.warn` /
   `.banner.err`-Instanzen auf `.gat-callout --info` / `--warn` /
   `--error` umgestellt (Overview, Beispiele, SampleSizeCalculator,
   StratificationExplainer, Stage1Panel).
4. **`refactor(tags)`** — 8 `.status-pill` und 2 `.sig-pill`-Instanzen
   auf `.gat-tag --ok` / `--warn` / `--error` migriert (Overview,
   Stage1Panel, OverrideEditor, RunPanel, AuditFooter).
5. **`refactor(naming)`** — sortition-spezifische Komponenten ins
   `.app-*`-Namespace gehoben: `.step-rail`, `.step`, `.tbl`, `.audit`,
   `.stats-grid`, `.stat`, `.chip`, `.sample-grid`, `.sample-card`,
   `.doc-grid`, `.doc-toc`, `.doc-body`, `.callout`, `.sidebar`,
   `.stage1-report` → jeweils `.app-*`. Neu: `.app-override-editor`
   (Sortition-Override-Warn-Block) und `.app-axis-breakdown`
   (Marker-Klasse fuer Stage-1-Chart-Wrapper). Zugleich Tailwind-
   Palette-Reste (`text-slate-500/600/700`, `bg-slate-50/100`,
   `text-red-700`, `bg-red-50`, `text-amber-700`, `text-emerald-700`,
   `bg-slate-900` etc.) auf Token-aliase migriert. RunPanel-Lauf-
   Fehlerblock auf `.gat-callout --error`.
6. **`chore(fonts)`** — `apps/web/public/fonts/{inter,jetbrains-mono,
   source-serif-4}/*` geloescht (~672 KB woff2 + OFL-Lizenzen).
   `index.html`-Kommentar zu self-hosted-Fonts aufgeraeumt.
7. **`docs`** — diese Datei.

## Was bewusst NICHT migriert wurde

- **Step-Rail** als App-Klasse (`.app-step-rail`) — `.gat-step-indicator`
  ist erst v2.3.
- **Stats-Grid** als App-Klasse (`.app-stats-grid` / `.app-stat`) —
  `.gat-metric-card` traegt Ertrag/Aufwand-Semantik, neutraler Modifier
  ist offen.
- **Drop-Zone** (`.dropzone`) bleibt lokal — `.gat-dropzone` ist v2.2.
- **Audit-Mono-`<dl>`** als App-Klasse (`.app-audit`) — `.gat-prose
  --mono` ist v2.3.
- **Sticky-Action-Footer** — `.gat-toolbar` / `.gat-actionbar` ist v2.2.
- **Data-Tables** als App-Klasse (`.app-table`) — `.gat-table` ist v2.2.
- **Prose-Wrapper** (`.prose-app`) bleibt lokal — `.gat-prose` ist v2.3.
- **Sidebar-Shell** (`.app-sidebar`) bleibt lokal — DS hat keine
  Sidebar-Primitive geplant (siehe `notes/audit.md` A1).
- **`.app-callout`** vs `.gat-callout` — der sortition-spezifische
  Info-Only-Bands-Report nutzt einen leicht anderen Look (Left-Stripe,
  kein Icon, weniger Padding). Bleibt lokal bis ein DS-Modifier in
  diese Richtung kommt.
- **`.app-axis-breakdown`** — SVG-Stage-1-Chart, kein DS-Kandidat (DS
  liefert keine Chart-Engine).
- **`.btn-primary` / `-secondary` / `-ghost`** — die App nutzt
  rectangular-rounded (Radius `--gat-radius-sm` = 8 px); `.gat-btn` ist
  vollrund Pill. Bleibt lokal bis die Marken-Entscheidung „App folgt DS-
  Button-Shape" fallen ist (heute: lokal ist gewuenscht).
- **`.pill-tab`** — Mobile-Fallback-Navigation (<md). Wird mittelfristig
  ueberfluessig, sobald `.app-sidebar` auch mobil ausspielt.

## Klassen-Inventur (Stand nach Phase 2)

### DS-v2.1-Klassen (`.gat-*`) im Markup

- `.gat-skiplink` — App.tsx
- `.gat-callout` + `--info` / `--warn` / `--error` — 18 Instanzen in 7
  Dateien
- `.gat-tag` + `--ok` / `--warn` / `--error` — 10 Instanzen in 5 Dateien
- `.gat-input` / `.gat-textarea` / `.gat-field__label` — 11 Instanzen
  in 4 Dateien

### App-Namespace (`.app-*`) im Markup

11 `.app-step`, 8 `.app-table`, 8 `.app-step__num`, 8 `.app-doc-toc`,
8 `.app-chip`, 6 `.app-sidebar`, 5 `.app-step-rail`, 5 `.app-stat*`,
5 `.app-audit`, 4 `.app-stats-grid`, 4 `.app-doc-grid`,
3 `.app-sample-card`, 3 `.app-doc-body`, 2 `.app-sample-grid`,
2 `.app-override-editor*`, 2 `.app-callout`, 2 `.app-axis-breakdown`,
9 `.app-stage1-report` (in `@media print`-Selektoren).

### Lokale Cross-Cutting-Klassen (bleiben unter Alt-Namen)

`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.card`, `.card-hover`,
`.card-head`, `.card-eyebrow`, `.card-title`, `.card-help`, `.pill-tab`,
`.pill-tab-active`, `.pill-tab-inactive`, `.dropzone` + `__icon` /
`__label` / `__hint` + `.is-drag`, `.prose-app`.

## OkLCH-Token-Diff (Aufraeumung)

Aus `index.css`:

- Geloescht: ~30 oklch()-Konstanten (`--bg`/`--ink`/`--accent`/`--ok`/
  `--warn`/`--err` plus jeweils `-soft`/`-line`/`-ink`-Varianten) +
  2 Theme-Schichten (`[data-theme="dark"]`, `[data-density="compact"]`)
  + OkLCH-Fallback-Banner (`@supports not (color: oklch())`).
- Ersetzt durch ~25 Zeilen DS-Passthrough-Aliase. Die kurzen `--bg`/
  `--accent`/usw. existieren nur noch als Convenience-Bindung fuer
  Tailwind und die `var(--...)`-Sites im Stylesheet selbst.
- `.banner`, `.status-pill`, `.sig-pill`, `.input-base`/`.input-label`/
  `.field`/`.field-label` als CSS-Regeln entfernt (DS uebernimmt).
- Net-Diff: `apps/web/src/index.css` 859 → 736 Zeilen (-123).

## Bundle-Effekt

`pnpm build`:

- Vor Phase 0: CSS 44.13 kB / gzip 8.73 kB.
- Nach Phase 2: CSS 40.66 kB / gzip 7.95 kB. Der Bulk-Rueckgang ist
  klein, weil die meisten lokal entfernten Regeln durch DS-Klassen
  ersetzt werden, die per CDN zur Laufzeit dazukommen (zaehlen nicht
  zum App-Bundle).
- Inline-Bundle-JS unveraendert (DS-CSS-only).
- 672 KB woff2-Assets aus dem `public/`-Tree und damit aus dem `dist/`-
  Output raus.

## Konsumenten-URL

Unveraendert: `https://flomotlik.github.io/buergerinnenrat/`. Phase 2
ist `--ds-only`-Migration, kein Pfad- oder Route-Wechsel.

## Was bleibt offen

- v2.2-Welle (DS): Drop-Zone, Stats-Variante, Data-Tables, Sticky-
  Action-Footer. Wenn die landen, koennen die `.dropzone`,
  `.app-stats-grid`, `.app-table` und der mobile Sticky-Run-Trigger
  in `Stage1Panel.tsx` auf DS-Klassen umziehen.
- v2.3-Welle (DS): Step-Indicator, Prose, Audit-Mono-`<dl>`. Wenn die
  landen, fallen `.app-step-rail`, `.prose-app`, `.app-audit`.
- Sidebar-Shell: noch ist `.app-sidebar` lokal. Falls die DS spaeter
  eine Sidebar-Primitive bekommt, ist der Markup-Wechsel ein Such+
  Ersetz.
- A11Y-Drift in `.gat-tag --warn` / `--ok` Farbkontrasten ist im
  axe-Smoke-Test bereits dokumentiert (Test-Kommentar in
  `apps/web/tests/e2e/a11y.spec.ts`). Phase 2 erbt das Verhalten von
  der DS — fix gehoert ins DS-Repo.
