---
id: '65'
title: 'Visual Redesign — Design-Handoff (Solid+Tailwind, mobile-first, supersedes
  #56)'
status: done
priority: high
labels:
- ui
- design
- frontend
- refactor
---

## Kontext

Es liegt ein hochauflösender Design-Handoff im Repo unter `design_handoff_buergerinnenrat/` (README.md + `reference/` mit `index.html`, `styles.css`, `app.jsx`, `i18n.jsx`, `tweaks-panel.jsx`, `components/{sidebar,stage1,stage3,docs,audit,icons}.jsx`). Der Handoff ist ein **HTML + React + Babel-in-browser-Prototyp** — kein Production-Code zum 1:1-Übernehmen.

**Diese Issue löst Issue #56 ab** (UI Visual Redesign, GreuneAT-Inspiration). #56 wird ins Archiv verschoben mit Verweis auf diese Issue.

Eine kritische Drei-LLM-Review (Claude + Codex; Gemini lief in Quota) hat den Handoff vor Adoption geprüft. Beide Reviewer haben FAIL gestimmt mit überlappenden Kritiken. Vollständige Reviews unter `.issues/design-handoff-buergerinnenrat-redesign-review/reviews/`.

Ziel dieser Issue: das **gute aus dem Handoff** in die bestehende **Solid.js + Tailwind v3-App** übersetzen und das **falsche/scope-creepige** explizit weglassen.

## Strategische Leitplanken (aus Reviews)

1. **Stack: Solid.js + Tailwind v3 bleibt.** Keine Migration auf React. Der Handoff-README empfiehlt fälschlicherweise "Vite + React + TypeScript". Diese Empfehlung gilt nicht — der App hat bereits Solid.js (`apps/web/package.json:24`, 1015 Zeilen Solid in `Stage1Panel.tsx` allein). JSX-Komponenten des Handoffs sind **Wireframes, nicht Deliverables**.
2. **Mobile-first bleibt Pflicht.** Handoff hat `<meta viewport="width=1280">` hartkodiert — desktop-only. Bestehender Vertrag: Playwright-Specs (`apps/web/tests/e2e/mobile-touch-targets.spec.ts:50-168`) erfordern 375×812-Viewport, ≥44×44 Touch-Targets, horizontal-scrollbare Strata-Tabelle, env(safe-area-inset-bottom). Sidebar muss unter `md` (768px) zu Drawer/Hamburger kollabieren.
3. **Test-IDs sind Vertrag (issue #56 L107).** Handoff hat **0** `data-testid`-Attribute. Bestehende ~70 Test-IDs in 12 Specs müssen erhalten bleiben — auch von der Print-CSS (`apps/web/src/index.css:163-235`) als Selektoren genutzt.
4. **Hash-Routing bleibt.** Aktueller `App.tsx:67-100` synct `mode` und `docsRoute` mit `window.location.hash` (`#/stage1`, `#/docs/algorithmus`, …). Handoff verwendet stattdessen In-Memory `useState`. Sidebar-Items müssen Hash schreiben, nicht direkt State setzen.
5. **Audit-Schema ist Wahrheit, nicht Handoff-Mockup.** `Stage1AuditDoc` schema_version 0.4 (`packages/core/src/stage1/types.ts:98-200`) hat 21 Pflicht- + 4 optionale + 3 Signatur-Felder. Handoff-Audit-Panel (`audit.jsx:14-27`) zeigt 11 Felder mit teils falschen Namen (`algorithm` statt `algorithm_version`, `input_sha` statt `input_csv_sha256`, `created_at` statt `timestamp_iso`, `N` statt `target_n`). Visuelles Layout adoptieren — Feldset von `AuditFooter.tsx` übernehmen.
6. **DE-only.** EN-Strings im `i18n.jsx` werden nicht ins Production-Bundle gezogen (issue #56 L117). Asset bleibt für künftige i18n-Issue.
7. **Markenfarbe bleibt civic-grün** (`brand-accent: #16a34a`, `tailwind.config.cjs:13-19`). Nicht auf Handoff-Default `--hue: 248` (kühl-blau) oder `353` (rosa) wechseln. Civic-grün als oklch (~`oklch(60% 0.14 145)`) in das Token-System einbetten.
8. **Stage 3-Copy-Fix ist separate Issue (#66).** Nicht in dieser Issue lösen. Aber: keine neuen Stage-3-Mockup-Inhalte aus dem Handoff in diesem Scope übernehmen, die die falsche "Leximin · Bereit"-Claim wiederholen.
9. **Future Polish ist separate Issue (#67).** Dark theme, density toggle, accent-hue picker, vollständiges EN/DE-i18n, "echtes" Settings-Screen werden dort getrackt.

## Was zu **adoptieren** ist (visuelles Erbgut aus dem Handoff)

### Token-System

- [ ] OkLCH-Farbtokens aus `styles.css:7-94` in `tailwind.config.cjs` extend übernehmen — warm-neutrale Surfaces (`--bg`, `--bg-sunken`, `--bg-card`, `--line`, `--line-strong`), Ink-Skala (`--ink`, `--ink-2`, `--ink-3`, `--ink-4`), Akzent in zwei Tiefen + drei Soft-Varianten (`--accent`, `--accent-strong`, `--accent-soft`, `--accent-line`, `--accent-ink`), State-Tokens (`--ok`, `--warn`, `--err`).
- [ ] **Akzent als civic-grün** statt `--hue: 248`. Konkret: `--accent: oklch(50% 0.14 145)` (vergleichbar zu `#16a34a`), `--accent-strong: oklch(40% 0.16 145)`. Behalt die `--hue`-Indirektion als CSS-Variable für künftige Themability (Issue #67).
- [ ] OkLCH-Browser-Support-Policy: Chrome ≥111, Firefox ≥113, Safari ≥15.4 als Browserlist deklarieren. Optional: PostCSS `postcss-oklab-function` für hex/rgb-Fallbacks via `@supports`.
- [ ] Dark-Theme-Token-Block (`styles.css:72-94`) als CSS-Block hinter `[data-theme="dark"]` einlagern — **kein UI-Toggle in dieser Issue**, das ist #67.
- [ ] Dichte-Tokens (`[data-density="compact"]`, `styles.css:63-70`) als Block einlagern — **kein UI-Toggle in dieser Issue**.
- [ ] Spacing-Skala `--gap-1..7 = 4/8/12/16/24/32/48px`, `--pad-card: 24px`, `--row-h: 40px`, `--radius: 8px`, `--radius-lg: 14px` in `tailwind.config.cjs` extend.
- [ ] Type-Stack: Source Serif 4 (display) + Inter (UI) + JetBrains Mono (data) — **selbst gehostet** unter `apps/web/public/fonts/` als woff2, kein Google-Fonts-CDN-Preconnect (DSGVO-Risiko für deutsche Verwaltungen, LG München I 2022). Inter ist heute via rsms.me eingebunden — auf self-hosted umstellen.

### Komponenten-Primitive (Tailwind `@layer components` — bestehende Klassen ersetzen, nicht duplizieren)

- [ ] **Banner-Primitiv** (`styles.css:622-637`): `.banner.info / .warn / .ok` mit color-mix-Border. Bestehende Inline-Banners refactorn (`Stage1Panel.tsx:432-456` BMG-Hint, `:548-556` Seed-Hint, `:716-720` Bands-Block-Warn).
- [ ] **Drop-Zone-Visuals** (`styles.css:421-454`): dashed border + ico + h3 + p + formats-Zeile + `.is-drag` Accent-Soft-Fill. **Verhalten bleibt: Click öffnet OS-File-Picker via `<input type="file" class="sr-only">` in `<label>`. Keine echte Drag-and-Drop-Implementierung** (issue #56 L113 explizit out-of-scope; Handoff `pickSample(SAMPLE_DATASETS[0])` auf Drop ist falsches Verhalten).
- [ ] **Card-System** (`.card`, `.card-head`, `.card-title`, `.card-eyebrow`, `.card-help` aus `styles.css:316-353`): existing `.card` aus `index.css:64-71` durch Handoff-Variante ersetzen.
- [ ] **Step-Rail-Primitiv** (`styles.css:268-314`): `.step-rail` mit `.step.is-current` (accent-soft fill), `.step.is-done` (✓), `.step` (todo). **6 statt 5 Schritte**: `Eingabe · Bemessung · Achsen · Parameter · Ziehen · Audit & Export` (siehe nächster Abschnitt). Mobile-Fallback unter `<sm` (640px): vertikale Liste oder 2×3-Grid (handoff-Default 980px ist tablet, nicht mobile).
- [ ] **Sample-Picker-Grid** (`.sample-grid` + `.sample-card` aus `styles.css:647-676`): für `apps/web/src/docs/Beispiele.tsx`-Flow.
- [ ] **Audit-Panel-Visuals** (`.audit` mono-block + `.sig-pill` mit grünem Dot, `styles.css:590-620`): visuelles Layout adoptieren, Feld-Set bleibt das von `AuditFooter.tsx` (alle 21 Pflicht- + optionale Felder aus schema 0.4).
- [ ] **Doc-Grid-Treatment** (`styles.css:679-730`): Sticky 220px-TOC + 68ch-Body + `.callout` + Inline-`<code>`-Stil — auf `apps/web/src/docs/DocsLayout.tsx` anwenden für **alle 8 bestehenden Docs-Subpages**, ohne Inhalt zu ändern.
- [ ] **Form-Controls** (`.input`, `.select`, `.field`, `.btn`, `.btn-primary`, `.btn-accent`, `.btn-ghost`, `.btn-row`): bestehende `index.css:30-122` durch Handoff-Varianten ersetzen.
- [ ] **Stratum-Tabelle** (`.tbl` aus `styles.css:546-589`): bestehende Strata-Tabelle in `Stage1Panel.tsx` re-stylen mit Sticky-Thead, Bar-Cell, Tabular-Nums.
- [ ] **Stats-Grid** (`styles.css:472-507`): 4-spaltiges Stats-Grid mit `.stat .k / .v / .delta` für Result-Metriken.
- [ ] **Axis-Chips** (`styles.css:509-543`): Chip-Stil für Stratifikations-Achsen mit `.is-on`-State (Accent-Soft-Fill + Bullet-Dot).

### Shell-Layout

- [ ] **Sidebar (≥md)**: 256px sticky sidebar aus `styles.css:121-229` mit Brand-Mark + drei Nav-Gruppen (Übersicht / Verfahrensschritte / Ressourcen) + Footer ("Daten bleiben lokal" + Version-Stamp).
- [ ] **Drawer/Hamburger (<md)**: Sidebar kollabiert zu Hamburger-Trigger mit Drawer. Touch-Targets ≥44×44. Open/close via Solid-Signal.
- [ ] **Brand-Mark**: Frage offen — Handoff zeigt 12-Dot-Ring mit 3 hervorgehobenen ("sortition / stratified sample"-Metapher); existing app zeigt "ein-großer-Kreis-mit-6-kleinen" ("Versammlung"-Ikone, in Favicon + Logo). **Empfehlung: existing favicon-Logo (Versammlung) behalten — issue #56 L60-62 referenziert es explizit. Brand-Mark-Swap wäre Marken-Tausch, nicht Refresh.**
- [ ] Brand-Wordmark "Bürger:innenrat" + Tag — **Tag-Text "Sortition · Werkzeug" prüfen**: "Sortition" ist englischsprachig in DE-UI ungewohnt; Vorschlag: "Stratifiziertes Losverfahren" oder "Bürgerbeteiligung · Werkzeug".
- [ ] **Nav-Gruppen**:
  - Übersicht: `#/overview` (neu — siehe unten)
  - Verfahrensschritte: Stage 1 + Stage 3 + **disabled Item "Stage 2 (Outreach — außerhalb Tool)"** + **disabled Item "Stage 4 (Reserve — geplant)"**. Schließt explizit die Lücke, die der Handoff sonst schweigend hat (CLAUDE.md L37-44).
  - Ressourcen: Dokumentation (existing 8-page Hub), Beispiel-Daten (`#/docs/beispiele`), Settings — **nur als gear-icon-Popover mit localStorage-prefs (nichts gefakte)**, kein vollständiger Screen.
- [ ] **Sidebar-Nav-Items setzen `window.location.hash`**, nicht direkt Solid-Signal. Bestehender hashchange-Listener in `App.tsx:141-144` bleibt Single-Source-of-Truth.
- [ ] **Test-ID `data-testid="primary-nav"`** als Superset; bestehender `main-nav` + `tab-stage1 / tab-docs / tab-stage3` bleiben (entweder auf den Sidebar-Items oder auf einer mobile-only-Pill-Bar).

### Stage-1-Workbench (6-Schritt-Rail)

- [ ] **Step-Rail-Labels (6 Schritte)**: `Eingabe · Bemessung · Achsen · Parameter · Ziehen · Audit & Export`. Begründung: Handoff hat 5 Schritte und faltet "Bemessung" (SampleSizeCalculator, issue #64 — recently shipped, schema bump 0.3→0.4 _für_ dieses Feature) unter "Parameter". Das wäre ein silent regression. Plus: Audit-Signing ist die kanonische letzte Aktion, "Export" ist nur UI-Affordance.
- [ ] **Step-Rail-Eyebrow**: oberhalb der Rail bleibt die existing "Schritt 1 von 3 — Versand-Liste ziehen"-Heading (`Stage1Panel.tsx:342-346`) als Disambig zwischen Inner-Stage-1-Schritten und Outer-Verfahrens-Schritten.
- [ ] **MUST-PRESERVE Stage-1-Sub-Komponenten** (jede behält ihre Test-IDs und ihr Verhalten — Redesign darf sie in neue Card-Chrome wrappen, nicht löschen):
  - `CsvImport` + `CsvPreview` (`apps/web/src/csv/`)
  - `SampleSizeCalculator` (`apps/web/src/stage1/SampleSizeCalculator.tsx`, issue #64) — Test-IDs: `stage1-sample-size-section`, `stage1-panel-size`, `stage1-outreach-mode`, `stage1-sample-suggestion`, `stage1-pool-too-small-warning`, `stage1-accept-suggestion` u.a.
  - `AgeBandsEditor` (`apps/web/src/stage1/AgeBandsEditor.tsx`, issue #62) — Test-IDs: `stage1-age-bands-editor`, `band-min-*`, `band-max-*`, `band-mode-*-selection / -display`, `bands-add`, `bands-reset`, `bands-validation` u.a.
  - `AxisPicker` + `AxisBreakdown` + `StratificationExplainer`
  - Preview-Block mit Zero-Allocation-List + Underfill-List (`Stage1Panel.tsx:563-682`) — Test-IDs: `stage1-preview`, `stage1-preview-zero-list`, `stage1-preview-underfill-list`
  - `TrustStrip` (`apps/web/src/stage1/TrustStrip.tsx`, issue #54) — Test-IDs: `trust-card-algorithmus`, `trust-card-verifikation`, `trust-card-audit`
  - `AuditFooter` (`apps/web/src/stage1/AuditFooter.tsx`) — alle audit-footer-* Test-IDs, alle 21 Pflicht-Felder von schema_version 0.4 inkl. `selected_indices`, `signature_algo`, `derived_columns`, `forced_zero_strata`, `sample_size_proposal`
  - `runStage1` + `audit-sign` Logik bleibt unangerührt
- [ ] **Card-Hierarchie**: jede Sub-Komponente bekommt ihre eigene `.card` mit `.card-head` (Eyebrow + Title + Help) — visuelle Hierarchie wie Handoff `stage1.jsx:151-225`.
- [ ] **Achsen-Card mit BMG-Banner**: `axes_available` (chips als selektierbar, mit `.is-on`-State) und `axes_unavailable` (chips opacity 0.55, cursor not-allowed) plus `.banner.info` mit "§ 46 BMG"-Erklärung (handoff `stage1.jsx:230-292`). Existing `Stage1Panel.tsx`-Logik dahinter bleibt.
- [ ] **Result-Block**: 4-spalt Stats-Grid (Gezogen / Strata erfüllt / Dauer / Seed), Strata-Tabelle mit Bar-Cell, Audit-Panel — alle Werte aus `runStage1` + `Stage1AuditDoc`, **keine Demo-Strings wie `n=188` oder `tool_version: buergerinnenrat@0.4.0`** (handoff hartkodierte Demo-Artefakte, müssen dynamisch sein).

### Overview-Screen (neu)

- [ ] Neuer `#/overview`-Route mit Layout aus `docs.jsx:3-79`: Hero (Page-Title + Lede) + 2 Workflow-Cards (Stage 1 verfügbar, Stage 3 in Planung) + 3-Spalten "Architektur-Prinzipien" (Browser-nativ / Reproduzierbar / Rechtskonform).
- [ ] Prinzipien-Inhalte aus `apps/web/src/stage1/TrustStrip.tsx` ableiten — eine Source-of-Truth, nicht zwei divergierende Kopien.
- [ ] Default-Landing umstellen von `#/stage3` auf `#/overview` (oder `#/stage1`, wenn das natürlicher ist — Plan-Phase entscheidet).
- [ ] Overview enthält **explizite Erklärung** "Werkzeug deckt Stage 1 (Versand-Liste) und Stage 3 (Panel-Auswahl) ab; Stage 2 (Outreach + Selbstauskunft) und Stage 4 (Reserve / Nachholung) sind außerhalb des aktuellen Funktionsumfangs." (CLAUDE.md L37-44, S-7).

## Was **abzulehnen** ist (mit Grund)

- [ ] **React + Babel-in-browser-Scaffolding** (`index.html:23-26`, alle `script type="text/babel"`-Tags). App ist Solid.
- [ ] **Wholesale-Lift von `styles.css`**. 830 Zeilen mit eigenem Reset (`*, *::before, *::after`, L97), Body-Defaults (L99-107), 30+ Komponenten-Klassen würden mit Tailwind-Preflight + bestehenden `.btn-primary / .card / .dropzone / .pill-tab / .input-base` aus `apps/web/src/index.css:30-154` kollidieren. Alles in `@layer components` rebauen, bestehende Definitionen ersetzen.
- [ ] **`tweaks-panel.jsx`** (425 Zeilen) und postMessage-Host-Protokoll. README selbst sagt "drop in production". Persistente Prefs (lang/theme/density/accentHue) gehen in #67.
- [ ] **Stage 1 dropzone wired to drop=`pickSample(SAMPLE_DATASETS[0])`** (`stage1.jsx:168`). Drop-Verhalten bleibt inert.
- [ ] **Settings-Screen** (`docs.jsx:229-273`). Toggles sind visual-only Fiktionen ("Letzten Seed merken", "Telemetrie senden" — Features existieren nicht). Key-Rotation ist nicht implementiert. **Stattdessen**: kleiner gear-icon-Popover mit echten localStorage-prefs (theme + density nur, beides in #67 mit UI-Toggle aktiviert).
- [ ] **8-Pages-Docs-Hub durch single 5-section docs.jsx ersetzen**. Behalt alle 8 existing Subpages (`apps/web/src/docs/{Algorithmus,Beispiele,Bmg46,DocsHub,DocsLayout,Glossar,HamiltonSvg,Limitationen,Technik,Term,Verifikation}.tsx`). Inhalt bleibt unverändert. Nur `DocsLayout.tsx` bekommt Sticky-TOC + 68ch-Body + Callout-Treatment.
- [ ] **Hartkodiertes `tool_version: buergerinnenrat@0.4.0`** in irgendeinem gerenderten Audit-Panel. Wenn neue Tool-Version-Feld eingeführt wird, muss es aus Build-Constant kommen (Vite `import.meta.env.VITE_VERSION` oder `__APP_VERSION__`-Define).
- [ ] **Brand-Mark-Swap** (12-Dot-Ring → bestehende Versammlung-Ikone bleibt; siehe oben).

## Was **deferred** ist (in #67)

- Dark-Theme-UI-Toggle (Tokens landen hier, Toggle nicht)
- Density-UI-Toggle (Tokens landen hier, Toggle nicht)
- Accent-Hue-Picker
- EN/DE-i18n vollständig (existing DE bleibt; `i18n.jsx`-EN-Strings als Asset für #67 archivieren)
- "Echtes" Settings-Screen (Telemetry-Opt-out, Audit-Snapshot-Retention, Key-Rotation)

## Was in **#66** geht (Stage-3-Honesty-Fix, P0)

- Reword "HiGHS · Leximin · Bereit" (`stage3.jsx:72-86`) → "Maximin (Phase 1) — Solver-Wahl S-2 offen"
- Reword `docs.jsx:140-143` Leximin/Pyodide-Claims
- Animierter `solver-step.is-active` "Leximin-Iterationen · 3 / 24" entfernen oder als ehrliche Maximin-Iteration umlabeln
- Diese Issue darf Stage-3-Mockup-Inhalte nicht ohne Korrektur übernehmen

## Acceptance Criteria

### Tech-Setup

- [ ] OkLCH-Tokens in `tailwind.config.cjs` extend (mit civic-grün als Default-Accent), CSS-Variablen für `--hue` + Dark-Theme-Block + Density-Block in `index.css`
- [ ] Self-hosted woff2 für Source Serif 4 + Inter + JetBrains Mono unter `apps/web/public/fonts/`, Google-Fonts-CDN-Preconnect entfernt
- [ ] Optional: Browserlist-Update + PostCSS-Fallback für oklch
- [ ] Bundle-Delta dokumentiert in `BUNDLE_DELTA.md`, **Budget: +50 KB raw / +18 KB gzip** (großzügiger als #56 wegen self-hosted-fonts; ohne Fonts-Delta unter +30/+10)

### Visuelles

- [ ] Token-System wirkt in Sidebar, Cards, Buttons, Inputs, Banners, Step-Rail, Audit-Panel, Stats-Grid, Stratum-Table, Sample-Cards, Doc-Grid
- [ ] 256px-Sidebar ≥md, Hamburger+Drawer <md, Touch-Targets ≥44×44
- [ ] Stage 1 mit 6-Step-Rail, alle 8+ Sub-Komponenten erhalten
- [ ] Overview-Screen (`#/overview`) mit Hero + 2 Workflow-Cards + 3 Prinzipien-Spalten + Stage-2-/-4-Outside-Tool-Erklärung
- [ ] Docs-Layout-Refresh (sticky TOC + 68ch-Body + Callout) auf alle 8 Subpages
- [ ] Audit-Panel-Visuals mit korrektem schema_version 0.4-Feldset

### Verträge (nicht brechen)

- [ ] **Alle 70+ data-testid-Selectoren** in `apps/web/tests/e2e/*.spec.ts` und `apps/web/tests/unit/*.test.ts` bleiben funktional (Test-Suite grün)
- [ ] **Hash-Routing** für `#/stage1`, `#/stage3`, `#/docs`, `#/docs/<subpage>`, plus neue `#/overview`
- [ ] **Stage1AuditDoc schema_version 0.4** bleibt unverändert; visuelle Audit-Panel rendert alle Pflicht-Felder
- [ ] **DE-only**: keine EN-Strings im Production-Bundle
- [ ] **Print-CSS** weiter funktional (selektiert auf Test-IDs in `apps/web/src/index.css:163-235`)
- [ ] **Civic-grün** als Brand-Accent
- [ ] Stage-3-Inhalte werden nicht angerührt (warten auf #66)

### Tests

- [ ] Bestehende Vitest + Playwright e2e bleiben grün (incl. `mobile-touch-targets.spec.ts`, `a11y.spec.ts`, `_visual-iteration.spec.ts`, `stage1-bands.spec.ts`, `stage1-sample-size.spec.ts`, `trust-strip.spec.ts`, `docs.spec.ts`)
- [ ] Live-Smoke (`apps/web/tests/smoke-live/site-smoke.spec.ts`) bleibt grün
- [ ] Visual-Iteration-Spec für Vorher/Nachher-Screenshots auf 5+ Iterations-Punkten (Sidebar/Drawer, Stage-1-Card, Audit-Panel, Doc-Layout, Overview), Desktop+Mobile

### Dokumentation

- [ ] `BUNDLE_DELTA.md` mit Vergleich Pre/Post-Redesign
- [ ] `design_handoff_buergerinnenrat/`-Folder bleibt im Repo als Referenz; nicht löschen
- [ ] Frontmatter-Kommentar in `tailwind.config.cjs` und `index.css` verweist auf diese Issue + den Handoff

## Out of Scope (für diese Issue)

- Drag-and-Drop CSV-Upload (visuelles Drop-Target reicht)
- Stage-3-Inhaltsfix (Issue #66)
- Dark-Theme-UI-Toggle, Density-Toggle, Accent-Hue-Picker, EN/DE-i18n, Settings-Screen (alle in Issue #67)
- A11y-Vollaudit (BITV-2.0)
- Visual-Regression-Test-Suite mit pixel-diff
- Stage-2-/-4-Implementierung
- Engine-B / Pyodide / Leximin-Solver

## Verweise

- Design-Handoff: `design_handoff_buergerinnenrat/README.md` + `reference/`
- Reviews: `.issues/design-handoff-buergerinnenrat-redesign-review/reviews/`
- Abgelöste Issue: `.issues/archived/56-ui-visual-redesign/`
- Verwandt: #54 (in-app docs, shipped), #62 (altersgruppe-derived, shipped), #64 (sample-size-suggestion, shipped)
- Folge-Issues: #66 (Stage-3-Honesty), #67 (Future Polish)
- Stack-Vorlage (User-Memory, andere Repos): `bildgenerator.gruene.at`, `Gemeindeordnung`
- CLAUDE.md L37-44 (Zwei-Stufen-Workflow), L36-37 (Leximin-Gurobi-Pflicht)
