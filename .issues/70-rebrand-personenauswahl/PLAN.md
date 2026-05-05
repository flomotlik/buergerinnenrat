# Plan: Rebranding Bürgerinnenrat → Personenauswahl + Use-Case-Hub

<objective>
Was: Tool als generisches **"Personenauswahl"**-Werkzeug positionieren. Bürgerinnenrat wird zu *einem* von drei dokumentierten Use Cases (neben Landeskonferenz/Parteitag-Delegation und internem Vereinsgremium). UI-Wordmarks, Hero-Copy, ausgewählte Tooltips/Helper-Texte werden generisch reformuliert. Ein neuer Doku-Bereich "Anwendungsfälle" wird als Akkordeon-Sub-Page ergänzt. README + CLAUDE.md erhalten generischen Aufmacher mit Disclaimer.

Warum: Eine zweite Organisation will das Tool intern für Delegierten-Auswahl nutzen. Das aktuelle Branding "Bürger:innenrat" suggeriert fälschlich, das Tool sei nur dafür gebaut. Dabei sind die drei Tool-Primitive (Auswahl, Quoten-Override, Nachwahl) bereits generisch — nur Copy/Doku müssen das spiegeln.

Scope IN: In-App-Branding (6 UI-Surface-Dateien), 4 E2E-Spec-Updates (auf `getByTestId('brand')` für Brand-Immunität), generische Reformulierung Stage1Panel-Tooltips + SampleSizeCalculator-Helper-Text + BMG-§46-Banner (Variante A: konservativ, generisch, immer sichtbar), neuer Doku-Slug `use-cases` + neue Component `UseCases.tsx` mit Akkordeon (drei `<details>`), README + CLAUDE.md-Updates inkl. Disclaimer zu verbleibenden internen "Bürgerrat"-Referenzen.

Scope OUT (locked durch CONTEXT.md): Repo-Rename, Domain-Migration, `vite.config.ts` `base`-Pfad, CI-Workflow-Pfade (`deploy.yml`, `docker-build.yml`), Verzeichnis-Rename `design_handoff_buergerinnenrat/`, Audit-Manifest-Versionierung, Stakeholder-Kommunikation, Multi-Mandanten-Modus, Pipeline-Wahl/Modus-Toggle.

Open questions resolved by planner (dokumentiert):
1. **CHANGELOG.md existiert nicht** → kein neues File anlegen, stattdessen Rebrand-Note kompakt in README integrieren (Researcher-Empfehlung).
2. **BMG §46-Banner-Strategie (`Stage1Panel.tsx:491-516`)** → **Variante A** (konservativ): generisch reformulieren, immer sichtbar. Keine neue Bedingung, kein Heuristik-Code-Pfad, kein neuer Test. (Researcher-Empfehlung Risiko 7.)
3. **Use-Case-Hub-Layout** → **Akkordeon** (3 `<details>`) auf einer Sub-Route `#/docs/use-cases`. Drei Sub-Routes wären für ~150–300 Wörter pro Use Case Overkill. (Researcher-Empfehlung §"Architektur Patterns".)
4. **Verbleibende Brand-Referenzen** in `sortition-tool/`, `research/`, `docs/iteration-2-issue-synthesis.md` → laut CONTEXT.md Out-of-Scope. 2-Zeilen-Disclaimer in README dokumentiert das als historische Artefakte.
</objective>

<context>
Issue: @.issues/70-rebrand-personenauswahl/ISSUE.md
Context (locked decisions): @.issues/70-rebrand-personenauswahl/CONTEXT.md
Research: @.issues/70-rebrand-personenauswahl/RESEARCH.md

<interfaces>
<!-- Executor: use these contracts directly. Do not explore the codebase for them.
     The full Research has more — these are the load-bearing surfaces for #70. -->

// From apps/web/src/shell/Brand.tsx (current)
// Already has data-testid="brand" on the wrapping <div> — line 14.
// Wordmark span on line 40: <span class="font-serif font-semibold text-lg text-ink">Bürger:innenrat</span>
// Subtitle on line 41 (default 'Stratifiziertes Losverfahren') — bleibt unverändert.
export const Brand: Component<{ subtitle?: string }>;

// From apps/web/src/App.tsx — DocsRoute union (lines 49-57) + DOCS_ROUTES set (lines 59-68)
export type DocsRoute =
  | 'hub' | 'algorithmus' | 'technik' | 'verifikation'
  | 'glossar' | 'bmg46' | 'limitationen' | 'beispiele';
// Erweiterung für #70: 'use-cases' zur Union UND zum DOCS_ROUTES Set hinzufügen.
// Die sr-only h1 in App.tsx:241 lautet aktuell 'Bürger:innenrat' — auf 'Personenauswahl' umstellen.
// Code-Kommentar in App.tsx:235-239 erwähnt 'Bürger:innenrat' — mit-anpassen.

// From apps/web/src/docs/DocsHub.tsx
interface TileDef { slug: Exclude<DocsRoute, 'hub'>; title: string; description: string; icon: JSX.Element; }
const TILES: ReadonlyArray<TileDef>;            // 7 Tiles heute, neuer Eintrag 'use-cases' ergänzt
const TITLES: Record<Exclude<DocsRoute, 'hub'>, string>;
function renderSubpage(route: Exclude<DocsRoute, 'hub'>): JSX.Element;  // switch — ein neuer case 'use-cases'
// Pattern: lazy() + Suspense für jede Sub-Component (siehe DocsHub.tsx:8-14).

// From apps/web/src/docs/DocsLayout.tsx
interface Props { title: string; back?: () => void; children: JSX.Element; }
// Renders: header + sticky 220px TOC (auto-extracted from <h2>) + 68ch reading column.
// Drei <h2> in UseCases.tsx ergeben automatisch ein 3-Punkte-TOC.

// From apps/web/src/stage1/Stage1Panel.tsx
// Lines 41,43: Tooltip-Text Geschlecht-Achse — enthält "Bürgerrats-Methodik".
// Lines 491-516: <aside data-testid="stage1-bmg-hint"> — BMG §46-Banner.
//   STRATEGIE Variante A: generisch umformulieren, immer sichtbar lassen.

// From apps/web/src/stage1/SampleSizeCalculator.tsx
// Line 114: Helper-Text "Z.B. 30 für einen Gemeinde-Bürgerrat, 160 für einen Bundes-Bürgerrat."

// From packages/core/src/stage1/sample-size.ts (interface unchanged — only header comment touched)
export type OutreachMode = 'mail-only' | 'mail-plus-phone' | 'custom';
export const OUTREACH_DEFAULTS: Record<OutreachMode, OutreachRates>;
export const DEFAULT_SAFETY_FACTOR = 1.5;
export interface SampleSizeProposal { ... }
export function suggestSampleSize(...): SampleSizeProposal | null;

// From apps/web/src/stage1/TrustStrip.tsx — bereits generisch (3 Cards, kein Brand-Bezug).
// Researcher-Empfehlung: NICHT anfassen. Nur Code-Kommentar prüfen.

// From apps/web/src/docs/Beispiele.tsx
interface ExampleFile { filename; slug; personen; stage; beschreibung; }
const FILES: ExampleFile[];   // 4 Einträge, keine Änderung. Optional Quer-Link aus UseCases.tsx.

// E2E Specs mit Brand-String-Asserts (alle vier müssen mit dem Rename umgestellt werden):
// - apps/web/tests/e2e/csv-import.spec.ts:14 — getByRole('heading', { name: 'Bürger:innenrat' })
// - apps/web/tests/e2e/smoke.spec.ts:5 — toHaveText('Bürger:innenrat')
// - apps/web/tests/e2e/overview.spec.ts:19 — toContainText('Bürger:innenrat')
// - apps/web/tests/smoke-live/site-smoke.spec.ts:26 — Regex /Bürger|Sortition|Buergerinnenrat/i
// Empfehlung: Erste drei auf getByTestId('brand') umstellen (Brand.tsx hat bereits data-testid="brand"
// auf dem äußeren div), für Brand-Immunität gegen zukünftige Renames. Vierte: Regex erweitern um
// "Personenauswahl".
</interfaces>

Key files:
@apps/web/src/shell/Brand.tsx — Wordmark (Sidebar)
@apps/web/src/Overview.tsx — Landing-Hero `<h1>` + Subtitle
@apps/web/src/App.tsx — sr-only h1 + DocsRoute Union + DOCS_ROUTES Set
@apps/web/index.html — `<title>`
@apps/web/src/stage1/Stage1Panel.tsx — Tooltips + BMG-§46-Banner (lines 41,43,491-516)
@apps/web/src/stage1/SampleSizeCalculator.tsx — Helper-Text (line 114)
@apps/web/src/docs/DocsHub.tsx — TILES + TITLES + renderSubpage
@apps/web/src/docs/DocsLayout.tsx — TOC-Auto-Extract (Reuse für UseCases.tsx)
@apps/web/src/docs/UseCases.tsx — NEU (Akkordeon mit 3 Use Cases)
@apps/web/src/stage1/TrustStrip.tsx — bereits generisch (nur Verifizieren)
@apps/web/src/docs/Beispiele.tsx — optional Quer-Link
@packages/core/src/stage1/sample-size.ts — Header-Kommentar
@apps/web/tailwind.config.cjs — Brand-Color-Familien-Kommentar
@apps/web/tests/e2e/{csv-import,smoke,overview}.spec.ts — Brand-Asserts auf testid umstellen
@apps/web/tests/smoke-live/site-smoke.spec.ts — Regex erweitern
@README.md — Titel + Beschreibung + Rebrand-Note + Disclaimer
@CLAUDE.md — Satz 1 generischer

**Wichtiger Hinweis zu Parallel-Branch #72 (Excel-Upload):**
`issue/72-excel-upload-support` benennt `apps/web/src/csv/` → `apps/web/src/import/` um und ergänzt Excel-Buttons in `Stage1Panel.tsx` und `Beispiele.tsx`. Issue #70 wird voraussichtlich NACH #72 ausgeführt. Folgen:
- `apps/web/src/import/` existiert (statt `csv/`) — relevant nur für Imports in Stage1Panel; #70 ändert keine Imports.
- `Stage1Panel.tsx` und `Beispiele.tsx` haben mehr Inhalt (Excel-Buttons / Excel-Examples) — die Brand-Targets sind aber stabil (Tooltip-Strings im Geschlecht-Block, BMG-Banner-Block).
- `SampleSizeCalculator.tsx` ist von #72 nicht berührt.
- **Konsequenz für Executor:** Vor jedem Edit `grep -n "Bürgerrat" <file>` neu ausführen, wenn Zeilennummern aus diesem PLAN nicht passen — der Inhalt ist eindeutig identifizierbar (Brand-Strings sind selten), Zeilen können sich verschoben haben.
</context>

<commit_format>
Format: conventional with issue prefix `70:`
Pattern: `70: <type>(<scope>): <description>`
Beispiele:
- `70: refactor(brand): rename to Personenauswahl + harden test-ids against future rebrands`
- `70: refactor(stage1): generic copy with bürgerinnenrat as one example`
- `70: feat(docs): add use-cases hub with 3 anwendungsbeispiele`
- `70: docs: update README and CLAUDE.md for Personenauswahl rebrand`
- `70: docs(issues): mark issue done`
</commit_format>

<tasks>

<task type="auto">
  <name>Task 1: Wordmark-Rename + Test-ID-Migration (atomic)</name>
  <files>
    apps/web/src/shell/Brand.tsx,
    apps/web/src/Overview.tsx,
    apps/web/src/App.tsx,
    apps/web/index.html,
    apps/web/tests/e2e/csv-import.spec.ts,
    apps/web/tests/e2e/smoke.spec.ts,
    apps/web/tests/e2e/overview.spec.ts,
    apps/web/tests/smoke-live/site-smoke.spec.ts
  </files>
  <action>
  Atomic Brand-Wordmark-Rename. Alle Wordmark-Surfaces UND alle 4 brechenden E2E-Specs in einem Commit. Tests werden auf `getByTestId('brand')` umgestellt für Brand-Immunität gegen zukünftige Renames (Brand.tsx hat bereits `data-testid="brand"` auf dem äußeren div, Z. 14 — verifiziert).

  **1.1 — apps/web/src/shell/Brand.tsx, Z. 40:**
  Ersetze den Wordmark-Text:
  ```
  <span class="font-serif font-semibold text-lg text-ink">Bürger:innenrat</span>
  ```
  durch:
  ```
  <span class="font-serif font-semibold text-lg text-ink">Personenauswahl</span>
  ```
  Die Subtitle (Z. 41, default 'Stratifiziertes Losverfahren') BLEIBT unverändert — sie ist generisch.
  Verifiziere: `data-testid="brand"` ist bereits auf Z. 14 vorhanden — NICHT entfernen.

  **1.2 — apps/web/src/Overview.tsx, Hero-Block:**
  Z. 22: `<h1>Bürger:innenrat</h1>` → `<h1>Personenauswahl</h1>`.
  Z. 24 (Subtitle): Original lautet sinngemäß "Browser-natives Werkzeug für stratifizierte Zufallsauswahl in Bürgerräten. Daten bleiben lokal …".
  Ersetze durch: "Browser-natives Werkzeug für stratifizierte Personenauswahl — z.B. für Bürgerinnenräte, Delegierten-Auswahl oder Vereinsgremien. Daten bleiben lokal, …" (Rest des Original-Satzes nach "lokal" beibehalten).
  Vor dem Edit `grep -n "Bürger" apps/web/src/Overview.tsx` ausführen, falls Zeilen anders.

  **1.3 — apps/web/src/App.tsx:**
  Z. 241: `<h1 class="sr-only">Bürger:innenrat</h1>` → `<h1 class="sr-only">Personenauswahl</h1>`.
  Code-Kommentar in Z. 235-239 mit aktualisieren — überall wo `'Bürger:innenrat'` als String erwähnt ist (typischerweise im Doku-Kommentar zu `getByRole('heading', { name: '…' })`), auf `'Personenauswahl'` umstellen.

  **1.4 — apps/web/index.html, Z. 6:**
  `<title>Bürger:innenrat — Versand-Liste & Panel-Auswahl</title>`
  → `<title>Personenauswahl — stratifizierte Zufallsauswahl</title>`

  **1.5 — apps/web/tests/e2e/csv-import.spec.ts, Z. 14:**
  Vorher (sinngemäß): `await expect(page.getByRole('heading', { name: 'Bürger:innenrat' })).toBeVisible();`
  Nachher: `await expect(page.getByTestId('brand')).toBeVisible();`
  Begründung als Inline-Kommentar: `// Brand wordmark — testid-selector for immunity against future rebrands.`

  **1.6 — apps/web/tests/e2e/smoke.spec.ts, Z. 5:**
  Vorher (sinngemäß): `await expect(<sel>).toHaveText('Bürger:innenrat');`
  Nachher: `await expect(page.getByTestId('brand')).toContainText('Personenauswahl');`
  Falls die Spec den Selektor anders aufbaut, sinngemäß auf testid-Selektor migrieren und gegen `'Personenauswahl'` prüfen.

  **1.7 — apps/web/tests/e2e/overview.spec.ts, Z. 19:**
  Vorher: `toContainText('Bürger:innenrat')` → Nachher: `toContainText('Personenauswahl')`.
  Wenn das Spec-Setup einen `data-testid` für die Hero-h1 hat, dann auf den umstellen; sonst Wordmark-Text-Assert auf 'Personenauswahl' umschreiben.

  **1.8 — apps/web/tests/smoke-live/site-smoke.spec.ts, Z. 26:**
  Regex `/Bürger|Sortition|Buergerinnenrat/i` → `/Personenauswahl|Bürger|Sortition/i`.
  Hintergrund: nach Deployment ist "Personenauswahl" der primäre Brand; "Bürger" und "Sortition" bleiben tolerierte Fallbacks (für Übergangszeit, falls CDN cached).

  **WICHTIG:** Alle 8 Edits in EINEM Commit. Wenn Brand.tsx isoliert committed wird, brechen sofort 4 Specs. Pre-commit-Hook führt Tests aus → würde fehlschlagen.

  **Anti-Patterns (NICHT tun):**
  - KEINE neue `BRAND`-Konstante / globale Brand-Indirection. Nur 4 UI-Strings, String-Replace ist klarer (siehe RESEARCH §"Don't Hand-Roll").
  - `data-testid="brand"` NICHT entfernen oder verschieben — es ist die Basis für die Test-Migration.
  - Subtitle in Brand.tsx Z. 41 NICHT anfassen.
  - Den Hash-Routing-Pfad / `vite.config.ts base` NICHT anfassen (CONTEXT.md L15, locked).
  </action>
  <verify>
  <automated>
  cd /root/workspace && pnpm --filter @sortition/web typecheck \
    && pnpm --filter @sortition/web test \
    && pnpm --filter @sortition/web exec playwright test --project=chromium \
    && ! grep -n "Bürger:innenrat\|Bürgerinnenrat" apps/web/src/shell/Brand.tsx apps/web/src/Overview.tsx apps/web/src/App.tsx apps/web/index.html \
    && grep -n "Personenauswahl" apps/web/src/shell/Brand.tsx apps/web/src/Overview.tsx apps/web/src/App.tsx apps/web/index.html \
    && grep -n 'data-testid="brand"' apps/web/src/shell/Brand.tsx \
    && grep -n "getByTestId('brand')\|getByTestId(\"brand\")" apps/web/tests/e2e/csv-import.spec.ts apps/web/tests/e2e/smoke.spec.ts
  </automated>
  </verify>
  <done>
  - `Brand.tsx` Wordmark zeigt "Personenauswahl"; Subtitle unverändert; `data-testid="brand"` weiterhin auf dem äußeren `<div>`.
  - `Overview.tsx` Hero `<h1>` zeigt "Personenauswahl"; Subtitle nennt drei Use-Case-Beispiele.
  - `App.tsx` sr-only `<h1>` zeigt "Personenauswahl"; Code-Kommentar in Z. 235-239 spricht von 'Personenauswahl'.
  - `index.html` `<title>` ist "Personenauswahl — stratifizierte Zufallsauswahl".
  - 3 E2E-Specs (`csv-import`, `smoke`, `overview`) verwenden `getByTestId('brand')` und prüfen `'Personenauswahl'`.
  - `site-smoke.spec.ts` Regex enthält `Personenauswahl`.
  - `pnpm --filter @sortition/web exec playwright test --project=chromium` grün.
  - Single commit: `70: refactor(brand): rename to Personenauswahl + harden test-ids against future rebrands`.
  </done>
</task>

<task type="auto">
  <name>Task 2: UI-Copy generisch reformulieren (Stage1 + SampleSizeCalculator + BMG-§46-Banner)</name>
  <files>
    apps/web/src/stage1/Stage1Panel.tsx,
    apps/web/src/stage1/SampleSizeCalculator.tsx
  </files>
  <action>
  Drei UI-Strings in zwei Files generisch reformulieren. **Variante A** für BMG-§46-Banner: konservativ, generisch, immer sichtbar (kein Heuristik-Code-Pfad, kein neuer State, kein neuer Test).

  **Vor jedem Edit:** `grep -n "Bürger\|Bürgerrat" <file>` ausführen, da #72-Branch Zeilen verschieben könnte. Inhaltliche Identifikation der Targets:

  **2.1 — apps/web/src/stage1/Stage1Panel.tsx, Tooltip-Text Geschlecht-Achse (Z. ~38-50):**
  Ziel: zwei Tooltip-Strings, die heute "…Standard-Stratifikation in jeder Bürgerrats-Methodik." enthalten (Z. 41 und Z. 43 in der RESEARCH-Snapshot — kann nach #72-Merge verschoben sein).

  Such-Pattern: `grep -n "Bürgerrats-Methodik" apps/web/src/stage1/Stage1Panel.tsx`.

  Reformuliere beide Vorkommen sinngemäß zu:
  > "…Standard-Stratifikation in stratifizierten Auswahl-Verfahren (z.B. Bürgerräte, Delegierten-Auswahl)."

  Wenn die zwei Tooltips minimal unterschiedlich sind (z.B. einer bezieht sich auf Geschlecht, einer auf Altersbänder), die generische Reformulierung kontextuell anpassen — der Punkt ist: kein Vorkommen von "Bürgerrats-Methodik" mehr, ersetzt durch generische Formulierung mit Bürgerrat als *eines* der Beispiele.

  **2.2 — apps/web/src/stage1/Stage1Panel.tsx, BMG-§46-Banner (Z. ~491-516, `<aside data-testid="stage1-bmg-hint">`):**
  Such-Pattern: `grep -n 'data-testid="stage1-bmg-hint"' apps/web/src/stage1/Stage1Panel.tsx`.

  Variante A — generisch reformulieren, IMMER sichtbar, kein neuer Conditional. Behalte den `<aside data-testid="stage1-bmg-hint">`-Wrapper und die Position im Layout. Ersetze den Inhalt sinngemäß zu (Deutsch, Sachton, mit BMG-§46-Verweis als kontextueller Hinweis):

  > **Hinweis: Stratifikation kann nur über Spalten erfolgen, die in deiner Eingabe existieren.**
  >
  > Im Bürgerrats-Kontext (BMG §46, DE/AT-Melderegister-Auszüge) sind das typischerweise Felder wie *Staatsbürgerschaft*, *Geburtsjahr*, *Sprengel* oder *Katastralgemeinde*. In anderen Verfahren (z.B. Mitgliederlisten für Delegierten-Auswahl oder Vereinsgremien) sind die verfügbaren Spalten andere — das Tool stratifiziert auf den Achsen, die du im Mapping zuordnest.
  >
  > Mehr zu konkreten Anwendungsfällen: [Anwendungsfälle](#/docs/use-cases).

  WICHTIG:
  - Der Verweis auf `#/docs/use-cases` zeigt auf Task 3 (UseCases.tsx). Wenn Task 3 in einem späteren Commit kommt, ist der Link zwischenzeitlich tot — das ist OK, weil PLAN.md eine sequentielle Ausführung garantiert.
  - Den `data-testid="stage1-bmg-hint"` BEHALTEN — andere Tests können darauf prüfen.
  - KEIN Heuristik-Code-Pfad (kein `parsed()?.headers.some(…)`).
  - Markdown-Syntax wahrscheinlich als JSX-Children mit Inline-Tags (`<strong>`, `<a href="#/docs/use-cases">`); konkrete JSX-Form an bestehende Banner-Struktur in Stage1Panel.tsx anpassen.

  **2.3 — apps/web/src/stage1/SampleSizeCalculator.tsx, Helper-Text Z. ~114:**
  Such-Pattern: `grep -n "Gemeinde-Bürgerrat" apps/web/src/stage1/SampleSizeCalculator.tsx`.

  Original (sinngemäß): "Z.B. 30 für einen Gemeinde-Bürgerrat, 160 für einen Bundes-Bürgerrat."
  Ersetze durch: "Z.B. 30 für einen Gemeinde-Bürgerrat, 50–100 für eine Landeskonferenz-Delegation, 160 für einen Bundes-Bürgerrat."

  **Out-of-scope für diesen Task (nicht anfassen):**
  - TrustStrip.tsx — laut Researcher bereits generisch.
  - Wordmarks (Task 1).
  - Doku-Subpage UseCases.tsx (Task 3).
  - `packages/core/src/stage1/sample-size.ts` Header-Kommentar (Task 5).
  </action>
  <verify>
  <automated>
  cd /root/workspace && pnpm --filter @sortition/web typecheck \
    && pnpm --filter @sortition/web test \
    && pnpm --filter @sortition/web exec playwright test --project=chromium tests/e2e/stage1.spec.ts tests/e2e/stage1-sample-size.spec.ts tests/e2e/stage1-bands.spec.ts \
    && ! grep -n "Bürgerrats-Methodik" apps/web/src/stage1/Stage1Panel.tsx \
    && grep -n "Anwendungsfälle\|use-cases" apps/web/src/stage1/Stage1Panel.tsx \
    && grep -n "Landeskonferenz-Delegation" apps/web/src/stage1/SampleSizeCalculator.tsx \
    && grep -n 'data-testid="stage1-bmg-hint"' apps/web/src/stage1/Stage1Panel.tsx
  </automated>
  </verify>
  <done>
  - Beide "Bürgerrats-Methodik"-Tooltip-Strings sind generisch formuliert; "Bürgerräte" erscheint nur noch als ein Beispiel von mehreren.
  - BMG-§46-Banner verwendet generische Einleitung; behält BMG-§46-Verweis als Bürgerrats-Beispiel; verlinkt auf `#/docs/use-cases`.
  - `<aside data-testid="stage1-bmg-hint">` ist erhalten — keine Conditional-Logik um den Banner.
  - SampleSizeCalculator.tsx Helper-Text nennt drei Pool-Größen-Beispiele.
  - Alle Stage1-Specs grün.
  - Single commit: `70: refactor(stage1): generic copy with bürgerinnenrat as one example`.
  </done>
</task>

<task type="auto">
  <name>Task 3: Use-Case-Hub anlegen (neue DocsRoute + Tile + Akkordeon-Component)</name>
  <files>
    apps/web/src/App.tsx,
    apps/web/src/docs/DocsHub.tsx,
    apps/web/src/docs/UseCases.tsx,
    apps/web/src/stage1/TrustStrip.tsx
  </files>
  <action>
  Neuer Doku-Bereich "Anwendungsfälle" als Akkordeon-Sub-Page (1 Route, 3 `<details>`-Sektionen).

  **3.1 — apps/web/src/App.tsx, DocsRoute-Union + DOCS_ROUTES-Set (Z. ~49-68):**
  - Erweitere `DocsRoute`-Union um `'use-cases'`:
    ```ts
    export type DocsRoute =
      | 'hub' | 'algorithmus' | 'technik' | 'verifikation'
      | 'glossar' | 'bmg46' | 'limitationen' | 'beispiele'
      | 'use-cases';
    ```
  - Erweitere `DOCS_ROUTES`-Set um `'use-cases'` (gleiche Liste — Set wird für die Hash-Routing-Validierung verwendet, unbekannte Slugs fallen auf `'hub'`).

  **3.2 — apps/web/src/docs/DocsHub.tsx:**

  - Z. 8-14 (lazy-Imports): Ergänze `const UseCases = lazy(() => import('./UseCases'));`.
  - `TILES`-Array (Z. 43-145): Neuer Eintrag — am Ende der Liste anhängen:
    ```ts
    {
      slug: 'use-cases',
      title: 'Anwendungsfälle',
      description: 'Drei dokumentierte Verfahren — und wie sie dasselbe Tool kombinieren.',
      icon: <SomeAppropriateIcon /> // z.B. ein Layer-Stack-Icon oder drei-Personen-Silhouetten
    }
    ```
    Wähle ein Icon-Pattern, das den anderen Tiles ähnelt (Inline-SVG mit `currentColor` und `aria-hidden`). Falls unsicher: dasselbe Pattern wie `Beispiele`-Tile verwenden, mit anderem Pfad (drei kleine Personen-Silhouetten).
  - `TITLES`-Map (Z. 147-155): Ergänze `'use-cases': 'Anwendungsfälle'`.
  - `renderSubpage`-Switch (Z. 158-175): Neuer Case `case 'use-cases': return <UseCases />`. Folge dem `lazy()`-Suspense-Pattern der bestehenden Cases.

  **3.3 — apps/web/src/docs/UseCases.tsx (NEU):**

  Erstelle die Component nach dem Vorbild von `Beispiele.tsx` und `Bmg46.tsx`. Verwende `DocsLayout` als Shell. Drei `<section>`-Blöcke mit `<h2>` (für TOC-Auto-Extract) und jeweils einem `<details open>` (Akkordeon, Default aufgeklappt, User kann kollabieren).

  Englische JSDoc am Top (CLAUDE.md-Konvention: Code-Kommentare englisch). UI-Texte deutsch.

  Struktur (sinngemäß):
  ```tsx
  import type { Component } from 'solid-js';
  import { DocsLayout } from './DocsLayout';

  /**
   * Use-cases hub — three Anwendungsbeispiele as accordion sections.
   * Each section uses <details open> so all three are visible by default
   * (readers can compare), but collapsible.
   * <h2> per section is auto-extracted by DocsLayout into the sticky TOC.
   */
  export const UseCases: Component = () => (
    <DocsLayout title="Anwendungsfälle">
      <p class="lead">
        Drei dokumentierte Verfahren — und wie sie dasselbe Tool kombinieren.
        Personenauswahl ist eine Toolbox aus drei zusammensetzbaren Primitiven:
        <strong> stratifizierte Auswahl</strong>, <strong>Quoten-Override</strong> und
        <strong> Nachwahl</strong>. Verschiedene Verfahren-Typen — vom Bürgerinnenrat
        über die Landeskonferenz bis zum Vereinsgremium — sind dieselbe Komposition
        mit anderen Pool-Größen und Workflow-Reihenfolgen. Was sich unterscheidet,
        ist organisatorisch, nicht algorithmisch.
      </p>
      <p>
        Anschreiben und Antwort-Tracking liegen außerhalb des Tools — der/die
        Verfahrens-Begleiter:in pflegt das per Excel, Mail-Merge oder Telefon-Liste.
        Das Tool sieht davon nichts.
      </p>

      <section>
        <h2>Bürgerinnenrat</h2>
        <details open>
          <summary>BMG §46, Herzogenburg-Daten, zweistufige Auswahl</summary>
          <p>
            <strong>Was ist das?</strong> Geloster, deliberativ arbeitender
            Bürger:innenrat auf Gemeinde- oder Bundes-Ebene (Vorbild:
            österreichische/deutsche Praxis). Nach §46 BMG dürfen Kommunen
            aus dem Melderegister bestimmte Felder herausgeben; die Auswahl
            erfolgt zweistufig (Versand-Liste + Antwortenden-Panel).
          </p>
          <h3>Workflow (Tool-Primitive)</h3>
          <ol>
            <li><strong>Stage 1 / Auswahl</strong> — Pool: Vollbevölkerung 18+
              aus Melderegister; Stichprobe ~300–1500 Personen mittels
              stratifizierter Zufallsziehung.</li>
            <li>Anschreiben extern (Brief, Mail, Telefon-Outreach).</li>
            <li><strong>Stage 3 / Auswahl</strong> — Pool: ~30–60 Antwortende
              mit Selbstauskunft; Maximin-Heuristik wählt das Panel
              (15–50 Personen) mit Bildung/Migrationshintergrund-Quoten.</li>
            <li><strong>Quoten-Override</strong> bei Bedarf, z.B. wenn ein
              Quoten-Bound zu hart ist (Issue #71).</li>
            <li><strong>Nachwahl</strong> (Stage 4, geplant) bei Drop-out
              aus optionaler Reserve.</li>
          </ol>
          <p>
            <strong>Beispiel-Daten:</strong>{' '}
            <a href="#/docs/beispiele">Herzogenburg-Melderegister + Antwortende</a>.
          </p>
          <p>
            <strong>Audit-Trail:</strong> Stage 1 produziert
            <code>versand-audit-&lt;seed&gt;.json</code> mit Stichprobe,
            Stratifikations-Achsen, Soll/Ist pro Stratum, Ed25519-Signatur.
            Stage 3 ergänzt das Panel-Manifest mit Quoten-Verteilung.
          </p>
        </details>
      </section>

      <section>
        <h2>Landeskonferenz / Parteitag-Delegation</h2>
        <details open>
          <summary>50–100 Delegierte, einstufige Auswahl, „min 50 % unter 50"</summary>
          <p>
            <strong>Was ist das?</strong> Auswahl von 50–100 Delegierten aus
            einer Mitgliederliste (regionaler Verband, Landesgruppe,
            Parteiorganisation). Ziel: faire Repräsentation nach Gemeinde,
            Bezirk, Altersband, Geschlecht, evtl. Funktion. Beispiel:
            „100 Delegierte aus 87 Gemeinden, mindestens 50 % unter 50 Jahre,
            mindestens 40 % weiblich."
          </p>
          <h3>Workflow (Tool-Primitive)</h3>
          <ol>
            <li><strong>Auswahl</strong> — Pool: Mitgliederliste (CSV/Excel-Upload,
              Issue #72). Direkt einstufig: stratifizierte Stichprobe auf
              Gemeinde/Bezirk/Altersband/Geschlecht.</li>
            <li><strong>Quoten-Override</strong> — Verfahrens-Begleiter setzt
              z.B. die untere Bound für <em>geschlecht=weiblich</em> von 35 auf 40
              (Issue #71).</li>
            <li>Anschreiben extern (Mail-Merge oder Brief).</li>
            <li><strong>Nachwahl</strong> bei Absagen — kleinere Auswahl
              (5–10 Personen) aus dem Pool, mit denselben Quoten und
              einem neuen Seed.</li>
          </ol>
          <p>
            <strong>Beispiel-Daten:</strong> Generische Mitgliederliste —
            User generiert sich selbst eine (ähnliches Schema wie
            <code>kleinstadt-3000.csv</code>, ergänzt um Gemeindespalte).
          </p>
          <p>
            <strong>Audit-Trail:</strong> Identisches JSON-Format wie Stage 1
            (<code>versand-audit-&lt;seed&gt;.json</code>) — die Struktur ist
            generisch genug, dass „Versand-Liste" hier „Delegierten-Liste"
            entspricht.
          </p>
        </details>
      </section>

      <section>
        <h2>Internes Auswahl-Verfahren / Vereinsgremium</h2>
        <details open>
          <summary>Niedrigschwelliger Use Case, kleine Pool-Größen</summary>
          <p>
            <strong>Was ist das?</strong> Ein Verein, eine NGO oder eine Schule
            will ein 5–15-köpfiges Gremium aus 50–500 Personen losen — mit
            einfachen Quoten (z.B. „drei Sitze für jede Altersgruppe"). Kein
            juristischer Kontext, keine §46-BMG-Komplexität.
          </p>
          <h3>Workflow (Tool-Primitive)</h3>
          <ol>
            <li><strong>Auswahl</strong> — Pool: Vereins-Mitgliederliste
              (Excel-Upload, Issue #72). Stratifikation auf 1–2 Achsen
              (Altersgruppe, evtl. Funktion).</li>
            <li><strong>Quoten-Override</strong> — selten nötig bei kleinen
              Pools, aber verfügbar.</li>
            <li>Anschreiben extern (Mail).</li>
            <li><strong>Nachwahl</strong> bei Absage — 1–2 Personen.</li>
          </ol>
          <p>
            <strong>Beispiel-Daten:</strong> Hand-erzeugtes Beispiel mit
            ~80 Personen reicht. Kann der User selbst aus Kontoliste/CSV-Export
            bauen.
          </p>
          <p>
            <strong>Audit-Trail:</strong> Reines
            <code>versand-audit-&lt;seed&gt;.json</code> — die Signatur dient
            hier eher der internen Transparenz („alle Mitglieder können den
            Lauf nachvollziehen") als der juristischen Anforderung.
          </p>
        </details>
      </section>
    </DocsLayout>
  );

  export default UseCases;
  ```

  Hinweise:
  - Stylesheet-Klassen (`class="lead"` etc.) am Pattern bestehender Doku-Components ausrichten — wenn die andere Doku-Subpages einen anderen Stil benutzen, daran orientieren.
  - `<details open>` für Default-Aufklappen.
  - Einzeiliges `<summary>` pro Sektion.
  - Cross-Links via Hash (`#/docs/beispiele`) — funktioniert mit dem bestehenden Hash-Routing.

  **3.4 — apps/web/src/stage1/TrustStrip.tsx (Verifizierung, kein Diff erwartet):**
  - Mit `grep -n "Bürger\|Bürgerrat" apps/web/src/stage1/TrustStrip.tsx` prüfen, dass es WIRKLICH keine Brand-Strings enthält.
  - Wenn der grep leer bleibt: keine Änderung. Optional einen englischen Code-Kommentar am Top ergänzen wie:
    `// All three principles are framework-generic (Hamilton 1792, cross-validation, Ed25519 audit) — applicable to any Personenauswahl-Verfahren, not Bürgerinnenrat-specific.`
  - Wenn doch Brand-Strings auftauchen: generisch reformulieren (gleicher Stil wie Task 2).

  **3.5 — apps/web/src/docs/Beispiele.tsx (optionaler Quer-Link):**
  - Mit `grep -n "Bürger\|Bürgerrat" apps/web/src/docs/Beispiele.tsx` Brand-Bezüge prüfen.
  - Falls der Einleitungstext `Bürgerrat`-spezifisch ist und ein generischer Cross-Link zu `#/docs/use-cases` fehlt: einen kurzen Quer-Link ergänzen ("Mehr Verfahren-Typen unter [Anwendungsfälle](#/docs/use-cases).") — sonst weglassen.
  - **Keine** Strukturänderung an `FILES` (das Array bleibt 4 Einträge).

  **Anti-Patterns:**
  - KEINE drei separaten Sub-Routes (`/use-cases/buergerinnenrat`, `/use-cases/landeskonferenz`, ...) — Akkordeon ist die locked-Entscheidung.
  - KEIN Tab-Layout (versteckt Inhalt).
  - KEIN Modus-Toggle in Stage1 oder Anywhere — die Use-Case-Wahl ist Doku, keine Konfiguration.
  - KEINE neue Lazy-Library — `<details>`/`<summary>` ist DOM-nativ.
  </action>
  <verify>
  <automated>
  cd /root/workspace && pnpm --filter @sortition/web typecheck \
    && pnpm --filter @sortition/web test \
    && pnpm --filter @sortition/web exec playwright test --project=chromium tests/e2e/docs.spec.ts tests/e2e/routing.spec.ts tests/e2e/sidebar-nav.spec.ts \
    && [ -f apps/web/src/docs/UseCases.tsx ] \
    && grep -n "use-cases" apps/web/src/App.tsx \
    && grep -n "use-cases" apps/web/src/docs/DocsHub.tsx \
    && grep -n "Anwendungsfälle" apps/web/src/docs/DocsHub.tsx \
    && grep -n "Bürgerinnenrat" apps/web/src/docs/UseCases.tsx \
    && grep -n "Landeskonferenz" apps/web/src/docs/UseCases.tsx \
    && grep -n "Vereinsgremium" apps/web/src/docs/UseCases.tsx \
    && pnpm --filter @sortition/web build
  </automated>
  </verify>
  <done>
  - `apps/web/src/docs/UseCases.tsx` existiert; verwendet `DocsLayout`; enthält drei `<section>` mit `<h2>` für Bürgerinnenrat, Landeskonferenz, Vereinsgremium; jede Sektion ein `<details open>`.
  - `App.tsx` `DocsRoute`-Union + `DOCS_ROUTES`-Set enthalten `'use-cases'`.
  - `DocsHub.tsx` lazy-importiert `UseCases`, hat einen Tile in `TILES`, einen Eintrag in `TITLES`, und einen Case in `renderSubpage`.
  - Hash-Route `#/docs/use-cases` rendert die neue Page (testbar in `routing.spec.ts`/`docs.spec.ts`).
  - TrustStrip.tsx unverändert (oder nur Code-Kommentar ergänzt).
  - `pnpm --filter @sortition/web build` erfolgreich (neuer lazy-Chunk für UseCases.tsx).
  - Single commit (oder zwei wenn Diff zu groß): `70: feat(docs): add use-cases hub with 3 anwendungsbeispiele`.
  </done>
</task>

<task type="auto">
  <name>Task 4: README + CLAUDE.md + Code-Kommentare aktualisieren</name>
  <files>
    README.md,
    CLAUDE.md,
    packages/core/src/stage1/sample-size.ts,
    apps/web/tailwind.config.cjs
  </files>
  <action>
  README + CLAUDE.md generischer aufmachen, Code-Kommentare in zwei Files neutralisieren. Live-URL bleibt `flomotlik.github.io/buergerinnenrat/` (out-of-scope laut CONTEXT.md).

  **4.1 — README.md:**
  - Z. 1: `# Bürgerinnenrat — Sortition Tool` → `# Personenauswahl — stratifizierte Zufallsauswahl`.
  - Z. 5 (Beschreibung): "Browser-natives Werkzeug für die stratifizierte Zufallsauswahl von Personen für Bürger:innenräte (Deutschland und Österreich)." → "Browser-natives Werkzeug für die stratifizierte Zufallsauswahl von Personen — z.B. für Bürgerinnenräte (DE/AT, BMG §46), Landeskonferenz-Delegation oder Vereinsgremien."
  - Z. 7 (Live-URL): `**Live:** <https://flomotlik.github.io/buergerinnenrat/>` → `**Live (vorläufige URL):** <https://flomotlik.github.io/buergerinnenrat/> — die URL wird mit der Infrastruktur-Migration aktualisiert (siehe Issue #73, deferred).`
  - **Neu: Rebrand-Note (kompakt, ersetzt CHANGELOG.md, ~3 Zeilen)** — direkt unter dem ersten Absatz oder als neue Sub-Sektion `## Rebranding-Hinweis`:
    > "Dieses Repository hieß bis 2026-05 *Bürgerinnenrat — Sortition Tool*. Mit der Erweiterung auf weitere Anwendungsfälle (Delegierten-Auswahl, Vereinsgremien) heißt das Produkt jetzt **Personenauswahl**. Die Bürgerinnenrat-Funktionalität, BMG-§46-Kontext und Herzogenburg-Beispieldaten bleiben unverändert — Bürgerinnenrat ist *einer* von drei dokumentierten Use Cases (siehe Doku → Anwendungsfälle in der App)."
  - **Neu: Disclaimer für historische Brand-Referenzen (~2 Zeilen)** — direkt unter der Rebrand-Note oder als Hinweis-Block am Ende:
    > "*Hinweis:* Internes Planungs-Material und Research-Artefakte unter `sortition-tool/`, `research/` und `docs/iteration-*` referenzieren weiterhin den ursprünglichen Bürgerrats-Kontext, weil sie historische Artefakte sind. Aktuelle UI und Doku verwenden den generischen Namen *Personenauswahl*."
  - Z. 42-46, 80-87, 92-117 (Stage-1-Beschreibung): grep auf `Bürger` und neutralisieren wo es generisch geht. Wo es BMG-§46 oder Herzogenburg-spezifisch ist (z.B. `siehe Herzogenburg-Beispiel`), als Beispiel-Hinweis stehen lassen ("Beispiel: Bürgerinnenrat-Workflow nach BMG §46 — siehe Herzogenburg-Daten in `apps/web/public/sample-data/`."). Subsection-Header generisch ("Stage 1 — Stichprobe aus Pool" statt "Stage 1 — Versand-Liste für Bürgerinnenrat").

  **4.2 — CLAUDE.md, Z. 7 (Projekt-in-einem-Satz):**
  Original: "Browser-native, backend-lose Sortition-Web-App für stratifizierte Zufallsauswahl in Bürgerräten (Deutschland/Österreich). Iteration 1 ist gebaut, Engine B (Pyodide) bleibt für Iteration 2."
  Ersetze den ersten Satz durch: "Browser-native, backend-lose Sortition-Web-App für **Personenauswahl** (stratifizierte Zufallsauswahl), entwickelt für Bürgerinnenräte (DE/AT) und übertragbar auf weitere Verfahren wie Delegierten-Auswahl oder Vereinsgremien."
  Zweiter Satz ("Iteration 1 ist gebaut …") bleibt.

  Z. 21 ("Bürgerrat-Kontext und Gesamteinordnung" als Beschreibung des `research/00-synthesis.md`-Verweises): bleibt — das ist ein historisch korrekter Verweis auf den Inhalt der Research-Datei.

  Restliche `Bürgerrat`/`Bürger:innenrat`-Vorkommen in CLAUDE.md (z.B. Z. 72 "Wenn überhaupt … Bürger:innenrat") — wenn sie sich auf historische Kontextualisierung beziehen, lassen. Wenn sie aktuelles UI-Branding behaupten, generischer formulieren.

  **4.3 — packages/core/src/stage1/sample-size.ts, Header-Kommentar Z. ~7-12:**
  Original (sinngemäß): JSDoc-Header erwähnt "Bürgerrat-Praxis" und "Bürgerräte AT" als Quelle für die OUTREACH_DEFAULTS-Raten.
  Reformuliere zu (englisch, da Code-Kommentare englisch sind laut CLAUDE.md): "Outreach response-rate defaults derived from sortition practice — empirical from Bürgerrat verfahren in DE/AT (sortition-foundation, Es geht LOS), and applicable to comparable selection processes (delegation, internal panels) with similar anonymous-outreach characteristics."

  Quellenangabe (`@see` o.ä.) NICHT entfernen — die Defaults sind empirisch begründet, die Begründung muss erhalten bleiben.

  **4.4 — apps/web/tailwind.config.cjs, Z. ~15-19 (Brand-Color-Familien-Kommentar):**
  Original: Erwähnt "Bürger:innenrat" als Brand und "Bürgerrat = zivil/demokratisch" als Farb-Begründung.
  Reformuliere zu: "Brand color family for Personenauswahl — civic green signals democratic / participatory framing, applicable to Bürgerräte and other stratified-selection use cases."

  **Out-of-scope (laut CONTEXT.md):**
  - `vite.config.ts` `base` — bleibt `/buergerinnenrat/`.
  - `playwright.config.ts`, `playwright-live.config.ts` — bleiben (Pfad-Konfig).
  - `apps/web/src/index.css:3-4` Verweis auf `design_handoff_buergerinnenrat/` — Verzeichnis-Rename out-of-scope.
  - `.github/workflows/deploy.yml`, `docker-build.yml` — bleiben.
  - `docs/iteration-2-issue-synthesis.md`, `sortition-tool/*.md`, `research/*.md` — historische Artefakte, bleiben (durch README-Disclaimer in §4.1 abgedeckt).
  </action>
  <verify>
  <automated>
  cd /root/workspace && pnpm --filter @sortition/web typecheck \
    && pnpm --filter @sortition/web test \
    && grep -n "Personenauswahl" README.md \
    && grep -n "Personenauswahl" CLAUDE.md \
    && grep -n "Anwendungsfälle\|Use Cases\|use-cases" README.md \
    && grep -n "historische Artefakte\|sortition-tool" README.md \
    && grep -n "Personenauswahl\|comparable selection" packages/core/src/stage1/sample-size.ts \
    && grep -n "Personenauswahl\|civic green" apps/web/tailwind.config.cjs
  </automated>
  </verify>
  <done>
  - README.md Titel + Beschreibung + Live-URL-Note + Rebrand-Note + Disclaimer (verbleibende historische Brand-Referenzen) erwähnt.
  - README.md Stage-1-Sektion neutraler, Bürgerrat als Beispiel.
  - CLAUDE.md Satz 1 nennt "Personenauswahl" als Produkt; Bürgerinnenrat als ursprünglicher Anwendungsfall.
  - `packages/core/src/stage1/sample-size.ts` Header-Kommentar englisch + neutralisiert; Quellenangabe behalten.
  - `apps/web/tailwind.config.cjs` Brand-Color-Familien-Kommentar generisch.
  - Single commit: `70: docs: update README and CLAUDE.md for Personenauswahl rebrand`.
  </done>
</task>

<task type="auto">
  <name>Task 5: Final wrap — Issue auf done</name>
  <files>.issues/70-rebrand-personenauswahl/ISSUE.md</files>
  <action>
  ISSUE.md frontmatter: `status: open` → `status: done`. Optional kurzer Eintrag in der Issue-Body unter neuer Sektion `## Erledigt am 2026-05-XX` mit 2-3 Stichpunkten was umgesetzt wurde (welche Phasen, welche Acceptance Criteria erfüllt, was deferred bleibt — Verweis auf `73-infra-migration-personenauswahl-gruene` falls existent oder anzulegen).

  Final-Verifikation vor dem Commit:
  - Volle Test-Suite grün: `pnpm --filter @sortition/web test`, `pnpm --filter @sortition/web typecheck`, `pnpm --filter @sortition/web exec playwright test`, `pnpm --filter @sortition/web build`.
  - Manueller Smoke (optional, nicht executor-pflicht): App lokal starten, Hash auf `#/docs/use-cases` setzen, Akkordeon prüfen.
  </action>
  <verify>
  <automated>
  cd /root/workspace && pnpm --filter @sortition/web typecheck \
    && pnpm --filter @sortition/web test \
    && pnpm --filter @sortition/web exec playwright test \
    && pnpm --filter @sortition/web build \
    && grep -n "^status: done" .issues/70-rebrand-personenauswahl/ISSUE.md
  </automated>
  </verify>
  <done>
  - ISSUE.md `status: done`.
  - Vollständige Test-Suite grün.
  - Build successful.
  - Single commit: `70: docs(issues): mark issue done`.
  </done>
</task>

</tasks>

<verification>
Nach allen Tasks final ausführen:

```bash
cd /root/workspace
pnpm --filter @sortition/web typecheck                           # TS strikt grün
pnpm --filter @sortition/web test                                 # Unit-Tests grün
pnpm --filter @sortition/web exec playwright test                 # Alle E2E grün (alle Browser)
pnpm --filter @sortition/web build                                # Production-Build erfolgreich

# Brand-Sweep — keine sichtbaren UI-Brand-Strings mehr
! grep -rn "Bürger:innenrat\|Bürgerinnenrat" apps/web/src/shell/ apps/web/src/Overview.tsx apps/web/index.html
# Stage1 Tooltips generisch
! grep -n "Bürgerrats-Methodik" apps/web/src/stage1/Stage1Panel.tsx
# Personenauswahl ist überall etabliert
grep -rn "Personenauswahl" apps/web/src/ README.md CLAUDE.md
# Use-Case-Hub ist routebar
grep -n "use-cases" apps/web/src/App.tsx apps/web/src/docs/DocsHub.tsx
[ -f apps/web/src/docs/UseCases.tsx ]
```

**Smoke-Check der nicht-anzufassenden Bereiche** (Sicherheitsnetz):
```bash
# vite.config.ts base bleibt unverändert
grep -n "/buergerinnenrat/" apps/web/vite.config.ts
# Workflows unverändert
grep -n "buergerinnenrat" .github/workflows/deploy.yml .github/workflows/docker-build.yml
# Verzeichnis design_handoff_buergerinnenrat/ existiert weiterhin
[ -d design_handoff_buergerinnenrat ] || echo "WARNING: design_handoff_buergerinnenrat dir missing — out-of-scope target violated"
```

**Erwartete Commit-Anzahl auf dem Branch:** 5 (eine pro Task), vor möglichem PR-Merge auch ein optionaler `ship`-Schritt.
</verification>

<success_criteria>
Mapping zu ISSUE.md Acceptance Criteria (locked nur In-App-Branding + Doku):

**Code- / Config-Renames** (in-scope):
- README.md Titel + Beschreibung → "Personenauswahl …" — Task 4
- index.html `<title>` aktualisiert — Task 1
- Stage1Panel + SampleSizeCalculator: generische Formulierungen, Bürgerrat als ein Beispiel — Task 2
- Test-Daten-Pfade `herzogenburg-*`/`kleinstadt-*` bleiben — keine Änderung (out-of-scope-Akzeptanz)
- Tailwind-Color-Familien-Kommentar generisch — Task 4

**OUT-OF-SCOPE laut CONTEXT.md (nicht erledigt, nicht zu erledigen):**
- vite.config.ts `base` — bewusst unangetastet
- deploy.yml + docker-build.yml — bewusst unangetastet
- Repo-Rename, Domain-Migration, 301-Redirects, gh-pages-Update — alle in Follow-up-Issue 73
- Verzeichnis-Rename `design_handoff_buergerinnenrat/` — bewusst unangetastet

**UI-Copy:**
- App-Header / Sidebar Wordmark = "Personenauswahl" — Task 1 (Brand.tsx)
- Stage1Panel-Tooltips generisch — Task 2
- SampleSizeCalculator-Helper-Text mit drei Beispielen — Task 2
- Bürgerinnenrat-Beispiele bleiben sichtbar als eines von mehreren — Task 3 (Use-Case-Hub) + Task 2 (Stage1Panel)
- Deutsche Hauptsprache bleibt — alle UI-Texte in den Tasks deutsch

**Doku-Erweiterung — Use-Case-Hub:**
- Neuer Doku-Bereich `apps/web/src/docs/use-cases/` (umgesetzt als Single-File `UseCases.tsx` mit Akkordeon, weil Researcher-Empfehlung gegen Sub-Routes für ~150–300 Wörter pro Use Case) — Task 3
- Drei gleichberechtigte Use Cases (Bürgerinnenrat, Landeskonferenz, Vereinsgremium) — Task 3
- Jede Sektion zeigt Workflow + Beispiel-Daten + Audit-Trail — Task 3
- Hub-Übersicht macht klar: Tool ist immer dasselbe — Task 3 (Einleitungstext der UseCases.tsx)
- Anschreib-/Antwort-Status pflegt User extern — Task 3 (im Einleitungstext explizit)
- TrustStrip.tsx geprüft (bereits generisch, kein Diff) — Task 3
- Generische Doku-Sektion "Wofür ist dieses Tool geeignet?" auf Startseite — abgedeckt durch Overview.tsx-Subtitle-Edit (Task 1) + Tile in DocsHub.tsx (Task 3)

**Migration / Backward-Compat:**
- 301-Redirect / Repo-Rename / gh-pages — out-of-scope
- CHANGELOG-Eintrag → ersetzt durch Rebrand-Note in README.md (Task 4)
- CLAUDE.md Satz 1 aktualisiert — Task 4

**Verifikation:**
- Alle Playwright-Tests grün (4 Specs auf testid-Selektor migriert) — Task 1 + Task 5
- Live-Smoke aktualisiert (Regex erweitert) — Task 1
- Manuelles Smoke (optional) — Task 5
- Audit-Export-Format — kein Brand-Eintrag im Manifest (verifiziert in RESEARCH §"Risiko 1"), keine Änderung nötig
</success_criteria>
