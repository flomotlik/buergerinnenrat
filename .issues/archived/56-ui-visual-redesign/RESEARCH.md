# Research — Issue #56 UI Visual Redesign

> Lightweight Research: viel Visual-Iteration, keine konzeptionelle Tiefe nötig — Inspirations-Quellen + Tailwind-Setup-Optionen + Screenshot-Tooling.

## User Constraints (verbatim aus ISSUE.md)

- Inspiration: GrueneAT/bildgenerator + GrueneAT/Gemeindeordnung (beide Tailwind, kein Komponenten-Framework)
- Marke "Bürger:innenrat" statt "Sortition Iteration 1"
- Eigene Farbidentität (Brand + 2 Akzente)
- Mobile-first (Touch-Targets ≥ 44px, Stacked-Layouts ab <md)
- Visuelle Iteration mit Screenshots (5+ Iterations-Punkte)
- Bestehende Test-IDs sind Vertrags-Schnittstelle, NICHT ändern
- Bundle-Delta ≤ +30 KB raw / +10 KB gzip
- Branch: neu `ui-redesign` von main

## Summary

Aktueller Tailwind v3.4.17 Setup mit `tailwind.config.cjs`, Tailwind-Directives in `apps/web/src/index.css`. Gemeindeordnung-Pattern (Tailwind v4 + `@tailwindcss/vite`) ist eleganter aber Migrationsaufwand. **Empfehlung: bei v3 bleiben, `@tailwindcss/typography` + `@tailwindcss/forms` als Plugins addieren** — minimaler Migrations-Schmerz, alle Features die wir brauchen.

Kein Komponenten-Framework (daisyUI, Mantine, …) — beide Inspirations-Repos nutzen pure Tailwind-Utilities, das ist der civic-tech-Standard und behält Bundle-Größe minimal.

Visuelle Iteration: Playwright via `pnpm exec playwright test` mit Spec im `tests/e2e/`-Ordner, Screenshots nach `/tmp/ui-iter/`. Multimodal-Lesen via Read-Tool (Sonnet/Opus können PNGs interpretieren).

## Codebase Analysis

### Tailwind-Setup (heute)
<interfaces>
- `apps/web/tailwind.config.cjs`: vermutlich nur `content: ['./src/**/*.{tsx,ts}']` und default theme. **Erweitern:** custom colors (brand, accent), font family, container plugin defaults
- `apps/web/src/index.css`: `@tailwind base; @tailwind components; @tailwind utilities;` plus `@media print`-Block. Erweiterung: custom `@layer base` rules für body-default, smooth scroll, prose defaults
- `apps/web/package.json`: `tailwindcss: ^3.4.17`, postcss, autoprefixer
- Plugins addieren: `@tailwindcss/typography` (für Doku-Inhalte), `@tailwindcss/forms` (file-input, number-input)
</interfaces>

### Komponenten-Inventar zur visuellen Überarbeitung
<interfaces>
- `apps/web/src/App.tsx`: Header, Tab-Switcher, Tab-Subtitles, Schritt-Header
- `apps/web/src/stage1/Stage1Panel.tsx`: Schritt-Header, BMG-Hint, Upload, AxisPicker-Container, N+Seed-Inputs, Seed-Confirm, Vorschau-Block, sticky Run-Button, Result-Cards (3), Underfill-Liste, AxisBreakdowns, Stratum-Tabelle, Audit-Footer, Export-Buttons
- `apps/web/src/stage1/AxisPicker.tsx`: Checkbox-Liste
- `apps/web/src/stage1/AxisBreakdown.tsx`: SVG-Chart-Container
- `apps/web/src/stage1/AuditFooter.tsx`: Tech-Provenance
- `apps/web/src/stage1/TrustStrip.tsx`: 3 Karten
- `apps/web/src/stage1/CsvPreview.tsx`: Tabelle nach Upload
- `apps/web/src/csv/CsvImport.tsx`: Stage-3-Upload (gleiches Pattern)
- `apps/web/src/run/RunPanel.tsx`: Stage 3 Layout
- `apps/web/src/quotas/...`: Quoten-Editor (nicht-prioritär für Redesign)
- `apps/web/src/docs/DocsHub.tsx`: Tile-Karten
- `apps/web/src/docs/DocsLayout.tsx`: gemeinsamer Layout-Wrapper
- `apps/web/src/docs/Algorithmus.tsx`, `Technik.tsx`, `Verifikation.tsx`, `Glossar.tsx`, `Bmg46.tsx`, `Limitationen.tsx`: prose-Style-Kandidaten
- `apps/web/src/docs/Term.tsx`: Inline-Tooltip
- `apps/web/src/docs/HamiltonSvg.tsx`: SVG-Visualisierung
</interfaces>

### Aktueller visueller Zustand (aus Screenshots in `before-screenshots/`)
<interfaces>
- 02-stage1-empty-desktop: Header mit "Sortition Iteration 1" (zu groß, unmarken-haft), Tagline grau, Tabs als Underline-only, TrustStrip 3 Cards mit hellem Border (kein Hover, keine Icons), File-Input ist Browser-Default
- 02-stage1-empty-mobile: Tabs-Wrap mit Subtitles, sehr unschön, eng gestapelt
- 03-docs-hub-desktop: 6 generische Tile-Cards 3×2, alle gleich aussehend, kein Icon, kein Hover-Cue, Footer-Build-SHA klein
- 04-docs-algo: prose-Layout existiert, ist aber ohne tailwind/typography und visuell sehr simpel
</interfaces>

### Test-IDs (NICHT ändern!)
<interfaces>
Wichtige IDs die in 38+ Playwright-Tests genutzt werden:
- `tab-stage1`, `tab-stage3`, `tab-docs`
- `stage1-panel`, `stage1-csv-upload`, `stage1-pool-summary`, `stage1-bmg-hint`, `stage1-seed-hint`, `stage1-target-n`, `stage1-seed`, `stage1-seed-source`, `stage1-seed-confirm`, `stage1-run`, `stage1-preview`, `stage1-result`, `stage1-summary-cards`, `stage1-coverage-card`, `stage1-underfill-card`, `stage1-axis-breakdowns`, `stage1-axis-breakdown-{axis}`, `stage1-strata-toggle`, `stage1-strata-table`, `stage1-trust-strip`, `stage1-audit-footer`, `audit-footer-sig-algo`, `stage1-download-csv`, `stage1-download-audit`, `stage1-download-md`, `stage1-print`, `stage1-underfill-list`, `stage1-preview-error`
- `axis-checkbox-{name}`
- `docs-tile-{slug}`, `docs-back-to-hub`, `copy-snippet-{n}`, `docs-page-{slug}`
- Stage 3: `csv-import`, `quota-editor`, `run-button`, `run-result`, etc.

**Strategie:** Tests halten via `data-testid` — visuelle Re-Styling ändert nur class-Strings + Layout, nicht IDs.
</interfaces>

### Screenshot-Workflow
<interfaces>
- Spec-Datei `apps/web/tests/e2e/_visual-iteration.spec.ts` (mit Underscore-Prefix damit klar dass es ein temp-script ist) ODER per `--grep visual-iter` filtern
- Screenshots: `/tmp/ui-iter/<step>-<state>-<viewport>.png` mit klarer Naming-Convention
- Nach jedem visuellen Step: `pnpm --filter @sortition/web build` (wegen vite preview), dann Screenshot-Run
- Lokal vs. Live: Iteration LOKAL gegen `vite preview` (Port 4173, base path `/`), nicht gegen Live-URL — das ist schneller und unabhängig von GH Pages. Erst am Ende: lokal vs. live Smoke-Vergleich.
</interfaces>

## Architektur-Empfehlung

### Plugin-Setup (statt v3→v4-Migration)

```
pnpm --filter @sortition/web add -D @tailwindcss/typography @tailwindcss/forms
```

`tailwind.config.cjs`:
- `theme.extend.colors`: brand (slate-900-Variante mit Akzent), accent-warm (amber-600), accent-cool (blue-600)
- `theme.extend.fontFamily`: sans = ['Inter', 'system-ui', ...]
- `plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')]`

### Inter-Font

Via `index.html` `<link>` zu `https://rsms.me/inter/inter.css` ODER eigener `@font-face` mit selbst-gehostetem Inter-Subset (privacy-friendly, kein Google-CDN). Empfehlung: rsms.me ist der canonical Inter-Host, OK für civic-tech (kein Tracking).

### Komponenten-Patterns (zentralisiert)

`apps/web/src/styles/components.css` ODER per `@layer components` in `index.css`:
```css
@layer components {
  .btn-primary { ... }
  .btn-ghost { ... }
  .card { ... }
  .pill-tab { ... }
  .pill-tab-active { ... }
}
```

### Tab-Bar-Layout

- Desktop: horizontaler Pill-Stack mit Brand-aktivem-State
- Mobile: horizontaler Scroll-Container (`overflow-x-auto`, `scroll-snap-type-x`), Pills tap-friendly (≥44px Höhe)
- Subtitles: aus Tab-Buttons raus, evtl. als Tooltip-aria-label

## Implementierungs-Risiken

1. **Test-Brüche durch DOM-Struktur-Änderungen:** Wenn beim Restyling unbeabsichtigt Element-Hierarchie geändert wird, brechen Selector-basierte Tests. **Mitigation:** Test-IDs als Konstanten, NICHT verschachteln; pre-flight-Check `pnpm test` nach JEDER visuellen Iteration.
2. **Bundle-Delta:** Tailwind generiert nur genutzte Utilities, aber neue Plugins (typography, forms) addieren CSS. Erwartung: +5-15 KB CSS gzipped. Innerhalb +30 KB raw / +10 KB gzip Budget.
3. **Inter-Font-Loading:** rsms.me-CDN-Latenz auf erstem Page-Load. Mitigation: `<link rel="preload">` für Inter-Subset, oder System-Sans-Stack als Fallback.
4. **Print-CSS-Brüche:** existing print-CSS ist sehr spezifisch (selectors). Restyling muss print-CSS mitupdaten.
5. **Mobile-Sticky-Run-Button:** sticky kann auf iOS Safari mit virtual-keyboard-overlay seltsam sein. Mitigation: `bottom: env(safe-area-inset-bottom, 0)`.
6. **Multimodal-Screenshot-Read im Subagent:** issue-executor (Sonnet) kann PNGs lesen via Read-Tool, aber das hängt von Modell-Verfügbarkeit ab. Falls multimodal nicht verfügbar im Subagent: Fallback ist mein Hauptmodell, das den Screenshot-Step als Verify-Punkt einleitet.

## Sources

- HIGH: aktueller Tailwind-Setup im Repo (geprüft)
- HIGH: Inspirations-Repos package.json + tech (geprüft via gh api)
- HIGH: Test-ID-Inventar aus Playwright-Specs
- MEDIUM: Inter-Font-Hosting-Optionen (rsms.me ist standard)
- LOW: Bundle-Delta-Estimate (würde gemessen)
