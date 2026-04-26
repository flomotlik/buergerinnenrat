# Plan: In-App Dokumentation — Algorithmus, Tech-Stack, Reproduzierbarkeit, Trust-Signale

<objective>
Was dieser Plan liefert: zwei in der App selbst lebende Vertrauens-Pfade — (1) ein Verwaltungs-Pfad mit TrustStrip-Karten und kontextuellen Tooltips im Stage1Panel, (2) ein Auditor-Pfad mit `/docs/technik` (Build-Time-Manifest mit eingefrorenen Versionen) und `/docs/verifikation` (Schritt-für-Schritt-Reproduktion gegen `scripts/stage1_reference.py`).

Warum es wichtig ist: Algorithmus + Audit-Chain stehen (#45/#52/#53), aber alle Erklärungen liegen heute nur in `docs/*.md` im Git-Repo. Eine Verwaltungs-Mitarbeiterin, eine Volkshochschul-Auditor:in oder ein Pilotgemeinde-Vertreter sieht das Verfahren im Tool selbst nicht erklärt. Ohne die in-situ Doku entsteht kein Vertrauen, ohne den Reproduzierbarkeits-Pfad keine externe Verifikation.

Scope:
- IN: Routing-Erweiterung in App.tsx auf `'docs'`, Hub + 6 Doku-Seiten, Hamilton-SVG-Walkthrough, Tech-Manifest-Generator + CI-Drift-Check, Verifikations-Anleitung, Glossar (JSON + Vollseite + Inline-Tooltip), TrustStrip im Stage1Panel, BMG §46-Erklärung, Limitationen-Seite, Print-CSS-Erweiterung, Build-/Commit-Info im Footer, Vitest- und Playwright-Tests, Bundle-Delta-Messung.
- OUT (lt. ISSUE.md): Mehrsprachigkeit, PDF-Export, interaktiver Algorithmus-Playground, Audit-JSON-Drag-and-drop-Reader, eigene "Über/Methodik-Bibliografie"-Seite.

Kein CONTEXT.md vorhanden — die Variantenwahl ist bereits in ISSUE.md festgenagelt (Single SPA-Tab, sechs Unterseiten, Solid-Signal-State + Hash-Sync, eingechecktes Tech-Manifest, eigene HamiltonSvg-Komponente analog `AxisBreakdown.tsx`).
</objective>

<context>
Issue: @.issues/54-in-app-documentation/ISSUE.md
Research: @.issues/54-in-app-documentation/RESEARCH.md

Branch (vorgegeben, KEIN neuer Worktree): `worktree-agent-ac76adcb`. Alle Tasks arbeiten im aktuellen Worktree `/root/workspace/.claude/worktrees/agent-ac76adcb/`.

<interfaces>
<!-- Executor: nutze diese Verträge direkt. Keine Codebase-Exploration nötig. -->

App-Routing — heute (apps/web/src/App.tsx):
- Tab-Switcher via Solid-Signal `mode` mit Werten `'stage1' | 'stage3'`, default `'stage3'`.
- Tab-Buttons: `data-testid="tab-stage1"` und `data-testid="tab-stage3"`, Container `data-testid="main-nav"`.
- Render via `<Show when={mode() === 'stage1'}>` / `<Show when={mode() === 'stage3'}>`.
- KEIN bestehender URL-Hash-Sync.

Bestehende SVG-Vorlage (apps/web/src/stage1/AxisBreakdown.tsx):
- Pattern für SVG-Chart (gleicher visueller Stil wird für die neue HamiltonSvg-Komponente übernommen). Stack horizontal, Boxen pro Kategorie.

Bestehender BMG-Hint (apps/web/src/stage1/Stage1Panel.tsx, Block ab `data-testid="stage1-bmg-hint"`):
- Externer Link auf `https://www.gesetze-im-internet.de/bmg/__46.html`. Hier soll zusätzlich ein interner Link auf `/docs/bmg46` hinzugefügt werden (siehe Task 18).

Stage1AuditDoc-Schema (packages/core/src/stage1/types.ts:54-86):
- Felder: `schema_version: '0.2'`, `algorithm_version: 'stage1@1.0.0'`, `prng: 'mulberry32'`, `tie_break_rule`, `key_encoding`, `stratum_sort`, `seed`, `input_csv_sha256`, `selected_indices`, `signature`, `public_key`, `signature_algo`.
- Reproduktions-Schritte: Audit-JSON laden -> Parameter `seed, axes, target_n` extrahieren -> `python3 scripts/stage1_reference.py --input <csv> --axes <a,b,c> --target-n <N> --seed <S> --output-json out.json` -> `selected_indices` byte-vergleichen.

Reference-Skripte (im Repo vorhanden):
- `scripts/stage1_reference.py` — native Python-Referenz
- `scripts/stage1_cross_validate.sh` — Cross-Validation-Lauf
- `scripts/verify_audit.py` — Signatur-Prüfung

Bundle-Budget:
- +25 KB raw / +8 KB gzip Bundle-Delta gegenueber dem Baseline-Build vor diesem Issue.
- Lazy-load aller Doku-Seiten via Solid `lazy(() => import('./docs/...'))`, damit das Stage1/Stage3-Bundle nicht waechst.
- Bundle-Ueberschreitung loest KEIN automatisches Rollback aus — Task 22 misst und reportet, User entscheidet.

Build-Befehle (apps/web/package.json):
- `pnpm build` (= `vite build`), `pnpm test` (= `vitest run`), `pnpm test:e2e` (= `playwright test`), `pnpm typecheck` (= `tsc --noEmit`), `pnpm lint`.
- Aus dem Repo-Root: `pnpm --filter @sortition/web <script>`.

Tech-Manifest-Eintrag-Schema (zu definieren in Task 8):
- `interface TechEntry { name: string; version: string; license: string; kind: 'runtime' | 'build' | 'test'; purpose: string; sourceUrl?: string }`
- Sonderfall Web Crypto API: Eintrag ohne semantische Version (Browser-Standard); Mulberry32: own-implementation, mit Quelle.

Glossar-Eintrag-Schema (Task 13):
- `interface GlossarEntry { slug: string; term: string; kurz: string; lang_md?: string; see_also?: string[]; external_link?: { label: string; url: string } }`
- Slug ist URL-fragment-faehig: `#/docs/glossar/<slug>`.

Existing test directories:
- Vitest: `apps/web/tests/unit/*.test.ts(x)` (jsdom env, globals on, include in vite.config.ts).
- Playwright: `apps/web/tests/e2e/*.spec.ts`.
- Vorhandene e2e-Specs (zur Co-Location der neuen): `smoke.spec.ts`, `stage1.spec.ts`, `end-to-end.spec.ts`, `a11y.spec.ts`.
</interfaces>

Schluesseldateien (Lesen vor Implementierung):
@apps/web/src/App.tsx — Top-Level-Routing, Mode-Type erweitern
@apps/web/src/stage1/Stage1Panel.tsx — Einbindung TrustStrip + interner BMG-Link
@apps/web/src/stage1/AxisBreakdown.tsx — SVG-Vorlage fuer HamiltonSvg
@apps/web/src/stage1/AuditFooter.tsx — visueller Stil fuer Tech-Manifest-Anzeige
@apps/web/src/index.css — Print-CSS-Pattern (heute Stage1-spezifisch, wird auf `/docs/*` erweitert)
@apps/web/vite.config.ts — `define` fuer `__GIT_SHA__` / `__BUILD_DATE__`
@docs/stage1-algorithm.md — Inhalt-Quelle fuer Algorithmus-Seite (gekuerzte Plain-Language-Umarbeitung)
@docs/stage1-validation-report.md — Zahlen fuer TrustStrip-Karte 2 ("21/21 byte-identisch")
@packages/core/src/stage1/types.ts — Audit-Schema fuer Verifikations-Seite
@scripts/stage1_reference.py — Reproduktions-Ziel
</context>

<commit_format>
Format: conventional ohne Issue-Prefix (Repo-Konvention; siehe Recent Commits: `feat(iteration-2): ...`, `docs(09,12-14,16): ...`).
Pattern: `<type>(<scope>): <description>`
Beispiele:
- `feat(docs): add docs tab routing with hash sync and lazy stub pages`
- `feat(docs): add algorithm page with hamilton svg toy walkthrough`
- `feat(tech-manifest): generator + technik docs page + ci drift check`
- `feat(docs): verification reproduction guide`
- `feat(docs): glossary data, full page, and inline term tooltip`
- `feat(stage1): trust strip; docs(bmg46,limitations): explanatory pages`
- `chore(docs): print css, e2e tests, bundle delta report`
</commit_format>

<tasks>

<!-- ============================================================ -->
<!-- COMMIT 1: Skeleton (Routing + Hub + Build-Info + Stub pages)  -->
<!-- ============================================================ -->

<task type="auto">
  <name>Task 1: Routing erweitern — App.tsx mode='docs' + URL-Hash-Sync</name>
  <files>apps/web/src/App.tsx</files>
  <action>
  Erweitere den Mode-Type in `App.tsx`:
  - `type AppMode = 'stage1' | 'stage3' | 'docs';`
  - Fuege einen dritten Tab-Button `data-testid="tab-docs"` zwischen Stage1 und Stage3 ein, Beschriftung "Dokumentation" mit Subtext "Algorithmus, Technik, Verifikation".
  - Fuege einen `<Show when={mode() === 'docs'}>` Block hinzu, der die in Task 2 erstellte `<DocsHub />` Komponente lazy-importiert. Verwende `import { lazy, Suspense } from 'solid-js'` und `const DocsHub = lazy(() => import('./docs/DocsHub'));`. Wickle den Use-Site in `<Suspense fallback={<p>Lade...</p>}>`.

  URL-Hash-Sync fuer ALLE drei Modi (per RESEARCH.md Risk #1: alle drei mitziehen):
  - Hash-Format:
    - `#/stage1` -> mode='stage1'
    - `#/stage3` -> mode='stage3' (und leerer Hash, also auch initial)
    - `#/docs` oder `#/docs/<route>` -> mode='docs'; `<route>` aus {`hub`, `algorithmus`, `technik`, `verifikation`, `glossar`, `bmg46`, `limitationen`} (default `hub` wenn leer).
  - Implementiere ein zweites Solid-Signal `docsRoute` (Type: union der 7 String-Literale) im App-Component-Scope. Default `'hub'`.
  - Beim Mount: `createEffect(() => { ... })` parst initial `window.location.hash` und setzt `mode()` + `docsRoute()` entsprechend. Dann `window.addEventListener('hashchange', ...)` fuer externe Hash-Aenderungen. Vergiss nicht den Listener bei `onCleanup` zu entfernen.
  - Beim Tab-Klick: schreibe den passenden Hash via `window.location.hash = '#/...'` (NICHT `history.pushState` — bleibe bei einfachem Hash, kein Router-Dep). Der hashchange-Listener triggert dann den Mode-Wechsel.
  - Uebergebe `docsRoute` und `setDocsRoute` als Props an `<DocsHub />` (Component-Signatur in Task 2 entsprechend).
  - Unbekannte Hashes (z.B. `#/foobar`) -> fallback auf default-mode `'stage3'`, kein Crash.

  Code-Kommentare englisch.
  </action>
  <verify>
  <automated>cd apps/web && pnpm typecheck && pnpm lint</automated>
  </verify>
  <done>
  - `AppMode` enthaelt `'docs'`
  - Dritter Tab `data-testid="tab-docs"` wird gerendert
  - `window.location.hash = '#/stage1'` schaltet Tab um (manuelle Browser-Verifikation in Task 21)
  - typecheck + lint gruen
  </done>
</task>

<task type="auto">
  <name>Task 2: DocsLayout + DocsHub mit 6 Tile-Karten</name>
  <files>apps/web/src/docs/DocsLayout.tsx, apps/web/src/docs/DocsHub.tsx</files>
  <action>
  Lege neuen Ordner `apps/web/src/docs/` an.

  `DocsLayout.tsx` (gemeinsames Layout, KEIN lazy — wird von allen Doku-Seiten genutzt):
  - Component nimmt Props `{ title: string; back?: () => void; children: JSX.Element }`.
  - Header: H1 mit `title`, "Zurueck zur Uebersicht"-Link wenn `back` gesetzt (ruft `back()`).
  - Footer: Build-/Commit-Info "Diese Doku gehoert zu Build <SHA> vom <Date>" — verwende die in Task 3 definierten globals `__GIT_SHA__` und `__BUILD_DATE__`. Tailwind: `text-xs text-slate-500 border-t pt-3 mt-8`.
  - Container: `class="space-y-6"`, `data-testid="docs-layout"`.

  `DocsHub.tsx` (default export, lazy-loaded aus App.tsx):
  - Component nimmt Props `{ docsRoute: () => DocsRoute; setDocsRoute: (r: DocsRoute) => void }`.
  - Wenn `docsRoute() === 'hub'`: rendere die Hub-Uebersicht mit 6 Tile-Karten in einem `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`. Jede Karte = klickbarer `<button>` mit Titel + 1-Zeilen-Beschreibung + `data-testid="docs-tile-<slug>"`. Click setzt `setDocsRoute(<slug>)` UND `window.location.hash = '#/docs/<slug>'`.
  - Karten:
    1. Algorithmus — "Wie wird gezogen? Schritt fuer Schritt"
    2. Technik — "Welche Bibliotheken, in welcher Version, mit welcher Lizenz"
    3. Verifikation — "Lauf nachrechnen mit der Python-Referenz"
    4. Glossar — "Begriffe nachschlagen"
    5. BMG §46 — "Welche Felder sind im Melderegister erlaubt"
    6. Limitationen — "Was dieses Tool bewusst nicht tut"
  - Wenn `docsRoute() !== 'hub'`: lade die passende Lazy-Subseite (siehe Task 4) und rendere `<DocsLayout title="..." back={() => { setDocsRoute('hub'); window.location.hash = '#/docs'; }}>{<Subseite />}</DocsLayout>`.
  - Beim Klick auf eine Tile-Karte zusaetzlich `window.scrollTo(0, 0)`.
  - Inhalte deutsch, Code-Kommentare englisch.
  </action>
  <verify>
  <automated>cd apps/web && pnpm typecheck && pnpm lint</automated>
  </verify>
  <done>
  - `DocsHub.tsx` rendert 6 Tile-Karten mit `data-testid="docs-tile-*"`
  - Klick auf Karte aendert `docsRoute()` und `window.location.hash`
  - Layout-Footer zeigt `__GIT_SHA__` + `__BUILD_DATE__`
  - typecheck + lint gruen
  </done>
</task>

<task type="auto">
  <name>Task 3: Build-Time Git-SHA + Build-Date Globals via vite.config.ts</name>
  <files>apps/web/vite.config.ts, apps/web/src/vite-env.d.ts</files>
  <action>
  In `apps/web/vite.config.ts`:
  - Importiere `execSync` aus `node:child_process`.
  - Berechne am Top-Level (vor `defineConfig(...)`) zwei Konstanten:
    - `const GIT_SHA = (() => { try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'unknown'; } })();`
    - `const BUILD_DATE = new Date().toISOString();`
  - Fuege `define: { __GIT_SHA__: JSON.stringify(GIT_SHA), __BUILD_DATE__: JSON.stringify(BUILD_DATE) }` zur Vite-Config hinzu (auf gleicher Ebene wie `plugins`, `resolve`, `build`).

  Erstelle `apps/web/src/vite-env.d.ts` (oder erweitere falls vorhanden) mit:
  - `/// <reference types="vite/client" />`
  - `declare const __GIT_SHA__: string;`
  - `declare const __BUILD_DATE__: string;`

  Dies stellt sicher, dass TypeScript die Globals kennt und die in Task 2 referenzierten Werte zur Build-Time eingefuegt werden. Das Try/Catch faengt den Fall ab, dass `git rev-parse` ausserhalb eines Git-Checkouts laeuft (Docker-Build ohne `.git`).
  </action>
  <verify>
  <automated>cd apps/web && pnpm typecheck && pnpm build && grep -qE '"[a-f0-9]{7,}"' dist/assets/*.js</automated>
  </verify>
  <done>
  - `vite.config.ts` definiert `__GIT_SHA__` und `__BUILD_DATE__`
  - Build embeds die Werte ins JS-Bundle
  - typecheck gruen (Globals deklariert)
  </done>
</task>

<task type="auto">
  <name>Task 4: Stub-Lazy-Seiten fuer Algorithmus, Technik, Verifikation, Glossar, BMG46, Limitationen</name>
  <files>apps/web/src/docs/Algorithmus.tsx, apps/web/src/docs/Technik.tsx, apps/web/src/docs/Verifikation.tsx, apps/web/src/docs/Glossar.tsx, apps/web/src/docs/Bmg46.tsx, apps/web/src/docs/Limitationen.tsx</files>
  <action>
  Erstelle fuer jede der 6 Doku-Seiten eine Stub-Komponente mit default-export:
  - Inhalt zunaechst nur ein Absatz "In Arbeit — Inhalt folgt in Task <N>." mit `data-testid="docs-page-<slug>"`.
  - Slugs: `algorithmus`, `technik`, `verifikation`, `glossar`, `bmg46`, `limitationen`.

  In `DocsHub.tsx` (Task 2) lade jede dieser Seiten lazy:
  - `const Algorithmus = lazy(() => import('./Algorithmus'));` etc.
  - Im Switch je nach `docsRoute()`: rendere die passende Komponente innerhalb `<Suspense fallback={<p>Lade...</p>}>`.

  Zweck: das Skelett ist commit-ready (Routing + alle 6 Tabs erreichbar), die inhaltlichen Tasks 5-19 fuellen die Stubs auf.

  Lazy-Liste (alle Doku-Seiten sind explizit lazy, das Stage1/Stage3-Bundle bleibt klein):
  - DocsHub selbst (lazy von App.tsx)
  - Algorithmus, Technik, Verifikation, Glossar, Bmg46, Limitationen (jeweils lazy aus DocsHub)
  - DocsLayout, Term, HamiltonSvg sind NICHT lazy — sie werden in Doku-Bundles eingebunden und teilen sich dort den Code-Split.
  </action>
  <verify>
  <automated>cd apps/web && pnpm typecheck && pnpm lint && pnpm build</automated>
  </verify>
  <done>
  - 6 Stub-Komponenten existieren mit `data-testid="docs-page-<slug>"`
  - Lazy-imports in DocsHub.tsx
  - Build erzeugt separate Chunks fuer jede Doku-Seite (Vite-Default fuer dynamic imports)
  - typecheck + lint gruen
  </done>
</task>

<!-- ============================================================ -->
<!-- COMMIT 2: Algorithmus-Seite + Hamilton-SVG-Walkthrough         -->
<!-- ============================================================ -->

<task type="auto" tdd="true">
  <name>Task 5: HamiltonSvg.tsx — Toy-Beispiel-Visualisierung 100->10, 6 Strata</name>
  <files>apps/web/src/docs/HamiltonSvg.tsx, apps/web/tests/unit/hamilton-svg.test.ts</files>
  <action>
  Erstelle `HamiltonSvg.tsx`:
  - Toy-Beispiel: Pool=100 Personen, Target N=10, 3 Bezirke x 2 Geschlechter = 6 Strata.
  - Beispiel-Daten (hardcoded im Component oder als exportierte Konstante `TOY_STRATA`):
    - Bezirk A / w: Pool 18 -> Soll 1.8 -> Floor 1, Remainder 0.8
    - Bezirk A / m: Pool 12 -> Soll 1.2 -> Floor 1, Remainder 0.2
    - Bezirk B / w: Pool 22 -> Soll 2.2 -> Floor 2, Remainder 0.2
    - Bezirk B / m: Pool 13 -> Soll 1.3 -> Floor 1, Remainder 0.3
    - Bezirk C / w: Pool 20 -> Soll 2.0 -> Floor 2, Remainder 0.0
    - Bezirk C / m: Pool 15 -> Soll 1.5 -> Floor 1, Remainder 0.5
    - Floor-Summe = 8 -> 2 Remainder-Bonusse zu vergeben -> groesste Remainder gehen an A/w (0.8) und C/m (0.5) -> Final-Allokation: A/w=2, A/m=1, B/w=2, B/m=1, C/w=2, C/m=2 = 10.
  - Reine Berechnungs-Funktion `computeHamiltonAllocation(strata, targetN, totalPool)` -> Array von `{ key, pool, quote, floor, remainder, remainderRank, bonus, final }` — exportieren fuer den Vitest in der gleichen Task. Tie-Break bei gleichem Remainder: alphabetisch nach `key` (deterministisch, dokumentieren in JSDoc).
  - SVG-Layout (Vorlage: `apps/web/src/stage1/AxisBreakdown.tsx` — gleicher Stil):
    - Horizontaler Stack mit 6 Boxen (eine pro Stratum), jede Box ~140px x 130px.
    - Pro Box 5 Zeilen: Bezeichnung (z.B. "A / w"), "Pool: 18", "Soll: 0.18*10 = 1.8", "Floor 1 + Bonus 1", "Final: 2".
    - Boxen mit Bonus visuell markiert (z.B. amber Border).
    - SVG-`viewBox="0 0 880 160"`, deutsche Beschriftungen, `data-testid="hamilton-svg"`.
  - Component nimmt KEINE Props (Toy-Beispiel ist hartkodiert fuer didaktische Klarheit).

  Vitest `hamilton-svg.test.ts`:
  - RED: Schreibe Tests fuer `computeHamiltonAllocation` mit den oben aufgefuehrten Toy-Daten:
    - Test "Quoten korrekt": `quote` fuer A/w === 1.8, B/w === 2.2 etc.
    - Test "Floors korrekt": Summe der `floor` === 8.
    - Test "Remainder-Ranking korrekt": A/w hat `remainderRank` === 1 (hoechster), C/m hat `remainderRank` === 2.
    - Test "Bonus-Verteilung": A/w und C/m haben `bonus` === 1, alle anderen `bonus` === 0.
    - Test "Final-Summe": Summe der `final` === 10.
    - Test "Final-Werte": A/w=2, A/m=1, B/w=2, B/m=1, C/w=2, C/m=2.
  - GREEN: Implementiere `computeHamiltonAllocation` so dass alle Tests gruen sind.
  - REFACTOR: Cleanup, JSDoc auf englisch.
  </action>
  <verify>
  <automated>cd apps/web && pnpm test -- hamilton-svg</automated>
  </verify>
  <done>
  - `HamiltonSvg.tsx` exportiert default-Component + `computeHamiltonAllocation` + `TOY_STRATA`
  - Vitest gruen, alle 6 Test-Cases pass
  - SVG rendert mit `data-testid="hamilton-svg"`
  </done>
</task>

<task type="auto">
  <name>Task 6: Algorithmus.tsx — Vollstaendige Algorithmus-Seite</name>
  <files>apps/web/src/docs/Algorithmus.tsx</files>
  <action>
  Ersetze den Stub aus Task 4 mit der Vollseite:
  - Einleitungs-Absatz (deutsch, Plain-Language, max. 4 Saetze): Was ist stratifizierte Zufallsauswahl, warum Hamilton, warum Fisher-Yates.
  - Sektion "Toy-Beispiel: 100 Personen, 10 ziehen": Einbinden der `<HamiltonSvg />` aus Task 5 mit Begleittext, der die Mini-Tabelle in jeder Box erklaert (Pool -> Quote -> Floor -> Remainder -> Bonus -> Final).
  - Sektion "Realistisches Beispiel": Beschreibung "6.000 Personen -> 300 ziehen" mit "selbst ausprobieren"-Link. Da Algorithmus.tsx lazy-loaded ist und keinen direkten Zugriff auf den App-Store hat, verwende `<a href="#/stage1">selbst ausprobieren</a>` (das setzt den Hash, App.tsx Tab-Switch in Task 1 reagiert).
  - Sektion "5-Schritt-Erklaerung" als kollabierbares `<details>`-Element:
    1. **Bucketize** — Personen nach Stratum-Schluessel gruppieren
    2. **Hamilton-Apportionment** — Floor-Quoten + Remainder-Bonus-Verteilung (Verweis auf Toy-Beispiel oben)
    3. **Lex-Order** — Strata werden alphabetisch nach Schluessel sortiert (deterministisch, seed-unabhaengig)
    4. **Fisher-Yates-Shuffle** — pro Stratum n Personen aus dem Pool gezogen, deterministisch via Mulberry32(seed)
    5. **Output** — Versand-Liste + Audit-JSON mit Signatur
  - Inhalt-Quelle: `docs/stage1-algorithm.md` (gekuerzte Plain-Language-Umarbeitung). Englisch im Original, deutsch in der UI.
  - Externe Verlinkungen am Ende:
    - Cochran *Sampling Techniques* 3rd ed., Kapitel 5 (Buchverweis, kein Link)
    - Hamilton/Largest-Remainder: https://en.wikipedia.org/wiki/Largest_remainders_method
    - Sortition Foundation Methodik: https://www.sortitionfoundation.org/how
    - Flanigan et al. 2021 Nature: https://www.nature.com/articles/s41586-021-03788-6
    - Fisher-Yates: Knuth TAOCP Vol. 2 §3.4.2 (Buchverweis)
    - Mulberry32: https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32
  - `data-testid="docs-page-algorithmus"` (vom Stub uebernommen).
  - Verwendung von `<Term slug="...">` fuer 3-5 Schluesselbegriffe (Stratum, Hamilton-Methode, Mulberry32, Fisher-Yates) — wird in Task 16 nachgezogen, hier zunaechst als Plain-Text mit TODO-Kommentar `{/* TODO Task 16: replace with Term slug */}`.
  </action>
  <verify>
  <automated>cd apps/web && pnpm typecheck && pnpm lint && pnpm build</automated>
  </verify>
  <done>
  - Algorithmus.tsx zeigt alle 4 Sektionen (Einleitung, Toy, Realistisch, 5-Schritt)
  - HamiltonSvg ist eingebunden
  - Mind. 6 externe Links/Quellenverweise
  - typecheck + lint + build gruen
  </done>
</task>

<task type="auto">
  <name>Task 7: Vitest fuer HamiltonSvg-Datenstruktur (Bestaetigung)</name>
  <files>apps/web/tests/unit/hamilton-svg.test.ts</files>
  <action>
  Bereits in Task 5 (TDD) erledigt. Diese Task verifiziert, dass der Test in der Test-Suite laeuft und auch ohne Task 6 standalone gruen ist. Falls noetig: Co-Locate-Test mit Stage1-Tests (gleicher Vitest-Pfad `apps/web/tests/unit/`).
  </action>
  <verify>
  <automated>cd apps/web && pnpm test -- hamilton-svg</automated>
  </verify>
  <done>
  - Test gruen
  - Bereits erledigt in Task 5 — diese Task nur als Bestaetigung
  </done>
</task>

<!-- ============================================================ -->
<!-- COMMIT 3: Tech-Manifest + CI-Drift-Detection + Technik-Seite   -->
<!-- ============================================================ -->

<task type="auto" tdd="true">
  <name>Task 8: build-tech-manifest.ts — Generator + Vitest</name>
  <files>scripts/build-tech-manifest.ts, apps/web/tests/unit/tech-manifest-generator.test.ts</files>
  <action>
  Erstelle `scripts/build-tech-manifest.ts` (executable mit `tsx`):
  - Liest `package.json` (root), `apps/web/package.json`, `packages/core/package.json`, `packages/engine-a/package.json`, `packages/engine-contract/package.json`.
  - Liest `pnpm-lock.yaml` fuer transitive Versions-Pinning (nur direkte Dependencies werden ins Manifest gehoben — transitive nicht).
  - Liest pro direkter Dependency die `license`-Angabe aus `node_modules/<pkg>/package.json`.
  - Generiert TypeScript-Output mit dem Schema:
    - `interface TechEntry { name: string; version: string; license: string; kind: 'runtime' | 'build' | 'test'; purpose: string; sourceUrl?: string }`
    - `export const TECH_MANIFEST: TechEntry[] = [...];`
  - Schreibt nach `apps/web/src/generated/tech-manifest.ts`.
  - File-Header-Kommentar: "AUTO-GENERATED by scripts/build-tech-manifest.ts. Do not edit by hand. Regenerate via `pnpm tech-manifest`."
  - Sonderfall-Eintraege die KEIN node_modules-Lookup brauchen, manuell ergaenzen:
    - Web Crypto API — version 'browser-standard', license 'W3C Recommendation', kind 'runtime', purpose 'Ed25519/ECDSA-Signatur des Audit-JSON', sourceUrl 'https://www.w3.org/TR/WebCryptoAPI/'
    - Mulberry32 PRNG — version 'own-implementation (packages/core)', license 'Public Domain', kind 'runtime', purpose 'Deterministische Pseudo-Zufallszahlen fuer Fisher-Yates', sourceUrl 'https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32'
    - Hamilton Apportionment — version 'own-implementation (packages/core)', license 'GPL-3.0-or-later (this repo)', kind 'runtime', purpose 'Stratifizierte Quoten-Allokation (Largest-Remainder-Methode)'
  - `purpose`-Strings fuer direkte Deps muessen manuell in einer Map `PURPOSE_MAP: Record<string, string>` gepflegt werden (5-10 Eintraege: solid-js, vite, tailwindcss, papaparse, @kobalte/core, highs, vitest, playwright, eslint, prettier).

  Vitest `tech-manifest-generator.test.ts`:
  - RED: Test "Generator produziert TypeScript-File mit gueltigem TECH_MANIFEST-Export":
    - Importiere die Generator-Funktion (refaktoriere den Generator so, dass die Logik als Function `buildManifest(rootDir: string): TechEntry[]` exportiert wird, nicht nur als Script).
    - Rufe sie mit dem Repo-Root auf.
    - Assert: Array enthaelt mind. 5 Eintraege.
    - Assert: jeder Eintrag hat `name`, `version`, `license`, `kind`, `purpose`.
    - Assert: `solid-js`, `vite`, `papaparse`, `Web Crypto API`, `Mulberry32 PRNG` sind enthalten.
    - Assert: Lizenz fuer `solid-js` enthaelt "MIT" (oder ist nicht leer).
  - GREEN: Implementiere bis Tests gruen.
  - REFACTOR: Cleanup.

  Code-Kommentare englisch.
  </action>
  <verify>
  <automated>cd apps/web && pnpm test -- tech-manifest-generator</automated>
  </verify>
  <done>
  - `scripts/build-tech-manifest.ts` ausfuehrbar via `tsx`
  - Exportierte Function `buildManifest(rootDir): TechEntry[]`
  - Vitest gruen
  </done>
</task>

<task type="auto">
  <name>Task 9: tech-manifest.ts — eingecheckte generierte Datei + npm-script</name>
  <files>apps/web/src/generated/tech-manifest.ts, package.json</files>
  <action>
  Lege Ordner `apps/web/src/generated/` an. Lege `.gitkeep` NICHT an — die generierte Datei selbst wird eingecheckt (per RESEARCH.md Risk #2 Empfehlung).

  Stelle sicher, dass das Task-8-Script standalone (`tsx scripts/build-tech-manifest.ts`) den Output nach `apps/web/src/generated/tech-manifest.ts` schreibt (also der Generator hat einen `main()`-Modus zusaetzlich zum exportierten `buildManifest`).

  In Repo-Root `package.json` neuer Script-Eintrag:
  - `"tech-manifest": "tsx scripts/build-tech-manifest.ts"`
  - `"prebuild": "pnpm tech-manifest && git diff --exit-code apps/web/src/generated/tech-manifest.ts || (echo '[ERROR] tech-manifest.ts is out of date. Run: pnpm tech-manifest && commit.' && exit 1)"`

  Wichtig: der `prebuild`-Hook ist die CI-Drift-Detection (per RESEARCH.md Risk #2). Wenn jemand eine Dependency aendert ohne `pnpm tech-manifest` zu laufen, schlaegt CI-Build fehl mit klarer Fehlermeldung.

  Lokal (auf der aktuellen Branch) einmal `pnpm tech-manifest` laufen lassen, damit `apps/web/src/generated/tech-manifest.ts` mit aktuellem Inhalt eingecheckt wird.

  Hinweis: Wenn lokales `pnpm install` vorher mit `--frozen-lockfile` lief, sind alle Versionen deterministisch — der Lauf produziert eine reproduzierbare Datei.
  </action>
  <verify>
  <automated>pnpm tech-manifest && test -f apps/web/src/generated/tech-manifest.ts && grep -q 'TECH_MANIFEST' apps/web/src/generated/tech-manifest.ts && pnpm prebuild</automated>
  </verify>
  <done>
  - `apps/web/src/generated/tech-manifest.ts` existiert + ist eingecheckt + ist syntaktisch valides TypeScript
  - `pnpm tech-manifest` regeneriert idempotent
  - `pnpm prebuild` ist gruen (kein Drift)
  </done>
</task>

<task type="auto">
  <name>Task 10: Technik.tsx — Vollstaendige Tech-Stack-Seite</name>
  <files>apps/web/src/docs/Technik.tsx</files>
  <action>
  Ersetze den Stub aus Task 4:
  - Importiere `TECH_MANIFEST` aus `'../generated/tech-manifest'`.
  - Sektion "Bibliotheken (direkte Dependencies)": Tabelle mit Spalten Name, Version, Lizenz, Kind, Zweck, Quelle. Filter: nur Eintraege mit `kind === 'runtime' || kind === 'build'`.
  - Sektion "Test- und Dev-Tools": Tabelle fuer `kind === 'test'`.
  - Sektion "Algorithmen (own-implementation)": filtere die manuell hinzugefuegten Sondereintraege (Hamilton, Fisher-Yates, Mulberry32, Web Crypto). Diese werden als 4 Karten mit erweiterter Erklaerung dargestellt:
    - **Hamilton-Apportionment** — Quelle, "warum hier": deterministische Quoten-Allokation fuer stratifizierte Auswahl.
    - **Fisher-Yates-Shuffle** — Knuth-Verweis, "warum hier": uniformer Shuffle in O(n) ohne Bias.
    - **Mulberry32 PRNG** — Quelle, "warum hier": Mulberry32 ist KEIN crypto-grade RNG (Verweis auf Limitationen-Seite Task 19); mit Mitigation "Seed muss oeffentlich-vor-Lauf vereinbart werden".
    - **Ed25519/ECDSA-Signatur via Web Crypto API** — "warum hier": Audit-Protokoll-Integritaet ohne Custom-Krypto.
  - Sektion "Build-Reproduzierbarkeit":
    - "Diese Doku gehoert zu Build `<__GIT_SHA__>` vom `<__BUILD_DATE__>`."
    - "Build-Reproduktion: Repo auf SHA `<__GIT_SHA__>` auschecken, `pnpm install --frozen-lockfile`, `pnpm build`. Alle Versionen sind in `pnpm-lock.yaml` festgenagelt."
    - Lockfile-Hash NICHT zur Runtime berechnen (kein Filesystem-Access im Browser); stattdessen verweisen auf den GIT_SHA als hinreichend deterministische Coordinate.
  - `data-testid="docs-page-technik"`.
  - Verwende `<Term>` fuer Schluesselbegriffe — TODO-Kommentar wie in Task 6.
  </action>
  <verify>
  <automated>cd apps/web && pnpm typecheck && pnpm lint && pnpm build</automated>
  </verify>
  <done>
  - Tabelle zeigt mind. 5 Library-Eintraege mit Version + Lizenz
  - 4 Algorithmen-Karten (Hamilton, Fisher-Yates, Mulberry32, Web Crypto)
  - Build-Reproduzierbarkeits-Sektion zeigt SHA + Date
  - typecheck + lint + build gruen
  </done>
</task>

<task type="auto">
  <name>Task 11: CI-Drift-Detection (in Task 9 enthalten) — Erweiterung apps/web</name>
  <files>apps/web/package.json</files>
  <action>
  Bereits in Task 9 erledigt fuer Repo-Root. Diese Task ergaenzt apps/web fuer den Fall, dass jemand `pnpm --filter @sortition/web build` direkt aufruft (umgeht Repo-Root-prebuild):
  - Fuege in `apps/web/package.json` Scripts den Eintrag hinzu: `"prebuild": "cd ../.. && pnpm prebuild"`

  Damit greift der Drift-Check auch beim direkten Workspace-Build.
  </action>
  <verify>
  <automated>pnpm build && pnpm --filter @sortition/web build</automated>
  </verify>
  <done>
  - `pnpm build` von Repo-Root: gruen
  - `pnpm --filter @sortition/web build`: gruen (triggert prebuild via cd)
  - Manuelle Verifikation der Drift-Erkennung: Bei lokalem Test eine fake-Aenderung in `apps/web/src/generated/tech-manifest.ts` machen -> `pnpm prebuild` schlaegt fehl. Aenderung wieder rueckgaengig.
  </done>
</task>

<!-- ============================================================ -->
<!-- COMMIT 4: Verifikations-Seite                                  -->
<!-- ============================================================ -->

<task type="auto">
  <name>Task 12: Verifikation.tsx — 3-Schritt-Reproduktions-Anleitung</name>
  <files>apps/web/src/docs/Verifikation.tsx</files>
  <action>
  Ersetze den Stub aus Task 4 mit der Vollseite:
  - Einleitungs-Absatz (deutsch): "Jeder Lauf produziert ein signiertes Audit-JSON. Mit der nativen Python-Referenz laesst sich der Lauf byte-exakt nachrechnen."
  - Sektion "3-Schritt-Anleitung":
    1. **Audit-JSON herunterladen** — Beschreibung wo (Stage1-Ergebnis-Sektion -> "Audit-JSON herunterladen"-Button).
    2. **Eingangs-CSV bereithalten** — die urspruengliche Melderegister-CSV, die im Stage1-Lauf hochgeladen wurde. Hinweis: das Audit-JSON enthaelt `input_csv_sha256`; die CSV muss diesem Hash entsprechen.
    3. **Python-Referenz laufen lassen** — Code-Block, copy-paste-bereit. Inhalt: Aufruf `python3 scripts/stage1_reference.py` mit den Parametern `--input <pfad-zur-csv>`, `--axes "<axes-aus-audit>"`, `--target-n <N-aus-audit>`, `--seed <seed-aus-audit>`, `--output-json reproduced.json`. Plus zweiter Block mit `jq -r '.selected_indices[]'` Vergleich (sortieren beide JSONs, dann `diff` und Echo "BYTE-IDENTISCH" / "ABWEICHUNG").
  - Sektion "Was kann ich noch pruefen?":
    - **Signatur pruefen** mit `openssl` oder Python — verweise auf `scripts/verify_audit.py` im Repo (existiert).
    - **Cross-Validation** — verweise auf `scripts/stage1_cross_validate.sh`.
  - Sektion "Quellen": Links auf
    - `scripts/stage1_reference.py` — Plain-Text-Pfad (kein externes Repo-Hosting bekannt; sobald GitHub-URL festgelegt ist via Setting in einer Konstante, kann der Link aktiviert werden)
    - `scripts/stage1_cross_validate.sh`
    - `scripts/verify_audit.py`
  - Code-Snippets in `<pre>`-Bloecken mit Tailwind `bg-slate-100 p-3 rounded text-xs font-mono overflow-x-auto`. Jeder Code-Block hat einen "Kopieren"-Button mit `data-testid="copy-snippet-<n>"` der `navigator.clipboard.writeText(...)` ruft.
  - `data-testid="docs-page-verifikation"`.
  </action>
  <verify>
  <automated>cd apps/web && pnpm typecheck && pnpm lint && pnpm build</automated>
  </verify>
  <done>
  - 3-Schritt-Sektion vollstaendig
  - Mind. 2 copy-paste-bereite Code-Bloecke mit Kopier-Button
  - "Was kann ich noch pruefen?"-Sektion + Quellenverweise
  - typecheck + lint + build gruen
  </done>
</task>

<!-- ============================================================ -->
<!-- COMMIT 5: Glossar (JSON + Term-Component + Vollseite)          -->
<!-- ============================================================ -->

<task type="auto">
  <name>Task 13: glossar.json — 15-25 Eintraege</name>
  <files>apps/web/src/docs/glossar.json</files>
  <action>
  Erstelle JSON-Datei mit Schema (siehe `<interfaces>`).

  Mindestens 15 Eintraege zu folgenden Begriffen (deutsche UI-Strings, kurze Plain-Language-Definitionen):
  1. `stratum` — Bevoelkerungsgruppe (Stratum)
  2. `soll` — Soll (n_h_target)
  3. `ist` — Ist (n_h_actual)
  4. `pool` — Pool
  5. `hamilton` — Hamilton-Methode (Largest-Remainder)
  6. `fisher-yates` — Fisher-Yates-Shuffle
  7. `mulberry32` — Mulberry32 (PRNG)
  8. `seed` — Seed
  9. `audit-json` — Audit-JSON
  10. `signatur` — Ed25519/ECDSA-Signatur
  11. `unterbesetzt` — Unterbesetzt (Underfill)
  12. `quote` — Quote (Soll-Bruch)
  13. `floor` — Floor (Ganzzahl-Anteil)
  14. `remainder` — Remainder (Bruch-Anteil)
  15. `coverage` — Gruppen-Abdeckung (Coverage)
  16. `bmg46` — § 46 BMG (Bundesmeldegesetz)
  17. `versand-liste` — Versand-Liste (Stage 1 Output)
  18. `melderegister` — Melderegister
  19. `axes` — Achsen / Stratifikations-Merkmale
  20. `byte-identisch` — Byte-identisch (Reproduktion)

  Jeder Eintrag hat MUST `slug`, `term`, `kurz`. `lang_md`, `external_link` und `see_also` optional. Beispiel-Eintrag fuer `stratum`: kurz-Definition wie "Eine Untergruppe der Bevoelkerung, definiert durch eine Kombination von Merkmalen (z.B. Bezirk A / weiblich / 30-49). Stratifizierte Auswahl zieht aus jeder Gruppe proportional.", see_also `["soll", "ist"]`.
  </action>
  <verify>
  <automated>cd apps/web && node -e "const g = require('./src/docs/glossar.json'); if (g.length < 15) throw new Error('need >=15 entries'); g.forEach(e => { if (!e.slug || !e.term || !e.kurz) throw new Error('missing required field in ' + e.slug); }); console.log('OK', g.length);"</automated>
  </verify>
  <done>
  - JSON valide
  - Mindestens 15 Eintraege
  - Jeder hat `slug`, `term`, `kurz`
  </done>
</task>

<task type="auto">
  <name>Task 14: Term.tsx — Inline-Tooltip-Komponente</name>
  <files>apps/web/src/docs/Term.tsx, apps/web/tests/unit/term.test.tsx, apps/web/package.json</files>
  <action>
  Erstelle `Term.tsx`:
  - Component-Signatur: nimmt Props `{ slug: string; children: JSX.Element }` (children = sichtbarer Text).
  - Importiere `glossar.json` (typisiert als `GlossarEntry[]`).
  - Sucht den Eintrag per `slug`. Wenn nicht gefunden: rendert nur die children + `console.warn` (im DEV via `import.meta.env.DEV`).
  - Wenn gefunden:
    - Rendert `<span>` mit children, gestyltet als underlined-dotted (Tailwind: `border-b border-dotted border-slate-500 cursor-help`).
    - Auf Hover/Focus: zeigt `<div role="tooltip">` mit `entry.kurz` + Link "-> im Glossar nachschlagen" der den Hash auf `#/docs/glossar/<slug>` setzt.
    - Tooltip-Implementierung: Solid-Signal `show`, gesetzt durch `onMouseEnter` / `onFocus` (true), `onMouseLeave` / `onBlur` (false). Touch: `onClick` toggelt show.
    - Tooltip absolut positioniert (`absolute z-10 bg-slate-900 text-white text-xs p-2 rounded shadow max-w-xs mt-1`), parent `<span>` hat `position: relative`.
    - `data-testid="term-<slug>"` auf Wrapper, `data-testid="term-tooltip-<slug>"` auf Tooltip.

  Falls `@solidjs/testing-library` noch nicht installiert ist, fuege es als devDependency hinzu (`pnpm add -D @solidjs/testing-library` im apps/web-Workspace) — Hinweis: das vergroessert nur die Test-Dependency, nicht das Produktions-Bundle.

  Vitest `term.test.tsx`:
  - Test "rendert children unveraendert"
  - Test "Eintrag aus glossar.json wird gefunden fuer slug='stratum'"
  - Test "Warnung wenn slug='nonexistent-slug'" (mit `vi.spyOn(console, 'warn')`)
  - Test "Tooltip-Inhalt enthaelt die Kurz-Definition aus glossar.json" (nach Hover-Trigger via `fireEvent.mouseEnter`)
  </action>
  <verify>
  <automated>cd apps/web && pnpm test -- term</automated>
  </verify>
  <done>
  - `Term.tsx` exportiert default-Component
  - Vitest gruen (4 Test-Cases)
  - `console.warn` bei unbekanntem slug (DEV)
  </done>
</task>

<task type="auto">
  <name>Task 15: Glossar.tsx — Vollseite alphabetisch</name>
  <files>apps/web/src/docs/Glossar.tsx</files>
  <action>
  Ersetze den Stub aus Task 4:
  - Importiere `glossar.json`.
  - Sortiere Eintraege alphabetisch nach `term` (Locale 'de-DE').
  - Rendere als Definitionsliste (`<dl>`):
    - `<dt id="<slug>">{term}</dt>`
    - `<dd>{kurz}<br/>Siehe auch: ...; Externer Link: ...</dd>` (See-Also-Links setzen Hash auf den jeweils anderen Slug).
  - Bei Mount: pruefe `window.location.hash` auf `#/docs/glossar/<slug>` und scrolle zum entsprechenden `id` (`document.getElementById(slug)?.scrollIntoView({behavior: 'smooth'})`). Verwende `onMount` aus `solid-js`.
  - Filterfeld oben (`<input type="search" placeholder="Filter...">`) — filtert die Liste reaktiv per Solid-Signal auf `term` ODER `kurz` (case-insensitive substring).
  - `data-testid="docs-page-glossar"`. Pro Eintrag `data-testid="glossar-entry-<slug>"`.
  </action>
  <verify>
  <automated>cd apps/web && pnpm typecheck && pnpm lint && pnpm build</automated>
  </verify>
  <done>
  - Alle Glossar-Eintraege gerendert, alphabetisch
  - Filterfeld reduziert die Anzeige reaktiv
  - Hash-Scroll funktioniert (manuelle Verifikation in Task 21)
  - typecheck + lint + build gruen
  </done>
</task>

<task type="auto">
  <name>Task 16: Term-Verwendung in Algorithmus-, Technik-, Verifikations-Seiten</name>
  <files>apps/web/src/docs/Algorithmus.tsx, apps/web/src/docs/Technik.tsx, apps/web/src/docs/Verifikation.tsx</files>
  <action>
  Suche in jeder der 3 Seiten nach den TODO-Kommentaren aus Task 6/10/12 und ersetze die markierten Plain-Text-Begriffe durch `<Term slug="...">Begriff</Term>`-Aufrufe.

  Mindest-Verwendungen:
  - Algorithmus.tsx: `stratum`, `hamilton`, `floor`, `remainder`, `fisher-yates`, `mulberry32`, `seed` — mind. 5 Begriffe.
  - Technik.tsx: `mulberry32`, `fisher-yates`, `signatur`, `audit-json` — mind. 3 Begriffe.
  - Verifikation.tsx: `audit-json`, `seed`, `byte-identisch` — mind. 3 Begriffe.

  Importiere `Term` per `import Term from './Term';` in jeder der 3 Dateien.

  Code-Kommentare englisch, UI-Inhalt deutsch.
  </action>
  <verify>
  <automated>cd apps/web && pnpm typecheck && pnpm lint</automated>
  </verify>
  <done>
  - Mind. 5 `<Term>`-Aufrufe in Algorithmus.tsx
  - Mind. 3 `<Term>`-Aufrufe in Technik.tsx
  - Mind. 3 `<Term>`-Aufrufe in Verifikation.tsx
  - typecheck + lint gruen
  </done>
</task>

<!-- ============================================================ -->
<!-- COMMIT 6: TrustStrip + BMG46 + Limitationen                    -->
<!-- ============================================================ -->

<task type="auto">
  <name>Task 17: TrustStrip.tsx + Einbindung in Stage1Panel</name>
  <files>apps/web/src/stage1/TrustStrip.tsx, apps/web/src/stage1/Stage1Panel.tsx</files>
  <action>
  Erstelle `apps/web/src/stage1/TrustStrip.tsx`:
  - Component (default-export) rendert 3-Karten-Block in `grid grid-cols-1 md:grid-cols-3 gap-3`. Container `data-testid="stage1-trust-strip"`.
  - Karte 1: Titel "Algorithmus seit 1792", Sub "Hamilton-Methode (Largest-Remainder)". Klick setzt `window.location.hash = '#/docs/algorithmus'`. `data-testid="trust-card-algorithmus"`.
  - Karte 2: Titel "Cross-validiert", Sub "21/21 byte-identisch mit Python-Referenz" (Quelle Hardcode aus `docs/stage1-validation-report.md`, Kommentar im Code: `// Stand: <build-date>; siehe RESEARCH.md Risk #7. TODO: aus stats.json lesen sobald CI-Lauf das produziert.`). Klick setzt Hash auf `#/docs/verifikation`. `data-testid="trust-card-verifikation"`.
  - Karte 3: Titel "Signiertes Audit-Protokoll", Sub "Vollstaendig nachpruefbar (Ed25519/ECDSA)". Klick setzt Hash auf `#/docs/verifikation`. `data-testid="trust-card-audit"`.
  - Visuelle Differenzierung von der Werkbank (per ISSUE.md): leichter blauer Tint (`bg-sky-50 border-sky-200`), Hover-Effekt `hover:bg-sky-100`. Karten als `<button>` mit `text-left`.
  - Nur sichtbar nach Datei-Upload — der Slot ist im Stage1Panel direkt nach dem Schritt-Header und vor dem Datei-Upload-Block (also auch ohne CSV sichtbar — Trust-Signale sollen den Operator vor dem Upload abholen).

  In `apps/web/src/stage1/Stage1Panel.tsx`:
  - Importiere `TrustStrip` und rendere es direkt nach dem Block `data-testid="stage1-step-header"`, vor dem ersten `<section>` mit "1. Melderegister-CSV hochladen".

  Print-CSS (Task 20): TrustStrip soll im Druck weg — wird via `display: none` auf `[data-testid="stage1-trust-strip"]` in der print-CSS-Erweiterung erledigt.
  </action>
  <verify>
  <automated>cd apps/web && pnpm typecheck && pnpm lint && pnpm build</automated>
  </verify>
  <done>
  - TrustStrip mit 3 Karten existiert
  - In Stage1Panel direkt unter dem Schritt-Header eingebunden
  - Klick auf Karte aendert `window.location.hash`
  - typecheck + lint + build gruen
  </done>
</task>

<task type="auto">
  <name>Task 18: Bmg46.tsx + Verlinkung aus Stage1-BMG-Hint</name>
  <files>apps/web/src/docs/Bmg46.tsx, apps/web/src/stage1/Stage1Panel.tsx</files>
  <action>
  Ersetze den Stub aus Task 4 in `Bmg46.tsx`:
  - H2 "Warum kann ich nicht nach Bildung stratifizieren?"
  - Plain-Language-Erklaerung (3-4 Saetze): § 46 BMG regelt, welche Felder Kommunen aus dem Melderegister fuer Sortition-Verfahren herausgeben duerfen. Es ist eine abschliessende Liste — Bildung, Migrationshintergrund, Beruf sind nicht enthalten und kommen erst in der Selbstauskunft (Stage 2) hinzu.
  - Sektion "Zulaessige Felder" als Liste:
    - Familienname, Vornamen, Doktorgrad
    - Tag und Ort der Geburt
    - Geschlecht
    - Anschrift (Strasse, Hausnummer, PLZ, Wohnort)
    - Tag des Einzugs in die Wohnung
    - (vollstaendige Liste laut § 46 Abs. 1 BMG; Quelle: research/03-legal-framework-and-best-practices.md:200-280)
  - Sektion "Was nicht im Melderegister steht — und warum das wichtig ist" mit Verweis auf Stage 2 (Selbstauskunft) fuer Bildung, Migration, Beruf, Einkommen.
  - Externer Link: https://www.gesetze-im-internet.de/bmg/__46.html
  - `data-testid="docs-page-bmg46"`.

  In `apps/web/src/stage1/Stage1Panel.tsx`:
  - Im bestehenden BMG-Hint-Block (`data-testid="stage1-bmg-hint"`) zusaetzlich zum existierenden externen Link einen internen Link einbauen: `<a href="#/docs/bmg46" class="underline">Mehr im Glossar zu § 46 BMG</a>` direkt nach dem externen Link, getrennt durch ` | `.
  </action>
  <verify>
  <automated>cd apps/web && pnpm typecheck && pnpm lint && pnpm build</automated>
  </verify>
  <done>
  - Bmg46.tsx zeigt Erklaerung + Liste zulaessiger Felder + externen Link
  - Stage1Panel BMG-Hint enthaelt zusaetzlichen internen Link auf `#/docs/bmg46`
  - typecheck + lint + build gruen
  </done>
</task>

<task type="auto">
  <name>Task 19: Limitationen.tsx — ehrlich, aber nicht alarmierend</name>
  <files>apps/web/src/docs/Limitationen.tsx</files>
  <action>
  Ersetze den Stub aus Task 4:
  - H2 "Was dieses Tool bewusst nicht tut"
  - Einleitungs-Absatz (2 Saetze): Ehrlichkeit ueber den Funktionsumfang ist Teil des Vertrauens-Pakets. Im Folgenden: was Stage 1 absichtlich aussen vor laesst, mit Begruendung.
  - Sektion "Kein IPF (Iterative Proportional Fitting)":
    - Was: IPF balanciert Marginal-Verteilungen iterativ. Wir machen klassische Hamilton-Allokation auf dem vollen Cross-Product.
    - Warum: Hamilton ist transparenter und in einem 2h-Sitzungs-Setting erklaerbar; IPF lohnt erst bei sparsamer Cross-Product-Matrix.
  - Sektion "Keine Soft-Constraints":
    - Was: Kein "moeglichst nahe an X, aber nicht zwingend"-Ziel. Quoten sind hart.
    - Warum: ohne Solver kein Trade-off; Stage 3 (Maximin in Engine A) macht das, Stage 1 nicht.
  - Sektion "Kein Cross-Stratum-Minimum":
    - Was: Wenn ein Stratum nur 1 Person braucht und 2 Personen verfuegbar sind, kann Stage 1 nicht garantieren, dass diese 1 Person zusaetzlich noch ein Mindest-Alter erfuellt — wir ziehen rein zufaellig im Stratum.
    - Warum: das ist Stage-3-Territorium (Maximin); Stage 1 ist absichtlich einfach.
  - Sektion "Mulberry32 ist KEIN crypto-grade RNG":
    - Was: Mulberry32 ist deterministisch und uniform, aber kein CSPRNG. Theoretisch koennte jemand bei bekanntem Seed alle Outputs vorhersagen.
    - Mitigation: Seed wird oeffentlich vor dem Lauf gewaehlt (siehe Stage1-Seed-Hint). Damit hat niemand einen Informations-Vorsprung. Verweis auf `<Term slug="seed">Seed</Term>`.
  - Sektion "Pool-Groessen-Skalierung":
    - Was: getestet bis 100k Personen mit <100ms Laufzeit. Bei 1M+ kann Browser-Memory eng werden.
    - Mitigation: fuer wirklich grosse Pools (Bundeslaender) waere Server-seitiges Pre-Sampling sinnvoll — out of scope fuer Iteration 1.
  - Verlinkung am Ende: aus Stage1Panel-Underfill-Banner und vom existierenden Limitations-Hint (falls vorhanden) auf diese Seite zeigen lassen — kein Code-Aenderung in dieser Task, nur Hinweis fuer spaetere Issues.
  - `data-testid="docs-page-limitationen"`.
  </action>
  <verify>
  <automated>cd apps/web && pnpm typecheck && pnpm lint && pnpm build</automated>
  </verify>
  <done>
  - Limitationen.tsx zeigt 5 Sektionen (IPF, Soft-Constraints, Cross-Stratum, Mulberry32, Skalierung)
  - Jede mit Was + Warum/Mitigation
  - typecheck + lint + build gruen
  </done>
</task>

<!-- ============================================================ -->
<!-- COMMIT 7: Polish (Print-CSS, e2e-Tests, Bundle-Delta)         -->
<!-- ============================================================ -->

<task type="auto">
  <name>Task 20: Print-CSS-Erweiterung fuer /docs/*</name>
  <files>apps/web/src/index.css</files>
  <action>
  Erweitere die bestehende `@media print { ... }`-Sektion in `apps/web/src/index.css`:
  - Verstecke im Druck: `[data-testid="tab-stage1"]`, `[data-testid="tab-stage3"]`, `[data-testid="tab-docs"]`, `[data-testid="stage1-trust-strip"]`, alle `[data-testid="docs-tile-*"]` (also nur die Hub-Karten — die aktive Doku-Seite soll printen). Verwende einen Selektor wie `[data-testid^="docs-tile-"]`.
  - "Zurueck zur Uebersicht"-Link in DocsLayout: `[data-testid="docs-layout"] header button` -> `display: none`.
  - Code-Snippet-"Kopieren"-Buttons in Verifikation.tsx: alle `[data-testid^="copy-snippet-"]` -> `display: none`.
  - Doku-Inhalt: `[data-testid^="docs-page-"]` mit Tailwind-Print-Resets entsprechend dem Stage1-Pattern (Hintergruende transparent, Schrift schwarz, max font-size 11pt, Headlines `page-break-after: avoid`).
  - Hub-Seite (`docsRoute === 'hub'`): kein expliziter Print-Style — dort ist Drucken sinnlos, Hub zeigt nur Tile-Karten.

  Code-Kommentar englisch, CSS auf englisch.
  </action>
  <verify>
  <automated>cd apps/web && pnpm build && grep -q 'docs-page-' dist/assets/*.css</automated>
  </verify>
  <done>
  - Print-CSS extends `@media print` block
  - Tab-Buttons + TrustStrip + Hub-Tiles + Copy-Buttons werden im Druck versteckt
  - Doku-Seiten sind druckfreundlich formatiert
  - Build gruen
  </done>
</task>

<task type="auto">
  <name>Task 21: Playwright-Tests — Tab-Switch, Hub, Algorithmus, Tech, Verifikation, TrustStrip</name>
  <files>apps/web/tests/e2e/docs.spec.ts, apps/web/tests/e2e/trust-strip.spec.ts</files>
  <action>
  Erstelle `apps/web/tests/e2e/docs.spec.ts` mit folgenden Tests (Playwright):
  1. **Tab-Switch funktioniert**: navigiere auf `/`, klicke `[data-testid="tab-docs"]`, erwarte URL-Hash `#/docs` und sichtbares `[data-testid="docs-layout"]` ODER Hub-Karten.
  2. **Hub-Karten klickbar**: erwarte 6 sichtbare Tiles mit `[data-testid^="docs-tile-"]`. Klick auf `[data-testid="docs-tile-algorithmus"]` -> URL-Hash `#/docs/algorithmus`, sichtbares `[data-testid="docs-page-algorithmus"]`.
  3. **Algorithmus-Seite zeigt Toy-Beispiel-SVG**: navigiere via Hash `#/docs/algorithmus`, erwarte sichtbares `[data-testid="hamilton-svg"]`.
  4. **Tech-Seite zeigt mind. 5 Libraries**: navigiere via Hash `#/docs/technik`, zaehle Tabellen-Zeilen — mind. 5.
  5. **Verifikations-Seite zeigt copy-paste-Code-Snippets**: navigiere via Hash `#/docs/verifikation`, erwarte mind. 2 `[data-testid^="copy-snippet-"]`-Buttons.
  6. **Hash-direkt-Navigation**: setze `window.location.hash = '#/docs/glossar'` programmatisch, erwarte sichtbares `[data-testid="docs-page-glossar"]`.
  7. **Zurueck-zum-Hub**: von einer Subseite klicke "Zurueck zur Uebersicht", erwarte URL `#/docs` und sichtbare Hub-Karten.

  Erstelle `apps/web/tests/e2e/trust-strip.spec.ts`:
  1. **TrustStrip im Stage1 sichtbar**: navigiere `/#/stage1`, erwarte sichtbares `[data-testid="stage1-trust-strip"]` mit 3 Karten (`trust-card-algorithmus`, `trust-card-verifikation`, `trust-card-audit`).
  2. **TrustStrip-Karte klickbar**: Klick auf `[data-testid="trust-card-algorithmus"]` -> URL-Hash `#/docs/algorithmus`, sichtbarer Doku-Tab.

  Convention: bestehende Tests in `apps/web/tests/e2e/` als Vorlage (`smoke.spec.ts`, `stage1.spec.ts`) — gleicher Page-Setup, gleiche Playwright-Imports.
  </action>
  <verify>
  <automated>cd apps/web && pnpm test:e2e -- docs trust-strip</automated>
  </verify>
  <done>
  - 7 Doku-e2e-Tests gruen
  - 2 TrustStrip-e2e-Tests gruen
  - Bestehende e2e-Tests bleiben gruen (verifiziert in Final-Verifikation)
  </done>
</task>

<task type="auto">
  <name>Task 22: Bundle-Delta messen + dokumentieren</name>
  <files>.issues/54-in-app-documentation/BUNDLE_DELTA.md</files>
  <action>
  Miss das Bundle-Delta gegenueber dem Baseline (vor diesem Issue):
  1. Stelle den Baseline her: temporaerer git-stash der gesamten Aenderungen (oder `git worktree add` einer sauberen `main`-Kopie). Build ausfuehren: `pnpm build`. Notiere die Groesse von `apps/web/dist/assets/index-*.js` (raw + gzipped).
     - gzipped messen via `gzip -c apps/web/dist/assets/index-*.js | wc -c`.
  2. Stelle den aktuellen Stand wieder her, baue erneut: `pnpm build`. Notiere die gleichen Werte.
  3. Berechne Delta:
     - raw delta = current_main_chunk_raw - baseline_main_chunk_raw
     - gzip delta = current_main_chunk_gz - baseline_main_chunk_gz
     - PLUS die Summe der neuen Doku-Chunks (`apps/web/dist/assets/Algorithmus-*.js`, `Technik-*.js`, etc.) — diese laden lazy, aber zaehlen ins Gesamt-Budget.
  4. Schreibe Report nach `.issues/54-in-app-documentation/BUNDLE_DELTA.md` mit:
     - Tabelle: Datei | Baseline raw | Current raw | Delta raw | Baseline gz | Current gz | Delta gz
     - Summen-Zeile
     - Vergleich gegen Budget +25 KB raw / +8 KB gzip
     - Status: WITHIN BUDGET / OVER BUDGET (kein Rollback — nur Reporting)
     - Falls OVER BUDGET: 2-3 Saetze, was die Treiber sind und welche Optimierungs-Optionen existieren (z.B. groessere Algorithmus-Bibliographien aus dem Doku-Bundle ausgliedern, Glossar-JSON in separate Asset auslagern).
  5. Im Commit-Message des Polish-Commits explizit das Delta nennen: "Bundle delta: +X KB raw / +Y KB gzip (budget: +25/+8)".

  Wichtig: kein automatisches Rollback bei Ueberschreitung — der User entscheidet anhand des Reports. Die Verify-Automation prueft NUR, dass der Report existiert und Zahlen enthaelt.
  </action>
  <verify>
  <automated>test -f .issues/54-in-app-documentation/BUNDLE_DELTA.md && grep -qE 'Delta.*[0-9]+' .issues/54-in-app-documentation/BUNDLE_DELTA.md</automated>
  </verify>
  <done>
  - BUNDLE_DELTA.md existiert mit Tabelle + Summe + Status
  - Commit-Message enthaelt Delta-Werte
  - Status WITHIN/OVER BUDGET klar markiert (kein Auto-Rollback)
  </done>
</task>

</tasks>

<verification>
Nach Abschluss aller 22 Tasks, Final-Verifikations-Sweep:

1. **Unit-Tests gesamt**: `cd apps/web && pnpm test` — alle Vitest-Tests gruen (inkl. neue `hamilton-svg`, `tech-manifest-generator`, `term`).
2. **Typecheck**: `pnpm typecheck` (vom Repo-Root, fuer alle Workspaces).
3. **Lint**: `pnpm lint` (vom Repo-Root).
4. **Build inkl. prebuild**: `pnpm build` — der prebuild-Drift-Check muss gruen sein.
5. **e2e-Tests gesamt**: `cd apps/web && pnpm test:e2e` — alle Specs gruen, insbesondere die neuen `docs.spec.ts` und `trust-strip.spec.ts`, UND die bestehenden `smoke.spec.ts`, `stage1.spec.ts`, `end-to-end.spec.ts`, `a11y.spec.ts`.
6. **Bundle-Delta-Report existiert**: `test -f .issues/54-in-app-documentation/BUNDLE_DELTA.md`.
7. **Manueller Browser-Smoke** (lokal):
   - `pnpm dev`, oeffne `http://127.0.0.1:5173/`, klicke jeden der 3 Tabs.
   - Klicke jede der 6 Hub-Tiles, pruefe dass die Subseite laedt + URL-Hash sich aendert.
   - Setze `window.location.hash = '#/docs/algorithmus'` direkt in der DevTools-Konsole, pruefe dass die Seite ohne Klick laedt.
   - Pruefe dass TrustStrip im Stage1-Tab sichtbar ist und Klick die Doku-Seite oeffnet.
   - Drucke (Ctrl+P) eine Doku-Seite — Tab-Buttons + TrustStrip + Copy-Buttons sind weg.
</verification>

<success_criteria>
1:1-Mapping zu den 26 Acceptance Criteria aus ISSUE.md:

**Routing + Hub**
- [ ] Dritter Top-Level-Tab "Dokumentation" in App.tsx (Task 1)
- [ ] DocsHub.tsx mit 6 Tile-Karten (Task 2 + 4)
- [ ] In-Tab-Navigation via Solid-Signal + URL-Hash-Sync (Task 1 + 2)

**Algorithmus-Seite**
- [ ] Algorithmus.tsx existiert (Task 6)
- [ ] Toy-Beispiel als visuelle Hamilton-SVG (Task 5 + 6)
- [ ] Realistisches Beispiel + Verlinkung zu Stage1 (Task 6)
- [ ] 5-Schritt-Erklaerung als kollabierbares Detail (Task 6)
- [ ] Externe Verlinkungen Cochran/Hamilton/Sortition Foundation/Flanigan (Task 6)

**Tech-Stack-Seite**
- [ ] Technik.tsx (Task 10)
- [ ] Build-Time-Manifest-Generator + eingecheckte Datei (Task 8 + 9)
- [ ] Manifest enthaelt direkte Deps + Web Crypto + Mulberry32 (Task 8)
- [ ] Algorithmen-Sektion (Hamilton/Fisher-Yates/Mulberry32/Ed25519) (Task 10)
- [ ] Build-Reproduzierbarkeit mit Lockfile-Verweis + Commit-SHA (Task 10)

**Reproduzierbarkeits-Seite**
- [ ] Verifikation.tsx (Task 12)
- [ ] 3-Schritt-Anleitung (Task 12)
- [ ] Code-Snippets copy-paste-bereit (Task 12)
- [ ] Verlinkung zu stage1_reference.py + cross_validate.sh (Task 12)
- [ ] "Was kann ich noch pruefen?"-Sektion (Task 12)

**Trust-Strip**
- [ ] TrustStrip.tsx mit 3 Karten (Task 17)
- [ ] Karten "Algorithmus seit 1792" / "21/21 byte-identisch" / "Signiertes Audit" (Task 17)
- [ ] Visuelle Differenzierung von Werkbank (Task 17)

**Glossar**
- [ ] glossar.json mit 15-25 Eintraegen (Task 13)
- [ ] Glossar.tsx Vollseite alphabetisch (Task 15)
- [ ] Term.tsx Inline-Tooltip in Algorithmus/Technik/Verifikation (Task 14 + 16)

**BMG §46**
- [ ] Bmg46.tsx mit zulaessigen Feldern (Task 18)
- [ ] Verlinkung aus Stage1Panel BMG-Hint (Task 18)

**Limitationen**
- [ ] Limitationen.tsx mit IPF/Soft-Constraints/Cross-Stratum/Mulberry32/Skalierung (Task 19)

**Print-friendly**
- [ ] index.css Print-CSS extended fuer /docs/* (Task 20)

**Build-/Commit-Info**
- [ ] vite.config.ts define `__GIT_SHA__` + `__BUILD_DATE__` (Task 3)
- [ ] DocsLayout-Footer zeigt Build-Info (Task 2)

**Tests**
- [ ] Vitest fuer Tech-Manifest-Generator (Task 8)
- [ ] Vitest fuer Hamilton-Walkthrough-Datenstruktur (Task 5)
- [ ] Playwright-Tests Tab-Switch / Hub / Algorithmus-SVG / Tech-Liste / Verifikations-Snippets / TrustStrip (Task 21)
- [ ] Bestehende Tests bleiben gruen (Final-Verifikation)
- [ ] Bundle-Delta unter +25 KB raw / +8 KB gzip dokumentiert (Task 22 — Reporting; bei Ueberschreitung User informiert, kein Auto-Rollback)
</success_criteria>
