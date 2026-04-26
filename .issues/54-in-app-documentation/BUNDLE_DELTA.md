# Bundle-Delta-Report — Issue #54 In-App Dokumentation

## Methodik

- Baseline: Build von Commit `d1852e2` (vor #54).
- Current: Build nach allen 22 Tasks aus #54.
- Beide Builds: `pnpm build` mit `vite build`, gleiche Vite-Config bis auf
  die in #54 hinzugefügten `define`-Globals (`__GIT_SHA__` / `__BUILD_DATE__`).
- gzipped-Werte aus Vite-Build-Output.

## Bundle-Tabelle

| Datei | Baseline raw | Current raw | Δ raw | Baseline gz | Current gz | Δ gz |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `index-*.js` (main bundle) | 97.88 kB | 100.75 kB | **+2.87 kB** | 32.55 kB | 33.50 kB | **+0.95 kB** |
| `index-*.css` | 14.10 kB | 16.36 kB | **+2.26 kB** | 3.42 kB | 3.82 kB | **+0.40 kB** |
| `solid-*.js` | 10.69 kB | 15.72 kB | **+5.03 kB** | 4.42 kB | 6.50 kB | **+2.08 kB** |
| `highs-*.js` | 27.12 kB | 27.12 kB | 0 | 11.04 kB | 11.04 kB | 0 |
| `index.html` | 0.52 kB | 0.52 kB | 0 | 0.32 kB | 0.32 kB | 0 |
| **Eager-Subtotal** | **150.31 kB** | **160.47 kB** | **+10.16 kB** | **51.75 kB** | **55.18 kB** | **+3.43 kB** |
| `Glossar-*.js` (lazy) | — | 2.33 kB | +2.33 kB | — | 1.24 kB | +1.24 kB |
| `Bmg46-*.js` (lazy) | — | 2.53 kB | +2.53 kB | — | 1.36 kB | +1.36 kB |
| `Limitationen-*.js` (lazy) | — | 3.80 kB | +3.80 kB | — | 1.74 kB | +1.74 kB |
| `DocsHub-*.js` (lazy) | — | 4.40 kB | +4.40 kB | — | 1.81 kB | +1.81 kB |
| `Verifikation-*.js` (lazy) | — | 5.51 kB | +5.51 kB | — | 2.52 kB | +2.52 kB |
| `Term-*.js` (lazy, shared) | — | 7.24 kB | +7.24 kB | — | 3.29 kB | +3.29 kB |
| `Algorithmus-*.js` (lazy) | — | 8.12 kB | +8.12 kB | — | 3.44 kB | +3.44 kB |
| `Technik-*.js` (lazy) | — | 11.90 kB | +11.90 kB | — | 3.80 kB | +3.80 kB |
| **Lazy-Subtotal** | — | **45.83 kB** | **+45.83 kB** | — | **19.20 kB** | **+19.20 kB** |
| **Gesamtdelta** | **150.31 kB** | **206.30 kB** | **+55.99 kB** | **51.75 kB** | **74.38 kB** | **+22.63 kB** |

## Vergleich gegen Budget

Budget aus PLAN.md / ISSUE.md: **+25 kB raw / +8 kB gzip**.

| Metrik | Δ | Budget | Status |
| --- | ---: | ---: | --- |
| Eager-Bundle (Stage 1/3 zahlen drauf) | +10.16 kB raw / +3.43 kB gz | +25 / +8 | **WITHIN BUDGET** |
| Gesamtdelta (inkl. lazy Doku-Chunks) | +55.99 kB raw / +22.63 kB gz | +25 / +8 | **OVER BUDGET** |

## Status-Begründung

Das **Eager-Bundle** (was Stage-1- und Stage-3-Nutzer:innen tatsächlich
beim ersten Page-Load bekommen) liegt deutlich unter Budget — alle
Doku-Seiten sind lazy, das DocsHub selbst auch. Wer die App nur für
Stage 1 oder Stage 3 nutzt und nie auf den Doku-Tab klickt, lädt die
Doku-Bundles nie.

Das **Gesamtdelta** überschreitet das Budget, weil sieben neue Doku-Seiten
plus die Term-Tooltip-Komponente plus der Tech-Manifest-Generator-Output
zusammen ca. 46 kB raw beitragen. Das ist vergleichbar mit dem Solid-Js-
Runtime-Bundle (15.7 kB) — also nicht trivial, aber auch nicht unverhältnismäßig
für 6 Doku-Seiten + Glossar + Algorithmus-Walkthrough mit eigenem SVG.

Treiber im Detail:
- **Technik-*.js (11.90 kB raw)** — der größte Doku-Chunk; enthält die
  zwei Tabellen mit allen 29 Tech-Manifest-Einträgen plus die vier
  Algorithmen-Karten.
- **Algorithmus-*.js (8.12 kB raw)** — Hamilton-SVG plus die 5-Schritt-Erklärung
  plus Quellenverweise.
- **Term-*.js (7.24 kB raw)** — die 20 Glossar-Einträge plus die
  Tooltip-Komponente; wird shared-chunk-loaded sobald irgendeine Doku-Seite
  einen Term verwendet.

## Optimierungs-Optionen (falls User Bundle weiter reduzieren will)

1. **Glossar als JSON-Asset statt JS-Modul** — `glossar.json` würde
   `fetch()`-geladen statt im Bundle eingebettet. Spart ~3 kB raw, kostet
   einen extra Roundtrip.
2. **Tech-Manifest-Tabellen verkürzen** — Beschreibungen kürzen oder die
   Test- und Dev-Tools weglassen. Spart ~2 kB raw.
3. **Quellenverweise aus Algorithmus-Seite in Glossar verschieben** — würde
   beide Seiten verkleinern. Spart ~1 kB raw.

Keine dieser Optimierungen ist vor Iteration-2-Pilot dringend, weil das
Eager-Bundle (was den TTFB / TTI beeinflusst) im Budget bleibt. **Kein
Auto-Rollback** — User entscheidet anhand dieses Reports.
