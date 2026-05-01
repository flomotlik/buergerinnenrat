---
id: 56
slug: ui-visual-redesign
title: UI Visual Redesign — Branding, Tailwind v4, Desktop + Mobile, Screenshot-Iteration
track: Z
estimate_pt: 3
status: planned
depends_on: [54, 55]
priority: high
priority_rationale: "Aktuelles UI ist funktional aber visuell unpoliert — würde Verwaltungen abschrecken bevor sie das eigentliche Tool sehen"
---

# UI Visual Redesign

## Kontext

Die Live-Site `https://flomotlik.github.io/buergerinnenrat/` ist technisch komplett (Stage 1 Sampler, Reporting, Doku-Hub, Trust-Strip, Audit-Footer, Verifikation), aber **visuell nicht produktiv-tauglich**. Heute (Screenshots in `/tmp/ui-current/`):

- Header lautet "Sortition Iteration 1" — Placeholder-Niveau
- Komplett grayscale, keine Marken-/Farb-Identität
- Browser-Default-File-Input ("Choose File / No file chosen")
- Tabs sind nur Underline-Hover, keine Card-Container
- TrustStrip-Karten sind farblos, ohne Icons, ohne Hover-Feedback
- Doku-Hub-Tiles sind generisch, nicht differenziert pro Thema
- Mobile (375px): drei Tabs in einer Zeile mit Subtitles werden zu Wrap-Salat
- Footer ist eine kleine graue Zeile

Inspirationsquellen vom User:
- <https://github.com/GrueneAT/bildgenerator> (deployed: `https://bildgenerator.gruene.at/`) — Tailwind v3, klares Branding, Visual-Regression-Tests
- <https://github.com/GrueneAT/Gemeindeordnung> (Repo) — Tailwind v4 mit Vite-Plugin, pagefind für Suche, Civic-Tech-Stil

Beide Repos bleiben bei pure Tailwind ohne Komponenten-Library — kein daisyUI, kein Mantine, kein Bootstrap. Eigenes Design-System aus Tailwind-Utilities.

## Ziel

Ein visuell selbstbewusstes, **mobile-first** Layout mit:
- Klares Branding ("Bürger:innenrat" als Marke, nicht "Sortition Iteration 1")
- Eigene Farb-Identität (Primärfarbe + 2 Akzente, nicht nur Slate-Grayscale)
- Card-Komponenten mit Hover-Lift, Icons, Differenzierung
- Mobile-Navigation die nicht zerbricht (Tabs scrollen horizontal ODER Drawer-Pattern)
- Form-Inputs mit eigenem Style (file-input, number-input)
- Typo-Hierarchie (H1 größer, mit Schrift-Akzent; H2 mit Marker; Lead-Paragraph größer)
- Konsistenz zwischen Stage 1, Stage 3, Doku
- Print-CSS bleibt (analog #54)

Visuelle Verbesserung wird **iterativ** durch Screenshot-Vergleich entwickelt: vorher/nachher pro Komponente, sichtbarer Fortschritt.

## Acceptance Criteria

### Tailwind-Setup

- [ ] Tailwind v3 → v4 migrieren (Gemeindeordnung-Pattern: `@tailwindcss/vite` plugin); ODER auf v3 bleiben + `@tailwindcss/typography` für Doku-Inhalte hinzufügen — Plan-Phase entscheidet welcher Weg weniger Breaking Change
- [ ] `tailwind.config.js` (oder v4-Equivalent): eigene Farb-Tokens (`brand`, `accent-warm`, `accent-cool`), eigene Spacing-Scale-Erweiterung wenn nötig
- [ ] `apps/web/src/index.css`: Base-Layer mit Default-Body-Font (System-Sans-Stack OR Inter via Google Fonts CDN), Default-Background, Smooth-Scroll

### Branding

- [ ] Header: "Sortition Iteration 1" → "Bürger:innenrat — Versand-Liste & Panel-Auswahl" mit Logo (Inline-SVG, eigenes simples Symbol, z.B. ein Kreis mit kleineren Kreisen als "Versammlung-Icon")
- [ ] Tagline darunter umformulieren in einen Kurz-Pitch: "Open-Source-Werkzeug für Verwaltungen — stratifizierte Auswahl ohne Backend, ohne Datenversand"
- [ ] Favicon (SVG, gleiche Marke wie Logo)
- [ ] HTML `<title>`: "Bürger:innenrat — Versand-Liste & Panel-Auswahl"

### Top-Navigation

- [ ] `apps/web/src/App.tsx`: Tabs umbauen zu **Pill-Buttons** mit aktiver/inaktiver-Variante, klar erkennbarer aktiver Pill (Hintergrund-Farbe), Hover-State
- [ ] Tab-Subtitles entweder weglassen ODER als Tooltip/aria-description (Tabs blieben kompakt)
- [ ] **Mobile (<640px)**: Tab-Bar als horizontaler Scroll-Container (kein Wrap), oder umstellen auf Stacked-Buttons mit Icons
- [ ] Active-State: 2-3 sichtbare Visual-Cues (Hintergrund + Text-Color + ggf. unterer Indikator)

### TrustStrip-Karten (#54)

- [ ] Icons pro Karte (Inline-SVG: z.B. Buch für "Algorithmus", Häkchen für "Cross-validiert", Schloss für "Signiert")
- [ ] Card-Stil: Hover-Lift-Effekt (translate-y -2 + shadow-md), klickbare Cursor, subtile Background-Tint passend zur Brand-Farbe
- [ ] Mobile: 1-Spalte-Stack statt 3-Spalten

### Stage 1 Form-Komponenten

- [ ] CSV-Upload-Bereich: prominente Drop-Zone mit gestricheltem Border + Icon + Label "Melderegister-CSV hochladen oder hier ablegen" (mindestens visuell — Drag-Drop kann separates Issue bleiben, aber das Upload-Feld muss aussehen wie ein Drop-Target)
- [ ] N-Input + Seed-Input: konsistente Größe, Label + Input klar visual gruppiert, Focus-Ring
- [ ] Run-Button: Sticky bleibt, aber visuell als Primary-Action stylen (Brand-Farbe, größer, klare Pfeil-Icon)
- [ ] Result-Karten: Hierarchie verstärken — "Gezogen"-Card als Hero, andere als Sekundär
- [ ] Strata-Tabelle: bessere Typo, Zebra-Stripes, Status-Badges (Underfilled = rote Pill, OK = grüne Pill)

### Doku-Hub und -Seiten

- [ ] Tile-Karten: Icons pro Doku-Bereich, Card-Stil mit Hover, mobile 1-Spalte
- [ ] Doku-Sub-Pages: prose-Stil über `@tailwindcss/typography` (`prose prose-slate max-w-3xl`)
- [ ] "Zurück zu Hub"-Link prominent oben links pro Sub-Page

### Mobile-Spezifisch

- [ ] Alle Touch-Targets ≥ 44px (Apple HIG / Material Design Standard)
- [ ] Cards stacken auf 1-Spalte ab `<md` (768px)
- [ ] Strata-Tabelle: horizontaler Scroll-Container statt zerbröselt
- [ ] Sticky Run-Button funktioniert auch auf Mobile (kein viewport-Bug)

### Visuelle Iteration mit Screenshots

- [ ] Vor jedem visuellen Schritt: Playwright-Screenshot des aktuellen Zustands speichern unter `/tmp/ui-iter/<step>-before-<viewport>.png`
- [ ] Nach jedem Schritt: gleicher Pfad mit `-after-`
- [ ] Executor agent **liest** Screenshots via Read-Tool (multimodal) und entscheidet ob Iteration nötig ist
- [ ] Mind. 5 Iterations-Punkte: (1) Branding, (2) Tab-Nav, (3) TrustStrip, (4) Stage-1-Form, (5) Doku-Hub
- [ ] Screenshots desktop+mobile pro Iterations-Punkt

### Tests + Build

- [ ] Bestehende Vitest + Playwright e2e bleiben grün — Test-IDs sind die Vertrags-Schnittstelle, sollen NICHT geändert werden
- [ ] Live-Smoke (`apps/web/tests/smoke-live/site-smoke.spec.ts`) bleibt grün
- [ ] Bundle-Delta unter +30 KB raw / +10 KB gzip dokumentieren (Tailwind generiert mehr CSS, aber tree-shaked)

## Out of Scope

- Drag-and-Drop CSV-Upload-Implementierung (visuelles Drop-Target reicht; echte DnD ist eigener Issue)
- Dark-Mode (Polish-Polish, später)
- Animations-Framework (Motion / Framer-Motion) — CSS-Transitions reichen
- Komponenten-Library (daisyUI, Mantine) — Tailwind-Utilities reichen, gemäß Inspiration-Repos
- Internationalisierung (DE bleibt einzige Sprache)
- A11y-Vollaudit (BITV-2.0) — Smoke-A11y reicht, das ist eigener Workstream
- Visual-Regression-Test-Suite mit Snapshot-Diff (wäre nice, aber Bildgenerator-Pattern ist eigener großer Issue)

## Verweise

- Inspiration: <https://github.com/GrueneAT/bildgenerator>, deployed: <https://bildgenerator.gruene.at/>
- Inspiration: <https://github.com/GrueneAT/Gemeindeordnung>
- Aktuelle Screenshots: `/tmp/ui-current/` (8 Stück, desktop+mobile, 4 Views)
- Live-URL: <https://flomotlik.github.io/buergerinnenrat/>
- Tailwind v4: <https://tailwindcss.com/blog/tailwindcss-v4>
- @tailwindcss/typography: <https://tailwindcss.com/docs/typography-plugin>
- Branch: alle Änderungen auf neuer Branch `ui-redesign` ODER weiter auf `worktree-agent-ac76adcb` — Plan-Phase entscheidet
