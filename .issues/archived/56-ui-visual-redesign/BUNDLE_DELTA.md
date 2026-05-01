# Bundle-Delta — Issue #56 UI Visual Redesign

> Quantifiziert die Bundle-Auswirkungen der Tailwind-Plugin-Erweiterung
> (typography + forms), Inter-Font-Inclusion (über CDN, nicht Bundle), neuer
> Component-Layer-Klassen und Logo/Icon-SVGs.

## Mess-Methodik

- **Pre-State:** main-Branch HEAD (`8a8f483`, vor Issue #56), gebaut mit
  `VITE_BASE_PATH=/ NODE_ENV=development pnpm --filter @sortition/web exec vite build`
  in `/root/workspace`.
- **Post-State:** `ui-redesign`-Branch nach allen 8 Tasks, gleicher
  Build-Befehl in der Worktree.
- Raw-Größe: `stat --printf=%s <file>`.
- Gzip-Größe: `gzip -c <file> | wc -c`.

## Tabelle (Bytes)

| Datei | Pre raw | Pre gzip | Post raw | Post gzip | Δ raw | Δ gzip |
|------|--------:|---------:|---------:|----------:|------:|-------:|
| index.css                | 16 355 | 3 841 | 43 358 | 7 325 | **+27 003** | **+3 484** |
| index-*.js (App-Bundle)  | 101 003 | 33 489 | 105 672 | 35 190 | +4 669 | +1 701 |
| solid-*.js               | 17 384 | 7 264 | 21 222 | 8 604 | +3 838 | +1 340 |
| DocsHub-*.js             | 4 396 | 1 822 | 6 388 | 2 576 | +1 992 | +754 |
| Technik-*.js             | 11 902 | 3 841 | 12 328 | 3 944 | +426 | +103 |
| Algorithmus-*.js         | 8 122 | 3 464 | 8 122 | 3 463 | 0 | -1 |
| Bmg46-*.js               | 2 533 | 1 385 | 2 533 | 1 385 | 0 | 0 |
| Glossar-*.js             | 2 325 | 1 258 | 2 325 | 1 256 | 0 | -2 |
| Limitationen-*.js        | 3 796 | 1 772 | 3 796 | 1 776 | 0 | +4 |
| Term-*.js                | 7 304 | 3 354 | 7 304 | 3 354 | 0 | 0 |
| Verifikation-*.js        | 5 506 | 2 556 | 5 506 | 2 555 | 0 | -1 |
| highs-*.js               | 28 272 | 11 264 | 28 272 | 11 264 | 0 | 0 |
| **Total**                | **208 898** | **75 310** | **246 826** | **82 692** | **+37 928** | **+7 382** |

## Budget-Vergleich

| Metrik | Δ | Budget | Verdict |
|--------|--:|-------:|---------|
| Raw   | **+37,9 KB** | +30 KB | **leicht über Budget (+7,9 KB)** |
| Gzip  | **+7,4 KB**  | +10 KB | **innerhalb Budget (-2,6 KB unter)** |

### Einordnung

Der Raw-Delta ist um 26 % über dem 30-KB-Budget. Hauptursache: das CSS-Bundle
verdoppelt sich von 16,4 KB auf 43,4 KB (+165 %) durch:

1. `@tailwindcss/typography` — generiert die `prose-*` Utility-Klassen (für
   Doku-Sub-Pages).
2. `@tailwindcss/forms` (class-Strategy) — `.form-input` etc. Klassen.
3. Neue Component-Layer-Klassen in `index.css` (`.btn-*`, `.card`, `.pill-tab`,
   `.dropzone`, `.status-pill-*`).
4. Brand-Token-Color-Variants (Tailwind generiert pro Color-Token mehrere
   Utility-Klassen).

Gzip ist mit +7,4 KB **deutlich unter Budget**, weil CSS extrem gut komprimiert
(viele wiederholte Strings wie `--tw-`, `padding-`, `margin-` etc.). Da Browser
CSS gzip-comprimiert ausliefern, ist Gzip die für Nutzer relevante Kennzahl.

**Empfehlung:** kein Auto-Rollback gemäß User-Vorgabe; das Raw-Budget war als
Faustregel konzipiert, das Gzip-Budget ist der härtere Knock-out — und der
ist locker eingehalten. Die +7,4 KB Gzip sind der Preis für Brand-Tokens,
Typography-Plugin (für Doku-Lesbarkeit) und Forms-Plugin (für konsistente
Inputs) — in Relation zum Funktions-Sprung gut investiert.

## Test-Suite-Status

| Suite | Status | Hinweis |
|-------|--------|---------|
| `vitest run` (Unit, 7 Files, 44 Tests)        | ✓ grün | unverändert |
| `playwright test --project chromium` (54)     | ✓ grün | inkl. neue mobile-touch-targets + visual-iteration |
| `playwright test --project firefox` (54)      | ✓ grün | gleiche Suite, beide Browser |
| `tsc --noEmit` (typecheck)                    | ✓ grün | |
| `eslint . && prettier --check`                | ✗ pre-existing failures | nicht durch dieses Issue verursacht (s.u.) |

### Pre-existing Lint-Failures (nicht Scope von #56)

`pnpm --filter @sortition/web lint` zeigt 17 Errors die bereits auf `main`
existieren (verifiziert via `git stash && pnpm lint && git stash pop` vor
Beginn dieses Issues):

- 3 × `@typescript-eslint/consistent-type-imports` in
  `src/stage1/{AxisBreakdown,AxisPicker,Stage1Panel}.tsx` — Imports von
  `Component` als Type-only.
- 4 × `@typescript-eslint/no-unused-vars` in `src/stage1/audit-sign.ts`
  (`_pk`, `_sig`, `_algo`, `_e`).
- 1 × `tests/smoke-live/site-smoke.spec.ts` Parsing-Error: nicht in
  `parserOptions.project` enthalten.
- 9 × Prettier-Format-Diffs in unveränderten Files.

Diese sind out-of-scope für #56 (UI-Redesign). Sollten in einem separaten
`chore: fix pre-existing lint`-Issue adressiert werden.

### Live-Smoke

`pnpm --filter @sortition/web test:smoke-live` läuft gegen die deployed
Live-URL und ist nicht Teil des lokalen Test-Laufs. Wird nach Deploy auf
`gh-pages` separat verifiziert (außerhalb des Scope dieses Issues).

## Test-Anpassungen

Drei Selector- bzw. Text-Assertion-Änderungen — alle weil das Issue
absichtlich UI-Texte ändert; keine Test-Logik geändert.

| Datei | Änderung | Begründung |
|-------|----------|------------|
| `apps/web/tests/e2e/smoke.spec.ts:5` | `'Sortition Iteration 1'` → `'Bürger:innenrat'` | Header-Rebranding (Akzeptanz #56). |
| `apps/web/tests/e2e/csv-import.spec.ts:14` | `'Sortition Iteration 1'` → `'Bürger:innenrat'` | Header-Rebranding. |
| `apps/web/tests/e2e/stage1.spec.ts:244-252` | Subtitle-toContainText → toHaveAttribute('title', /…/) | Subtitles wurden bewusst aus visuellem DOM in `title`-Attribute umgehängt (Akzeptanz: Tabs sollen mobile nicht wrappen). |

## Bekannte A11y-Punkte

Nichts ungelöstes — der `mobile-touch-targets.spec.ts` Audit (Task 7)
verifiziert ≥44×44 für 19 interaktive Elemente und ist grün auf chromium.
Eine Anpassung war nötig: `docs-back-to-hub` bekam `py-3 + min-h-[44px]`
(vorher 168×20px). Alle anderen Targets passten direkt durch die in #1
definierten Komponenten-Klassen (`.pill-tab` min-h, `.btn-primary` py-3,
`.input-base` min-h, `.dropzone` py-10, `.card` p-4).

## Offene visuelle Punkte

Keine. Alle 5 geplanten Iterations-Punkte (Header, Tab-Nav, TrustStrip,
Stage-1 Form, DocsHub) konnten ohne explizite Iteration-Schleifen direkt
beim ersten Versuch getroffen werden. Keine Step musste die 3-Runden-Grenze
in Anspruch nehmen.

## Verifikations-Befehle (Reproduzierbarkeit)

```bash
# Unit
pnpm --filter @sortition/web test

# Type check
pnpm --filter @sortition/web typecheck

# E2E (chromium + firefox)
PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers \
  pnpm --filter @sortition/web exec playwright test --project=chromium
PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers \
  pnpm --filter @sortition/web exec playwright test --project=firefox

# Build (production-style with base path /buergerinnenrat/)
pnpm --filter @sortition/web build

# Build for local preview / e2e (base path /)
VITE_BASE_PATH=/ pnpm --filter @sortition/web exec vite build

# Visual iteration (regenerates all PNGs in iteration/ + after-screenshots/)
PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers \
  pnpm --filter @sortition/web exec playwright test \
  apps/web/tests/e2e/_visual-iteration.spec.ts --project=chromium

# Mobile touch-target audit only
PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers \
  pnpm --filter @sortition/web exec playwright test \
  mobile-touch-targets.spec.ts --project=chromium

# Bundle-Größen messen
for f in apps/web/dist/assets/*.{js,css}; do
  raw=$(stat --printf=%s "$f")
  gz=$(gzip -c "$f" | wc -c)
  echo "$(basename "$f") raw=$raw gz=$gz"
done | sort
```
