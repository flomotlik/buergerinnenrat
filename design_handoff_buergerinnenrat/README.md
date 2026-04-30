# Handoff: Bürger:innenrat — UI Redesign

## Overview
High-fidelity redesign for **buergerinnenrat** (https://github.com/flomotlik/buergerinnenrat) — a browser-native sortition tool. **Stage 1** draws a stratified mailing list from a population-register CSV; **Stage 3** is the final-panel draw — Maximin (Phase 1); Leximin is out of Phase-1 scope (requires Gurobi upstream, see `docs/upstream-verification.md`). Sidebar nav, 5-step Stage-1 workbench, plus Overview, Stage 3, Docs, Samples, Settings screens.

## About the design files
The files in `reference/` are **design references built as an HTML + React (Babel-in-browser) prototype**. They show intended look, copy, layout, and interactions — **not** production code to drop in. Recreate them in the existing buergerinnenrat codebase using its build pipeline. Recommended target if no framework is in place: **Vite + React + TypeScript**. Compile JSX/TSX ahead of time — drop `@babel/standalone` at runtime.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, copy, micro-interactions. Recreate pixel-perfectly. Only allowed substitutions: existing icon set or form primitives the codebase already provides.

## Files in this bundle
- `reference/index.html` — entry, font loading, root mount
- `reference/styles.css` — **all design tokens + component CSS** (lift verbatim)
- `reference/app.jsx` — shell, screen routing, Tweaks wiring
- `reference/i18n.jsx` — DE/EN copy table
- `reference/tweaks-panel.jsx` — design-env Tweaks shell (drop in production; replace with `localStorage`-backed prefs)
- `reference/components/sidebar.jsx` — sidebar + brand mark + nav
- `reference/components/icons.jsx` — inline SVG icons
- `reference/components/stage1.jsx` — **interactive** Stage-1 workbench
- `reference/components/stage3.jsx` — Stage-3 hi-fi mockup
- `reference/components/audit.jsx` — audit-snapshot panel
- `reference/components/docs.jsx` — Overview / Docs / Samples / Settings

Open `reference/index.html` in any modern browser to see the prototype live (no build needed).

## Screens
1. **Sidebar** (256px sticky, all screens) — brand SVG (12-dot ring, 3 highlighted = sortition metaphor) + wordmark + 3 nav groups (Übersicht; Verfahrensschritte: Stage 1 / Stage 3; Ressourcen: Doku / Beispiel-Daten / Settings) + DE/EN toggle + "Daten bleiben lokal" footer.
2. **Stage 1 — Versand-Liste ziehen** *(interactive)*. 5-step rail (Eingabe · Achsen · Parameter · Ziehen · Export). Cards: drop-zone + sample picker → axis chips (verfügbar / nicht im Melderegister, with § 46 BMG banner) → N + Seed + Methode → animated draw → result with stats grid + stratum table (Soll vs. Ist) + signed audit snapshot.
3. **Stage 3 — Auswahl-Pool** *(static hi-fi)*. Quotas list / solver panel with live iteration / target-vs-achieved distribution / fairness stats (min π, max π, mean, Gini).
4. **Overview** — hero + 2 big workflow cards + 3-col principles.
5. **Docs** — sticky TOC + 68ch body, methodology / algorithm / law / audit reproduction.
6. **Samples** — table of 4 synthetic CSVs.
7. **Settings** — local-storage toggles + signing-key block.

## Design tokens (lift from `reference/styles.css`)

```css
:root {
  --hue: 248;                                   /* user has tested 353 (rose) too */
  --bg:           oklch(98.4% 0.006 80);
  --bg-sunken:    oklch(96.2% 0.008 80);
  --bg-card:      oklch(100% 0 0);
  --line:         oklch(91% 0.01 80);
  --line-strong:  oklch(84% 0.012 80);
  --ink:    oklch(20% 0.015 80);
  --ink-2:  oklch(38% 0.012 80);
  --ink-3:  oklch(55% 0.01 80);
  --ink-4:  oklch(70% 0.008 80);
  --accent:        oklch(48% 0.14 var(--hue));
  --accent-strong: oklch(38% 0.16 var(--hue));
  --accent-soft:   oklch(94% 0.04 var(--hue));
  --accent-line:   oklch(82% 0.07 var(--hue));
  --accent-ink:    oklch(28% 0.13 var(--hue));
  --ok:   oklch(50% 0.13 155);  --ok-soft:   oklch(94% 0.04 155);
  --warn: oklch(58% 0.13 60);   --warn-soft: oklch(94% 0.05 60);
  --err:  oklch(50% 0.16 25);   --err-soft:  oklch(94% 0.04 25);
}
```
Dark theme is the `[data-theme="dark"]` block in `styles.css`.

### Typography
- **Source Serif 4** — page/card titles, callouts (40 / 26 / 22 / 18 px, weight 500, letter-spacing -0.02→-0.01em)
- **Inter** — UI / body (14 px / 1.5; lede 16 px / 1.55 / `--ink-2`)
- **JetBrains Mono** — eyebrows, hashes, seeds, audit (10.5–13 px; eyebrow 600 / 0.08em / uppercase)

### Spacing
`--gap-1..7` = 4 / 8 / 12 / 16 / 24 / 32 / 48 px. `--pad-card: 24px`, `--row-h: 40px`, `--radius: 8px`, `--radius-lg: 14px`. `[data-density="compact"]` tightens these.

## Behavior to preserve
- **No backend.** Everything client-side; no telemetry; data never leaves the browser.
- **Audit snapshot** every draw: input SHA-256, seed, axes, algorithm version, ISO timestamp, Ed25519 signature → downloadable JSON.
- **Reproducibility**: same input + same seed + same tool version → byte-identical output CSV.
- **§ 46 BMG / DSGVO**: stratification axes are split into "verfügbar im Melderegister" (selectable) and "nur via Selbstauskunft" (disabled, opacity 0.55, with explanatory banner).
- **Tweaks** in production: persist `lang`, `theme`, `density`, `accentHue` in `localStorage`. Drop the postMessage protocol — that's a design-environment artifact.

## Wiring notes
- The prototype's `allocate()` function in `stage1.jsx` is a working largest-remainder (Hamilton) allocator; `DEMO_STRATA` is illustrative only. Replace with the real CSV → stratum reduction from the existing repo.
- The prototype simulates a 650ms draw; remove the timeout and run the real Mulberry32 + Fisher-Yates already in the repo.
- The "SHA-256" and "Ed25519 signature" strings are hard-coded placeholders; wire to the real subtle-crypto code.
- The 4 sample datasets in `SAMPLE_DATASETS` are stubs — point them at the real synthetic CSVs in `scripts/synthetic-meldedaten/`.

## Suggested implementation order
1. Token system + global CSS (sidebar, cards, buttons, inputs, banners, audit panel)
2. Layout shell + sidebar + i18n
3. Stage 1 workbench wired to real parser/draw/audit
4. Overview, Docs, Samples, Settings
5. Stage 3 (after solver lands)
6. Theme + density + hue prefs in `localStorage`
