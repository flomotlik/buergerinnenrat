# Execution: UI Visual Redesign — Bürger:innenrat Branding, Tailwind v3 + Plugins, Mobile-First, Screenshot-Iteration

**Started:** 2026-04-26T15:18:43Z
**Completed:** 2026-04-26T15:50:00Z
**Status:** complete
**Branch:** ui-redesign

## Execution Log

- [x] Task 1: Tailwind plugins + brand theme + Inter font + component layer — commit `8dbb5ed`
- [x] Task 2: Branding + Header rebrand to "Bürger:innenrat" with assembly logo — commit `6af4bd7`
- [x] Task 3: Tab-Navigation as pill buttons + mobile horizontal scroll — commit `d3071f1`
- [x] Task 4: TrustStrip cards with icons (book/check/shield) + hover-lift — commit `2e09e88`
- [x] Task 5: Stage 1 form components — dropzone, inputs, run-button, hero result cards, strata zebra+pills — commit `bfe9585`
- [x] Task 6: Docs hub tile icons + prose-app sub-pages + prominent back link — commit `d3e1253`
- [x] Task 7: Mobile touch-target audit + docs back-link min-height patch — commit `7773173`
- [x] Task 8: Bundle delta + 10 after-screenshots final suite — commit `84877b9`

## Visual Iterations

### 01-header (Task 2) — VERDICT: ACCEPTED at first pass

**Vorher:** `.issues/56-ui-visual-redesign/iteration/01-header-before-{desktop,mobile}.png`
**Nachher:** `.issues/56-ui-visual-redesign/iteration/01-header-after-{desktop,mobile}.png`

Visuelle Bewertung:
- **Desktop:** Logo (assembly-icon, civic-green) sichtbar links neben "Bürger:innenrat"-H1 in dark slate. Subtitle "Versand-Liste & Panel-Auswahl" als zweite Zeile, klar als Untertitel erkennbar (kleiner als H1). OSS-Tagline darunter in lesbarer Größe (text-base, max-w-2xl). Border-bottom als sauberer Trenner zur Tab-Nav.
- **Mobile (375px):** Logo + Titel + Subtitle vertikal gestackt. Alle Texte vollständig lesbar. Logo bleibt prominent (12×12). Tagline wraps in 3 Zeilen — das ist ok und intentional (max-w-2xl auf Desktop, Container-Limit auf Mobile).
- **Civic-tech-Eindruck:** seriös, nicht startup-haft. Marken-Identität klar.

### 02-tabs (Task 3) — VERDICT: ACCEPTED at first pass

**Vorher:** `.issues/56-ui-visual-redesign/iteration/02-tabs-before-{desktop,mobile}.png`
**Nachher:** `.issues/56-ui-visual-redesign/iteration/02-tabs-after-{desktop,mobile}.png`

Visuelle Bewertung:
- **Desktop:** 3 Pills nebeneinander. Active "Stage 1 / Versand-Liste" hat dunkles brand-Background (slate-900) + weißen Text + leichten Schatten. Inactive Pills haben slate-100 Background + slate-700 Text. Klare ≥2-Cue-Differenzierung (BG-Color + Text-Color + Shadow auf active).
- **Mobile:** Alle 3 Pills in einer horizontalen Linie, NICHT mehr wrap-salat. Stage 3 ist überschossen am rechten Rand (scrollbar). Touch-Targets ≥44px durch min-h auf .pill-tab.
- **Subtitles:** vollständig aus visuellem DOM entfernt; jetzt als `title`-Attribut für Hover-Tooltip auf Desktop und Screen-Reader-Verfügbarkeit.

### 03-trust-strip (Task 4) — VERDICT: ACCEPTED at first pass

**Vorher:** `.issues/56-ui-visual-redesign/iteration/03-trust-strip-before-{desktop,mobile}.png`
**Nachher:** `.issues/56-ui-visual-redesign/iteration/03-trust-strip-after-{desktop,mobile}.png`

Visuelle Bewertung:
- **Desktop:** 3 Cards in einer Reihe. Open-Book-Icon (Algorithmus), Check-Circle-Icon (Verifikation), Shield-Check-Icon (Audit) alle in brand-accent-green. Cards haben deutlich sichtbaren border-slate-200 + shadow-card. Subtle bg-brand-muted/40 Background-Tint hält die Strip kohärent als ein "Trust-Block", aber nicht aufdringlich.
- **Mobile:** Cards 1-spaltig gestackt (durch grid-cols-1 default), jede Card volle Breite. Icons + Titel + Sub gut lesbar.
- **Vertrauenswürdigkeits-Eindruck:** Schloss/Häkchen vermitteln "ja, das ist ernst gemeint" — kein Spielzeug.

### 04-stage1-form (Task 5) — VERDICT: ACCEPTED at first pass

**Vorher:** `.issues/56-ui-visual-redesign/iteration/04-stage1-form-before-{desktop,mobile}.png`
**Nachher:** `.issues/56-ui-visual-redesign/iteration/04-stage1-form-after-{desktop,mobile}.png`

Visuelle Bewertung:
- **CSV-Upload:** Browser-default "Choose File" komplett ersetzt durch eine echte Drop-Zone mit gestricheltem Border, brand-green Upload-Icon, prominentem Label "Melderegister-CSV hochladen oder hier ablegen", Format-Hint. "Geladen: pool.csv" Feedback in brand-accent-strong nach Upload.
- **N + Seed:** Beide Inputs in 2-Spalten-Grid mit gleicher Höhe (.input-base, ≥44px), gleichem Focus-Ring auf brand-accent. Klare Label-Input-Pairing.
- **Run-Button:** Brand-green .btn-primary mit weißem Text, deutlich größer als Sekundär-Buttons, Pfeil-Icon rechts als CTA-Indikator. Sticky bottom mit env(safe-area-inset-bottom) für iOS.
- **Result-Cards (sichtbar in 05-stage1-with-result Final-Screenshot):** "Gezogen 50" als Hero-Card mit brand-accent linkem Border, 4xl bold Display-Type. Coverage + Underfill als sekundäre Cards mit Status-Pills (grün "OK").
- **Strata-Tabelle:** Zebra-Stripes, Status-Spalte nutzt status-pill-warn / status-pill-ok statt Plain-Text. Mobile bekommt overflow-x-auto Container — kein Bröselei mehr.

### 05-docs-hub (Task 6) — VERDICT: ACCEPTED at first pass

**Vorher:** `.issues/56-ui-visual-redesign/iteration/05-docs-hub-before-{desktop,mobile}.png`
**Nachher:** `.issues/56-ui-visual-redesign/iteration/05-docs-hub-after-{desktop,mobile}.png`
**Bonus Sub-Page:** `.issues/56-ui-visual-redesign/iteration/05-docs-algorithmus-after-desktop.png`

Visuelle Bewertung:
- **DocsHub-Tiles:** Jede Tile hat ein eindeutiges, semantisch passendes Icon: connected-nodes (Algorithmus), code-brackets (Technik), shield-check (Verifikation), open-book (Glossar), § (BMG-46), warning-triangle (Limitationen). Cards mit border-slate-200 + shadow-card + hover-lift. Mobile 1-col, Desktop 3-col.
- **Sub-Page (Algorithmus):** prose-app wrapper sorgt für saubere Typography (Heading-Hierarchie, Absatz-Spacing, Listen-Einzug, brand-accent Links). "← Zurück zur Übersicht" Back-Link prominent oben links mit Pfeil-Icon und Hover-Effekt.

## Verification Results

- **Vitest unit tests:** 44 passed (7 files) — green
- **Playwright e2e (chromium):** 54 passed — green
- **Playwright e2e (firefox):** 54 passed — green
- **TypeScript typecheck:** clean
- **ESLint + Prettier:** 17 pre-existing failures unchanged by this issue (verified by stashing my changes and re-running on main HEAD before starting). Documented in BUNDLE_DELTA.md.
- **Bundle delta:** +37.9 KB raw (8 % über 30-KB-Budget), +7.4 KB gzip (26 % unter 10-KB-Budget). Detail-Tabelle in `BUNDLE_DELTA.md`.
- **All 5 visual iteration steps:** accepted at first pass — keine Step musste die 3-Runden-Iterations-Grenze in Anspruch nehmen.

## Deviations from Plan

### Auto-fixed (Rules 1-3)

1. **[Rule 3 - Blocker] tech-manifest entries for new Tailwind plugins**
   - Found during: Task 1 (build prebuild script enforces tech-manifest.ts is up-to-date)
   - Issue: Adding `@tailwindcss/typography` + `@tailwindcss/forms` to package.json triggered `[ERROR] tech-manifest.ts is out of date` because `scripts/build-tech-manifest.ts` had no entries for these packages.
   - Fix: Added curated `purpose` entries for both plugins to `PURPOSE_MAP` and ran `pnpm tech-manifest` to regenerate the manifest.
   - Files: `scripts/build-tech-manifest.ts`, `apps/web/src/generated/tech-manifest.ts`
   - Commit: `8dbb5ed` (part of Task 1)

2. **[Rule 1 - Bug] Test text-assertions broken by header rebrand**
   - Found during: Task 2 (E2E run after header change)
   - Issue: `smoke.spec.ts` and `csv-import.spec.ts` asserted `'Sortition Iteration 1'` heading text; the rebrand intentionally changed it.
   - Fix: Updated text assertion to `'Bürger:innenrat'` — pure assertion-text change, no test logic touched.
   - Files: `apps/web/tests/e2e/smoke.spec.ts`, `apps/web/tests/e2e/csv-import.spec.ts`
   - Commits: `6af4bd7` (Task 2), `bfe9585` (Task 5 — caught csv-import in same scope)

3. **[Rule 1 - Bug] Tab-subtitle assertion broken by intentional DOM removal**
   - Found during: Task 3 (E2E run after pill-tab redesign)
   - Issue: `stage1.spec.ts:244` asserted that tab buttons contain text "Aus Melderegister"/"Aus Antwortenden". The redesign intentionally removed those subtitles from visible DOM and moved them into `title` attributes for hover/SR access (per acceptance criterion).
   - Fix: Updated assertion to `toHaveAttribute('title', /Melderegister/)` — pure expectation update, intent preserved.
   - Files: `apps/web/tests/e2e/stage1.spec.ts`
   - Commit: `d3071f1` (Task 3)

4. **[Rule 2 - A11y] docs-back-to-hub touch-target below 44px**
   - Found during: Task 7 (mobile-touch-targets audit)
   - Issue: Back-link rendered at 168×20px on mobile — fails 44×44 touch-target requirement.
   - Fix: Added `py-3 px-1 -mx-1 min-h-[44px]` so the tap surface meets the audit. Visual size on desktop unchanged (inline-flex content drives the visible glyph).
   - Files: `apps/web/src/docs/DocsLayout.tsx`
   - Commit: `7773173` (Task 7)

### Blocked (Rule 4)

None.

## Discovered Issues

- **Pre-existing lint failures (17)** — `pnpm lint` fails on main with the same 17 errors that exist on `ui-redesign`. Out of scope for #56. Recommend a separate `chore: fix pre-existing lint`-Issue covering: 3× consistent-type-imports in stage1 components, 4× no-unused-vars in audit-sign.ts, 1× site-smoke.spec.ts parserOptions.project, 9× prettier format diffs.
- **Live-Smoke spec** — runs against the deployed Live URL only. Will be verified after deploy, not part of this issue's local scope.

## Self-Check

- [x] All files from plan exist:
  - `apps/web/tailwind.config.cjs` (extended)
  - `apps/web/src/index.css` (base + components layers added)
  - `apps/web/index.html` (title + Inter + favicon)
  - `apps/web/src/App.tsx` (header + nav)
  - `apps/web/src/stage1/Stage1Panel.tsx` (dropzone + inputs + run + result + strata)
  - `apps/web/src/stage1/TrustStrip.tsx` (icons + cards)
  - `apps/web/src/csv/CsvImport.tsx` (Stage 3 dropzone)
  - `apps/web/src/docs/DocsHub.tsx` (icons)
  - `apps/web/src/docs/DocsLayout.tsx` (prose-app + back-link)
  - `apps/web/tests/e2e/_visual-iteration.spec.ts` (NEW)
  - `apps/web/tests/e2e/mobile-touch-targets.spec.ts` (NEW)
  - `.issues/56-ui-visual-redesign/iteration/*.png` (24 PNGs: 5 steps × {before,after} × {desktop,mobile} + 4 bonus algorithmus shots)
  - `.issues/56-ui-visual-redesign/after-screenshots/*.png` (10 PNGs final suite)
  - `.issues/56-ui-visual-redesign/BUNDLE_DELTA.md`
- [x] All 8 commits exist on branch (verified via `git log --oneline | head -8`)
- [x] Full verification suite passes (vitest + chromium + firefox + typecheck)
- [x] No new stubs/TODOs/placeholders introduced (2 pre-existing TODOs in TrustStrip and CsvImport noted but not from this issue)
- [x] No leftover debug code (no console.log/debugger/breakpoint)
- [x] All test-IDs preserved (verified via grep + passing trust-strip, stage1, csv-import, docs, end-to-end specs)
- **Result:** PASSED

**Duration:** ~32 minutes
**Commits:** 8
