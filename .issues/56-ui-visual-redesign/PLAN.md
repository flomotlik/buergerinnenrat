# Plan: UI Visual Redesign — Bürger:innenrat Branding, Tailwind v3 + Plugins, Mobile-First, Screenshot-Iteration

<objective>
**Was:** Aus dem aktuell funktional-aber-visuell-unpolierten Iteration-1-UI ein selbstbewusstes, marken-konsistentes, mobile-first Layout machen, das Verwaltungen ernst nehmen würden.

**Warum:** Die App läuft End-to-End (CSV → Quoten → Engine A → Audit), aber Header sagt "Sortition Iteration 1", alles ist Slate-Grayscale, Tabs zerbröseln auf Mobile, File-Input ist Browser-Default. In der Form ist sie nicht pilot-tauglich — keine Kommune würde sie zeigen.

**Wie:** Tailwind v3 bleibt (Empfehlung aus RESEARCH.md gegen v4-Migration — minimaler Breaking Change), `@tailwindcss/typography` + `@tailwindcss/forms` werden ergänzt. Brand-Tokens, Inter-Font, eigene Komponenten-Klassen (`btn-primary`, `card`, `pill-tab`) im `@layer components`. Iterativ via Screenshot-Vergleich vor/nach jedem visuellen Step.

**Scope:**
- IN: Tailwind-Plugins + Theme-Tokens, Header/Branding, Tab-Pills, TrustStrip, Stage-1-Form, DocsHub-Tiles, DocsLayout-prose, Mobile-Touch-Targets, Bundle-Delta-Report.
- OUT: Tailwind v4-Migration, Drag-Drop-CSV (visual-only Drop-Zone reicht), Dark-Mode, Animations-Framework, Komponenten-Library, A11y-Vollaudit, Visual-Regression-Snapshot-Suite.

**Stack-Hinweis:** Diese App ist **Solid.js**, nicht React. `App.tsx` etc. sind Solid-Komponenten (`createSignal`, `Show`, `class=` statt `className=`). Der Executor muss Solid-Idiome beibehalten — keine React-Patterns einführen.

**Kein CONTEXT.md vorhanden** — Entscheidungen folgen RESEARCH.md-Empfehlungen (v3 + Plugins) und User-Constraints aus dieser Plan-Anfrage.
</objective>

<skills>
Keine `.claude/skills/` im Repo — Skill-Sektion entfällt.
</skills>

<context>
Issue: @.issues/56-ui-visual-redesign/ISSUE.md
Research: @.issues/56-ui-visual-redesign/RESEARCH.md
Before-Screenshots (8 PNGs, multimodal lesbar): @.issues/56-ui-visual-redesign/before-screenshots/

<interfaces>
<!-- Executor: nutze diese Datei-Pfade und Kontrakte direkt. Codebase-Exploration ist nur für Klassennamen erforderlich, nie für Strukturen. -->

# Tailwind / Build (heute)
- `apps/web/tailwind.config.cjs`: minimal — `content: ['./index.html', './src/**/*.{ts,tsx}']`, leeres `theme.extend`, keine Plugins. Muss erweitert werden um colors, fontFamily, plugins.
- `apps/web/src/index.css`: nur `@tailwind base/components/utilities` + `@media print`-Block (Zeilen 12–85). `@layer base` und `@layer components` müssen NEU eingeführt werden, **vor** dem `@media print`-Block. Print-Block bleibt unverändert.
- `apps/web/index.html`: `<title>Sortition Iteration 1</title>` (Z. 6), kein Favicon, keine Font-Links. Body hat `class="bg-slate-50 text-slate-900"`.
- `apps/web/package.json`: `tailwindcss: ^3.4.17`, `postcss`, `autoprefixer` schon da. `@tailwindcss/typography` + `@tailwindcss/forms` müssen via `pnpm --filter @sortition/web add -D` ergänzt werden.

# Framework
- App ist **Solid.js** (`solid-js: ^1.9.3`, `vite-plugin-solid`). Komponenten heißen `Component`, nutzen `createSignal`, `Show`, `Suspense`, `lazy`. Attribute heißen `class=` (nicht `className=`), conditional classes via `classList={{ ... }}`.
- Build: `pnpm --filter @sortition/web build`, Preview: `pnpm --filter @sortition/web preview --host 127.0.0.1 --port 4173 --strictPort`.

# Hauptkomponenten (alle Solid `Component`s)
- `apps/web/src/App.tsx` (278 Zeilen): Header mit "Sortition Iteration 1" (Z. 165–171), Tab-Nav als Underline-Border-Buttons (Z. 172–218), Stage-Switcher via `Show`. Test-IDs: `main-nav`, `tab-stage1`, `tab-docs`, `tab-stage3`. Tabs haben heute Subtitles (`<span class="block text-xs ...">…</span>`) — die müssen entweder entfernt oder als `aria-description` umgehängt werden.
- `apps/web/src/stage1/Stage1Panel.tsx`: enthält CSV-Upload, BMG-Hint, Seed/N-Inputs, sticky Run-Button, Result-Cards (3), Underfill-Liste, AxisBreakdowns, Strata-Tabelle, Audit-Footer. Test-IDs: `stage1-panel`, `stage1-csv-upload`, `stage1-bmg-hint`, `stage1-seed-hint`, `stage1-target-n`, `stage1-seed`, `stage1-seed-source`, `stage1-seed-confirm`, `stage1-run`, `stage1-preview`, `stage1-result`, `stage1-summary-cards`, `stage1-coverage-card`, `stage1-underfill-card`, `stage1-axis-breakdowns`, `stage1-strata-toggle`, `stage1-strata-table`, `stage1-trust-strip`, `stage1-audit-footer`, `stage1-download-csv`, `stage1-download-audit`, `stage1-download-md`, `stage1-print`, `stage1-underfill-list`, `stage1-preview-error`, `stage1-pool-summary`.
- `apps/web/src/stage1/TrustStrip.tsx`: 3-Karten-Grid heute farblos.
- `apps/web/src/stage1/AuditFooter.tsx`: Tech-Provenance, `audit-footer-sig-algo` Test-ID.
- `apps/web/src/stage1/CsvPreview.tsx`, `apps/web/src/stage1/AxisPicker.tsx`, `apps/web/src/stage1/AxisBreakdown.tsx`: Subkomponenten.
- `apps/web/src/csv/CsvImport.tsx`: Stage-3-Upload (gleiches Pattern wie Stage 1).
- `apps/web/src/run/RunPanel.tsx`, `apps/web/src/quotas/QuotaEditor.tsx`: Stage-3-Workflow.
- `apps/web/src/docs/DocsHub.tsx`: Tile-Karten, `docs-tile-{slug}` Test-IDs.
- `apps/web/src/docs/DocsLayout.tsx`: gemeinsamer Wrapper, `docs-back-to-hub` Test-ID, `docs-page-{slug}` data-testid.
- `apps/web/src/docs/Algorithmus.tsx`, `Technik.tsx`, `Verifikation.tsx`, `Glossar.tsx`, `Bmg46.tsx`, `Limitationen.tsx`: Sub-Pages, prose-Kandidaten.

# Test-IDs (NIE ändern — Vertrags-Schnittstelle für 38+ Specs)
Alle oben gelisteten `data-testid`-Strings sind LOCKED. Restyling ändert NUR class-Strings und Layout-Wrapper-Hierarchie, NIE `data-testid`-Werte. Wenn ein Test bricht, ist die Strategie: Test-Selector behalten, DOM minimal anpassen damit der Selector wieder greift — keine Test-Logik-Änderungen, keine Test-ID-Renames.

# Test-Infrastruktur
- E2E: `apps/web/tests/e2e/` (a11y.spec.ts, csv-import.spec.ts, docs.spec.ts, end-to-end.spec.ts, smoke.spec.ts, stage1.spec.ts, trust-strip.spec.ts).
- Live-Smoke: `apps/web/tests/smoke-live/site-smoke.spec.ts` (gegen Live-URL).
- Playwright-Config: `apps/web/playwright.config.ts` — startet `vite preview` auf 127.0.0.1:4173 mit `VITE_BASE_PATH=/`. `chromium` + `firefox` Projekte.
- Vitest: `pnpm --filter @sortition/web test` (Unit-Tests).

# Brand-Tokens (vorgeschlagen, in Task 1 zu fixieren)
- `brand`: Slate-900-basiert mit dunkel-grünem oder dunkel-blauem Akzent. Empfehlung: `brand.DEFAULT = #0f172a` (slate-900), `brand.fg = #f8fafc`, `brand.accent = #16a34a` (green-600) als Primary-Accent für Bürgerrat-Konnotation (zivil/grün/demokratisch). Executor entscheidet final basierend auf Inspirations-Repos (bildgenerator.gruene.at) — falls Bildgenerator klar Grün-Akzent zeigt, übernehmen; sonst Blau.
- `accent-warm`: amber-600 (#d97706) — Underfill-Warnings.
- `accent-cool`: blue-600 (#2563eb) — Info/Links.
- `font-sans`: Inter zuerst, System-Stack als Fallback.
</interfaces>

Schlüssel-Dateien zur Lektüre vor Start:
@apps/web/src/App.tsx — Header + Tabs leben hier
@apps/web/src/index.css — Tailwind-Layer + Print-CSS (Print-Block NICHT anfassen)
@apps/web/tailwind.config.cjs — heute leer, wird Theme-Extension-Ziel
@apps/web/index.html — Title + Favicon-Ziel
@apps/web/playwright.config.ts — Preview-Server-Konfig für Screenshots
</context>

<commit_format>
Format: conventional mit Issue-Slug-Prefix
Beispiel: `ui-visual-redesign: feat(ui): add tailwind plugins and brand tokens`
Pattern: `{issue-slug}: {type}({scope}): {description}`

Type-Auswahl pro Task: `feat` für neue Komponenten/Klassen, `style` für rein visuelle Änderungen ohne neue Funktionalität, `chore` für Build-/Config-Änderungen, `test` wenn ein Task primär Tests hinzufügt, `docs` für `BUNDLE_DELTA.md`. Tests gehören in denselben Commit wie der Code, den sie verifizieren.
</commit_format>

<screenshot_iteration_workflow>
**Vorbereitung (einmalig, vor Task 2):** Spec-Datei `apps/web/tests/e2e/_visual-iteration.spec.ts` anlegen mit Test-Cases pro Iterations-Punkt × Viewport (Desktop 1280×800, Mobile 375×812). Jeder Test navigiert zu der relevanten Route, wartet auf das Test-ID-Anchor-Element, schießt `page.screenshot({ path: '.issues/56-ui-visual-redesign/iteration/<step>-<state>-<viewport>.png', fullPage: true })`. Filename-Convention: `<step>-{before|after}-{desktop|mobile}.png`. Underscore-Prefix im Filename signalisiert dem Executor, dass dies kein Production-Test ist.

**Pro Iterations-Punkt:**
1. **Vorher-Screenshot:** Spec mit `--grep '<step>-before'` aufrufen → schreibt PNGs ins `iteration/`-Verzeichnis.
2. **Implementierung:** Code-Änderung wie in `<action>` beschrieben.
3. **Build + Nachher-Screenshot:** `pnpm --filter @sortition/web build && pnpm exec playwright test apps/web/tests/e2e/_visual-iteration.spec.ts --grep '<step>-after'`.
4. **Multimodal-Lesen:** Executor liest beide PNGs via Read-Tool, vergleicht gegen Akzeptanzkriterium aus dem `<screenshot_iteration>`-Block.
5. **Iteration:** Wenn Akzeptanzkriterium nicht erfüllt → minimal-invasiv nachschärfen (class-String anpassen, Spacing korrigieren), Build + Nachher-Screenshot wiederholen, max. 3 Iterations-Runden pro Step. Wenn nach 3 Runden nicht erfüllt: dokumentieren in `BUNDLE_DELTA.md` (Sektion "Offene visuelle Punkte") und weitermachen.
6. **Commit:** Nach erfolgreichem Vergleich Code + neuer Screenshots committen.

**Verzeichnis:** `.issues/56-ui-visual-redesign/iteration/` ist temporär (zwischenzeitliche Vorher-/Nachher-Vergleiche). Final-Suite landet in `.issues/56-ui-visual-redesign/after-screenshots/` (Task 28). Beide Verzeichnisse werden ins Repo committet — sie sind Teil des Audit-Trails für diesen Issue.

**Branch:** Alle Arbeit auf `ui-redesign` (frischer Worktree von main, schon angelegt, in dem dieser Plan geschrieben wird).
</screenshot_iteration_workflow>

<tasks>

<task type="auto">
  <name>Task 1 (Commit 1, Foundation): Tailwind-Plugins + Brand-Theme + Inter-Font + Component-Layer</name>
  <files>apps/web/package.json, apps/web/pnpm-lock.yaml, apps/web/tailwind.config.cjs, apps/web/src/index.css, apps/web/index.html</files>
  <action>
  Dieser Task legt die visuelle Grundlage. Keine Komponenten-Änderungen, nur Setup.

  **1. Plugins installieren:** Aus dem Repo-Root `pnpm --filter @sortition/web add -D @tailwindcss/typography @tailwindcss/forms`. Versions-Pins akzeptieren wie pnpm sie auflöst (latest stabil). Lockfile-Änderungen committen.

  **2. `apps/web/tailwind.config.cjs` erweitern:**
  - `theme.extend.colors`: `brand` (Objekt mit `DEFAULT`, `fg`, `muted`, `accent`), `accent-warm`, `accent-cool`. Konkrete Werte siehe `<interfaces>`-Block oben (Slate-900-Basis + Grün-Akzent — Executor verifiziert gegen bildgenerator.gruene.at-Live-Site, ob Grün oder Blau sich besser einfügt).
  - `theme.extend.fontFamily`: `sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']`.
  - `theme.extend.boxShadow`: einen `card` und einen `card-hover` Shadow ergänzen (subtil, civic-tech-Stil — kein heavy drop-shadow).
  - `plugins`: `[require('@tailwindcss/typography'), require('@tailwindcss/forms')({ strategy: 'class' })]`. **`forms` mit `strategy: 'class'`** — sonst stylet das Plugin globale `<input>`-Tags und kann existierende Stage-3-Inputs verändern. Mit `class`-Strategy gilt es nur für `.form-input`/`.form-select`/`.form-checkbox` etc. Klassen.

  **3. `apps/web/index.html` aktualisieren:**
  - `<title>Bürger:innenrat — Versand-Liste & Panel-Auswahl</title>`.
  - Im `<head>`: `<link rel="preconnect" href="https://rsms.me">` und `<link rel="stylesheet" href="https://rsms.me/inter/inter.css">`. (rsms.me ist canonical Inter-Host, kein Tracking, civic-tech-OK — siehe RESEARCH.md.)
  - Inline-SVG-Favicon als data-URI: `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,...">`. Das SVG ist ein einfaches Versammlungs-Icon: ein größerer Kreis mit ~5 kleineren Kreisen drumherum, im Brand-Akzent-Farbton. Executor zeichnet das SVG selbst (klein, ~24×24 viewBox, monochrom oder zwei-farbig).
  - `<body>`: Klasse von `bg-slate-50 text-slate-900` zu `bg-slate-50 text-slate-900 font-sans antialiased`.

  **4. `apps/web/src/index.css` strukturieren:** Vor dem existierenden `@media print`-Block ergänzen (Print-Block UNVERÄNDERT lassen):
  - `@layer base`: `body { font-feature-settings: 'cv11'; }` (Inter-Stylistic-Set für lesbare 1/I-Differenzierung), `html { scroll-behavior: smooth; }`, default heading line-heights wenn nötig.
  - `@layer components`: Klassen `btn-primary` (Brand-Background, weißer Text, padding ≥ touch-target, rounded, focus-ring, hover-Variante), `btn-ghost` (transparent, Border, Brand-fg-Hover), `btn-secondary` (slate-100-Background), `card` (white-Background, border-slate-200, rounded-lg, shadow-card, padding), `card-hover` (transition + translate-y-[-2px] + shadow-card-hover on hover), `pill-tab` (rounded-full, padding ≥44px touch-target, text-sm-medium), `pill-tab-active` (Brand-Background, Brand-fg-Text), `pill-tab-inactive` (slate-100-Background, slate-700-Text, hover:slate-200), `status-pill-warn` (amber-Background, amber-text), `status-pill-ok` (green-Background, green-text), `dropzone` (gestrichelter Border, hover-Brand-Border, padding-large, text-center, cursor-pointer).

  **5. Prose-Defaults:** Im `@layer base` `.prose-app` als Wrapper mit `@apply prose prose-slate max-w-3xl prose-headings:font-semibold prose-a:text-brand-accent` definieren (oder direkt in DocsLayout in Task 19).

  Code-Kommentare auf Englisch (siehe CLAUDE.md-Workmodus). UI-Strings im Title bleiben deutsch.
  </action>
  <verify>
    <automated>pnpm --filter @sortition/web build && pnpm --filter @sortition/web typecheck && pnpm --filter @sortition/web lint</automated>
  </verify>
  <done>
  - `@tailwindcss/typography` und `@tailwindcss/forms` in `package.json` devDependencies + Lockfile aktualisiert
  - `tailwind.config.cjs` exportiert `theme.extend.colors.brand`, `accent-warm`, `accent-cool`, `fontFamily.sans` mit Inter, beide Plugins registriert (forms mit `strategy: 'class'`)
  - `index.html` hat neuen Title, Inter-Preconnect+Stylesheet, Inline-SVG-Favicon
  - `index.css` hat `@layer base` + `@layer components` Block VOR dem unveränderten `@media print`-Block; alle in `<action>` Punkt 4 gelisteten Klassen sind definiert
  - Build kompiliert ohne Fehler, Typecheck grün, Lint grün
  - Bestehende E2E-Tests laufen noch durch (Sanity-Check vor visuellen Änderungen): `pnpm --filter @sortition/web test:e2e --project chromium`
  </done>
</task>

<task type="auto">
  <name>Task 2 (Commit 2, Branding + Header): Logo + neuer Title + Tagline + Visual-Iteration-Spec</name>
  <files>apps/web/src/App.tsx, apps/web/tests/e2e/_visual-iteration.spec.ts, .issues/56-ui-visual-redesign/iteration/01-header-before-desktop.png, .issues/56-ui-visual-redesign/iteration/01-header-before-mobile.png, .issues/56-ui-visual-redesign/iteration/01-header-after-desktop.png, .issues/56-ui-visual-redesign/iteration/01-header-after-mobile.png</files>
  <action>
  **1. Visual-Iteration-Spec anlegen** (`apps/web/tests/e2e/_visual-iteration.spec.ts`): Solid-App ist unter `http://127.0.0.1:4173` erreichbar (siehe playwright.config.ts). Spec definiert Test-Cases mit Tags die per `--grep` filterbar sind: `01-header-before-desktop`, `01-header-before-mobile`, `01-header-after-desktop`, `01-header-after-mobile`, dasselbe für `02-tabs`, `03-trust-strip`, `04-stage1-form`, `05-docs-hub`, `06-final` (5 Steps × 2 Phasen × 2 Viewports = 20+ Test-Cases). Pro Test: viewport setzen (Desktop 1280×800, Mobile 375×812), navigieren (Stage 1: `#/stage1`, Stage 3: `#/stage3`, Docs: `#/docs`), warten auf Anchor-Test-ID (z.B. `[data-testid="main-nav"]`), `await page.screenshot({ path: '.issues/56-ui-visual-redesign/iteration/<step>-<state>-<viewport>.png', fullPage: true })`. **Wichtig:** Spec überschreibt Screenshots beim erneuten Run — das ist gewollt für die Iterations-Schleife.

  **2. Vorher-Screenshots Header schießen** (vor Code-Änderung): `pnpm --filter @sortition/web build && pnpm --filter @sortition/web exec playwright test tests/e2e/_visual-iteration.spec.ts --grep "01-header-before"`. PNGs landen in `.issues/56-ui-visual-redesign/iteration/`.

  **3. Header in `App.tsx` umbauen** (Z. 165–171):
  - H1-Text "Sortition Iteration 1" → "Bürger:innenrat".
  - Davor (oder daneben auf Desktop, darüber auf Mobile) ein Inline-SVG-Logo: das gleiche Versammlungs-Symbol wie das Favicon, ~40px hoch, `text-brand-accent` Farbton.
  - Subtitle: "Versand-Liste & Panel-Auswahl" als sekundäre Zeile (`text-base text-slate-600`) direkt unter H1.
  - Tagline (Z. 168–170) umformulieren zu: "Open-Source-Werkzeug für Verwaltungen — stratifizierte Auswahl ohne Backend, ohne Datenversand." Größer setzen (`text-base text-slate-700`, max-width für Lesbarkeit, z.B. `max-w-2xl`).
  - Layout: Logo + Heading-Block flex-Container (`flex items-center gap-4` Desktop, `flex-col items-start gap-3` Mobile via `sm:flex-row sm:items-center`).
  - Header-Wrapper bekommt mehr vertikalen Atemraum (`pb-6 border-b border-slate-200` als Trenner zur Tab-Nav).

  **4. Build + Nachher-Screenshots** schießen, beide Viewports. Multimodal lesen via Read-Tool.

  **5. Akzeptanzkriterium prüfen** (siehe `<screenshot_iteration>`-Block unten). Falls nicht erfüllt: bis zu 3 Iterationsrunden mit Spacing-/Größen-Tuning.
  </action>
  <verify>
    <automated>pnpm --filter @sortition/web build && pnpm --filter @sortition/web exec playwright test tests/e2e/_visual-iteration.spec.ts --grep "01-header-after"</automated>
  </verify>
  <screenshot_iteration>
    <step>01-header</step>
    <vorher_pfad>.issues/56-ui-visual-redesign/iteration/01-header-before-{desktop,mobile}.png</vorher_pfad>
    <nachher_pfad>.issues/56-ui-visual-redesign/iteration/01-header-after-{desktop,mobile}.png</nachher_pfad>
    <akzeptanz_kriterium>
    - Header zeigt das Wort "Bürger:innenrat" als H1, NICHT mehr "Sortition Iteration 1"
    - Logo (SVG) ist sichtbar links oder oben vom Heading, in Brand-Akzent-Farbe
    - Sekundär-Zeile "Versand-Liste & Panel-Auswahl" ist visuell klar als Subtitle erkennbar (kleiner als H1, größer als Tagline)
    - Tagline ist umformuliert auf den OSS-für-Verwaltungen-Pitch
    - Desktop (1280px): Logo + Titel-Block in einer Zeile horizontal angeordnet
    - Mobile (375px): Logo + Titel-Block vertikal gestackt, alle Texte vollständig lesbar (kein abgeschnittener Text), kein Wrap-Salat
    - Visueller Eindruck: civic-tech-seriös, nicht generisch-startup
    </akzeptanz_kriterium>
  </screenshot_iteration>
  <done>
  - `_visual-iteration.spec.ts` existiert und enthält Test-Cases für mind. die 5 Iterations-Steps × 2 Viewports
  - 4 Screenshot-PNGs (`01-header-{before,after}-{desktop,mobile}.png`) committet
  - Header zeigt "Bürger:innenrat" + Logo + neue Tagline; alte Strings vollständig entfernt
  - `data-testid="main-nav"` und alle Tab-Test-IDs unverändert (Vertrags-Schnittstelle)
  - Bestehende E2E-Tests grün: `pnpm --filter @sortition/web test:e2e --project chromium`
  - Akzeptanzkriterien aus `<screenshot_iteration>` Block durch Multimodal-Vergleich bestätigt
  </done>
</task>

<task type="auto">
  <name>Task 3 (Commit 3, Tab-Navigation): Pill-Buttons mit Active-State + Mobile-Scroll-Container</name>
  <files>apps/web/src/App.tsx, .issues/56-ui-visual-redesign/iteration/02-tabs-before-{desktop,mobile}.png, .issues/56-ui-visual-redesign/iteration/02-tabs-after-{desktop,mobile}.png</files>
  <action>
  **1. Vorher-Screenshots:** `pnpm --filter @sortition/web exec playwright test tests/e2e/_visual-iteration.spec.ts --grep "02-tabs-before"`.

  **2. Tab-Nav umbauen** (`App.tsx` Z. 172–218):
  - Container `<nav>`: heutige Klasse `flex gap-2 border-b border-slate-200` ersetzen durch `flex gap-2 overflow-x-auto pb-2 sm:pb-0 [scroll-snap-type:x_mandatory]` + `role="tablist"` (a11y). Mobile bekommt damit horizontalen Scroll statt Wrap.
  - Jeder Tab-Button: `class="pill-tab"` als Basis (definiert in Task 1), `classList={{ 'pill-tab-active': mode() === 'stageX', 'pill-tab-inactive': mode() !== 'stageX' }}`. Min-Höhe ≥44px ist über `pill-tab` Klasse abgedeckt (touch-target).
  - **Subtitles entfernen:** Die `<span class="block text-xs ...">…</span>`-Zweite-Zeilen (z.B. "Aus Melderegister", "Algorithmus, Technik, Verifikation", "Aus Antwortenden") raus aus dem sichtbaren DOM. Stattdessen als `aria-description` oder als `title`-Attribut am Button hängen (für Screenreader + Hover-Tooltip auf Desktop).
  - Active-Tab bekommt zusätzlich `aria-current="page"` (statt nur visuelle Hervorhebung).
  - Scroll-Snap: jeder Pill bekommt `[scroll-snap-align:start]` damit Mobile-Swipe sauber pro Tab snappt.
  - Reihenfolge der Tabs: bleibt wie heute (Stage 1, Docs, Stage 3 — auch wenn Stage 3 default ist, das ist keine Änderung dieses Issues).
  - **Test-IDs unverändert** — `tab-stage1`, `tab-docs`, `tab-stage3`, `main-nav` bleiben Wort-für-Wort.

  **3. Border-Bottom des `<nav>` entfernen** — die alte Underline war Teil des Tab-Designs; mit Pill-Buttons unnötig. Falls visueller Trenner zum Content-Bereich nötig: einen `mt-4` auf den nachfolgenden Content-Wrapper, kein Border.

  **4. Build + Nachher-Screenshots + Multimodal-Lesen + ggf. Iteration.**
  </action>
  <verify>
    <automated>pnpm --filter @sortition/web build && pnpm --filter @sortition/web test:e2e --project chromium && pnpm --filter @sortition/web exec playwright test tests/e2e/_visual-iteration.spec.ts --grep "02-tabs-after"</automated>
  </verify>
  <screenshot_iteration>
    <step>02-tabs</step>
    <vorher_pfad>.issues/56-ui-visual-redesign/iteration/02-tabs-before-{desktop,mobile}.png</vorher_pfad>
    <nachher_pfad>.issues/56-ui-visual-redesign/iteration/02-tabs-after-{desktop,mobile}.png</nachher_pfad>
    <akzeptanz_kriterium>
    - Tabs sind als Pill-Buttons (rounded-full Hintergrund) gerendert, nicht mehr als Underline-Border
    - Aktiver Tab visuell klar erkennbar durch ≥2 Cues: Brand-Background + Brand-Foreground-Text-Color
    - Inactive Tabs haben hellen Hintergrund (z.B. slate-100), Hover hebt sie sichtbar an
    - Subtitle-Zeilen ("Aus Melderegister" etc.) sind aus dem visuellen DOM entfernt
    - Mobile (375px): Tabs in einer Zeile, nicht gewrappt; bei Bedarf horizontal scrollbar (kein Salat)
    - Touch-Target jedes Tabs ≥44px (visuell überprüfbar — Pills sind nicht winzig)
    - Desktop: Tabs proportional zur Header-Breite, nicht über volle Width verteilt
    </akzeptanz_kriterium>
  </screenshot_iteration>
  <done>
  - Tab-Nav nutzt `pill-tab` / `pill-tab-active` Klassen
  - Subtitles aus visuellem DOM entfernt, als `aria-description`/`title` migriert
  - Mobile zeigt Tabs als horizontalen Scroll-Container ohne Wrap
  - Active Tab hat `aria-current="page"`
  - 4 Screenshot-PNGs committet
  - Alle Test-IDs unverändert; bestehende E2E-Tests grün (insb. `tab-stage1`/`tab-docs`/`tab-stage3` Click-Tests)
  - Akzeptanzkriterien aus `<screenshot_iteration>` durch Multimodal-Vergleich bestätigt
  </done>
</task>

<task type="auto">
  <name>Task 4 (Commit 4, TrustStrip): Icons + Hover-Lift + Mobile-Stack</name>
  <files>apps/web/src/stage1/TrustStrip.tsx, .issues/56-ui-visual-redesign/iteration/03-trust-strip-before-{desktop,mobile}.png, .issues/56-ui-visual-redesign/iteration/03-trust-strip-after-{desktop,mobile}.png</files>
  <action>
  **1. Vorher-Screenshots:** Stage 1 Route nach Run-Ergebnis (TrustStrip wird nur unter Resultaten gerendert; Spec muss vorher CSV laden, N setzen, Run klicken). Falls das den Spec zu komplex macht — Alternative: Spec lädt eine pre-canned Result-Fixture-Route ODER setzt direkt programmatisch State. Einfachste Lösung: Spec lädt Stage 1, lädt synthetische CSV aus `apps/web/tests/fixtures/` (existiert vermutlich, sonst eine Mini-Fixture mit 20 Personen anlegen), klickt Run, wartet auf `[data-testid="stage1-trust-strip"]`. Spec-Code dafür im Step 03-Test-Case kapseln.

  **2. TrustStrip umbauen** (`apps/web/src/stage1/TrustStrip.tsx`):
  - 3 Karten bekommen jeweils ein Inline-SVG-Icon (24×24 oder 32×32) oben:
    - Karte "Algorithmus" → Buch- oder Formel-Icon (Brand-Accent-Farbton)
    - Karte "Cross-validiert" → Häkchen-Icon (green-600 für positive Konnotation)
    - Karte "Signiert" → Schloss- oder Schlüssel-Icon (brand-Farbton)
  - Card-Klasse: `card card-hover` (aus Task 1) — gibt automatisch Border, Shadow, Hover-Lift.
  - Cursor `cursor-default` auf den Karten lassen — sie sind nicht klickbar, also kein `cursor-pointer`-Lie.
  - Subtle Background-Tint: jede Karte bekommt einen sehr leichten Brand-Tint (z.B. `bg-slate-50/50` oder eigenen `bg-brand-muted` falls in Theme definiert).
  - Mobile-Stack: Container heutiges Grid (`grid-cols-1 md:grid-cols-3 gap-4`) prüfen — wenn `md:grid-cols-3` nicht da, hinzufügen. Mobile = 1-Spalte automatisch über `grid-cols-1`.
  - Icons + Headline + Body-Text vertikal innerhalb jeder Karte: `flex flex-col gap-3 items-start`.
  - **Test-ID `stage1-trust-strip` am Container unverändert.**

  **3. Build + Nachher-Screenshots + Multimodal + ggf. Iteration.**
  </action>
  <verify>
    <automated>pnpm --filter @sortition/web build && pnpm --filter @sortition/web test:e2e --project chromium -g "trust-strip" && pnpm --filter @sortition/web exec playwright test tests/e2e/_visual-iteration.spec.ts --grep "03-trust-strip-after"</automated>
  </verify>
  <screenshot_iteration>
    <step>03-trust-strip</step>
    <vorher_pfad>.issues/56-ui-visual-redesign/iteration/03-trust-strip-before-{desktop,mobile}.png</vorher_pfad>
    <nachher_pfad>.issues/56-ui-visual-redesign/iteration/03-trust-strip-after-{desktop,mobile}.png</nachher_pfad>
    <akzeptanz_kriterium>
    - 3 TrustStrip-Karten haben jeweils ein klar erkennbares SVG-Icon oben
    - Karten haben sichtbaren Border + Shadow (nicht mehr farblos-flach)
    - Hover-Lift bei Maus-Over erkennbar (translate-y + größerer Shadow) — auf Static-Screenshot evtl. nicht sichtbar, daher Code-Review als Fallback-Verify
    - Mobile (375px): Karten gestackt, jeweils volle Breite, lesbares Padding
    - Desktop (≥768px): 3-Spalten-Grid mit gleichmäßigem Gap
    - Visueller Eindruck: vertrauenswürdig (Schloss/Häkchen für "ja, das ist ernst gemeint"), nicht spielzeug-haft
    </akzeptanz_kriterium>
  </screenshot_iteration>
  <done>
  - 3 TrustStrip-Karten haben jeweils Inline-SVG-Icon, `card card-hover` Klassen, Mobile-Stack
  - 4 Screenshot-PNGs committet
  - `stage1-trust-strip` Test-ID + bestehender Trust-Strip-Spec (`tests/e2e/trust-strip.spec.ts`) grün
  - Akzeptanzkriterien aus `<screenshot_iteration>` bestätigt
  </done>
</task>

<task type="auto">
  <name>Task 5 (Commit 5, Stage 1 Form-Komponenten): Drop-Zone + Inputs + Run-Button + Result-Cards + Strata-Tabelle</name>
  <files>apps/web/src/stage1/Stage1Panel.tsx, apps/web/src/stage1/CsvPreview.tsx (falls für Strata-Tabelle relevant), apps/web/src/csv/CsvImport.tsx (für Stage-3-Konsistenz), .issues/56-ui-visual-redesign/iteration/04-stage1-form-before-{desktop,mobile}.png, .issues/56-ui-visual-redesign/iteration/04-stage1-form-after-{desktop,mobile}.png</files>
  <action>
  Größter Task — 5 sub-Bereiche im selben Commit (alle visuell zusammenhängend, gemeinsame Brand-Tokens). Wenn Token-Budget kritisch wird: jeden Sub-Bereich einzeln screenshotten + multimodal verifizieren, aber alle in einem Commit zusammenfassen.

  **1. Vorher-Screenshots Stage 1 Form** (mit geladenem CSV + ohne Run + mit Run): siehe Spec-Cases `04-stage1-form-before-{desktop,mobile}` und ggf. `04-stage1-result-before-{desktop,mobile}`.

  **2. CSV-Upload-Bereich (`Stage1Panel.tsx`, sucht das `<input type="file">` mit `data-testid="stage1-csv-upload"`):**
  - Den Browser-Default-File-Input durch eine Drop-Zone-Optik ersetzen: `<label>`-Wrapper mit Klasse `dropzone` (aus Task 1) — gestrichelter Brand-Border, Padding, Cursor-Pointer, Hover-State (Brand-Border voller).
  - Innerhalb der Label: ein Upload-Icon (SVG Pfeil-nach-oben oder Cloud-Upload), der Text "Melderegister-CSV hochladen oder hier ablegen", darunter ein kleinerer Hinweis "CSV mit Header-Zeile, UTF-8 oder Latin-1".
  - Das `<input>` selbst bleibt im DOM (für die Tests + Funktion), aber visuell versteckt: `class="sr-only"`. Klick auf Label triggert nativ den File-Picker.
  - `@tailwindcss/forms` mit `class`-Strategy bedeutet, dass der Input nicht globally-styled wird — gut, er ist sowieso `sr-only`.
  - **Drag-and-Drop-Funktionalität wird NICHT implementiert** (out-of-scope laut ISSUE.md) — die Drop-Zone ist rein visuell.
  - **Test-ID `stage1-csv-upload` muss am `<input>` bleiben** (nicht am Label) — falls bestehende Tests `setInputFiles` nutzen, brauchen sie den Input-Selector.

  **3. N-Input + Seed-Input (`stage1-target-n`, `stage1-seed`):**
  - Konsistente Größe: beide gleich hoch (`h-11` ≥44px touch-target), gleicher Border-Radius, gleiches Focus-Ring (`focus:ring-2 focus:ring-brand-accent focus:ring-offset-1`).
  - Label klar visuell zugeordnet: Label oberhalb mit `block text-sm font-medium text-slate-700 mb-1`, Input voller Breite des Wrappers.
  - Inputs in einem Grid auf Desktop (`grid-cols-1 sm:grid-cols-2 gap-4`), gestapelt auf Mobile.
  - Falls `@tailwindcss/forms` Klassen nutzbar: `form-input` Klasse hinzufügen — sonst manuell stylen mit `bg-white border border-slate-300 rounded-md px-3 py-2`.

  **4. Run-Button (`stage1-run`):**
  - Klasse von default-Button-Style auf `btn-primary` (aus Task 1) umstellen — Brand-Background, weißer Text, padding-large, rounded.
  - Größer als Standard-Buttons (`text-base font-semibold py-3 px-6`).
  - Pfeil-Icon rechts neben Text (Inline-SVG, einfacher Rechts-Pfeil oder Play-Symbol).
  - Sticky-Verhalten bleibt — heutige `position: sticky bottom-X` oder `sticky bottom-0` Klassen behalten. Zusätzlich `bottom: env(safe-area-inset-bottom, 0)` via inline-style oder Tailwind-Arbitrary-Value `[bottom:env(safe-area-inset-bottom,0)]` für iOS-Safari (siehe RESEARCH.md Risk #5).

  **5. Result-Cards (`stage1-summary-cards` Container, mit `stage1-result`/`stage1-coverage-card`/`stage1-underfill-card` als Kinder):**
  - Hierarchie verstärken: "Gezogen"-Card (`stage1-result`) als Hero — größer, prominenter Border-Akzent (z.B. `border-l-4 border-brand-accent` oder gefüllter Brand-Background mit fg-Text), Zahl (Anzahl gezogener Personen) als große Display-Type (`text-4xl font-bold`).
  - Coverage- + Underfill-Card als sekundäre Cards (`card`-Klasse, kleinere Zahlen, `text-2xl`).
  - Mobile: 1-Spalte-Stack; Desktop: Grid (`grid-cols-1 md:grid-cols-3 gap-4` mit Hero-Card span 2 wenn elegant).
  - Underfill-Card bekommt bei `underfilledCount > 0` Status-Pill `status-pill-warn` (amber).

  **6. Strata-Tabelle (`stage1-strata-table`, hinter `stage1-strata-toggle` Disclosure):**
  - Zebra-Stripes: jede zweite Zeile `bg-slate-50`.
  - Header-Row: `bg-slate-100 font-semibold text-slate-700 text-sm uppercase tracking-wide`.
  - Status-Spalte (vermutlich heutige "Status" oder via underfill-Detection): Status-Pills — bei Underfill `status-pill-warn`, bei OK `status-pill-ok`.
  - Mobile: Tabelle in Container `overflow-x-auto` mit `min-w-full` an der `<table>` — Horizontal-Scroll statt Bröselei.
  - Cell-Padding: `px-4 py-2` für Lesbarkeit.

  **7. Konsistenz Stage-3-Upload (`apps/web/src/csv/CsvImport.tsx`):** Gleicher Drop-Zone-Patch wie Stage 1, damit beide Stages konsistent aussehen. Test-IDs (`csv-import` etc.) unverändert.

  **8. Build + Nachher-Screenshots + Multimodal + Iteration** für jeden Sub-Bereich (kann viele Iterations-Runden brauchen — größter visueller Block).
  </action>
  <verify>
    <automated>pnpm --filter @sortition/web build && pnpm --filter @sortition/web test:e2e --project chromium -g "stage1|csv-import" && pnpm --filter @sortition/web exec playwright test tests/e2e/_visual-iteration.spec.ts --grep "04-stage1-form-after"</automated>
  </verify>
  <screenshot_iteration>
    <step>04-stage1-form</step>
    <vorher_pfad>.issues/56-ui-visual-redesign/iteration/04-stage1-form-before-{desktop,mobile}.png</vorher_pfad>
    <nachher_pfad>.issues/56-ui-visual-redesign/iteration/04-stage1-form-after-{desktop,mobile}.png</nachher_pfad>
    <akzeptanz_kriterium>
    - CSV-Upload sieht aus wie ein Drop-Target (gestrichelter Border, Upload-Icon, einladender Text), KEIN Browser-Default-File-Input "Choose File / No file chosen"
    - N- und Seed-Input sind visuell gleich groß, klar gelabelt, Focus-Ring sichtbar bei Fokus
    - Run-Button ist visuell die Primary-Action: Brand-Farbe, größer als andere Buttons, Pfeil-Icon rechts
    - "Gezogen"-Result-Card sticht hervor (größer, andere Hintergrundfarbe oder Akzent-Border) — sie ist klar Hero, nicht ein Geschwister-Card
    - Coverage- und Underfill-Cards sind als sekundär erkennbar (kleiner, neutralerer Stil)
    - Strata-Tabelle zeigt Zebra-Stripes; Status-Spalte hat Pills (rot/grün) statt Text
    - Mobile: Strata-Tabelle horizontal scrollbar (nicht zerbröselt); Cards einspaltig; Run-Button bleibt sticky bottom und touch-able
    - Stage-3-Upload (separater Test-Run mit Stage 3) sieht konsistent zum Stage-1-Upload aus
    </akzeptanz_kriterium>
  </screenshot_iteration>
  <done>
  - CSV-Upload visuell als Drop-Zone (Stage 1 + Stage 3), Browser-Default-Input nicht mehr sichtbar
  - N- und Seed-Inputs konsistent, Focus-Ring, ≥44px Höhe
  - Run-Button als `btn-primary`, sticky, safe-area-inset-bottom für iOS
  - Result-Cards mit Hero-Hierarchie (Gezogen prominent), Mobile 1-Spalte
  - Strata-Tabelle Zebra + Status-Pills + Mobile-Scroll-Container
  - 4+ Screenshot-PNGs committet
  - Alle Stage-1- und CSV-Import-E2E-Tests grün; insb. `setInputFiles` auf `stage1-csv-upload` funktioniert weiterhin
  - Akzeptanzkriterien bestätigt
  </done>
</task>

<task type="auto">
  <name>Task 6 (Commit 6, Doku-Hub + Sub-Pages): Tile-Karten mit Icons + prose-Stil + Zurück-Link</name>
  <files>apps/web/src/docs/DocsHub.tsx, apps/web/src/docs/DocsLayout.tsx, .issues/56-ui-visual-redesign/iteration/05-docs-hub-before-{desktop,mobile}.png, .issues/56-ui-visual-redesign/iteration/05-docs-hub-after-{desktop,mobile}.png</files>
  <action>
  **1. Vorher-Screenshots:** Docs-Route + ein Sub-Page (z.B. Algorithmus) jeweils Desktop+Mobile.

  **2. DocsHub Tile-Karten (`apps/web/src/docs/DocsHub.tsx`):**
  - Pro Tile (es sind ~6 — Algorithmus, Technik, Verifikation, Glossar, BMG-46, Limitationen) ein passendes SVG-Icon oben:
    - Algorithmus → Diagramm/Formel-Icon
    - Technik → Zahnrad oder Code-Brackets
    - Verifikation → Häkchen-im-Schild
    - Glossar → Buch
    - BMG-46 → Paragraf-Symbol §
    - Limitationen → Ausrufezeichen-Dreieck
  - Tile-Klasse: `card card-hover` + `cursor-pointer` (klickbar zur Sub-Page).
  - Mobile: 1-Spalte-Stack über `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
  - Tile-Inhalt: Icon oben, Titel als H3 (`text-lg font-semibold`), 1-2 Zeilen Beschreibung (`text-sm text-slate-600`).
  - **Test-IDs `docs-tile-{slug}` unverändert.**

  **3. DocsLayout (`apps/web/src/docs/DocsLayout.tsx`):**
  - Wrapper bekommt `prose prose-slate max-w-3xl` Klassen direkt am Content-Container, damit alle Sub-Page-Inhalte (`Algorithmus.tsx`, `Technik.tsx`, …) automatisch typography-styled sind. Sub-Pages brauchen keine Code-Änderungen, wenn sie strukturell semantisches HTML (h2, h3, p, ul, li, code) liefern.
  - "Zurück zu Hub"-Link (`docs-back-to-hub` Test-ID): prominent oben links, mit Pfeil-Icon nach links + Text "Zurück zur Übersicht". Klasse `btn-ghost` oder ein dezenter Brand-Akzent-Link mit Hover.
  - Layout: Zurück-Link in einem Header-Bereich des Layouts (`mb-6 pb-4 border-b border-slate-200`), darunter die `prose`-Wrapper für den Sub-Page-Content.
  - **Falls Sub-Pages aktuell `<div>`-Soup haben**, NICHT in diesem Issue umstellen — out-of-scope. `prose` arbeitet auch mit gemischtem Markup, wirkt halt nur dort wo semantisches HTML schon da ist. Sub-Page-Refactor ist eigener Issue.

  **4. Build + Nachher-Screenshots + Multimodal-Vergleich für Hub UND eine Sub-Page (z.B. Algorithmus, weil dort viel Text + Formeln + Code).**
  </action>
  <verify>
    <automated>pnpm --filter @sortition/web build && pnpm --filter @sortition/web test:e2e --project chromium -g "docs" && pnpm --filter @sortition/web exec playwright test tests/e2e/_visual-iteration.spec.ts --grep "05-docs-hub-after"</automated>
  </verify>
  <screenshot_iteration>
    <step>05-docs-hub</step>
    <vorher_pfad>.issues/56-ui-visual-redesign/iteration/05-docs-hub-before-{desktop,mobile}.png</vorher_pfad>
    <nachher_pfad>.issues/56-ui-visual-redesign/iteration/05-docs-hub-after-{desktop,mobile}.png</nachher_pfad>
    <akzeptanz_kriterium>
    - DocsHub-Tiles haben pro Bereich ein eindeutiges Icon (nicht mehr generisch alle gleich)
    - Tiles haben Card-Stil mit Border + Shadow + Hover-Lift
    - Mobile (375px): Tiles 1-spaltig gestackt, keine 3-Spalten-Quetschung
    - Desktop: 2- oder 3-Spalten-Grid mit gleichmäßigem Gap
    - Sub-Page (Algorithmus): Text ist über `prose`-Stil typografisch sauber (Heading-Hierarchie sichtbar, Absatz-Spacing konsistent, Listen eingerückt)
    - "Zurück zur Übersicht"-Link prominent oben links sichtbar mit Pfeil-Icon
    - Visueller Eindruck: civic-tech-Doku-Stil (Gemeindeordnung-ähnlich), nicht generisch-blog
    </akzeptanz_kriterium>
  </screenshot_iteration>
  <done>
  - DocsHub-Tiles: Icons pro Bereich, `card card-hover`, Mobile-Stack
  - DocsLayout: `prose prose-slate max-w-3xl`, prominent Zurück-Link mit Icon
  - Test-IDs `docs-tile-*`, `docs-back-to-hub`, `docs-page-*` unverändert
  - 4+ Screenshot-PNGs committet (Hub + mind. 1 Sub-Page-Beispiel)
  - Bestehende Docs-E2E-Tests grün
  - Akzeptanzkriterien bestätigt
  </done>
</task>

<task type="auto">
  <name>Task 7 (Commit 7, Mobile-Spezifisch): Touch-Targets ≥44px-Audit + Strata-Mobile-Scroll-Verify + Sticky-iOS-Safe-Area</name>
  <files>apps/web/tests/e2e/mobile-touch-targets.spec.ts (NEU), evtl. minor patches in apps/web/src/stage1/Stage1Panel.tsx + apps/web/src/App.tsx falls Audit Lücken findet</files>
  <action>
  **1. Mobile-Touch-Target-Audit-Spec anlegen** (`apps/web/tests/e2e/mobile-touch-targets.spec.ts`): NEUE Spec, läuft im normalen E2E-Suite mit. Setzt Viewport auf Mobile (375×812). Navigiert durch Stage 1, Stage 3, Docs-Hub. Für jeden interaktiven Selektor (Liste in Spec hardcoded: Tab-Buttons, Run-Button, Zurück-Link, alle DocsHub-Tiles, alle Stage-1-Buttons) macht `await locator.boundingBox()` und assertet `box.width >= 44 && box.height >= 44`. Bei Fail: Test schlägt mit klarer Message fehl ("Touch-target {selector} ist {w}×{h}, erwartet ≥44×44").

  **2. Audit ausführen.** Bei Fails: das jeweilige Element-Class-String anpassen (z.B. `py-1.5` zu `py-3`, `text-sm` zu `text-base`). Dieses Anpassen ist Teil des Tasks. Wenn nach 2-3 Anpassungen noch Fails bleiben, dokumentieren in `BUNDLE_DELTA.md` Sektion "Bekannte A11y-Punkte" und Test mit `test.fixme()` markieren — kein Blocker, aber sichtbar.

  **3. Strata-Tabelle Mobile-Scroll-Verify:** Spec lädt CSV + macht Run, klickt Strata-Toggle, prüft auf Mobile-Viewport dass `[data-testid="stage1-strata-table"]` Parent-Element `overflowX === 'auto'` hat ODER dass `scrollWidth > clientWidth` (Tabelle ist breiter als Container, sprich scrollbar).

  **4. Sticky Run-Button iOS-safe-area:** In CSS verifizieren dass `bottom: env(safe-area-inset-bottom, 0)` oder Tailwind-Arbitrary `[bottom:env(safe-area-inset-bottom,0)]` an dem Sticky-Wrapper angewendet ist (aus Task 5 Punkt 4). Falls nicht: nachreichen.
  </action>
  <verify>
    <automated>pnpm --filter @sortition/web test:e2e --project chromium -g "mobile-touch-targets|stage1"</automated>
  </verify>
  <done>
  - `tests/e2e/mobile-touch-targets.spec.ts` existiert und prüft ≥44×44 für alle relevanten interaktiven Elemente
  - Audit grün ODER offene Punkte in `BUNDLE_DELTA.md` "Bekannte A11y-Punkte" dokumentiert (mit `test.fixme()` markiert)
  - Strata-Tabelle hat auf Mobile horizontal-scroll-Container
  - Sticky Run-Button hat safe-area-inset-bottom
  </done>
</task>

<task type="auto">
  <name>Task 8 (Commit 8, Verify + Bundle-Delta + Final-Screenshots): Test-Run + Bundle-Messung + after-screenshots/-Suite</name>
  <files>.issues/56-ui-visual-redesign/BUNDLE_DELTA.md (NEU), .issues/56-ui-visual-redesign/after-screenshots/*.png (8+ Final-PNGs)</files>
  <action>
  **1. Vollständige Test-Suite durchlaufen lassen:**
  - `pnpm --filter @sortition/web test` (Vitest)
  - `pnpm --filter @sortition/web test:e2e --project chromium`
  - `pnpm --filter @sortition/web test:e2e --project firefox`
  - `pnpm --filter @sortition/web typecheck`
  - `pnpm --filter @sortition/web lint`

  Bei Brüchen: das **gebrochene Test ist die Quelle der Wahrheit für den Vertrag** — wenn ein Selector nicht mehr matcht, ist das DOM-Restyling zu invasiv gewesen → DOM-Struktur minimal-zurück anpassen damit der Selector wieder greift, NICHT den Test ändern. **Ausnahme:** wenn der Test eine pure-visuelle Annahme prüft (z.B. "Element hat bg-slate-100 Klasse"), ist Test-Anpassung erlaubt — aber dann nur die Selector-/Annahme-Zeile, nicht die Test-Logik. Jede Test-Anpassung dokumentieren in `BUNDLE_DELTA.md`.

  Live-Smoke `pnpm --filter @sortition/web test:smoke-live` läuft NUR gegen Live-URL (GH Pages) — diese Spec wird nach dem Deploy gegen die Live-Version geprüft. Im Plan-Scope: lokal überspringen (Annotation in BUNDLE_DELTA.md).

  **2. Bundle-Delta messen:**
  - Pre-State (vor allen Änderungen): aus `git log --oneline main` den Commit-Hash vor diesem PR finden, `git checkout` → `pnpm --filter @sortition/web build` → `du -sb apps/web/dist/assets/*.{js,css}` notieren, dazu `gzip -c <file> | wc -c` für gzip-Größen. **ODER:** Falls die main-Branch-baseline schon bekannt ist (aus CI), das nutzen. Einfachster Weg ohne Branch-Hopping: erstmal `git stash` (falls dirty), `git checkout main`, build + measure, `git checkout ui-redesign`, `git stash pop`, build + measure, diff.
  - Post-State (mit allen Änderungen): aktueller `apps/web/dist/`-Output.
  - Diff: `BUNDLE_DELTA.md` schreiben mit Tabelle "Datei | Pre raw | Pre gzip | Post raw | Post gzip | Δ raw | Δ gzip", Total-Zeile, Vergleich gegen Budget (+30 KB raw / +10 KB gzip). Falls Budget überschritten: in Markdown klar markieren ("BUDGET ÜBERSCHRITTEN: X KB statt 30 KB raw"), aber **kein Auto-Rollback** (gemäß User-Vorgabe).

  **3. Final-Screenshot-Suite generieren:** Spec-Cases `06-final-{stage1-empty,stage1-with-result,stage3-default,docs-hub,docs-algorithmus}-{desktop,mobile}` ergänzen in `_visual-iteration.spec.ts`. Output-Pfad NICHT `iteration/` sondern `.issues/56-ui-visual-redesign/after-screenshots/`. Mind. 8 PNGs (4 Views × 2 Viewports) — analog zu `before-screenshots/`. Diese Suite ist das Audit-Pendant für den PR-Reviewer.

  **4. `BUNDLE_DELTA.md` finalisieren** mit Sektionen:
  - "Bundle-Delta" (Tabelle + Budget-Vergleich)
  - "Test-Suite-Status" (welche Suites grün, welche angepasst, was)
  - "Test-Anpassungen" (jede Selector-/Annahme-Änderung mit Begründung)
  - "Bekannte A11y-Punkte" (aus Task 7)
  - "Offene visuelle Punkte" (aus Iterations-Step-Limits, falls vorhanden)
  - "Verifikations-Befehle" (Liste der Befehle die der Reviewer reproduzieren kann)

  **5. Status-Update ISSUE.md:** Frontmatter `status: planned` → `status: in_progress` ist schon durch Plan-Erstellung erfolgt; nach Commit 8 setzt der Executor (oder Closer) auf `status: completed`. **Dieser Plan macht das nicht.**
  </action>
  <verify>
    <automated>pnpm --filter @sortition/web test && pnpm --filter @sortition/web test:e2e --project chromium && pnpm --filter @sortition/web test:e2e --project firefox && pnpm --filter @sortition/web typecheck && pnpm --filter @sortition/web lint && test -f .issues/56-ui-visual-redesign/BUNDLE_DELTA.md && ls .issues/56-ui-visual-redesign/after-screenshots/*.png | wc -l | grep -E "^[ ]*[8-9]|^[ ]*[1-9][0-9]"</automated>
  </verify>
  <done>
  - Vitest grün (oder dokumentiert)
  - Playwright e2e in chromium UND firefox grün (oder dokumentiert)
  - Typecheck + Lint grün
  - `BUNDLE_DELTA.md` existiert mit allen 6 Sektionen, Bundle-Vergleich quantifiziert
  - `.issues/56-ui-visual-redesign/after-screenshots/` enthält ≥8 PNGs (Stage 1 leer + mit Result, Stage 3 default, Docs-Hub, Docs-Algorithmus — Desktop + Mobile)
  - Live-Smoke-Spec-Pfad unverändert (sie läuft gegen Live nach Deploy, nicht im Scope dieses Plans)
  </done>
</task>

</tasks>

<verification>
Nach allen 8 Tasks final laufen lassen:
- `pnpm --filter @sortition/web test` (Vitest Unit)
- `pnpm --filter @sortition/web test:e2e --project chromium`
- `pnpm --filter @sortition/web test:e2e --project firefox`
- `pnpm --filter @sortition/web typecheck`
- `pnpm --filter @sortition/web lint`
- `pnpm --filter @sortition/web build` (Production-Build sauber)
- Manuelle Multimodal-Verifikation der `after-screenshots/` gegen `before-screenshots/`: jede der 4 Hauptviews zeigt sichtbaren visuellen Sprung
- `BUNDLE_DELTA.md` Inhalt prüfen: Bundle-Diff vs. Budget, Test-Anpassungs-Log, A11y-Punkte
</verification>

<success_criteria>
1:1 Mapping zu ISSUE.md Acceptance Criteria:

**Tailwind-Setup:**
- Tailwind v3 bleibt + `@tailwindcss/typography` + `@tailwindcss/forms` als Plugins (Task 1) ✓
- `tailwind.config.cjs` hat `brand`, `accent-warm`, `accent-cool`, fontFamily Inter, beide Plugins (Task 1) ✓
- `index.css` hat `@layer base` mit body-defaults + smooth-scroll, `@layer components` mit Komponenten-Klassen (Task 1) ✓

**Branding:**
- Header-Text "Bürger:innenrat" + Logo + neue Tagline (Task 2) ✓
- Favicon SVG (Task 1) ✓
- HTML `<title>` "Bürger:innenrat — Versand-Liste & Panel-Auswahl" (Task 1) ✓

**Top-Navigation:**
- Tabs als Pill-Buttons mit Active-State (Task 3) ✓
- Subtitles aus visuellem DOM (zu aria-description) (Task 3) ✓
- Mobile horizontaler Scroll-Container (Task 3) ✓
- Active-State ≥2 Visual-Cues + `aria-current="page"` (Task 3) ✓

**TrustStrip-Karten:**
- Icons pro Karte (Task 4) ✓
- Card-Stil mit Hover-Lift + Brand-Tint (Task 4) ✓
- Mobile 1-Spalte (Task 4) ✓

**Stage 1 Form-Komponenten:**
- CSV-Upload als Drop-Zone (Task 5) ✓
- N+Seed-Inputs konsistent + Focus-Ring (Task 5) ✓
- Run-Button als Primary mit Pfeil-Icon, sticky safe-area (Tasks 5+7) ✓
- Result-Cards mit Hero-Hierarchie (Task 5) ✓
- Strata-Tabelle Zebra + Status-Pills (Task 5) ✓

**Doku-Hub und Sub-Pages:**
- Tile-Karten mit Icons + Hover + Mobile-Stack (Task 6) ✓
- Sub-Pages mit `prose prose-slate max-w-3xl` (Task 6) ✓
- "Zurück"-Link prominent (Task 6) ✓

**Mobile-Spezifisch:**
- Touch-Targets ≥44px verifiziert (Task 7) ✓
- Cards stacken ab `<md` (Tasks 4, 5, 6) ✓
- Strata horizontaler Scroll (Tasks 5, 7) ✓
- Sticky Run-Button mobile-OK (Tasks 5, 7) ✓

**Visuelle Iteration:**
- Vor/nach jedem visuellen Step Screenshots in `.issues/56-ui-visual-redesign/iteration/` (Tasks 2-6) ✓
- Mind. 5 Iterations-Punkte: Branding, Tabs, TrustStrip, Stage 1 Form, Docs Hub (Tasks 2-6) ✓
- Desktop + Mobile pro Punkt (Tasks 2-6) ✓
- Multimodal-Lesen + Iteration dokumentiert (Tasks 2-6) ✓

**Tests + Build:**
- Vitest + Playwright e2e + smoke-live grün (Task 8) ✓
- Test-IDs unverändert (alle Tasks: explizite Constraint) ✓
- Bundle-Delta dokumentiert in `BUNDLE_DELTA.md` (Task 8) ✓
</success_criteria>
