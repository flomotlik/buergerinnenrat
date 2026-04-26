# Bundle Delta — Issue #57

Measured 2026-04-26 from a clean `pnpm --filter @sortition/web build`.
"Raw" = sum of all `apps/web/dist/assets/*.js` byte sizes (excludes `.map`).
"Gzip" = same files piped through `gzip -c | wc -c`, summed.

## Vor / Nach

| Phase | Raw (bytes) | Raw (KB) | Gzip (bytes) | Gzip (KB) |
|---|---:|---:|---:|---:|
| Vor #57 (HEAD = `6174164`, UI not yet touched) | 200 353 | 195.7 | 74 211 | 72.5 |
| Nach #57 (HEAD = `e8cb3c5`, UI integrated)     | 206 810 | 202.0 | 76 920 | 75.1 |
| **Delta**                                       | **+6 457** | **+6.3 KB** | **+2 709** | **+2.6 KB** |

## Akzeptanz

ISSUE.md requires Δ < +50 KB raw / +20 KB gzip. Both budgets comfortably met:

- **+6.3 KB raw** (12.6 % of budget)
- **+2.6 KB gzip** (13.0 % of budget)

## Aufschlüsselung der neuen Bytes

| Asset | Erstmals dabei | Größenänderung |
|---|---|---|
| `Beispiele-*.js` | new lazy chunk | +5.64 KB raw / +2.44 KB gzip |
| `DocsHub-*.js` | union extended | +0.58 KB raw / +0.18 KB gzip |
| `index-*.js` | DocsRoute Union, Stage1Panel hint | +0.24 KB raw / +0.07 KB gzip |
| `index-*.css` | (no Tailwind classes added that weren't already in scan) | +0.10 KB raw / +0.01 KB gzip |
| **Σ JS** | | **+6.46 KB raw / +2.69 KB gzip** |

## Pre-generierte CSVs

Die vier Beispiel-CSVs liegen in `apps/web/public/beispiele/` (gesamt
~907 KB roh) und werden von Vite **statisch** ausgeliefert — sie sind
**kein Teil des JS-Bundle** und tragen 0 Bytes zum oben gemessenen
Bundle-Delta bei. Das war eine bewusste Architektur-Entscheidung
(siehe CONTEXT.md "Bundle-Budget").

Größe der Public-Assets:

| Datei | Bytes |
|---|---:|
| `herzogenburg-melderegister-8000.csv` | 666 783 |
| `herzogenburg-versand-300.csv` | 25 040 |
| `herzogenburg-antwortende-60.csv` | 6 129 |
| `kleinstadt-3000.csv` | 234 054 |
| `README.md` | 4 466 |
| **Σ** | **~907 KB** |

GitHub-Pages-Auslieferung erfolgt mit gzip on-the-fly, der typische
Download fällt damit auf ~150-200 KB pro Datei.

## Verifikations-Befehl

```bash
# Vor:
git checkout 6174164 -- apps/web/src/
pnpm --filter @sortition/web build
find apps/web/dist/assets -name '*.js' -not -name '*.map' | xargs wc -c
find apps/web/dist/assets -name '*.js' -not -name '*.map' -exec gzip -c {} \; | wc -c

# Restore + nach:
git checkout HEAD -- apps/web/src/
pnpm --filter @sortition/web build
# (gleiche Größen-Befehle)
```
