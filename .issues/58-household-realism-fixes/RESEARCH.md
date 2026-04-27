# Research — Issue #58 Haushalts-Realismus-Fixes

> Lightweight: 3 konkrete Bugs mit Datei:Zeile-Pointers aus ISSUE.md. Keine offene Forschungsfrage.

## User Constraints

- Realismus-Fokus, nicht selection-impact
- Re-generierung der CSVs OK (SHA wird sich ändern)
- Bestehende Test-Toleranzen ggf. erweitern

## Bug-Locations

<interfaces>
### Bug 1: Alleinerziehende
- `scripts/synthetic-meldedaten/household-builder.ts:228` — `const adultsCount = size === 3 && rng.nextFloat() < 0.15 ? 1 : 2;`
- Fix: Single-Parent-Wahrscheinlichkeit für ALLE size>=3, z.B. 18 % via `rng.nextFloat() < 0.18`
- Begründung: Statistik Austria — ~18 % aller Familien mit Kindern unter 18 sind Ein-Eltern-Familien

### Bug 2: Drei-Generation = 0 %
- `scripts/synthetic-meldedaten/household-builder.ts:295-321` — `buildDreigeneration`
- Heuristik im User-Verify-Skript klassifiziert nach `oldest >= 60 && (oldest - youngest) >= 35`
- Möglicher Bug: profile.threeGenerationShare ist evtl. 0 oder zu klein. Debug: ausgeben pro Build wieviele 3-gen-Haushalte (über Logging).
- Profile-Check: `scripts/synthetic-meldedaten/profiles/herzogenburg.json` — Wert für `threeGenerationShare` prüfen
- Wenn Wert > 0 aber Builder produziert keine: Bug in `pickHouseholdType` (Zeile 52-64) — wirft Sample erst nach Größe-Check, wird ggf. nie aktiviert weil `if (size === 2) return 'paar'` vorher returnt
- Fix-Möglichkeit: 3-Gen kann nur bei size >= 4 entstehen (Familien-Core mit min. 3 + 1 Großeltern)
- Empfehlung: setze Wahrscheinlichkeit auf ~3 % bei size >= 4 (höher als heutige Schätzung weil sie sonst nie sichtbar wird)

### Bug 3: Kinder-Staatsbürgerschaft
- `scripts/synthetic-meldedaten/person-builder.ts` — vermutlich `pickCitizenship(rng, profile, cluster)` o.ä.
- `scripts/synthetic-meldedaten/household-builder.ts` — wo Kinder gebaut werden (in `buildFamilie`, `buildDreigeneration`)
- Fix: `BuildPersonParams` braucht optionalen `citizenship?: string` (wenn gesetzt: nicht würfeln). In `buildFamilie` der Vater wird ohne Override gewürfelt; Kinder bekommen `citizenship: father.staatsbuergerschaft` als Override.
- Edge-Case Mischehen: Mutter aus anderem Cluster behält ihre eigene Citizenship (verheiratete Person behält eigene Staatsbürgerschaft in AT). Kinder erben aber Citizenship vom Vater (oder auch von Mutter — abstammungsprinzip jus sanguinis sagt: ein Elternteil mit AT-Staatsbürgerschaft → AT für Kind). Für Realismus reicht: Kinder bekommen Citizenship des AT-Elternteils wenn vorhanden, sonst des Vaters.
</interfaces>

## Test-Strategie

- Neue Vitest-Cases für die 3 Bugs (jeweils Acceptance-Criterion-Form)
- Plausibilitäts-Test gegen die regenerierte 8000er-CSV: Anteile checken
- SHA-Stabilitäts-Test bleibt grün (gleicher Seed → gleicher Output)

## Quellen

- Statistik Austria Familien: <https://www.statistik.at/statistiken/bevoelkerung-und-soziales/bevoelkerung/familien-und-haushalte> (Ein-Eltern-Familien-Anteil)
- AT Staatsbürgerschaftsgesetz §7 — Abstammungsprinzip: <https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10005579>
