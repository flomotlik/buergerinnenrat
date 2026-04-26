# Plan: Synthetischer Testdaten-Generator (Herzogenburg-Vorbild)

<objective>
Was dieser Plan liefert:
1. Ein deterministisches CLI-Tool (`scripts/synthetic-meldedaten/generator.ts`), das aus Profilen
   realistisch wirkende Melderegister-CSVs (AT-MeldeG-Felder) erzeugt — mit Vor-/Nachnamen aus
   4 Cluster-Pools, Haushaltsstrukturen, Mehrgeneration, EU-/Drittstaaten-Mix, KGs/Sprengeln.
2. 4 vor-generierte Beispiel-Dateien im `apps/web/public/beispiele/` Ordner (Herzogenburg
   8000 / Versand 300 / Antwortende 60 / Kleinstadt 3000), Seed-deterministisch (Default 4711).
3. Eine neue lazy-loaded Doku-Sub-Seite `/docs/beispiele` mit Download-Buttons + Erklärtext,
   plus ein Stage-1-Hinweis "Keine eigenen Daten? Beispiel-Datei verwenden →".

Warum: Live-Tool unter `https://flomotlik.github.io/buergerinnenrat/` lässt sich heute ohne
eigene CSV nicht ausprobieren — eine Verwaltung kann den Workflow nicht antesten. Mit
realistischen Beispiel-Daten wird das Tool greifbar.

Scope:
- IN: AT-Kontext (MeldeG, NICHT BMG §46), 4 Namens-Cluster, Pre-generierte CSVs, Doku-Sub-Seite
- OUT (per CONTEXT.md): Adressen / Geokoordinaten, Familienstand-Spalte, Religion, Beruf,
  Browser-side-Generation, mehrsprachige Versionen, Generator-Visualisierung
</objective>

<context>
Issue: @.issues/57-synthetic-test-data-generator/ISSUE.md
Context: @.issues/57-synthetic-test-data-generator/CONTEXT.md
Research: @.issues/57-synthetic-test-data-generator/RESEARCH.md
Names-Source: @.issues/57-synthetic-test-data-generator/research/names-extracted.md

Branch: `test-data-generator` (existing worktree — KEINEN neuen anlegen)
Commit-Format: `conventional` (siehe `<commit_format>`)
Sprachregel (CLAUDE.md): Code-Kommentare englisch, alle generierten Texte und Doku-Inhalte deutsch.

<interfaces>
<!-- Executor: alle Pfade und Signaturen verifiziert. Nicht erneut explorieren. -->

### Bestehender Mulberry32-RNG (re-use, NICHT neu schreiben)
File: `packages/core/src/pool/mulberry32.ts`
```
export class Mulberry32 {
  constructor(seed: number);          // uint32 seed
  nextU32(): number;                  // 0 .. 2^32-1
  nextFloat(): number;                // [0, 1)
}
```
Generator importiert via Workspace-Alias `@sortition/core` ODER relativem Pfad
`../../packages/core/src/pool/mulberry32` falls `scripts/` außerhalb des tsconfig-Pfad-
mappings liegt. Wenn Import-Probleme: 1:1-Kopie unter `scripts/synthetic-meldedaten/rng.ts`
mit Verweis-Kommentar auf Originaldatei.

### CSV-Auto-Mapping (apps/web/src/csv/parse.ts)
DEFAULT_GUESS-Map (Zeile 115ff) enthält bereits:
- `gender`/`geschlecht` -> `gender`
- `district`/`bezirk`/`sprengel` -> `district`
- `age_band`/`alter`/`altersband` -> `age_band`
- `bildung`/`education` -> `education`
- `migration`/`migration_background` -> `migration_background`
- `person_id`/`id` -> `person_id`

NICHT erkannt heute: `katastralgemeinde`, `vorname`, `nachname`, `geburtsjahr`,
`staatsbuergerschaft`, `haushaltsnummer`. Diese werden als `__ignore__` markiert. Stage 1
zeigt sie trotzdem im AxisPicker als wählbar (RESEARCH §C, Variante (b)). Generator MUSS
diese Spalten in genau dieser Schreibweise emittieren.

### Docs-Sub-Page-Pattern (apps/web/src/docs/DocsHub.tsx)
Bestehende lazy-imports (Zeile 8-13):
```
const Algorithmus = lazy(() => import('./Algorithmus'));
const Technik = lazy(() => import('./Technik'));
... (Verifikation, Glossar, Bmg46, Limitationen)
```
TILES-Array (Zeile 42-130) — jedes Tile hat `{ slug, title, description, icon: JSX.Element }`.
TITLES-Map (Zeile 132-139) — Record<slug, deutscherTitel>.
renderSubpage-Switch (Zeile 142-157) — case pro slug.
ICON_CLASS = 'h-7 w-7 text-brand-accent', SVG_BASE konstant.
Test-IDs-Pattern: `docs-tile-${slug}`.

### App-Routing (apps/web/src/App.tsx, Zeile 53-70)
DocsRoute Union + DOCS_ROUTES Set sind die zwei Stellen, an denen ein neues Slug eingetragen
werden muss. Hash-Routing parsed `#/docs/<slug>` in parseHash (Zeile 92-98) — funktioniert
automatisch sobald slug im DOCS_ROUTES-Set steht.

### Stage1Panel (apps/web/src/stage1/Stage1Panel.tsx)
Solid-Component mit Datei-Upload-UI. Hint kann oberhalb des Datei-Inputs ergänzt werden.
Link auf `#/docs/beispiele` (Hash-Routing) — Klick navigiert zur neuen Doku-Sub-Seite.

### Vitest-Config
Root `package.json` hat `"test": "pnpm --filter @sortition/web test"`. Web-app vitest sammelt
`apps/web/tests/**/*.test.ts`. Scripts-Tests landen daher unter
`apps/web/tests/unit/synthetic-*.test.ts`, NICHT unter `scripts/synthetic-meldedaten/__tests__/`.
Generator selbst lebt aber unter `scripts/synthetic-meldedaten/` und wird via relativem Pfad
importiert: `import { ... } from '../../../scripts/synthetic-meldedaten/...'`.

### Vite Public-Folder
`apps/web/public/` wird statisch ausgeliefert. Vite-Base-Pfad ist `/buergerinnenrat/` (GH
Pages). Resultierende URL nach Build: `https://flomotlik.github.io/buergerinnenrat/beispiele/<file>`.

### Bestehender abstrakter Generator (NICHT ablösen)
File: `packages/core/src/pool/generator.ts` — bleibt für Algorithmus-Tests + Iteration-1-
Fixtures. Neuer Generator ist eigenständige Tooling-Schicht in `scripts/`.

### tsx-CLI-Pattern
Bestehende Beispiele: `scripts/stage1_cli.ts`, `scripts/run_engine_a.ts`, `scripts/build-tech-manifest.ts`.
Aufruf: `pnpm tsx scripts/synthetic-meldedaten/generator.ts ...args`.
</interfaces>

Schlüsseldateien (zur Orientierung):
- @apps/web/src/csv/parse.ts — DEFAULT_GUESS, autoGuessMapping
- @apps/web/src/docs/DocsHub.tsx — Pattern für neue Tile + lazy-load
- @apps/web/src/docs/DocsLayout.tsx — Hülle für Sub-Seiten
- @apps/web/src/App.tsx — DocsRoute Union + DOCS_ROUTES Set + Hash-Routing
- @apps/web/src/stage1/Stage1Panel.tsx — Stelle für Beispiel-Hint
- @packages/core/src/pool/mulberry32.ts — Determinismus-RNG
- @scripts/build-tech-manifest.ts — tsx-CLI-Beispiel
- @apps/web/tests/smoke-live/site-smoke.spec.ts — Live-Smoke-Spec
</context>

<commit_format>
Format: conventional, OHNE Issue-Prefix (Repo-Konvention — siehe `git log --oneline`)
Pattern: `<type>(<scope>): <description>`
Types: feat, fix, test, refactor, docs, chore

7 thematische Commits — nach jedem Commit-Block (siehe Tasks-Boundaries unten) genau ein
`git commit` mit allen Dateien des Blocks. Beispiel-Messages:
- Commit 1: `feat(test-data): add curated names lists for 4 cultural clusters`
- Commit 2: `feat(test-data): generator core (types, cluster pool, person/household builders, csv writer)`
- Commit 3: `feat(test-data): CLI + Herzogenburg + Kleinstadt profiles + integration test`
- Commit 4: `feat(test-data): pre-generated example CSVs + README`
- Commit 5: `feat(docs): /docs/beispiele sub-page + DocsHub tile + Stage1 hint`
- Commit 6: `test(test-data): playwright e2e + live-smoke + bundle-delta documentation`
- Commit 7: `docs(readme): mention example data download`
</commit_format>

<tasks>

<!-- =================================================================== -->
<!-- COMMIT 1: Namens-Listen (curated data + sources)                     -->
<!-- =================================================================== -->

<task type="auto">
  <name>Task 1: Extrahiere 12 Namens-Listen aus research/names-extracted.md</name>
  <files>
  scripts/synthetic-meldedaten/names/at-de-vornamen-weiblich.txt,
  scripts/synthetic-meldedaten/names/at-de-vornamen-maennlich.txt,
  scripts/synthetic-meldedaten/names/at-de-nachnamen.txt,
  scripts/synthetic-meldedaten/names/tr-vornamen-weiblich.txt,
  scripts/synthetic-meldedaten/names/tr-vornamen-maennlich.txt,
  scripts/synthetic-meldedaten/names/tr-nachnamen.txt,
  scripts/synthetic-meldedaten/names/ex-yu-vornamen-weiblich.txt,
  scripts/synthetic-meldedaten/names/ex-yu-vornamen-maennlich.txt,
  scripts/synthetic-meldedaten/names/ex-yu-nachnamen.txt,
  scripts/synthetic-meldedaten/names/osteuropa-vornamen-weiblich.txt,
  scripts/synthetic-meldedaten/names/osteuropa-vornamen-maennlich.txt,
  scripts/synthetic-meldedaten/names/osteuropa-nachnamen.txt
  </files>
  <action>
  Lege Verzeichnis `scripts/synthetic-meldedaten/names/` an und extrahiere die 12 Listen aus
  `.issues/57-synthetic-test-data-generator/research/names-extracted.md` in 12 reine Text-
  Dateien (UTF-8, Unix-Line-Endings, ein Name pro Zeile, KEINE Backticks/Markdown,
  KEIN trailing whitespace, KEIN BOM).

  Pro Datei genau 50 Zeilen, Reihenfolge identisch zur Quelle. Diakritika exakt erhalten
  (z.B. `Şahin`, `Đorđević`, `Małgorzata`, `Wiśniewski`, `Hüseyin`).

  Dateien sind reine Faktendaten — KEINE Lizenz-Header, KEINE Kommentare. Lizenz/Quellen
  liegen separat in SOURCES.md (Task 2).
  </action>
  <verify>
  <automated>find scripts/synthetic-meldedaten/names -name '*.txt' | wc -l | grep -q '^12$' &amp;&amp; for f in scripts/synthetic-meldedaten/names/*.txt; do test "$(wc -l &lt; "$f")" -ge 50 || { echo "FAIL: $f hat &lt;50 Zeilen"; exit 1; }; done &amp;&amp; echo OK</automated>
  </verify>
  <done>
  - 12 .txt-Dateien existieren, jede mit ≥50 nicht-leeren Zeilen
  - Diakritika erhalten (Stichprobe: `grep -q 'Şahin' scripts/synthetic-meldedaten/names/tr-nachnamen.txt && grep -q 'Đorđević' scripts/synthetic-meldedaten/names/ex-yu-nachnamen.txt`)
  - Keine Markdown-Backticks (`! grep -l '\`' scripts/synthetic-meldedaten/names/*.txt`)
  </done>
</task>

<task type="auto">
  <name>Task 2: Quellen-Doku SOURCES.md</name>
  <files>scripts/synthetic-meldedaten/names/SOURCES.md</files>
  <action>
  Schreibe deutsche Markdown-Datei mit Quellen + Lizenz-Begründung. Inhalt aus
  `research/names-extracted.md` Abschnitt "Lizenz-Hinweis SOURCES.md" + RESEARCH.md §B.
  Mindestens enthalten:

  1. Überschrift "Quellen der Namens-Listen"
  2. Pro Cluster (at-de / tr / ex-yu / osteuropa) ein Abschnitt mit:
     - Welche Quellen die Liste speist (Statistik Austria URL für AT-Vornamen,
       Wikipedia-URLs für Familiennamen pro Sprachraum)
     - Abrufdatum: 2026-04-26
  3. Lizenz-Begründung: Faktendaten / OGD CC-BY 4.0 / Wikipedia CC-BY-SA 4.0,
     Listenauszüge unter 30-50 Einträgen sind unwesentliche Datenbank-Auszüge nach
     UrhG §87a Abs. 1
  4. Hinweis: Listen sind NICHT real-typische Verteilungen für Herzogenburg, sondern
     repräsentative Mischungen für synthetische Tests
  </action>
  <verify>
  <automated>test -f scripts/synthetic-meldedaten/names/SOURCES.md &amp;&amp; grep -q 'Statistik Austria' scripts/synthetic-meldedaten/names/SOURCES.md &amp;&amp; grep -q 'CC-BY' scripts/synthetic-meldedaten/names/SOURCES.md &amp;&amp; grep -q '2026-04-26' scripts/synthetic-meldedaten/names/SOURCES.md</automated>
  </verify>
  <done>
  - SOURCES.md existiert, deutsch, mit Quell-URLs für alle 4 Cluster, Abrufdatum, Lizenz-Begründung
  </done>
</task>

<!-- COMMIT 1 Boundary: stage + commit alle 13 Dateien aus Task 1+2 als
     `feat(test-data): add curated names lists for 4 cultural clusters` -->

<!-- =================================================================== -->
<!-- COMMIT 2: Generator-Kern (types + builders + csv-writer)             -->
<!-- =================================================================== -->

<task type="auto">
  <name>Task 3: Types + TS-Type-Guards (kein Zod)</name>
  <files>scripts/synthetic-meldedaten/types.ts</files>
  <action>
  Pure TS-Datei mit allen Interfaces für Profile-Konfiguration und Generator-internem Modell.
  Keine Imports von Zod (RESEARCH §C — TS-Type-Guards reichen). Definiere:

  Interfaces (exakte Feldnamen):
  - `KatastralgemeindeDef { id: string; name: string; populationShare: number; sprengelIds?: string[] }`
  - `SprengelDef { id: string; name: string; katastralgemeindeId: string; populationShare?: number }`
  - `AgeBandWeights` — Record<'0-9'|'10-19'|'20-29'|'30-39'|'40-49'|'50-59'|'60-69'|'70-79'|'80+', number>
  - `GenderDistribution { weiblich: number; maennlich: number; divers: number }`
  - `CitizenshipDistribution { austria: number; eu_other: number; third_country: number; eu_countries: string[]; third_country_countries: string[] }`
    (Länder-Codes ISO 3166-1 alpha-2, z.B. 'DE', 'RO', 'TR', 'RS')
  - `NameClusterMix { 'at-de': number; 'tr': number; 'ex-yu': number; 'osteuropa': number; 'sonstige': number }`
  - `HouseholdDistribution { 1: number; 2: number; 3: number; 4: number; 5: number; 6: number }`
  - `KgOverride { ageDistribution?: Partial<AgeBandWeights>; clusterMix?: Partial<NameClusterMix>; citizenshipDistribution?: Partial<CitizenshipDistribution> }`
  - `Profile { name; idPrefix; totalPopulation; cityName; bundesland; katastralgemeinden; sprengel?; ageDistribution; genderDistribution; citizenshipDistribution; nameClusterMix; householdDistribution; familiesWithChildren; threeGenerationShare; crossClusterMixProbability; perKgOverrides? }`
  - `Person { person_id; vorname; nachname; geburtsjahr; geschlecht: 'weiblich'|'maennlich'|'divers'; staatsbuergerschaft: string; sprengel: string; katastralgemeinde: string; haushaltsnummer: string; bildung?: string; migrationshintergrund?: string }`
  - `GeneratorOptions { profile: Profile; seed: number; bom?: boolean; extraFields?: 'none' | 'self-report' }`

  Type-Guard `isProfile(x: unknown): x is Profile` — prüft alle Pflichtfelder, dass alle
  Distribution-Summen ≈ 1 (±0.01), dass `nameClusterMix` Schlüssel komplett sind, dass
  `katastralgemeinden`-populationShares aufsummieren. Bei Fehler wirft `TypeError` mit
  konkretem Pfad ("nameClusterMix sums to 0.97, expected 1.0 ±0.01").

  Cluster-ID Type alias: `type ClusterId = 'at-de' | 'tr' | 'ex-yu' | 'osteuropa' | 'sonstige'`.

  Code-Kommentare englisch.
  </action>
  <verify>
  <automated>pnpm typecheck 2>&amp;1 | tail -20 &amp;&amp; pnpm tsx -e "import('./scripts/synthetic-meldedaten/types.ts').then(m=&gt;console.log(typeof m.isProfile))"</automated>
  </verify>
  <done>
  - types.ts kompiliert ohne TS-Fehler
  - isProfile-Guard exportiert, wirft TypeError bei ungültigen Distributions
  - Alle Felder aus Profile-Schema (RESEARCH §D) abgedeckt
  </done>
</task>

<task type="auto">
  <name>Task 4: Cluster-Pool — Namens-Loading + slawische Endungen-Logik (mit Vitest)</name>
  <files>
  scripts/synthetic-meldedaten/cluster-pool.ts,
  apps/web/tests/unit/synthetic-cluster-pool.test.ts
  </files>
  <action>
  Modul, das die 12 .txt-Listen in einen In-Memory-Pool lädt (synchron via Node `fs.readFileSync`,
  Pfad relativ zur Modul-Datei via `import.meta.url`) und gewichtet zieht. KEINE Browser-Imports.

  Exporte:
  - `loadClusterPools(namesDir: string): ClusterPools` — Map<ClusterId, { vornamen_w, vornamen_m, nachnamen }>
  - `pickName(rng: Mulberry32, list: string[]): string` — uniform (Issue erfordert kein Zipf;
    Listen sind bereits nach Häufigkeit grob sortiert, aber wir ziehen uniform für Vielfalt)
  - `applyFemaleSurnameSuffix(surname: string, cluster: ClusterId): string` — implementiert
    die Tabelle aus `research/names-extracted.md` Abschnitt "Slawische Frauennamen-Endungs-Logik":
    * Cluster 'osteuropa' UND endet auf '-ski' → '-ska'
    * Cluster 'osteuropa' UND endet auf '-cki' → '-cka'
    * Cluster 'osteuropa' UND endet auf '-cký' → '-cká'
    * Cluster 'osteuropa' UND endet auf '-ský' → '-ská'
    * Cluster 'osteuropa' UND endet auf '-ý' (CZ generisch, nicht schon -cký/-ský) → ersetze
      durch '-á' UND append '-ová' (Spezialfall Novák → Nováková)
    * Cluster 'osteuropa' UND CZ/SK-typisches Muster (Kovács, Nagy, Szabó, Tóth, Kiss, Molnár,
      Németh, Farkas, Balogh, Papp, Takács, Juhász, Mészáros, Varga — Hungarian) → KEINE Änderung
    * Cluster 'osteuropa' UND Romanian-typisch (endet auf 'a', 'u', 'eanu', 'escu') → KEINE Änderung
    * Cluster 'osteuropa' UND endet auf 'k', 'r' (z.B. Nowak, Mazur, Wójcik) → KEINE Änderung
      (polnische Namen ohne -ski-Suffix sind Maskulinum = Femininum)
    * Cluster 'osteuropa' default-CZ (endet z.B. auf '-er', '-ec') → append 'ová'
    * Cluster 'ex-yu' UND endet auf '-ić' → KEINE Änderung
    * Sonst: KEINE Änderung
  - `pickCluster(rng: Mulberry32, mix: NameClusterMix): ClusterId` — gewichtetes Roulette

  Die Hungarian/Romanian-Erkennungs-Sets als const-Arrays exportieren, damit Tests sie
  verifizieren können. Mulberry32 importieren wie in `<interfaces>` beschrieben.

  Vitest:
  - `applyFemaleSurnameSuffix('Kowalski', 'osteuropa')` === 'Kowalska'
  - `applyFemaleSurnameSuffix('Nowak', 'osteuropa')` === 'Nowak'
  - `applyFemaleSurnameSuffix('Novák', 'osteuropa')` === 'Nováková'
  - `applyFemaleSurnameSuffix('Petrović', 'ex-yu')` === 'Petrović'
  - `applyFemaleSurnameSuffix('Nagy', 'osteuropa')` === 'Nagy'
  - `applyFemaleSurnameSuffix('Müller', 'at-de')` === 'Müller'
  - `pickCluster` mit Seed 4711 + Herzogenburg-Mix über 10000 Ziehungen → at-de in
    [82%, 88%], tr in [3.5%, 6.5%], ex-yu in [2%, 4%], osteuropa in [2%, 4%]
  - `loadClusterPools` lädt alle 4 Cluster mit ≥50 Vornamen pro Geschlecht und ≥50 Nachnamen

  Code-Kommentare englisch.
  </action>
  <verify>
  <automated>pnpm --filter @sortition/web test -- --run synthetic-cluster-pool</automated>
  </verify>
  <done>
  - cluster-pool.ts lädt Pools aus `names/`-Verzeichnis
  - applyFemaleSurnameSuffix deckt alle Regel-Cases ab (Polish -ski/-cki, Czech/Slovak -ý/append -ová,
    Hungarian/Romanian no-op, polnisch ohne -ski no-op, Serbian -ić no-op, default no-op)
  - pickCluster gewichtet, ±2% statistische Plausibilität bei N=10000
  - Vitest grün
  </done>
</task>

<task type="auto">
  <name>Task 5: Person-Builder — gender, geburtsjahr, citizenship, name (mit Vitest)</name>
  <files>
  scripts/synthetic-meldedaten/person-builder.ts,
  apps/web/tests/unit/synthetic-person-builder.test.ts
  </files>
  <action>
  Modul, das eine Person aus RNG + Profile + Cluster + (optionalen) Constraints erzeugt.

  Exporte:
  - `pickGender(rng, dist: GenderDistribution): 'weiblich'|'maennlich'|'divers'`
  - `pickGeburtsjahrFromBand(rng, band, referenceYear: number): number`
    — referenceYear default 2026, gibt zufälliges Geburtsjahr im Band-Bereich
  - `pickAgeBand(rng, dist: AgeBandWeights): keyof AgeBandWeights` — gewichtet
  - `pickCitizenship(rng, cluster: ClusterId, dist: CitizenshipDistribution): string`
    — cluster-korrelative Logik (Modellannahme — siehe RESEARCH §A NÖ-Demografie + CONTEXT.md):
    * 'at-de' → 95% 'AT', 5% gemäß eu_other (vorrangig 'DE')
    * 'tr' → 60% 'AT' (3.+ Generation eingebürgert), 40% 'TR'
    * 'ex-yu' → 50% 'AT', 50% aus { 'RS', 'BA', 'HR', 'MK' }
    * 'osteuropa' → 30% 'AT', 70% aus { 'PL', 'CZ', 'SK', 'HU', 'RO' }
    * 'sonstige' → wie dist (verteile gemäß austria/eu_other/third_country mit zufälligem Land)
    Cluster-spezifische Default-Anteile sind Konstanten am Modul-Top, dokumentiert
    als "MODEL ASSUMPTION — see RESEARCH.md §A".
  - `buildPerson(rng, params): Person` mit params: { profile, cluster, householdSurname,
    ageBand?, gender?, sprengel, katastralgemeinde, haushaltsnummer, person_id }
    — wenn ageBand/gender gegeben: nutze diese, sonst würfle. Vorname aus Cluster-Pool
    geschlechts-spezifisch. Nachname = householdSurname (mit applyFemaleSurnameSuffix
    falls weiblich).

  Vitest:
  - pickGender mit 51/49/0.1 über 10000 → ±1.5% Toleranz
  - pickGeburtsjahrFromBand für '30-39' bei referenceYear 2026 → Ergebnis in [1987, 1996]
  - pickCitizenship deterministisch via Seed (zwei Aufrufe mit identischem Seed → identisches Ergebnis)
  - buildPerson mit weiblich + Cluster 'osteuropa' + Nachname 'Kowalski' → person.nachname === 'Kowalska'
  - buildPerson mit Cluster 'tr' + 100 Ziehungen → vorname stammt aus tr-vornamen-{geschlecht}-Liste
  - buildPerson Cluster 'tr' + 1000 Ziehungen → mind. 55% staatsbuergerschaft === 'AT'

  Code-Kommentare englisch.
  </action>
  <verify>
  <automated>pnpm --filter @sortition/web test -- --run synthetic-person-builder</automated>
  </verify>
  <done>
  - person-builder.ts mit allen 5 Exports
  - Citizenship-Korrelation cluster-spezifisch
  - Slawische Frauen-Suffixes funktionieren end-to-end
  - Vitest grün
  </done>
</task>

<task type="auto">
  <name>Task 6: Household-Builder — Strukturen + Cross-Cluster-Mix (mit Vitest)</name>
  <files>
  scripts/synthetic-meldedaten/household-builder.ts,
  apps/web/tests/unit/synthetic-household-builder.test.ts
  </files>
  <action>
  Modul, das einen Haushalt (1-N Personen) als konsistente Gruppe erzeugt.

  Exporte:
  - `pickHouseholdSize(rng, dist: HouseholdDistribution): number` (gewichtet 1..6)
  - `buildHousehold(rng, params): Person[]` mit params: { profile, sprengel, katastralgemeinde,
    haushaltsnummer, idCounter: { value: number }, idPrefix }
  - `HouseholdType = 'single' | 'paar' | 'familie' | 'dreigeneration' | 'wg'`
  - `pickHouseholdType(rng, size: number, profile: Profile): HouseholdType`

  Logik (per CONTEXT.md "Haushalts-Modell"):
  - Single (size 1): 1 Person, beliebiges Alter aus profile.ageDistribution
  - Paar (size 2): 2 Erwachsene 25-65, ähnliches Alter ±10 Jahre.
    Cluster: mit Wahrscheinlichkeit profile.crossClusterMixProbability gemischt, sonst gleich.
    Nachname: bei gleichem Cluster → gleicher Nachname; bei Mix → Mann behält seinen,
    Frau übernimmt seinen (vereinfacht — österreichische Realität ohne Doppelname-Modellierung).
  - Familie (size 3-5):
    * 1-2 Erwachsene 25-55 (1-Eltern bei size==3 mit P=0.15)
    * Rest Kinder 0-18 (Geburtsjahr so dass Kind ≥ 18 Jahre jünger als Mutter)
    * Eltern ≥ 18 Jahre älter als jedes Kind
    * Cluster der Familie: einheitlich mit P=(1-crossClusterMixProbability)
    * Kinder erben Cluster + Nachname von einem Elternteil
    * Bei size 4 mit P=profile.threeGenerationShare → konvertiere zu Dreigeneration
  - Dreigeneration (size 4-6): Familie + 1-2 Großeltern (60-85)
    * Großeltern Cluster wie Eltern, Nachname kann abweichen
  - WG (size 2-4, P=0.02): Erwachsene 20-40, jeder eigener Cluster und Nachname
    (per pickCluster pro Person)

  Person-IDs aus idCounter (mutate-by-reference). Format: `${idPrefix}-${String(n).padStart(5,'0')}`.

  Cluster-Wahl pro Haushalt: pickCluster(rng, profile.nameClusterMix). Bei
  perKgOverrides[katastralgemeinde]?.clusterMix → merge über profile-Defaults.

  Vitest:
  - buildHousehold size 1: returns 1 Person
  - buildHousehold size 4 als Familie: ≥1 Person mit geburtsjahr ≥ 2008 (Kind, Alter ≤ 18 bei
    referenceYear 2026), mind. 1 Person mit geburtsjahr in [1971, 2001] (Eltern)
  - Wenn Familie nicht-mixed: alle Nachnamen identisch (modulo Frauen-Suffix)
  - Über 1000 Haushalte size 2 mit crossClusterMixProbability=0.12: Anteil mit gemischten
    Clustern in [9%, 15%]
  - Über 10000 Personen aus buildHousehold-Aufrufen: Cluster-Anteile gemäß profile.nameClusterMix ±2%
  - Person-IDs sind aufsteigend, paddet, Prefix korrekt

  Code-Kommentare englisch.
  </action>
  <verify>
  <automated>pnpm --filter @sortition/web test -- --run synthetic-household-builder</automated>
  </verify>
  <done>
  - 5 Haushaltstypen implementiert mit plausiblen Alters-/Cluster-/Nachnamens-Constraints
  - perKgOverrides werden respektiert
  - Statistische Plausibilität ±2% bei N≥1000
  - Vitest grün
  </done>
</task>

<task type="auto">
  <name>Task 7: CSV-Writer mit deutschen Headern (mit Vitest)</name>
  <files>
  scripts/synthetic-meldedaten/csv-writer.ts,
  apps/web/tests/unit/synthetic-csv-writer.test.ts
  </files>
  <action>
  Modul, das Person[] in eine RFC-4180-konforme CSV serialisiert.

  Exporte:
  - `writeCsv(persons: Person[], options: { extraFields?: 'none'|'self-report'; bom?: boolean }): string`
  - `STAGE1_HEADERS`: const string[] — `['person_id','vorname','nachname','geburtsjahr','geschlecht','staatsbuergerschaft','sprengel','katastralgemeinde','haushaltsnummer']`
  - `STAGE3_HEADERS`: STAGE1_HEADERS + `['bildung','migrationshintergrund']`

  RFC-4180:
  - Felder mit Komma, Quote oder Newline → in Double-Quotes wrappen, interne Quotes verdoppeln
  - Werte ohne Sonderzeichen unquoted
  - LF als Line-Separator (matcht bestehender Codebase, parseCsvFile akzeptiert beides)
  - UTF-8, BOM optional via options.bom (Default false). Wenn true: prepend `﻿`
  - Header-Zeile zuerst, dann Daten

  Reihenfolge der Daten: stable sortiert nach katastralgemeinde, sprengel, haushaltsnummer,
  person_id (lexikographisch — bei numerisch gepaddeten IDs ergibt das natürliche Ordnung).

  Vitest:
  - Header-Zeile exakt `STAGE1_HEADERS.join(',')`
  - Person mit Komma im Nachnamen → korrekt gequotet
  - Person mit Diakritika (`Şahin`) → unverändert in Output
  - BOM-Flag: erste 3 Bytes `EF BB BF`
  - Roundtrip: writeCsv + parseCsvFile (apps/web/src/csv/parse.ts) liefert identische rows
  - Stage-3-Variant fügt 2 zusätzliche Spalten an, Stage-1-Reihenfolge bleibt erhalten
  - Determinismus: zwei Aufrufe mit identischer Person[]-Liste liefern byteweise identischen Output

  Code-Kommentare englisch.
  </action>
  <verify>
  <automated>pnpm --filter @sortition/web test -- --run synthetic-csv-writer</automated>
  </verify>
  <done>
  - csv-writer.ts mit RFC-4180-konformem Quoting
  - UTF-8, BOM optional, deutsche Header
  - Roundtrip mit existing parseCsvFile funktioniert
  - Vitest grün
  </done>
</task>

<!-- COMMIT 2 Boundary: stage + commit alle Dateien aus Task 3-7 als
     `feat(test-data): generator core (types, cluster pool, person/household builders, csv writer)` -->

<!-- =================================================================== -->
<!-- COMMIT 3: CLI + Profile + Integrations-Test                          -->
<!-- =================================================================== -->

<task type="auto">
  <name>Task 8: Generator-CLI (generator.ts)</name>
  <files>scripts/synthetic-meldedaten/generator.ts</files>
  <action>
  CLI-Entry-Point. Aufruf:
  `pnpm tsx scripts/synthetic-meldedaten/generator.ts --profile <name> --output <path> [--config <path>] [--seed N] [--bom] [--extra-fields self-report] [--limit N]`

  Argumente (process.argv parsing — bewusst minimal, keine yargs-Dep):
  - `--profile <name>` — lädt `scripts/synthetic-meldedaten/profiles/<name>.json`
  - `--config <path>` — alternativer Pfad zu Profile-JSON (überschreibt --profile)
  - `--output <path>` — Zielpfad für CSV (REQUIRED)
  - `--seed <N>` — uint32, Default 4711 (per CONTEXT.md)
  - `--bom` — Flag, schreibt UTF-8 BOM
  - `--extra-fields self-report` — Stage-3-Profil mit bildung/migrationshintergrund
  - `--limit <N>` — wenn gesetzt, beschränke Output auf N zufällig gezogene Personen
    (deterministisch via Seed). Wird für Antwortenden-60-Datei genutzt.

  Workflow:
  1. Parse args, validiere REQUIRED
  2. Lade Profile-JSON, validiere via isProfile-Type-Guard
  3. Lade Cluster-Pools (cluster-pool.ts) aus `scripts/synthetic-meldedaten/names/`
  4. Erzeuge Mulberry32(seed)
  5. Berechne Anzahl Haushalte: `round(profile.totalPopulation / 2.16)` (NÖ-avg)
  6. Verteile Haushalte auf KGs proportional zu populationShare (Hamilton-Allocation,
     deterministische Reste-Verteilung — keine Floating-Drift)
  7. Pro Haushalt: pickHouseholdSize → buildHousehold → akkumuliere Personen
  8. Stoppe sobald Personen-Anzahl ≥ profile.totalPopulation, beschneide auf totalPopulation
  9. Falls --extra-fields self-report: würfle bildung (`pflicht`,`lehre`,`matura`,`hochschul`)
     und migrationshintergrund (`keiner`,`erste-generation`,`zweite-generation`) für jede
     Person (deterministisch via Seed). Bildung schwach korreliert mit Alter (Jüngere häufiger
     hochschul). Migration korreliert mit Cluster (at-de meist 'keiner', tr meist 'zweite-generation').
  10. Falls --limit: ziehe N Personen ohne Zurücklegen via Mulberry32 (Fisher-Yates-Shuffle, dann slice)
  11. csvWriter.writeCsv → fs.writeFileSync(output)
  12. Schreibe Summary auf stderr: "Generated 8000 persons in 3704 households across 14 KGs.
      Cluster mix: at-de=85.1%, tr=4.9%, ..."

  Bei Fehler: stderr + exit(1). Sonst exit(0).

  Code-Kommentare englisch. Falls Generation länger als 5 s: progress-Log "[generator] 1000/8000".

  WICHTIG: pure Node, KEINE Browser-Imports. Imports nur aus `node:fs`, `node:path`,
  `node:url`, ../mulberry32, ./types, ./cluster-pool, ./person-builder, ./household-builder,
  ./csv-writer.

  Determinismus-Garantie: alle Map/Set-Iterationen MÜSSEN über sortierte Schlüssel laufen
  (z.B. `Object.keys(...).sort()`), KEINE `Date.now()`, KEIN Math.random.
  </action>
  <verify>
  <automated>pnpm tsx scripts/synthetic-meldedaten/generator.ts --profile herzogenburg --output /tmp/test-gen.csv --seed 4711 &amp;&amp; test "$(wc -l &lt; /tmp/test-gen.csv)" -eq 8001 &amp;&amp; head -1 /tmp/test-gen.csv | grep -q 'person_id,vorname,nachname,geburtsjahr,geschlecht,staatsbuergerschaft,sprengel,katastralgemeinde,haushaltsnummer'</automated>
  </verify>
  <done>
  - CLI akzeptiert --profile, --config, --output, --seed, --bom, --extra-fields, --limit
  - exit-code 0 bei Erfolg, 1 bei Fehler mit verständlichem stderr
  - Output deterministisch (Task 11 verifiziert SHA-Stabilität)
  </done>
</task>

<task type="auto">
  <name>Task 9: Herzogenburg-Profil (vollständig)</name>
  <files>scripts/synthetic-meldedaten/profiles/herzogenburg.json</files>
  <action>
  JSON-Profile gemäß `Profile`-Interface aus types.ts. Werte aus RESEARCH.md §A + CONTEXT.md:

  - name: "herzogenburg"
  - idPrefix: "hzbg"
  - totalPopulation: 8000
  - cityName: "Herzogenburg"
  - bundesland: "Niederösterreich"
  - katastralgemeinden: 14 KGs aus RESEARCH §A. populationShare-Verteilung (geschätzt, dokumentiert):
    * Herzogenburg ~0.59 (4720 von 8000)
    * Oberndorf in der Ebene ~0.10
    * St. Andrä an der Traisen ~0.07
    * Ossarn ~0.05
    * Wielandsthal ~0.04
    * Oberwinden ~0.03
    * Unterwinden ~0.03
    * Gutenbrunn ~0.025
    * Restliche 6 (Adletzberg, Angern, Ederding, Einöd, Hameten, Pottschal) je ~0.01
    Summe = 1.0 ±0.005
  - sprengel: 9 Sprengel aus RESEARCH §A, jeweils einer KG zugeordnet (Ortskern → mehrere Sprengel
    aufteilen, kleine KGs → ein Sprengel). Konkret:
    * `H-Altstadt` → KG Herzogenburg
    * `H-Altst-Umg-N` → KG Herzogenburg
    * `H-Altst-Umg-S` → KG Herzogenburg
    * `Oberndorf-NO` → KG Oberndorf in der Ebene
    * `Oberndorf-SW` → KG Oberndorf in der Ebene
    * `Ederding-Wielandsthal` → KG Wielandsthal
    * `Oberwinden-Ossarn` → KG Ossarn
    * `St-Andra` → KG St. Andrä an der Traisen
    * `Gutenbrunn` → KG Gutenbrunn
  - ageDistribution (RESEARCH §A NÖ): 0-9: 0.09, 10-19: 0.10, 20-29: 0.11, 30-39: 0.13,
    40-49: 0.14, 50-59: 0.15, 60-69: 0.13, 70-79: 0.10, 80+: 0.05
  - genderDistribution: weiblich 0.508, maennlich 0.491, divers 0.001
  - citizenshipDistribution:
    * austria: 0.875
    * eu_other: 0.069
    * third_country: 0.056
    * eu_countries: ['DE','RO','HU','PL','SK','CZ','IT','HR','SI','BG']
    * third_country_countries: ['TR','RS','BA','UA','MK','XK']
  - nameClusterMix: 'at-de': 0.85, 'tr': 0.05, 'ex-yu': 0.03, 'osteuropa': 0.03, 'sonstige': 0.04
  - householdDistribution: {1: 0.382, 2: 0.278, 3: 0.14, 4: 0.13, 5: 0.045, 6: 0.025} (Summe ≈ 1)
  - familiesWithChildren: 0.40
  - threeGenerationShare: 0.01
  - crossClusterMixProbability: 0.12
  - perKgOverrides: leer für v1 (kann später angereichert werden)

  Verifiziere via Type-Guard.
  </action>
  <verify>
  <automated>pnpm tsx -e "import('./scripts/synthetic-meldedaten/types.ts').then(m=&gt;{const fs=require('fs'); const p=JSON.parse(fs.readFileSync('./scripts/synthetic-meldedaten/profiles/herzogenburg.json','utf8')); m.isProfile(p); console.log('valid');})"</automated>
  </verify>
  <done>
  - herzogenburg.json validiert via isProfile
  - 14 KGs, 9 Sprengel, alle Distribution-Summen ±0.01 von 1.0
  - Cluster-Mix exakt 85/5/3/3/4
  </done>
</task>

<task type="auto">
  <name>Task 10: Kleinstadt-3000-Profil</name>
  <files>scripts/synthetic-meldedaten/profiles/kleinstadt-3000.json</files>
  <action>
  Kleineres Profil (3000 Personen, 4 KGs, 4 Sprengel) zum schnellen Testen. Strukturell
  identisch zu herzogenburg.json, aber:
  - name: "kleinstadt"
  - idPrefix: "ks3k"
  - totalPopulation: 3000
  - cityName: "Beispielstadt"
  - bundesland: "Niederösterreich"
  - katastralgemeinden: 4 generische KGs ("Stadtkern", "Nordbezirk", "Südbezirk", "Westsiedlung")
    populationShare 0.55 / 0.20 / 0.15 / 0.10
  - sprengel: 4, je einer pro KG
  - Demografie + ClusterMix wie herzogenburg.json (NÖ-typisch)

  Validierung wie Task 9.
  </action>
  <verify>
  <automated>pnpm tsx -e "import('./scripts/synthetic-meldedaten/types.ts').then(m=&gt;{const fs=require('fs'); const p=JSON.parse(fs.readFileSync('./scripts/synthetic-meldedaten/profiles/kleinstadt-3000.json','utf8')); m.isProfile(p); console.log('valid');})"</automated>
  </verify>
  <done>
  - kleinstadt-3000.json validiert
  - 4 KGs + 4 Sprengel, Summen ±0.01
  </done>
</task>

<task type="auto">
  <name>Task 11: Integrations-Test (Generator end-to-end mit statistischer Plausibilität)</name>
  <files>apps/web/tests/unit/synthetic-generator-integration.test.ts</files>
  <action>
  Vitest, der den Generator end-to-end aufruft (programmatisch via direkten Modul-Import,
  NICHT via Subprocess) und statistische Plausibilität verifiziert.

  Setup:
  - Lade Herzogenburg-Profil
  - Erzeuge 8000 Personen mit Seed 4711
  - Parse das CSV via existing parseCsvFile (apps/web/src/csv/parse.ts)

  Tests:
  - Anzahl Zeilen === 8000
  - Header-Reihenfolge exakt STAGE1_HEADERS
  - Geschlechter-Anteil weiblich in [49%, 53%], maennlich in [47%, 51%], divers ≤ 0.5%
  - Cluster-Anteile (heuristisch via Vornamen-Listen-Lookup): at-de in [82%, 88%], tr in [3.5%, 6.5%],
    ex-yu in [2%, 4%], osteuropa in [2%, 4%]
  - Anzahl unique haushaltsnummer in [3500, 3900] (≈ 8000/2.16)
  - Avg Personen pro Haushalt in [2.0, 2.4]
  - Single-Haushalte in [35%, 41%]
  - Citizenship: 'AT' in [85%, 90%], EU-andere in [5%, 9%], Drittstaaten in [4%, 7%]
  - Alle Sprengel-Werte aus profile.sprengel.id-Liste, alle katastralgemeinde-Werte aus
    profile.katastralgemeinden.id-Liste
  - Pro Haushalt: alle Personen identische sprengel + katastralgemeinde
  - Pro Familie (≥3 Personen, mind. 1 Kind unter 18): alle Erwachsenen ≥ 18 Jahre älter als jüngstes Kind
  - Determinismus: zwei Generator-Läufe mit Seed 4711 → byteweise identisches CSV
  - Anderer Seed (z.B. 4712) → anderes CSV (sanity check)

  Toleranzen sind ±2% bei N=8000 (per CONTEXT.md Test-Strategie).

  Code-Kommentare englisch.
  </action>
  <verify>
  <automated>pnpm --filter @sortition/web test -- --run synthetic-generator-integration</automated>
  </verify>
  <done>
  - End-to-end Generator-Lauf produziert valide CSV
  - Alle 11+ statistischen Plausibilitäts-Assertions grün
  - Determinismus + Seed-Differenz verifiziert
  </done>
</task>

<!-- COMMIT 3 Boundary: stage + commit alle Dateien aus Task 8-11 als
     `feat(test-data): CLI + Herzogenburg + Kleinstadt profiles + integration test` -->

<!-- =================================================================== -->
<!-- COMMIT 4: Pre-generierte CSVs                                        -->
<!-- =================================================================== -->

<task type="auto">
  <name>Task 12: herzogenburg-melderegister-8000.csv erzeugen</name>
  <files>apps/web/public/beispiele/herzogenburg-melderegister-8000.csv</files>
  <action>
  Lege Verzeichnis `apps/web/public/beispiele/` an (sofern nicht existent). Führe aus:

  ```
  pnpm tsx scripts/synthetic-meldedaten/generator.ts \
    --profile herzogenburg \
    --output apps/web/public/beispiele/herzogenburg-melderegister-8000.csv \
    --seed 4711
  ```

  Verifiziere:
  - Datei existiert, Größe ~600-900 KB
  - Erste Zeile === STAGE1_HEADERS-Header
  - Anzahl Datenzeilen === 8000
  - SHA-Stabilität: zweiter Aufruf mit identischen Args → identischer SHA-256
    (`sha256sum` der Datei vor + nach zweitem Aufruf vergleichen)

  Wenn SHA nicht stabil: STOPP, fixe Determinismus in Generator (vermutlich Iteration über
  `Object.keys()` ohne Sort, oder unsortierte Map-Iteration). NICHT als Workaround Datei
  einfach committen.

  Datei einchecken (kein gitignore — bewusste Commit-Strategie).
  </action>
  <verify>
  <automated>SHA1=$(sha256sum apps/web/public/beispiele/herzogenburg-melderegister-8000.csv | cut -d' ' -f1) &amp;&amp; pnpm tsx scripts/synthetic-meldedaten/generator.ts --profile herzogenburg --output /tmp/regen.csv --seed 4711 &amp;&amp; SHA2=$(sha256sum /tmp/regen.csv | cut -d' ' -f1) &amp;&amp; test "$SHA1" = "$SHA2" &amp;&amp; test "$(wc -l &lt; apps/web/public/beispiele/herzogenburg-melderegister-8000.csv)" -eq 8001</automated>
  </verify>
  <done>
  - CSV existiert mit 8001 Zeilen (Header + 8000 Daten)
  - SHA-deterministisch bei Re-Generation mit Seed 4711
  - Diakritika erhalten (Stichprobe: `grep -q 'Şahin\|Đorđević\|Müller' apps/web/public/beispiele/herzogenburg-melderegister-8000.csv`)
  </done>
</task>

<task type="auto">
  <name>Task 13: kleinstadt-3000.csv erzeugen</name>
  <files>apps/web/public/beispiele/kleinstadt-3000.csv</files>
  <action>
  ```
  pnpm tsx scripts/synthetic-meldedaten/generator.ts \
    --profile kleinstadt-3000 \
    --output apps/web/public/beispiele/kleinstadt-3000.csv \
    --seed 4711
  ```

  Wie Task 12 — SHA-Stabilität verifizieren, einchecken.
  </action>
  <verify>
  <automated>test "$(wc -l &lt; apps/web/public/beispiele/kleinstadt-3000.csv)" -eq 3001 &amp;&amp; SHA1=$(sha256sum apps/web/public/beispiele/kleinstadt-3000.csv | cut -d' ' -f1) &amp;&amp; pnpm tsx scripts/synthetic-meldedaten/generator.ts --profile kleinstadt-3000 --output /tmp/regen-ks.csv --seed 4711 &amp;&amp; test "$SHA1" = "$(sha256sum /tmp/regen-ks.csv | cut -d' ' -f1)"</automated>
  </verify>
  <done>
  - kleinstadt-3000.csv mit 3001 Zeilen, SHA-deterministisch
  </done>
</task>

<task type="auto">
  <name>Task 14: herzogenburg-versand-300.csv (Stage-1-Output Demo)</name>
  <files>
  apps/web/public/beispiele/herzogenburg-versand-300.csv,
  scripts/synthetic-meldedaten/derive-versand.ts
  </files>
  <action>
  Schreibe ein kleines Hilfsskript `scripts/synthetic-meldedaten/derive-versand.ts`, das aus
  `apps/web/public/beispiele/herzogenburg-melderegister-8000.csv` deterministisch 300
  Personen via Stage-1-Stratifikation zieht.

  Algorithmus (deterministisch via Seed 4711):
  1. Lade die 8000-Datei als Person[] (parseCsvFile-Logik 1:1 nutzen ODER simpler eigener CSV-Reader)
  2. Berechne Geburtsjahr-Bänder pro Person (`<30 / 30-49 / 50-69 / 70+`)
  3. 3 Stratifikations-Achsen: sprengel, geburtsjahr-band, geschlecht
  4. Ziehe 300 Personen via stratified-sampling (Hamilton-Quoten + Mulberry32(4711) für Auswahl
     innerhalb jeder Zelle) — KEINE Verwendung von Stage-1-runStage1.ts (Browser-Code), sondern
     eigene Mini-Implementation in derive-versand.ts ODER Wiederverwendung von Stage-1-Logik
     aus `packages/core` (falls Node-kompatibel)
  5. Schreibe als CSV mit selben Headern wie Quelldatei

  Aufruf via:
  ```
  pnpm tsx scripts/synthetic-meldedaten/derive-versand.ts \
    --input apps/web/public/beispiele/herzogenburg-melderegister-8000.csv \
    --output apps/web/public/beispiele/herzogenburg-versand-300.csv \
    --n 300 --seed 4711
  ```

  SHA-Stabilität verifizieren wie Task 12.

  Code-Kommentare englisch.
  </action>
  <verify>
  <automated>pnpm tsx scripts/synthetic-meldedaten/derive-versand.ts --input apps/web/public/beispiele/herzogenburg-melderegister-8000.csv --output /tmp/versand.csv --n 300 --seed 4711 &amp;&amp; SHA1=$(sha256sum apps/web/public/beispiele/herzogenburg-versand-300.csv | cut -d' ' -f1) &amp;&amp; SHA2=$(sha256sum /tmp/versand.csv | cut -d' ' -f1) &amp;&amp; test "$SHA1" = "$SHA2" &amp;&amp; test "$(wc -l &lt; apps/web/public/beispiele/herzogenburg-versand-300.csv)" -eq 301</automated>
  </verify>
  <done>
  - 301-Zeilen-CSV (Header + 300 Daten)
  - Deterministisch via Seed 4711
  - Personen sind Subset der 8000-Datei (alle person_ids existieren dort)
  </done>
</task>

<task type="auto">
  <name>Task 15: herzogenburg-antwortende-60.csv (Stage-3-Demo mit Selbstauskunft)</name>
  <files>
  apps/web/public/beispiele/herzogenburg-antwortende-60.csv,
  scripts/synthetic-meldedaten/derive-antwortende.ts
  </files>
  <action>
  Hilfsskript `derive-antwortende.ts`:
  1. Lade die 8000-Personen-Datei (oder die 300-Versand-Datei — wähle 300, näher an Realität)
  2. Ziehe 60 Personen deterministisch via Mulberry32(4711) (Fisher-Yates, dann slice)
  3. Pro Person füge zwei zusätzliche Spalten hinzu (Selbstauskunft, NICHT im Melderegister):
     - `bildung`: gewichtet `pflicht`/`lehre`/`matura`/`hochschul` (z.B. 0.20/0.40/0.25/0.15),
       schwach korreliert mit Alter (jüngere häufiger matura/hochschul)
     - `migrationshintergrund`: `keiner`/`erste-generation`/`zweite-generation`, korreliert mit
       Cluster (cluster-Inferenz heuristisch via Vornamen-Liste): at-de meist 'keiner',
       tr/ex-yu/osteuropa häufiger 'zweite-generation' (3.+ Generation eingebürgert)
  4. CSV-Spalten: STAGE3_HEADERS-Reihenfolge (= STAGE1_HEADERS + bildung + migrationshintergrund)

  Aufruf:
  ```
  pnpm tsx scripts/synthetic-meldedaten/derive-antwortende.ts \
    --input apps/web/public/beispiele/herzogenburg-versand-300.csv \
    --output apps/web/public/beispiele/herzogenburg-antwortende-60.csv \
    --n 60 --seed 4711
  ```

  SHA-Stabilität verifizieren.

  Code-Kommentare englisch.
  </action>
  <verify>
  <automated>pnpm tsx scripts/synthetic-meldedaten/derive-antwortende.ts --input apps/web/public/beispiele/herzogenburg-versand-300.csv --output /tmp/antw.csv --n 60 --seed 4711 &amp;&amp; SHA1=$(sha256sum apps/web/public/beispiele/herzogenburg-antwortende-60.csv | cut -d' ' -f1) &amp;&amp; SHA2=$(sha256sum /tmp/antw.csv | cut -d' ' -f1) &amp;&amp; test "$SHA1" = "$SHA2" &amp;&amp; test "$(wc -l &lt; apps/web/public/beispiele/herzogenburg-antwortende-60.csv)" -eq 61 &amp;&amp; head -1 apps/web/public/beispiele/herzogenburg-antwortende-60.csv | grep -q 'bildung,migrationshintergrund'</automated>
  </verify>
  <done>
  - 61-Zeilen-CSV (Header + 60 Daten) mit 11 Spalten
  - bildung + migrationshintergrund als zusätzliche Spalten
  - Deterministisch via Seed 4711
  </done>
</task>

<task type="auto">
  <name>Task 16: README.md im Beispiele-Verzeichnis</name>
  <files>apps/web/public/beispiele/README.md</files>
  <action>
  Deutsche Markdown-Datei. Enthält:

  1. Überschrift "Beispiel-Daten" + Einleitung: "Diese CSV-Dateien sind synthetisch erzeugt —
     keine echten Personen. Sie dienen ausschließlich dazu, das Tool ohne eigene Daten
     ausprobieren zu können."
  2. Tabelle mit allen 4 Dateien: Name | Größe | Personen | Stage | Beschreibung
  3. Pro Datei einen Detail-Abschnitt:
     - `herzogenburg-melderegister-8000.csv`: Stage 1 — Vollbevölkerung einer kleineren NÖ-Gemeinde
       nach Vorbild Herzogenburg. Spalten erklären.
     - `herzogenburg-versand-300.csv`: Stage 1 Output — eine stratifizierte Versand-Stichprobe
       von 300 Personen aus der 8000er-Bevölkerung
     - `herzogenburg-antwortende-60.csv`: Stage 3 Input — 60 Personen mit zusätzlichen
       Selbstauskunfts-Feldern (bildung, migrationshintergrund). Hinweis: diese Felder sind
       NICHT im Melderegister, sondern werden im realen Workflow von den Antwortenden selbst
       auf einem Anmeldeformular ausgefüllt.
     - `kleinstadt-3000.csv`: kleineres Profil zum schnellen Testen
  4. Abschnitt "Warum synthetisch": NÖ-Demografie-Schätzungen, NICHT reale Herzogenburger Daten.
     Verweis auf RESEARCH.md §A.
  5. Abschnitt "Reproduzierbarkeit": Generator-Aufruf-Befehle, Seed 4711, Generator-Commit-SHA
     (Platzhalter `__GENERATOR_COMMIT_SHA__` — Executor ersetzt durch echten kurzen SHA von HEAD
     zum Zeitpunkt der Generation, z.B. `git rev-parse --short HEAD`).
  6. Lizenz-Hinweis: Beispiel-Daten Public Domain (CC0), da reine synthetische Konstruktion.
  </action>
  <verify>
  <automated>test -f apps/web/public/beispiele/README.md &amp;&amp; grep -q 'synthetisch' apps/web/public/beispiele/README.md &amp;&amp; grep -q 'herzogenburg-melderegister-8000.csv' apps/web/public/beispiele/README.md &amp;&amp; grep -q '4711' apps/web/public/beispiele/README.md &amp;&amp; grep -qE '[a-f0-9]{7,}' apps/web/public/beispiele/README.md</automated>
  </verify>
  <done>
  - README erklärt jede Datei + Reproduzierbarkeit + Lizenz
  - Alle 4 Dateinamen, Seed 4711, Generator-SHA referenziert
  </done>
</task>

<!-- COMMIT 4 Boundary: stage + commit alle Dateien aus Task 12-16 als
     `feat(test-data): pre-generated example CSVs + README` -->

<!-- =================================================================== -->
<!-- COMMIT 5: Doku-Sub-Seite + DocsHub-Tile + Stage1-Hint                -->
<!-- =================================================================== -->

<task type="auto">
  <name>Task 17: Beispiele.tsx — neue Doku-Sub-Seite (Solid)</name>
  <files>apps/web/src/docs/Beispiele.tsx</files>
  <action>
  Solid-Komponente analog zum bestehenden #54-Pattern (z.B. `Limitationen.tsx`).

  Inhalt der Seite:
  1. Hinweis-Banner oben: "Diese Daten sind synthetisch erzeugt. Sie enthalten keine echten
     Personen. Sie dürfen frei verwendet werden, um den Workflow auszuprobieren."
  2. Tabelle mit 4 Zeilen (eine pro CSV-Datei) — Spalten: Datei | Personen | Stage | Beschreibung |
     Download-Button
  3. Download-Buttons als `<a href="..." download>` (kein JS), URL-Pattern
     `/buergerinnenrat/beispiele/<dateiname>` (Vite-Base-Pfad). HINWEIS: Vite stellt
     `import.meta.env.BASE_URL` zur Verfügung — nutze das, NICHT hardcoded `/buergerinnenrat/`.
     URL-Konstruktion: `${import.meta.env.BASE_URL}beispiele/${dateiname}` (BASE_URL endet bereits auf '/').
  4. Erklär-Abschnitt "Was steckt in den Spalten": Liste der Stage-1-Felder (person_id, vorname,
     nachname, geburtsjahr, geschlecht, staatsbuergerschaft, sprengel, katastralgemeinde,
     haushaltsnummer) + Stage-3-Zusatzfelder (bildung, migrationshintergrund)
  5. Abschnitt "Warum synthetisch": kurz erklären (NÖ-Demografie-Schätzungen, keine PII-Risiken)
  6. Verweis auf SOURCES.md (intern, kein Download-Link nötig — Hinweis "Quellen siehe
     scripts/synthetic-meldedaten/names/SOURCES.md im Repo")

  Test-IDs:
  - `data-testid="docs-page-beispiele"` auf Wrapper
  - `data-testid="download-${dateiname-ohne-endung}"` auf jedem Download-Link

  Tailwind-Styling konsistent zu bestehenden Doku-Seiten.

  Code-Kommentare englisch, alle UI-Texte deutsch.
  </action>
  <verify>
  <automated>test -f apps/web/src/docs/Beispiele.tsx &amp;&amp; grep -q 'docs-page-beispiele' apps/web/src/docs/Beispiele.tsx &amp;&amp; grep -q 'herzogenburg-melderegister-8000.csv' apps/web/src/docs/Beispiele.tsx &amp;&amp; grep -q 'BASE_URL' apps/web/src/docs/Beispiele.tsx &amp;&amp; pnpm typecheck 2>&amp;1 | tail -5</automated>
  </verify>
  <done>
  - Beispiele.tsx kompiliert
  - Alle 4 Download-Links vorhanden
  - Test-IDs gesetzt
  - BASE_URL korrekt verwendet
  </done>
</task>

<task type="auto">
  <name>Task 18: DocsHub.tsx erweitern um Beispiele-Tile</name>
  <files>apps/web/src/docs/DocsHub.tsx</files>
  <action>
  Vier minimale Änderungen am bestehenden DocsHub.tsx:
  1. Neue lazy-import-Zeile: `const Beispiele = lazy(() => import('./Beispiele'));`
  2. Neue Eintrag in TILES-Array (Reihenfolge: an passender Stelle, z.B. nach 'algorithmus'):
     ```
     {
       slug: 'beispiele',
       title: 'Beispiel-Daten',
       description: 'CSV-Dateien zum Download — den ganzen Workflow direkt ausprobieren.',
       icon: <svg {...SVG_BASE} class={ICON_CLASS}>
         <!-- Datei-Icon: Rechteck mit eingeknickter Ecke, signalisiert "Datei/Download" -->
         <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
         <polyline points="14 2 14 8 20 8" />
         <line x1="12" y1="18" x2="12" y2="12" />
         <polyline points="9 15 12 18 15 15" />
       </svg>
     }
     ```
  3. Neue Zeile in TITLES-Map: `beispiele: 'Beispiel-Daten'`
  4. Neuer case in renderSubpage: `case 'beispiele': return <Beispiele />;`

  KEINE weiteren Änderungen am DocsHub.
  </action>
  <verify>
  <automated>grep -q "lazy(() =&gt; import('./Beispiele'))" apps/web/src/docs/DocsHub.tsx &amp;&amp; grep -q "slug: 'beispiele'" apps/web/src/docs/DocsHub.tsx &amp;&amp; grep -q "case 'beispiele'" apps/web/src/docs/DocsHub.tsx &amp;&amp; pnpm typecheck 2>&amp;1 | tail -5</automated>
  </verify>
  <done>
  - DocsHub.tsx hat Tile + lazy-import + TITLES + renderSubpage-case
  - Typecheck grün (keine Union-Discrepancy)
  </done>
</task>

<task type="auto">
  <name>Task 19: App.tsx — DocsRoute Union + DOCS_ROUTES Set ergänzen</name>
  <files>apps/web/src/App.tsx</files>
  <action>
  Zwei Stellen erweitern (Zeile 53-70):

  1. DocsRoute-Union: füge `| 'beispiele'` hinzu:
  ```
  export type DocsRoute =
    | 'hub'
    | 'algorithmus'
    | 'technik'
    | 'verifikation'
    | 'glossar'
    | 'bmg46'
    | 'limitationen'
    | 'beispiele';
  ```

  2. DOCS_ROUTES Set: füge `'beispiele'` hinzu (Set-Literal in Zeile 62-70).

  KEINE anderen Änderungen — Hash-Routing funktioniert dann automatisch.
  </action>
  <verify>
  <automated>grep -q "| 'beispiele'" apps/web/src/App.tsx &amp;&amp; grep -A 10 'DOCS_ROUTES' apps/web/src/App.tsx | grep -q "'beispiele'" &amp;&amp; pnpm typecheck 2>&amp;1 | tail -5</automated>
  </verify>
  <done>
  - DocsRoute Union enthält 'beispiele'
  - DOCS_ROUTES Set enthält 'beispiele'
  - Typecheck grün
  </done>
</task>

<task type="auto">
  <name>Task 20: Stage1Panel — Hint mit Link zu /docs/beispiele</name>
  <files>apps/web/src/stage1/Stage1Panel.tsx</files>
  <action>
  Über (oder direkt unter) dem File-Upload-Input einen kleinen, dezenten Hinweis-Block einfügen:

  Inhalt: "Keine eigenen Daten? Beispiel-Datei verwenden →" als Link auf `#/docs/beispiele`
  (Hash-Routing — das Klick-Verhalten erledigt der Browser, der App-Hash-Listener navigiert
  automatisch).

  Styling: kleine Schrift (text-sm), gedämpfte Farbe (text-slate-600), unterhalb des Datei-
  Inputs. KEINE neuen Imports nötig (reines `<a href="#/docs/beispiele">...</a>`).

  Test-ID: `data-testid="stage1-beispiele-link"` auf das Link-Element.

  KEINE weiteren Änderungen an Stage1Panel — bestehende Logik bleibt unangetastet.
  </action>
  <verify>
  <automated>grep -q 'stage1-beispiele-link' apps/web/src/stage1/Stage1Panel.tsx &amp;&amp; grep -q '#/docs/beispiele' apps/web/src/stage1/Stage1Panel.tsx &amp;&amp; pnpm typecheck 2>&amp;1 | tail -5</automated>
  </verify>
  <done>
  - Hint-Link mit Test-ID + Hash-URL existiert
  - Bestehende Stage1-Funktionalität nicht betroffen
  </done>
</task>

<!-- COMMIT 5 Boundary: stage + commit alle Dateien aus Task 17-20 als
     `feat(docs): /docs/beispiele sub-page + DocsHub tile + Stage1 hint` -->

<!-- =================================================================== -->
<!-- COMMIT 6: E2E-Tests + Live-Smoke + Bundle-Delta-Doku                 -->
<!-- =================================================================== -->

<task type="auto">
  <name>Task 21: Playwright-E2E — Beispiel-Datei in Stage 1</name>
  <files>apps/web/tests/e2e/beispiele-stage1.spec.ts</files>
  <action>
  Neuer Playwright-Spec analog zu bestehenden e2e-Specs (siehe `apps/web/tests/e2e/stage1.spec.ts`
  als Template). Test-Schritte:

  1. Navigiere zur App, wechsle zu Stage 1 (`#/stage1`)
  2. Klicke auf den Hint-Link `[data-testid="stage1-beispiele-link"]`
  3. Verifiziere Navigation zu `/docs/beispiele` (`[data-testid="docs-page-beispiele"]` sichtbar)
  4. Klicke Download-Button für `herzogenburg-melderegister-8000.csv`
     (`[data-testid="download-herzogenburg-melderegister-8000"]`)
  5. Erwarte Download-Event (Playwright `page.waitForEvent('download')`), Speichere file
  6. Verifiziere: Download-Datei hat 8001 Zeilen
  7. Navigiere zurück zu Stage 1
  8. Lade die heruntergeladene Datei via File-Upload-Input hoch
  9. Verifiziere: Sampler erkennt Sprengel-Achse automatisch
  10. Setze Target-N auf 300, klicke "Run"
  11. Verifiziere: Output-CSV ist downloadbar mit 301 Zeilen

  Code-Kommentare englisch.
  </action>
  <verify>
  <automated>pnpm --filter @sortition/web test:e2e -- --grep beispiele-stage1</automated>
  </verify>
  <done>
  - E2E-Spec grün
  - Download + Re-Upload + Run end-to-end durchlaufen
  </done>
</task>

<task type="auto">
  <name>Task 22: Live-Smoke-Spec erweitern um Beispiele-Seite</name>
  <files>apps/web/tests/smoke-live/site-smoke.spec.ts</files>
  <action>
  Bestehende Live-Smoke-Spec um neuen Test ergänzen (NICHT existing tests verändern):

  - `test('Doku-Beispiele lädt mit Download-Link', ...)`:
    1. Navigiere zur live-deployten URL (Base-URL aus existierender Spec)
    2. Wechsle zu `/docs/beispiele`
    3. Verifiziere `[data-testid="docs-page-beispiele"]` sichtbar
    4. Verifiziere `[data-testid="download-herzogenburg-melderegister-8000"]` hat
       href endend auf `/beispiele/herzogenburg-melderegister-8000.csv`
    5. HEAD-Request auf den Download-URL → erwarte 200 OK
       (über `page.request.head(url)` in Playwright)

  Test darf KEINEN echten Download triggern (Smoke = lightweight).

  Code-Kommentare englisch.
  </action>
  <verify>
  <automated>grep -q 'docs-page-beispiele' apps/web/tests/smoke-live/site-smoke.spec.ts &amp;&amp; grep -q 'herzogenburg-melderegister-8000' apps/web/tests/smoke-live/site-smoke.spec.ts</automated>
  </verify>
  <done>
  - Neuer Smoke-Test in site-smoke.spec.ts
  - Existing Smoke-Tests unverändert
  </done>
</task>

<task type="auto">
  <name>Task 23: Verifikation — bestehende Tests bleiben grün</name>
  <files></files>
  <action>
  Keine Code-Änderungen. Nur Test-Suite full-run zur Regression-Verifikation der Issues
  #45/#52/#53/#54/#56:
  - `pnpm test` (alle Vitest)
  - `pnpm --filter @sortition/web test:e2e` (alle Playwright außer smoke-live)
  - `pnpm typecheck`
  - `pnpm lint`

  Falls eine bestehende Test-Suite rot ist: Root-Cause finden — wenn die Ursache eine
  unbeabsichtigte Side-Effect der Tasks 17-20 ist (z.B. CSS-Class-Konflikt), fixen.
  Wenn vorbestehender Flake: in Done-Liste dokumentieren, NICHT als Regression werten.

  Erlaubt: Doku-Tests die explizit gegen die neue Tile zählen sollten (z.B. existing docs.spec.ts
  prüft Anzahl Tiles) müssen aktualisiert werden — das ist KEIN Regression-Bruch.
  </action>
  <verify>
  <automated>pnpm test &amp;&amp; pnpm typecheck &amp;&amp; pnpm lint &amp;&amp; pnpm --filter @sortition/web test:e2e</automated>
  </verify>
  <done>
  - Alle Vitest, Playwright (außer smoke-live), Typecheck, Lint grün
  - Falls bestehende docs-Tests Tile-Counts hatten: angepasst auf neue Anzahl
  </done>
</task>

<task type="auto">
  <name>Task 24: Bundle-Delta messen + dokumentieren</name>
  <files>.issues/57-synthetic-test-data-generator/BUNDLE_DELTA.md</files>
  <action>
  1. Vor jeglichen Web-Änderungen (oder via `git stash` der UI-Changes — Beispiele.tsx,
     DocsHub.tsx-Diff, App.tsx-Diff, Stage1Panel.tsx-Diff): `pnpm build` ausführen, JS-Bundle-
     Größen aus `apps/web/dist/assets/*.js` summieren (raw + gzip via `gzip -c | wc -c`)
  2. Nach Wiederherstellung der Änderungen: `pnpm build` erneut, Größen erneut messen
  3. Schreibe Markdown-Tabelle in `BUNDLE_DELTA.md`:
     | Phase | Raw (KB) | Gzip (KB) | Delta vs Baseline |
     | Vor #57 | X | Y | — |
     | Nach #57 | X' | Y' | +Δ raw / +Δ gzip |
  4. Verifiziere Akzeptanzkriterium aus ISSUE.md: Delta < +50 KB raw / +20 KB gzip
  5. Falls überschritten: STOPP, root-cause analysieren — vermutlich ist Beispiele.tsx zu groß
     oder lazy-loading versagt. Fix vor Merge.

  Notiz im BUNDLE_DELTA.md, dass Beispiel-CSVs in public/ NICHT zum JS-Bundle zählen (das war
  bewusste Architektur-Entscheidung — siehe CONTEXT.md Bundle-Budget).
  </action>
  <verify>
  <automated>test -f .issues/57-synthetic-test-data-generator/BUNDLE_DELTA.md &amp;&amp; grep -qE '\+[0-9]+(\.[0-9]+)? (KB|kB)' .issues/57-synthetic-test-data-generator/BUNDLE_DELTA.md</automated>
  </verify>
  <done>
  - BUNDLE_DELTA.md mit konkreten Zahlen vor/nach
  - Delta unter +50 KB raw / +20 KB gzip dokumentiert
  </done>
</task>

<!-- COMMIT 6 Boundary: stage + commit alle Dateien aus Task 21-24 als
     `test(test-data): playwright e2e + live-smoke + bundle-delta documentation` -->

<!-- =================================================================== -->
<!-- COMMIT 7: README ergänzen                                            -->
<!-- =================================================================== -->

<task type="auto">
  <name>Task 25: Root-README — Abschnitt "Beispiel-Daten ausprobieren"</name>
  <files>README.md</files>
  <action>
  Neuen Abschnitt im Root-README einfügen (nach dem bestehenden Intro, vor technischen
  Details). Inhalt deutsch:

  > ## Beispiel-Daten ausprobieren
  >
  > Du willst das Tool ohne eigene Melderegister-Datei testen? Auf der Live-Seite findest du
  > unter [Doku → Beispiel-Daten](https://flomotlik.github.io/buergerinnenrat/#/docs/beispiele)
  > vier vor-generierte synthetische CSV-Dateien:
  >
  > - `herzogenburg-melderegister-8000.csv` — Vollbevölkerung einer kleineren NÖ-Gemeinde
  >   nach Vorbild Herzogenburg (für Stage 1)
  > - `herzogenburg-versand-300.csv` — stratifizierte Versand-Stichprobe von 300 Personen
  > - `herzogenburg-antwortende-60.csv` — 60 Personen mit Selbstauskunfts-Feldern (für Stage 3)
  > - `kleinstadt-3000.csv` — kleineres Profil zum schnellen Testen
  >
  > Alle Daten sind synthetisch erzeugt — keine echten Personen.
  > Generator + Reproduzier-Anleitung: `scripts/synthetic-meldedaten/`.

  KEINE weiteren README-Änderungen.
  </action>
  <verify>
  <automated>grep -q 'Beispiel-Daten ausprobieren' README.md &amp;&amp; grep -q 'herzogenburg-melderegister-8000.csv' README.md &amp;&amp; grep -q 'docs/beispiele' README.md</automated>
  </verify>
  <done>
  - README hat Beispiel-Daten-Abschnitt mit Live-Link + 4 Datei-Auflistung + Generator-Pfad-Verweis
  </done>
</task>

<!-- COMMIT 7 Boundary: stage + commit Task 25 als
     `docs(readme): mention example data download` -->

</tasks>

<verification>
Nach allen 25 Tasks final ausführen:
- `pnpm test` — alle Vitest grün (incl. neue synthetic-* Tests)
- `pnpm --filter @sortition/web test:e2e` — alle Playwright grün (incl. beispiele-stage1)
- `pnpm typecheck` — keine TS-Fehler
- `pnpm lint` — keine Lint-Fehler
- `pnpm build` — Build erfolgreich
- SHA-Drift-Check: alle 4 CSV-Dateien in `apps/web/public/beispiele/` haben identische SHA-256
  wie ein frischer Generator-Re-Run mit Seed 4711 (manueller Befehl-Set aus Task 12-15)
- 7 Commits in der erwarteten Reihenfolge: `git log --oneline -8 | head -7`
- Commit-Messages folgen conventional Format ohne Issue-Prefix
</verification>

<success_criteria>
Maps 1:1 zu den Acceptance Criteria aus ISSUE.md:

Generator-Architektur:
- generator.ts CLI mit allen 7 Args funktioniert (Task 8)
- types.ts mit Profile/Sprengel/HouseholdRules/NamePool/CitizenshipDistribution + TS-Type-Guards (Task 3)
- Deterministisch via Mulberry32-Seed (Task 8 + Test in Task 11)
- Pure TypeScript Node-only, keine Browser-Imports (Task 8)
- Output-CSV-Spalten = STAGE1_HEADERS (Task 7)

Demografische Realismen:
- Haushalts-Verteilung 38/28/14/13/4.5/2.5 implementiert (Task 6 + Task 9)
- Kinder + Eltern in einem Haushalt mit plausiblem Alter (Task 6, Test in Task 11)
- Mehrgeneration-Anteil ~1% (Task 6 + Profil)
- EU-Bürger:innen ~6.9% / Drittstaaten ~5.6% (Task 5 + Profil + Test)
- Kulturelle Namens-Mischung 4 Cluster (Task 4 + Task 5)
- Heirats-/Mischehen ~12% (Task 6 + Profile crossClusterMixProbability)
- Geburtsjahr-Pyramide NÖ-typisch (Task 5 + Profil)
- Geschlecht 51/49/0.1 (Task 5 + Profil)

Sprengel/KGs:
- 14 KGs + 9 Sprengel im Herzogenburg-Profil (Task 9)
- Generator respektiert KG-populationShare (Task 8)
- perKgOverrides als Schema-Feld vorhanden (Task 3, leere Map in Task 9)

Herzogenburg-Profil:
- 14 KGs aus RESEARCH §A (Task 9)
- 8000 Personen (Task 12)
- NÖ-Demografie-Werte (Task 9)
- ClusterMix 85/5/3/3/4 (Task 9)

Namens-Listen:
- 12 .txt-Dateien mit ≥50 Einträgen pro Geschlecht/Cluster (Task 1)
- SOURCES.md mit Quellen + Lizenz (Task 2)

Pre-generierte Beispiele:
- herzogenburg-melderegister-8000.csv (Task 12)
- herzogenburg-versand-300.csv (Task 14)
- herzogenburg-antwortende-60.csv (Task 15)
- kleinstadt-3000.csv (Task 13)
- README.md im public/beispiele/ (Task 16)

Website-Integration:
- Doku-Sub-Seite /docs/beispiele (Task 17)
- DocsHub-Tile (Task 18)
- Inhalt mit Erklär-Text + Download-Buttons (Task 17)
- Download via `<a href="..." download>` (Task 17)
- Stage 1 Panel-Hint (Task 20)

Tests:
- Vitest für Determinismus + Plausibilität (Task 4, 5, 6, 7, 11)
- Smoke: Stage 1 mit Beispiel-Datei (Task 21)
- Playwright Stage 1 Beispiel-Datei (Task 21)
- Live-Smoke (Task 22)
- Bestehende Tests grün (Task 23)
- Bundle-Delta unter +50 KB raw / +20 KB gzip (Task 24)
</success_criteria>
