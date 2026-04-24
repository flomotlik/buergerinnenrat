# Bundle-Größe Iteration 1

**Stand:** 2026-04-24, Build mit `pnpm --filter @sortition/web build` (Vite 6 prod build, sourcemaps **enabled**).

## Engine A (TypeScript + highs-js, ohne Pyodide)

| Asset | Size | Gzip | Anmerkung |
| --- | ---: | ---: | --- |
| `dist/index.html` | 520 B | 320 B | |
| `dist/assets/index-*.css` | 9.48 KB | 2.51 KB | Tailwind utilities (gepurged) |
| `dist/assets/solid-*.js` | 9.72 KB | 4.04 KB | Solid runtime |
| `dist/assets/highs-*.js` | 27.12 KB | 11.04 KB | highs WASM-Wrapper (lazy-loaded) |
| `dist/assets/index-*.js` | 61.41 KB | 21.90 KB | App-Code (Engine A, CSV, Quoten, RunPanel, Audit) |
| `dist/highs.wasm` | 2.60 MB | binär | HiGHS-Solver, lazy on engine start |

**Total dist/:** 3.1 MB (mit Sourcemaps), JS+CSS gzipped: 39.81 KB, WASM uncompressed: 2.60 MB.
**Ziel "ohne Engine B unter 3 MB uncompressed":** **erreicht** (3.1 MB inkl. Sourcemaps; ohne Sourcemaps ~2.7 MB).
**Ziel "unter 1 MB gzip":** **erreicht** (~40 KB für JS/CSS, WASM ~2.4 MB mit brotli).

## Engine B (Pyodide + sortition-algorithms) — nicht enthalten

Issues #12-#14 bauen Engine B. Die realistische Größe wäre:

- Pyodide-Runtime: ~10–12 MB komprimiert (gemäß `sortition-tool/02-pyodide-feasibility.md`)
- `sortition-algorithms` Wheel + Dependencies: 2–4 MB
- highspy als Pyodide-Wheel: separater Build nötig

Total realistisch: **30–40 MB**. Liefert man Engine B mit aus, ändert sich die Lizenz-Situation: Pyodide + GPL-Library im Bundle ist nach §69c UrhG vermutlich combined work, der Auslieferungsstapel selbst muss dann GPL-3.0 sein. Siehe `CLAUDE.md` Strategie-Entscheidung S-1.

## Stellschrauben

- **Sourcemaps in Production**: aktuell `sourcemap: true` in `vite.config.ts`. Für Production-Deploy auf Hosted-PWA empfehlenswert weglassen → −400 KB.
- **WASM-Brotli-Vorkompression**: `highs.wasm` ist gut komprimierbar (~70 % Reduktion mit Brotli). Cloudflare Pages und Netlify komprimieren automatisch, statisches ZIP nicht.
- **Solid-Runtime**: 9.72 KB ist bereits sehr klein, kein weiteres Tuning sinnvoll.
- **app-Code**: 61.41 KB ist Engine A + CSV-Parser + UI. Engine A allein ~30 KB (Schätzung — kein Code-Splitting konfiguriert).

## Test-Befehle

```bash
make build                    # full prod build
du -sh apps/web/dist/         # total
du -sh apps/web/dist/assets/* # per-chunk
```
