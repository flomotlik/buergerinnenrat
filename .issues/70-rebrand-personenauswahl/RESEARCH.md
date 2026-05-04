# Research: Rebranding Bürgerinnenrat → Personenauswahl + Use-Case-Hub

**Researched:** 2026-05-04
**Issue:** 70-rebrand-personenauswahl
**Confidence:** HIGH (pure code/copy/doc work, no ecosystem unknowns)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
1. **Produktname: Personenauswahl** — Verwendung in UI-Header, README, Doku, Audit-Manifesten.
2. **Scope nur In-App-Branding + Doku.** Keine Repo-Umbenennung, keine Domain-Migration, keine `vite.config.ts` `base`-Pfad-Änderung, keine CI-/Workflow-Pfad-Änderungen (`deploy.yml`, `docker-build.yml` Image-Namen bleiben).
3. **UI-Framing: generic-first.** App-Header / Sidebar / Default-Copy sprechen generische Personenauswahl-Sprache. Bürgerinnenrat-Spezifika (BMG §46, Bundes/Gemeinde-Bürgerrat-Größen) bleiben kontext-gebunden im Use-Case-Hub und (für TrustStrip) ggf. konditional sichtbar.
4. **Generisches Tool + Use-Case-Beispiele:** Drei zusammensetzbare Primitive (Auswahl, Quoten-Override #71, Nachwahl #48 3b). Verschiedene Verfahren = dieselbe Komposition mit anderen Pool-Größen / Workflow-Reihenfolgen, organisatorisch nicht algorithmisch.
5. **Use-Case-Hub mit drei gleichberechtigten Beispielen** (Bürgerinnenrat, Landeskonferenz / Parteitag-Delegation, Internes Auswahl-Verfahren / Vereinsgremium). Jede Seite zeigt: Workflow mit den drei Primitiven, Beispiel-Datei, was im Audit-Trail erscheint.
6. **Anschreib-/Antwort-Status pflegt User extern.** Doku stellt das explizit klar — Tool macht das nicht und braucht dafür kein UI.
7. **Issues bleiben file-basiert** (`.issues/`).

### Claude's Discretion
- Konkrete UI-Copy-Wordings (vom User abnehmen lassen).
- Aufbau Use-Case-Hub: Tab vs. Sub-Routes vs. Akkordeon — Empfehlung in §2.
- Konkretes Beispiel-Wording für Delegierten-Auswahl.
- Logo / Favicon-Änderung — nur falls bestehendes Logo "Bürgerinnenrat" trägt.
- CHANGELOG-Eintrag (es gibt heute keine `CHANGELOG.md` — siehe Risiko #4).

### Deferred Ideas (OUT OF SCOPE)
Repo-Rename, Domain-Migration, `vite.config.ts` `base`-Änderung, alle CI-Pfad-Anpassungen, 301-Redirects, Audit-Manifest-Versionierung für Rebrand, Verzeichnis-Rename `design_handoff_buergerinnenrat/`, Stakeholder-Kommunikation mit Pilot-Partner, Multi-Mandanten-Modus.
</user_constraints>

## Summary

Das Rebranding ist ein eng abgegrenztes Copy- und Doku-Refactor. Es gibt **genau sechs UI-Surface-Files** mit sichtbaren "Bürger:innenrat"/"Bürgerrats"-Strings (Brand.tsx, Overview.tsx, App.tsx h1, index.html `<title>`, Stage1Panel.tsx Tooltips, SampleSizeCalculator.tsx Helper-Text). Hinzu kommen **vier Test-Specs** mit hardgecodeten String-Asserts (`csv-import`, `smoke`, `overview`, `site-smoke`) — alle vier brechen, wenn der Brand-Wordmark geändert wird. Kein Audit-Manifest-Code referenziert den Produktnamen (nur `input_csv_filename`), daher ist Risiko #1 aus ISSUE.md (Manifest-Versionierung) für diese Issue gegenstandslos — solange wir keinen `tool_name`-Eintrag einführen.

Die bestehende Doku-Architektur (`apps/web/src/docs/DocsHub.tsx` + `DocsLayout.tsx` + 7 Sub-Components mit `lazy()`-Imports und `DocsRoute`-Union-Type in `App.tsx:49-57`) ist sauber erweiterbar. Empfohlener Weg: Hub-Tile "Anwendungsfälle" + Sub-Component `UseCases.tsx` mit drei Akkordeon-Sektionen (eine Route, drei `<details>`/`<section>`-Blöcke; eigene Sub-Routes überdimensioniert für drei Inhalts-Seiten).

TrustStrip-Konditionalität ist die größte Design-Frage: Das Tool hat heute keinen "Modus"-Begriff und CONTEXT.md verbietet ihn explizit. Empfehlung: TrustStrip neutralisieren ("Algorithmus seit 1792 / Cross-validiert / Signiertes Audit-Protokoll" sind alle generisch — kein Bürgerrats-spezifischer Inhalt darin), und den BMG §46-Hinweis (`Stage1Panel.tsx:491-516`) konditional an die Spalten-Auto-Erkennung koppeln (wenn `staatsbuergerschaft` oder `geburtsjahr` als Stage1-Spalten erkannt werden = Melderegister-Workflow → §46-Hinweis zeigen, sonst ausblenden). Das ist datengetrieben, nicht modal, und respektiert "kein Pipeline-Toggle".

**Primary recommendation:** 11 Edits an 6 Source-Files + 4 Test-Updates + 1 neue Doku-Component (`UseCases.tsx`) + 1 neuer DocsRoute-Slug (`'use-cases'`) + 1 neues Hub-Tile + README-Rewrite (Sektion 1, Live-URL bleibt).

## Codebase Analysis

### Relevant Files

| Datei | Rolle | Brand-Strings | Kategorie |
|-------|-------|---------------|-----------|
| `apps/web/src/shell/Brand.tsx:40` | Sidebar-Logo + Wordmark | `Bürger:innenrat` | UI |
| `apps/web/src/shell/Brand.tsx:41` | Untertitel | `Stratifiziertes Losverfahren` | UI |
| `apps/web/src/Overview.tsx:22` | Landing-Hero `<h1>` | `Bürger:innenrat` | UI |
| `apps/web/src/Overview.tsx:24` | Landing-Subtitle | `…in Bürgerräten` | UI |
| `apps/web/src/App.tsx:241` | sr-only `<h1>` für Stage1/Stage3 | `Bürger:innenrat` | UI (a11y) |
| `apps/web/src/App.tsx:239` | Code-Kommentar | `'Bürger:innenrat'` | Comment |
| `apps/web/index.html:6` | `<title>` Browser-Tab | `Bürger:innenrat — Versand-Liste & Panel-Auswahl` | UI |
| `apps/web/src/stage1/Stage1Panel.tsx:41,43` | Tooltip-Text Geschlecht-Achse | `…Bürgerrats-Methodik.` | UI |
| `apps/web/src/stage1/SampleSizeCalculator.tsx:114` | Helper-Text Panelgröße | `30 für einen Gemeinde-Bürgerrat, 160 für einen Bundes-Bürgerrat` | UI |
| `apps/web/src/docs/Bmg46.tsx` | Doku-Subpage zu §46 | (keine Brand-Strings) | Docs (bleibt) |
| `apps/web/src/docs/Beispiele.tsx` | Beispiel-Daten-Liste | `BASE_URL`-Kommentar L45 (`/buergerinnenrat/`) | Comment (bleibt — Pfad ist out-of-scope) |
| `packages/core/src/stage1/sample-size.ts:7-12` | Konstanten-Header-Kommentar | `Bürgerrat-Praxis`, `Bürgerräte AT` | Comment (Engine-Verhalten — Begründung in Doku, kann generischer formuliert werden) |
| `apps/web/tailwind.config.cjs:15-19` | Brand-Color-Familien-Kommentar | `Bürger:innenrat`, `Bürgerrat = zivil` | Comment |
| `apps/web/src/index.css:3-4` | Token-Source-Kommentar | `design_handoff_buergerinnenrat/` (Verzeichnisname) | Comment (Verzeichnis-Rename out-of-scope) |
| `apps/web/vite.config.ts:37` | `base` Pfad | `/buergerinnenrat/` | OUT-OF-SCOPE (CONTEXT.md L15) |
| `apps/web/playwright.config.ts:26` | Kommentar | `/buergerinnenrat/` | OUT-OF-SCOPE |
| `apps/web/playwright-live.config.ts:7` | LIVE_BASE_URL | `flomotlik.github.io/buergerinnenrat/` | OUT-OF-SCOPE |
| `.github/workflows/deploy.yml`, `docker-build.yml` | CI | base/Image-Namen | OUT-OF-SCOPE (CONTEXT.md L16) |
| `apps/web/tests/e2e/csv-import.spec.ts:14` | E2E-Spec | `getByRole('heading', { name: 'Bürger:innenrat' })` | TEST (muss mit) |
| `apps/web/tests/e2e/smoke.spec.ts:5` | E2E-Spec | `toHaveText('Bürger:innenrat')` | TEST (muss mit) |
| `apps/web/tests/e2e/overview.spec.ts:19` | E2E-Spec | `toContainText('Bürger:innenrat')` | TEST (muss mit) |
| `apps/web/tests/smoke-live/site-smoke.spec.ts:26` | Live-Smoke | `/Bürger\|Sortition\|Buergerinnenrat/i` (regex) | TEST (Regex erweitern: `\|Personenauswahl`) |
| `README.md:1` | Repo-Titel | `# Bürgerinnenrat — Sortition Tool` | Docs (rewrite Sektion 1) |
| `README.md:5,42-46,80-87,92-117` | Beschreibung, Stage-1-Sektion | mehrfach `Bürgerrat`/`Bürger:innenrat` | Docs (rewrite Sektion 1, Stage-1-Block neutraler) |
| `CLAUDE.md:7,21,72` | Projekt-Beschreibung | `Bürgerräten`, `Bürgerrat-Kontext-Research` | Docs (Satz 1 generischer, Rest belassen) |
| `docs/iteration-2-issue-synthesis.md` | Doku | mehrere | OUT-OF-SCOPE (Iteration-Doku, historisch) |
| `sortition-tool/*.md` | Planungsdokumente | viele | OUT-OF-SCOPE (Planungs-Artefakte) |
| `research/*.md` | Research-Background | viele | OUT-OF-SCOPE |

### Interfaces

<interfaces>
// From apps/web/src/App.tsx — Routing-Backbone
export type DocsRoute =
  | 'hub'
  | 'algorithmus'
  | 'technik'
  | 'verifikation'
  | 'glossar'
  | 'bmg46'
  | 'limitationen'
  | 'beispiele';
// Hash-Routing parser: parseHash(hash: string): { mode, docsRoute }
// Pattern: '#/docs/<sub>' wird auf DOCS_ROUTES Set geprüft → unbekannt fällt auf 'hub'.
// Erweiterung für #70: 'use-cases' zur Union + zum DOCS_ROUTES Set hinzufügen.

// From apps/web/src/docs/DocsHub.tsx — Tile-Liste + Sub-Page-Switch
interface TileDef {
  slug: Exclude<DocsRoute, 'hub'>;
  title: string;
  description: string;
  icon: JSX.Element;
}
const TILES: ReadonlyArray<TileDef>;  // 7 Tiles heute — neu: 8 (mit 'use-cases')
const TITLES: Record<Exclude<DocsRoute, 'hub'>, string>;  // Map slug → angezeigter Titel
function renderSubpage(route: Exclude<DocsRoute, 'hub'>): JSX.Element;  // switch — 7 cases heute
// Erweiterung: TILES um Eintrag erweitern, TITLES['use-cases'] = 'Anwendungsfälle',
// renderSubpage case 'use-cases': return <UseCases />, lazy() für UseCases.tsx

// From apps/web/src/docs/DocsLayout.tsx
interface Props { title: string; back?: () => void; children: JSX.Element; }
// Renders: header (h1 = title, optional back-link) + sticky 220px TOC (auto-extracted
// from <h2>) + 68ch reading column. Use-Case-Hub-Sub-Page kann denselben Layout
// nutzen — drei <h2>-Sektionen (eine pro Use Case) → automatischer TOC.

// From apps/web/src/shell/Brand.tsx
export const Brand: Component<{ subtitle?: string }>;
// Default subtitle: 'Stratifiziertes Losverfahren'
// Renders: assembly-icon SVG + wordmark <span class="font-serif">…</span>

// From apps/web/src/stage1/TrustStrip.tsx
export interface TrustPrinciple { testid; title; sub; hash; icon; iconColor }
export const TRUST_PRINCIPLES: ReadonlyArray<TrustPrinciple>;  // 3 Karten
// Heute: alle 3 sind generisch (Algorithmus, Cross-validiert, Audit-Protokoll).
// Bezug zu Bürgerrat ist NUR im Hash-Target ('#/docs/verifikation', etc.) implizit.
// Empfehlung: keine Konditionalisierung des TrustStrip nötig — er IST schon generisch.
// Single source of truth: Overview.tsx importiert dieselbe Konstante.

// From apps/web/src/stage1/Stage1Panel.tsx — BMG-§46-Banner
// Lines 491-516: <aside data-testid="stage1-bmg-hint"> — wird gerendert wenn parsed()
// Bedingt-rendern via Heuristik: parsed()?.headers enthält 'staatsbuergerschaft' OR
// 'geburtsjahr' OR mapping resolvte zu 'district'/'age_band' → Melderegister-Workflow → zeigen.
// Sonst ausblenden. Datengetrieben, kein Modus-Toggle.

// From apps/web/src/docs/Beispiele.tsx
interface ExampleFile { filename; slug; personen; stage; beschreibung; }
const FILES: ExampleFile[];  // 4 Einträge — bleibt unverändert
// Wird vom Use-Case-Hub verlinkt (Bürgerinnenrat-Use-Case verweist auf herzogenburg-*).
// Für Use-Cases 2+3 keine neuen CSV-Files in dieser Issue — Doku verweist auf
// generische Idee "ähnliche CSV mit Mitgliederliste".

// From packages/core/src/stage1/sample-size.ts (interface, NOT changed)
export type OutreachMode = 'mail-only' | 'mail-plus-phone' | 'custom';
export const OUTREACH_DEFAULTS: Record<OutreachMode, OutreachRates>;
export const DEFAULT_SAFETY_FACTOR = 1.5;
export interface SampleSizeProposal { panelSize; outreach; rateUsed; safetyFactor; recommended; range }
export function suggestSampleSize(...): SampleSizeProposal | null;
// API-Signatur unverändert. Nur Header-Kommentar wird neutraler ("Sortition-Praxis"
// statt "Bürgerrat-Praxis").
</interfaces>

### Reusable Components

- **`DocsLayout`** als Shell für die neue Use-Cases-Subseite (sticky TOC + 68ch). Drei `<h2>`-Tags ergeben automatisch ein 3-Punkte-TOC.
- **`TRUST_PRINCIPLES`-Array** ist bereits Single-Source-of-Truth (Overview + TrustStrip teilen es). Wenn wir den Sub-Title eines Cards auf "z.B. für Bürgerräte und ähnliche Verfahren" ändern wollten, würde das automatisch beide Surfaces synchron halten — aber: aktuell ist keiner der Sub-Titles Brand-spezifisch, daher kein Eingriff nötig.
- **`Beispiele.tsx` `FILES`-Array** für den Bürgerinnenrat-Use-Case-Eintrag wiederverwenden (Direkt-Link statt Datei-Duplikate).
- **Hash-Routing-Parser** in `App.tsx:81-101` ist erweiterbar — eine neue DocsRoute kostet 1 Eintrag in der Union, 1 in `DOCS_ROUTES`, 1 case in `renderSubpage`.

### Potential Conflicts

- **`packages/core/src/stage1/sample-size.ts:7-12`**: Konstanten-Begründung referenziert Bürgerrat-Praxis (Sortition-Foundation 5–10 % mail, 30–50 % mail+phone). Das ist die *Quelle* der Default-Raten — wenn wir den Kommentar generischer formulieren, sollten wir die Quellenangabe explizit beibehalten ("…aus Bürgerrats-Praxis empirisch belegt; Werte gelten ähnlich für andere Verfahren mit ähnlich anonymem Outreach"). Die Defaults selbst nicht ändern — Issue #70 ist ausschließlich Branding.
- **Test-Spec-Bruch:** Vier Specs brechen sofort wenn `Brand.tsx`/Overview-Hero/App-h1 umbenannt werden. Müssen im selben PR mit-aktualisiert werden, sonst läuft CI rot.
- **Iteration-2-Doku** (`docs/iteration-2-issue-synthesis.md`) und Planungs-Artefakte unter `sortition-tool/` referenzieren überall "Bürgerrat" — laut CONTEXT.md Out-of-Scope (historische Artefakte). Risiko: User könnte später noch zu README-Verweisen darauf zurückkommen — siehe Risiken §9.
- **Parallel-Branch `issue/72-excel-upload-support`**: laut Prompt wird `apps/web/src/csv/` → `apps/web/src/import/` umbenannt. `Stage1Panel.tsx:7,9` importiert aus `'../csv/parse'`/`'../csv/derive'` — keine Brand-Strings betroffen, aber Merge-Konflikt-Wahrscheinlichkeit hoch (wegen großer Datei). Planner sollte Reihenfolge dokumentieren: #72 zuerst mergen, dann #70.

### Code Patterns in Use

- **Hash-Routing** mit `window.location.hash` als Single-Source-of-Truth (`App.tsx:138-152`). Tab-Clicks schreiben Hash; `hashchange`-Listener flippt Solid-Signals. Neue Sub-Route folgt diesem Pattern automatisch.
- **`lazy()`-Imports** für jede Doku-Subpage (`DocsHub.tsx:8-14`). UseCases.tsx wird genauso eingebunden — eigener Bundle-Chunk.
- **`data-testid`-First-Selektoren** in den meisten E2E-Specs — robust gegen String-Renames. Die vier brand-string-asserts oben sind Ausnahmen und könnten beim Update auf `data-testid="brand"` (Brand.tsx Z. 14) umgestellt werden, was sie zukunftssicherer macht.
- **`<h1 class="sr-only">`**-Pattern in Stage1/Stage3 (`App.tsx:240-242`) sorgt für a11y-Compliance, wird aber von Tests sichtbar geprüft — beim Rename mit-anpassen.

## Standard Stack

| Komponente | Status | Zweck |
|------------|--------|-------|
| Solid.js + Vite + Tailwind v3 | bestehend | UI-Framework — keine Änderung |
| `lazy()` + `Suspense` | bestehend | Doku-Sub-Page-Splitting — UseCases.tsx integriert sich |
| `<details>`/`<summary>` | DOM-nativ | **empfohlen** für Use-Case-Hub als Akkordeon (nativ a11y, kein Library-Overhead) |
| `data-testid`-Konvention | bestehend | Test-Selektoren — robust gegen Brand-Renames |

### Alternativen Considered für den Use-Case-Hub

| Statt | Could Use | Tradeoff |
|-------|-----------|----------|
| Eine Sub-Route `/docs/use-cases` mit drei `<details>`-Akkordeon-Sektionen | Drei eigene Sub-Routes (`/docs/use-cases/buergerinnenrat`, `/use-cases/landeskonferenz`, `/use-cases/vereinsgremium`) | Drei Sub-Routes wären "richtiger" für tiefe Inhalte (eigene URLs, eigene TOCs), aber für ~150–300 Wörter pro Use Case Overkill. Akkordeon: 1 Route, alle drei Inhalte gleichberechtigt sichtbar, eine TOC mit Anker-Links pro Use Case. Vorteil: User scrollt einmal durch, kann vergleichen. **Empfehlung: Akkordeon mit 3 Sektionen.** Falls die Inhalte später signifikant wachsen, ist ein Refactor zu Sub-Routes trivial (1 DocsRoute-Slug pro Use-Case). |
| Tab-Layout innerhalb der Use-Cases-Seite | Sub-Routes oder Akkordeon | Tabs verstecken Inhalte → User vergleicht weniger leicht. CONTEXT.md will explizit "gleichberechtigte" Use Cases zeigen. |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TOC für die Use-Cases-Subpage | Eigene TOC-Generierung | `DocsLayout` (extrahiert automatisch alle `<h2>`) | Bestehender Code; konsistent mit anderen Doku-Subpages. |
| Akkordeon-Komponente | React-/Solid-Library | Native `<details>`/`<summary>` | A11y out-of-the-box, kein Bundle-Overhead, Test-Pattern bereits in `Stage1Panel.tsx:963-1016` etabliert. |
| Brand-String-Konstante | Globale `BRAND` const + import | Bewusst nicht — die paar Stellen sind zu unterschiedlich (h1 vs. title vs. Tooltip) und String-Replace ist robuster als ein zentraler Refactor | Nur 6 UI-Stellen; Aufwand für Indirektion höher als Nutzen. |

## Architektur Patterns

### Empfohlener Approach für Use-Case-Hub

1. **Route-Slug:** `'use-cases'` — neuer Eintrag in `DocsRoute`-Union (`App.tsx:49-57`) und `DOCS_ROUTES`-Set (`App.tsx:59-68`).
2. **Tile in `DocsHub`:** Neuer Eintrag in `TILES`-Array (`DocsHub.tsx:43-145`) mit Title "Anwendungsfälle", Description "Drei dokumentierte Verfahren — und wie sie dasselbe Tool kombinieren.", passendes Icon (z.B. drei Personen-Silhouetten oder Layer-Stack-Icon). Eintrag in `TITLES`-Map (`DocsHub.tsx:147-155`) und `renderSubpage`-Switch (`DocsHub.tsx:158-175`).
3. **Sub-Component `apps/web/src/docs/UseCases.tsx`:** Folgt dem Pattern von `Beispiele.tsx`/`Bmg46.tsx`. Drei `<section>` mit jeweils `<h2>` (Use-Case-Name) und Inhalt — TOC entsteht automatisch.
4. **Akkordeon optional** mit `<details open={true}>` so dass Default alle drei aufgeklappt sind (lesefreundlich), User aber kollabieren kann.
5. **Cross-Link von Stage1Panel** (`Stage1Panel.tsx:457-466`, der bestehende "Beispiel-Datei verwenden →" Link) NICHT ändern — das ist ein anderer Onramp. Statt dessen ein neuer Link/Hinweis im Helper-Text der `SampleSizeCalculator.tsx:113-115` ("z.B. 30 für Gemeinde-Bürgerrat — siehe [Anwendungsfälle](#/docs/use-cases)").

### Anti-Patterns to Avoid

- **Pipeline-Modi / Mandanten-Wahl bei App-Start.** CONTEXT.md L65 sagt explizit nein. Wenn der User "den richtigen Use-Case" wählen müsste, hätten wir ein zwei-Modus-Tool gebaut. Use-Case-Beispiele sind nur Doku, keine Konfiguration.
- **Konditionaler TrustStrip mit Bürgerrats-Modus-Flag.** Der heutige TrustStrip ist bereits generisch (Hamilton-Algorithmus, Cross-Validation, Audit-Signatur — alles für jede Personenauswahl relevant). Lieber unverändert lassen.
- **Globale "Brand"-Konstante als zentralen Refactor.** Die 6 betroffenen UI-Stellen haben unterschiedlichen Kontext (Wordmark vs. `<title>` vs. sr-only-h1 vs. Tooltip-Text). String-Replace ist klarer und einfacher zu reviewen als eine Indirektionsschicht.

## Common Pitfalls

### Pitfall 1: E2E-Tests brechen ohne Update
**Was geht schief:** Vier Specs asserten hardgecodet auf `'Bürger:innenrat'`. Rename ohne Test-Update → CI rot.
**Wie vermeiden:** Im selben Commit Tests aktualisieren. Empfehlung: auf `data-testid="brand"`-Selektor umstellen (Brand.tsx hat bereits `data-testid="brand"`), dann sind Tests gegen Brand-String-Renames immun.

### Pitfall 2: Live-Smoke-Test prüft regex `/Bürger|Sortition|Buergerinnenrat/i`
**Was geht schief:** Nach Deployment der neuen Strings würde der Live-Smoke ohne Regex-Erweiterung trotzdem grün durchgehen (weil Sortition immer noch passt) — kann zu falscher Sicherheit führen.
**Wie vermeiden:** Regex zu `/Personenauswahl|Bürger|Sortition/i` erweitern und ein eigener Assert auf "Personenauswahl" einführen, sobald deployt.

### Pitfall 3: BMG-§46-Banner versteckt zeigen würde mehrere Use-Cases benachteiligen
**Was geht schief:** Wenn TrustStrip oder §46-Hinweis "nur im Bürgerrats-Workflow" gerendert wird, müssten wir einen Workflow-Wahl-State einführen (= Modus). CONTEXT.md verbietet das.
**Wie vermeiden:** §46-Hinweis (`Stage1Panel.tsx:491-516`) datengetrieben konditional rendern — wenn die hochgeladene CSV typische Melderegister-Spalten hat (`staatsbuergerschaft`, `geburtsjahr`, `sprengel` aus den `autoGuessMapping`-Defaults), zeigen; sonst ausblenden. Heuristik: `parsed()?.headers.some(h => ['staatsbuergerschaft','sprengel','katastralgemeinde'].includes(h.toLowerCase()))`. Kein Modus, sondern reine Datenform-Erkennung. **Alternative**: §46-Banner als generisch umformulieren ("Hinweis: Stratifikation kann nur über Spalten erfolgen, die in deiner Eingabe existieren. Im Melderegister-Kontext sind das z.B. die in §46 BMG aufgelisteten Felder.") — kostengünstigere Variante, immer sichtbar, aber neutraler formuliert.

### Pitfall 4: README-Live-URL bleibt `flomotlik.github.io/buergerinnenrat`
**Was geht schief:** Branding sagt "Personenauswahl", URL sagt "buergerinnenrat" — User-Verwirrung.
**Wie vermeiden:** README muss explizit dazwischen vermitteln: "**Live (vorläufige URL):** https://flomotlik.github.io/buergerinnenrat/ — die URL wird mit der Infrastruktur-Migration angepasst (siehe Issue #73)."

### Pitfall 5: `packages/core/src/stage1/sample-size.ts` Defaults sind aus Bürgerrats-Praxis
**Was geht schief:** Wenn der Header-Kommentar generisch wird, geht die Begründung verloren ("warum 5–10 % bzw. 30–50 %?").
**Wie vermeiden:** Begründung NICHT entfernen, nur den Top-Satz neutralisieren ("Sortition-Praxis (empirisch aus Bürgerrats-Verfahren in DE/AT)") und Quellen ausdrücklich beibehalten.

## Environment Availability

Reine Code/Doku-Änderung — keine neuen Dependencies, keine Tools, keine Runtime-Probes nötig. Existing Stack:
- pnpm-Workspace mit Solid.js, TS, Tailwind v3, Vite — alles installiert
- Playwright für E2E — alle Tests laufen lokal mit `make test-e2e`
- Build via `make build` (Vite production) — Bundle bleibt unverändert in der Größe (1 neue Lazy-Subpage ~ 2 KB gz)

## Project Constraints (from CLAUDE.md)

- **Sprache der Dokumente: Deutsch** (User + Quellen). UI-Copy bleibt deutsch.
- **Code-Kommentare: Englisch** (wie adhocracy-plus). Neue Components bekommen englische JSDoc, wie bestehende Files.
- **Keine positive Affirmation, keine lose Schätzungen** — Reviews fanden substanzielle Probleme. Für #70 spezifisch: keine Branding-Behauptungen ohne Evidenz aus dem Code.
- **Quellenangabe für jede technische Behauptung** (`file:line`) — gilt auch für die Use-Case-Hub-Texte (jeder Verweis "wie in Bürgerrats-Praxis" muss auf research/ oder docs/ pointen).
- **CLAUDE.md selbst** referenziert "Bürgerinnenrat" in Z. 7 ("…in Bürgerräten") und Z. 21 ("Bürgerrat-Kontext"). Nach #70: Z. 7 generischer formulieren ("Browser-native Sortition-Web-App für **Personenauswahl** (stratifizierte Zufallsauswahl), entwickelt für Bürgerinnenräte (DE/AT) und übertragbar auf weitere Verfahren wie Delegierten-Auswahl"). Z. 21 (Pfad zu `research/00-synthesis.md` mit Bezeichner "Bürgerrat-Kontext") kann bleiben — historisch korrekter Verweis.

## Use-Case-Hub Inhalt-Vorschlag (Outline)

### Use Case 1: Bürgerinnenrat (BMG §46, Herzogenburg)

**Was ist das?** Geloster, deliberativ arbeitender Bürger:innenrat auf Gemeinde- oder Bundes-Ebene (Vorbild: österreichische/deutsche Praxis). Nach §46 BMG dürfen Kommunen aus dem Melderegister bestimmte Felder herausgeben; die Auswahl erfolgt zweistufig (Versand-Liste + Antwortenden-Panel).

**Workflow-Schritte (Tool-Primitiven):**
1. **Stage 1 / Auswahl** — Pool: Vollbevölkerung 18+ aus Melderegister; Stichprobe ~300–1500 Personen mittels stratifizierter Zufallsziehung (Stage1-Page).
2. *Anschreiben extern* (Brief, Mail, Telefon-Outreach).
3. **Stage 3 / Auswahl** — Pool: ~30–60 Antwortende mit Selbstauskunft; Maximin-Heuristik wählt das Panel (15–50 Personen) mit Bildung/Migrationshintergrund-Quoten.
4. **Quoten-Override** (#71) bei Bedarf, z.B. wenn ein Quoten-Bound zu hart ist.
5. **Nachwahl** (Stage 4, geplant) bei Drop-out.

**Beispiel-Daten:** `herzogenburg-melderegister-8000.csv` + `herzogenburg-antwortende-60.csv` (siehe [Beispiel-Daten](#/docs/beispiele)).

**Audit-Trail:** Stage 1 produziert `versand-audit-<seed>.json` mit Stichprobe, Stratifikations-Achsen, Soll/Ist pro Stratum, Ed25519-Signatur. Stage 3 ergänzt das Panel-Manifest mit Quoten-Verteilung.

---

### Use Case 2: Landeskonferenz / Parteitag-Delegation

**Was ist das?** Auswahl von 50–100 Delegierten aus einer Mitgliederliste (regionaler Verband, Landesgruppe, Parteiorganisation). Ziel: faire Repräsentation nach Gemeinde, Bezirk, Altersband, Geschlecht, evtl. Funktion. Beispiel: "100 Delegierte aus 87 Gemeinden, mindestens 50 % unter 50 Jahre, mindestens 40 % weiblich."

**Workflow-Schritte:**
1. **Auswahl** — Pool: Mitgliederliste (CSV/Excel-Upload, #72). Direkt ein-stufig: das Tool zieht eine stratifizierte Stichprobe aus der Mitgliederliste auf den Achsen Gemeinde/Bezirk/Altersband/Geschlecht.
2. **Quoten-Override** (#71) — der Verfahrens-Begleiter setzt z.B. die untere Bound für `geschlecht=weiblich` von 35 auf 40.
3. *Anschreiben extern* (Mail-Merge oder Brief).
4. **Nachwahl** bei Absagen — kleinere Auswahl (5–10 Personen) aus dem Pool, mit denselben Quoten und einem neuen Seed.

**Beispiel-Daten:** Generische Mitgliederliste — User generiert sich selbst eine (ähnliches Schema wie `kleinstadt-3000.csv`, ergänzt um Gemeindespalte). Use-Case-Hub-Seite kann ein synthetisches `verband-mitglieder-2400.csv` als optionales Beispiel ankündigen (Future-Issue).

**Audit-Trail:** Identisches Format wie Stage 1 (`versand-audit-<seed>.json`) — die JSON-Struktur ist generisch genug, dass "Versand-Liste" hier "Delegierten-Liste" entspricht. Nichts am Manifest ändert sich.

---

### Use Case 3: Internes Auswahl-Verfahren / Vereinsgremium

**Was ist das?** Niedrigschwelliger Use Case: ein Verein, eine NGO, eine Schule will ein 5–15-köpfiges Gremium aus 50–500 Personen losen — mit einfachen Quoten (z.B. "drei Sitze für jede Altersgruppe"). Kein juristischer Kontext, keine §46-BMG-Komplexität.

**Workflow-Schritte:**
1. **Auswahl** — Pool: Vereins-Mitgliederliste (Excel-Upload, #72). Stratifikation auf 1–2 Achsen (Altersgruppe, evtl. Funktion).
2. **Quoten-Override** (#71) — selten nötig bei kleinen Pools, aber verfügbar für Sonderfälle.
3. *Anschreiben extern* (Mail).
4. **Nachwahl** bei Absage — 1–2 Personen.

**Beispiel-Daten:** Hand-erzeugtes Beispiel mit ~80 Personen reicht. Kann der User selbst aus Kontoliste/CSV-Export bauen.

**Audit-Trail:** Reines `versand-audit-<seed>.json` — die Signatur dient hier eher der internen Transparenz ("alle Mitglieder können den Lauf nachvollziehen") als der juristischen Anforderung.

---

### Hub-Übersicht (Einleitungstext)

> **Drei dokumentierte Verfahren — und wie sie dasselbe Tool kombinieren.**
>
> Personenauswahl ist eine Toolbox aus drei zusammensetzbaren Primitiven: **stratifizierte Auswahl**, **Quoten-Override** und **Nachwahl**. Verschiedene Verfahren-Typen — vom Bürgerinnenrat über die Landeskonferenz bis zum Vereinsgremium — sind dieselbe Komposition mit anderen Pool-Größen und Workflow-Reihenfolgen. Was sich unterscheidet, ist organisatorisch, nicht algorithmisch.
>
> Anschreiben und Antwort-Tracking liegen außerhalb des Tools — der/die Verfahrens-Begleiter:in pflegt das per Excel, Mail-Merge oder Telefon-Liste. Das Tool sieht davon nichts.

## Konkrete UI-Copy-Vorschläge (vom User abnehmen lassen)

| Datei:Zeile | Original | Vorschlag |
|-------------|----------|-----------|
| `Brand.tsx:40` | `Bürger:innenrat` | `Personenauswahl` |
| `Brand.tsx:41` | `Stratifiziertes Losverfahren` | `Stratifiziertes Losverfahren` (bleibt — passt generisch) |
| `index.html:6` | `Bürger:innenrat — Versand-Liste & Panel-Auswahl` | `Personenauswahl — stratifizierte Zufallsauswahl` |
| `Overview.tsx:22` | `<h1>Bürger:innenrat</h1>` | `<h1>Personenauswahl</h1>` |
| `Overview.tsx:24` | `Browser-natives Werkzeug für stratifizierte Zufallsauswahl in Bürgerräten. Daten bleiben lokal, …` | `Browser-natives Werkzeug für stratifizierte Personenauswahl — z.B. für Bürgerinnenräte, Delegierten-Auswahl oder Vereinsgremien. Daten bleiben lokal, …` |
| `App.tsx:241` | `<h1 class="sr-only">Bürger:innenrat</h1>` | `<h1 class="sr-only">Personenauswahl</h1>` |
| `App.tsx:239` (Comment) | `getByRole('heading', { name: 'Bürger:innenrat' })` | `getByRole('heading', { name: 'Personenauswahl' })` |
| `Stage1Panel.tsx:41,43` | `…Standard-Stratifikation in jeder Bürgerrats-Methodik.` | `…Standard-Stratifikation in stratifizierten Auswahl-Verfahren (z.B. Bürgerräte, Delegierten-Auswahl).` |
| `SampleSizeCalculator.tsx:114` | `Z.B. 30 für einen Gemeinde-Bürgerrat, 160 für einen Bundes-Bürgerrat.` | `Z.B. 30 für einen Gemeinde-Bürgerrat, 50–100 für eine Landeskonferenz-Delegation, 160 für einen Bundes-Bürgerrat.` |
| `tailwind.config.cjs:15-19` (Comment) | `Brand-Familie für "Bürger:innenrat"`, `Bürgerrat = zivil/demokratisch` | `Brand-Familie für "Personenauswahl"`, `civic-grün = zivil/demokratisch` |
| `packages/core/src/stage1/sample-size.ts:7-12` (Comment) | `Bürgerrat-Praxis`, `Bürgerräte AT` | `Sortition-Praxis (empirisch aus Bürgerräten in DE/AT, übertragbar auf vergleichbare Verfahren)` |
| `README.md:1` | `# Bürgerinnenrat — Sortition Tool` | `# Personenauswahl — stratifizierte Zufallsauswahl` |
| `README.md:5` | `Browser-natives Werkzeug für die stratifizierte Zufallsauswahl von Personen für Bürger:innenräte (Deutschland und Österreich).` | `Browser-natives Werkzeug für die stratifizierte Zufallsauswahl von Personen — z.B. für Bürgerinnenräte (DE/AT, BMG §46), Landeskonferenz-Delegation oder Vereinsgremien.` |
| `README.md:7` | `**Live:** <https://flomotlik.github.io/buergerinnenrat/>` | `**Live (vorläufige URL):** <https://flomotlik.github.io/buergerinnenrat/> — die URL wird mit der Infrastruktur-Migration aktualisiert (siehe Issue #73).` |
| `CLAUDE.md:7` | `Browser-native, backend-lose Sortition-Web-App für stratifizierte Zufallsauswahl in Bürgerräten (Deutschland/Österreich).` | `Browser-native, backend-lose Sortition-Web-App für **Personenauswahl** (stratifizierte Zufallsauswahl), entwickelt für Bürgerinnenräte (DE/AT) und übertragbar auf weitere Verfahren wie Delegierten-Auswahl.` |

## Test-Impact

| Spec | Brand-Assertion | Update-Pfad |
|------|-----------------|-------------|
| `apps/web/tests/e2e/csv-import.spec.ts:14` | `getByRole('heading', { name: 'Bürger:innenrat' })` | Rename auf `'Personenauswahl'` (sicherer: auf `getByTestId('brand')` umstellen) |
| `apps/web/tests/e2e/smoke.spec.ts:5` | `toHaveText('Bürger:innenrat')` | Rename auf `'Personenauswahl'` |
| `apps/web/tests/e2e/overview.spec.ts:19` | `toContainText('Bürger:innenrat')` | Rename auf `'Personenauswahl'` |
| `apps/web/tests/smoke-live/site-smoke.spec.ts:26` | `/Bürger\|Sortition\|Buergerinnenrat/i` | Regex erweitern: `/Personenauswahl\|Bürger\|Sortition/i`; nach Deployment einen positiven Assert auf "Personenauswahl" einfügen. |

Alle anderen E2E-Specs (`stage1*.spec.ts`, `docs.spec.ts`, `routing.spec.ts`, `trust-strip.spec.ts`, `sidebar-nav.spec.ts`, `a11y.spec.ts`, `mobile-touch-targets.spec.ts`, `audit-footer-parity.spec.ts`, `beispiele-stage1.spec.ts`, `end-to-end.spec.ts`, `stage3.spec.ts`) verwenden ausschließlich `data-testid`-Selektoren und sind brand-string-immun. **Erwartete Test-Bruchquote: ~4 von 19 Specs (21 %)** — alle vorhersehbar und mit Single-Line-Edits behebbar.

## Risiken für den Planner

### Risiko 1: Audit-Manifest-Format
**Status:** **Nicht-Risiko für Issue #70.** `packages/core/src/stage1/audit-builder.ts` enthält keinen Tool-Namen-Eintrag (verifiziert per Grep — nur `input_csv_filename` als String-Feld). Der Rebrand erscheint nicht in Audit-JSONs. CONTEXT.md L62 deferred Audit-Manifest-Versionierung explizit; alte Manifeste mit `/buergerinnenrat/`-URL-Referenzen (die es nicht gibt) bleiben gültig. **Aktion: keine.**

### Risiko 2: Reihenfolge der Edits
Empfohlene Reihenfolge in einer einzigen PR:
1. **Brand.tsx + index.html + Overview.tsx + App.tsx** (sichtbarer Wordmark, deklarativ)
2. **Test-Specs** (csv-import, smoke, overview, site-smoke) — gleichzeitig committen, sonst CI rot
3. **Stage1Panel.tsx + SampleSizeCalculator.tsx** (Tooltip + Helper-Text)
4. **README.md + CLAUDE.md** (extern sichtbar, aber nicht test-relevant)
5. **packages/core/.../sample-size.ts + tailwind.config.cjs** (Code-Kommentare)
6. **Use-Case-Hub** (`UseCases.tsx` + `DocsRoute`-Erweiterung in `App.tsx` + `TILES`/`TITLES`/`renderSubpage` in `DocsHub.tsx`) — neue Funktionalität, separate logische Einheit, kann eigener Commit innerhalb der PR sein

### Risiko 3: Test-Breakage-Quote
Vier Specs brechen, vier Specs sind via `data-testid` immun, alle anderen 15 Specs sind nicht betroffen. Geringes Risiko, vollständig vorhersehbar.

### Risiko 4: CHANGELOG existiert nicht
Es gibt keine `CHANGELOG.md` im Repo (verifiziert: `ls /root/workspace/CHANGELOG.md` → no such file). CONTEXT.md "Claude's Discretion" listet "CHANGELOG-Eintrag-Wording". **Empfehlung:** Statt CHANGELOG zu erfinden, einen kurzen Rebrand-Eintrag in `README.md` als "Hinweis" oder als neues `docs/CHANGELOG.md` mit nur diesem einen Eintrag anlegen (Planner entscheidet). Nicht erzwingen — vom User abnehmen lassen.

### Risiko 5: Verbleibende "Bürgerrat"-Referenzen in Repo
Viele `.md`-Dateien (`docs/iteration-2-issue-synthesis.md`, `sortition-tool/*.md`, `research/*.md`) referenzieren weiter "Bürgerrat" — laut CONTEXT.md Out-of-Scope. **Risiko:** Suchst du im Repo nach "Bürgerrat", findest du es überall — das wirkt halbherzig gerebrandet. **Mitigation:** README explizit erklären lassen ("Internes Planungs-Material und Research-Artefakte unter `sortition-tool/`, `research/`, `docs/iteration-*` referenzieren weiterhin den ursprünglichen Bürgerrats-Kontext, weil sie historische Artefakte sind. Aktuelle UI und Doku verwenden den generischen Namen Personenauswahl."). Ein 2-Zeilen-Disclaimer reicht.

### Risiko 6: Rebrand-Reihenfolge in Doku
Empfohlen: erst README/Header (sichtbar), dann Use-Case-Hub-Doku (Inhalt füllen), dann TrustStrip (subtil — keine Änderung nötig laut Empfehlung). Die Reihenfolge ist orthogonal — alle drei können in derselben PR kommen, aber bei reviewbasierter Aufteilung ist die Reihenfolge React-Code → Doku-Component → README sinnvoll.

### Risiko 7: BMG-§46-Banner-Konditionalisierung
Wenn der Planner sich für die heuristische Variante entscheidet (siehe Pitfall 3, datengetriebenes Anzeigen), führt das einen neuen Code-Pfad in `Stage1Panel.tsx` ein — testbar, aber "neue Logik". **Empfohlene konservative Variante:** §46-Banner generisch umformulieren, immer sichtbar lassen. Spart neue Bedingung + neuen Test, ist im Geist von CONTEXT.md L23 ("BMG §46-Spezifika sind nicht entfernt, aber kontext-gebunden"). Wenn der User explizit will, dass §46 nur unter bestimmten Bedingungen erscheint, dann Heuristik — aber das ist nicht in den AC's gefordert.

## Sources

### HIGH confidence (Codebase + direkte Verifikation)
- `apps/web/src/App.tsx:49-101` (Hash-Routing-Pattern, Read 2026-05-04)
- `apps/web/src/docs/DocsHub.tsx:43-175` (Tile/Title/Switch-Pattern)
- `apps/web/src/docs/DocsLayout.tsx:30-127` (TOC-Auto-Extract, sticky 220px Layout)
- `apps/web/src/shell/Brand.tsx:13-44` (Wordmark `Bürger:innenrat`)
- `apps/web/src/Overview.tsx:18-94` (Hero `<h1>` + TRUST_PRINCIPLES-Reuse)
- `apps/web/src/stage1/TrustStrip.tsx:25-102` (alle drei Cards bereits generisch)
- `apps/web/src/stage1/Stage1Panel.tsx:38-50,491-516` (Tooltip-Texte + §46-Banner-Block)
- `apps/web/src/stage1/SampleSizeCalculator.tsx:113-115` (Helper-Text)
- `apps/web/index.html:6` (`<title>`)
- `apps/web/tests/e2e/{csv-import,smoke,overview}.spec.ts` (4 hardgecodete Brand-String-Asserts)
- `apps/web/tests/smoke-live/site-smoke.spec.ts:26` (Regex-Assert)
- `apps/web/tailwind.config.cjs:15-19` (Brand-Color-Familien-Kommentar)
- `packages/core/src/stage1/sample-size.ts:7-12` (Konstanten-Header-Kommentar)
- `apps/web/src/index.css:3-4` (Verzeichnis-Verweis `design_handoff_buergerinnenrat/`)
- `packages/core/src/stage1/audit-builder.ts` (verifiziert: kein `tool_name`-Feld)
- `README.md:1-129`, `CLAUDE.md:1-100` (Brand-Referenzen)

### MEDIUM confidence
- Empfehlung "Akkordeon statt Sub-Routes" basiert auf bestehendem `<details>`-Pattern in Stage1Panel.tsx — angemessen für ~150–300 Wörter pro Use Case, könnte bei Inhaltsverdoppelung später refactored werden.
- BMG-§46-Banner-Heuristik (Daten-getrieben statt Modus) ist eine Architektur-Empfehlung — nicht in CONTEXT.md vorgegeben, aber konsistent mit "kein Pipeline-Toggle".

### LOW confidence (needs validation)
- Konkrete UI-Copy-Wordings in der Tabelle oben — explizit "vom User abnehmen lassen" laut CONTEXT.md "Claude's Discretion".
- Use-Case-Outline-Texte (~150 Wörter pro Use Case) — Erstentwurf, User-Review nötig vor Implementierung.

## Metadata

**Confidence breakdown:**
- Codebase-Mapping: HIGH (alles direkt gegrept und gelesen)
- Doku-Architektur (Hub-Erweiterung): HIGH (1-zu-1-Pattern bestehend)
- UI-Copy-Vorschläge: MEDIUM (konkret aber abnahmepflichtig)
- TrustStrip/§46-Heuristik: MEDIUM (Empfehlung mit Alternative)
- Test-Impact: HIGH (4 Specs identifiziert + Update-Pfad)
- Audit-Manifest-Risiko: HIGH (verifiziert: kein Tool-Name im Audit-JSON)

**Research date:** 2026-05-04
**Sub-agents used:** None (alle Einzeltools direkt — Codebase ist klein und der Scope eng abgegrenzt; Parallel-Agents hätten keinen Mehrwert geliefert)
**Raw research files:** keine separaten Files notwendig — alles synthetisiert direkt in dieser RESEARCH.md.
