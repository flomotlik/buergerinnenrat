# Plan — Issue #58 Haushalts-Realismus-Fixes

> Schlanker Plan: 3 Code-Fixes + Re-Generierung der 4 CSVs + Tests, ein Commit.

## Tasks

<task id="1">
**Bug 1 — Alleinerziehende für alle Familien-Größen**

- Datei: `scripts/synthetic-meldedaten/household-builder.ts`
- Zeile ~228 (`buildFamilie`): ändere `const adultsCount = size === 3 && rng.nextFloat() < 0.15 ? 1 : 2;`
  zu: `const adultsCount = rng.nextFloat() < 0.18 ? 1 : 2;` (für ALLE Familien-Größen)
- Edge-Case: bei size=4 mit 1 Erwachsenem → 1 Erw + 3 Kinder. Funktioniert mit existing childrenCount-Logik.

**Acceptance:** Vitest-Test "Alleinerziehende kommen bei size=3,4,5,6 vor" — generiere 200 Familien-Haushalte, mind. 1 Single-Parent bei jeder Größe ≥3.

**Verify:** `pnpm --filter @sortition/web exec vitest run synthetic-household-builder`
</task>

<task id="2">
**Bug 2 — Drei-Generation funktioniert**

- Datei: `scripts/synthetic-meldedaten/household-builder.ts` Zeile 52-64 + 295-321
- Debug-Hypothese: `pickHouseholdType` ruft `rng.nextFloat() < profile.threeGenerationShare` aber NUR wenn size>=3 (line 62). Wenn `threeGenerationShare` im Profil 0.01 ist und size>=3 ist nur ~25 % der Haushalte → effektive Wahrscheinlichkeit pro Total-Haushalt ~0.25 %, bei N=3545 wären das ~9 Haushalte. Nicht 0.
- Tatsächlicher Bug: in `profiles/herzogenburg.json` und `kleinstadt-3000.json` checken ob `threeGenerationShare` überhaupt gesetzt ist und mit welchem Wert.
- Falls Wert fehlt oder 0: setze auf 0.03 (3 % der Familien-Haushalte sind 3-Gen, das ist statistisch realistisch genug für Sichtbarkeit)
- Logging: füge in `buildHousehold` einen Debug-Counter ein der bei dev-mode (env DEBUG_GEN=1) zählt wieviele 3-Gen erzeugt wurden, und drucke am Ende
- Profile-Update: `threeGenerationShare: 0.03` in beiden Profilen

**Acceptance:** Vitest-Test "Drei-Gen-Haushalte werden erzeugt" — generiere 500 Haushalte mit `threeGenerationShare: 0.05` und Mindest-Familien-Größe-Verteilung, erwarte mindestens 5 3-Gen.

**Verify:** Re-generate `herzogenburg-melderegister-8000.csv` und prüfe per Heuristik (oldest>=60 + altersspanne>=35 + size>=4) dass mindestens 30 3-Gen-Haushalte da sind (~1 % von 3545).
</task>

<task id="3">
**Bug 3 — Kinder erben Citizenship vom Eltern-Haushalt**

- Datei: `scripts/synthetic-meldedaten/person-builder.ts` — `BuildPersonParams` interface
- Erweitern: `staatsbuergerschaft?: string` als optionaler Override
- In der Builder-Logik: wenn `params.staatsbuergerschaft` gesetzt → übernehme; sonst → wie bisher würfeln
- Datei: `scripts/synthetic-meldedaten/household-builder.ts` — `buildFamilie` und `buildDreigeneration`
- Logik: nach Erzeugung der Eltern, vor Kinder-Erzeugung, bestimme `householdCitizenship`:
  - Wenn `father.staatsbuergerschaft === 'AT'` ODER `mother.staatsbuergerschaft === 'AT'` → 'AT' (jus sanguinis)
  - Sonst: nimm `father.staatsbuergerschaft`
- Pass `staatsbuergerschaft: householdCitizenship` an `buildPerson` für jedes Kind
- Mütter behalten eigene Citizenship (Mischehen: Mutter aus tr-Cluster mit türkischer Staatsbürgerschaft im at-Vater-Haushalt — Kind bekommt AT)

**Acceptance:** 
- Vitest: alle Kinder eines Haushalts haben gleiche Citizenship wie mind. ein Erwachsener im Haushalt
- Vitest: bei Mischehe AT+TR ist Kinder-Citizenship AT
- Vitest: bei beide Eltern TR ist Kinder-Citizenship TR

**Verify:** Re-generate `herzogenburg-melderegister-8000.csv` und prüfe alle Haushalte mit Kindern: keine Inkonsistenz (Kind-Citizenship muss in {Citizenship aller Erwachsenen}).
</task>

<task id="4">
**Re-generate alle 4 Beispiel-CSVs**

- `tsx scripts/synthetic-meldedaten/generator.ts --profile herzogenburg --output apps/web/public/beispiele/herzogenburg-melderegister-8000.csv --seed 4711`
- `tsx scripts/synthetic-meldedaten/generator.ts --profile kleinstadt-3000 --output apps/web/public/beispiele/kleinstadt-3000.csv --seed 4711`
- Re-derive `herzogenburg-versand-300.csv` und `herzogenburg-antwortende-60.csv` via vorhandene Hilfsskripte (siehe #57 PLAN Tasks 14/15)
- Plausibilitäts-Check als Bash-Output dokumentieren in commit-msg:
  - Alleinerziehende-Anteil
  - 3-Gen-Anteil  
  - Citizenship-Konsistenz: Anteil Haushalte mit konsistenten Kinder-Citizenships (Soll: 100 %)
  - Alte SHA → Neue SHA pro Datei

**Verify:** alle 4 CSVs existieren, sind leserlich, Plausibilitäts-Werte im erwarteten Bereich.
</task>

<task id="5">
**Tests laufen, Bundle-Check, Single Commit**

- `pnpm --filter @sortition/web exec vitest run` — alle grün
- `pnpm --filter @sortition/web exec playwright test --project=chromium` — alle grün (Beispiel-CSV-Inhalt ändert sich, falls Test darauf angewiesen ist anpassen)
- `pnpm --filter @sortition/web build` — clean
- Single Commit: `fix(test-data): single parents at all sizes, working three-gen, child citizenship inheritance (#58)` mit Plausibilitäts-Werten in Body
</task>

## Verifikation am Ende

```bash
# Alleinerziehend-Check (Erwartung: 15-20 % der Familien-Haushalte)
python3 -c "
import csv, collections
with open('apps/web/public/beispiele/herzogenburg-melderegister-8000.csv') as f:
    rows = list(csv.DictReader(f))
hh = collections.defaultdict(list)
for r in rows: hh[r['haushaltsnummer']].append(r)
fams = [v for v in hh.values() if len(v) >= 3 and any(2026 - int(p['geburtsjahr']) < 18 for p in v)]
single = [v for v in fams if len([p for p in v if 2026 - int(p['geburtsjahr']) >= 18]) == 1]
print(f'Single-Parent: {len(single)}/{len(fams)} = {len(single)/len(fams)*100:.1f} %')
"

# 3-Gen-Check
python3 -c "
import csv, collections
with open('apps/web/public/beispiele/herzogenburg-melderegister-8000.csv') as f:
    rows = list(csv.DictReader(f))
hh = collections.defaultdict(list)
for r in rows: hh[r['haushaltsnummer']].append(r)
gen3 = 0
for v in hh.values():
    if len(v) < 4: continue
    ages = [2026 - int(p['geburtsjahr']) for p in v]
    if max(ages) >= 60 and (max(ages) - min(ages)) >= 35: gen3 += 1
print(f'Drei-Generation: {gen3}/{len(hh)} = {gen3/len(hh)*100:.2f} %')
"

# Citizenship-Konsistenz
python3 -c "
import csv, collections
with open('apps/web/public/beispiele/herzogenburg-melderegister-8000.csv') as f:
    rows = list(csv.DictReader(f))
hh = collections.defaultdict(list)
for r in rows: hh[r['haushaltsnummer']].append(r)
broken = 0
total_w_kids = 0
for v in hh.values():
    kids = [p for p in v if 2026 - int(p['geburtsjahr']) < 18]
    adults = [p for p in v if 2026 - int(p['geburtsjahr']) >= 18]
    if not kids: continue
    total_w_kids += 1
    adult_cits = set(p['staatsbuergerschaft'] for p in adults)
    if any(k['staatsbuergerschaft'] not in adult_cits for k in kids):
        broken += 1
print(f'Inkonsistent: {broken}/{total_w_kids} = {broken/max(total_w_kids,1)*100:.1f} %')
"
```
