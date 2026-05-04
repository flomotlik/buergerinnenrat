# Design-Entscheidungen für #70 (Rebrand → Personenauswahl)

Erfasst am 2026-05-04 via `/issue:discuss`.

## Decisions (locked — research/planner müssen folgen)

### Produktname
- **Personenauswahl** ist der finale Name.
- Verwendung im UI-Header, README, Doku, Audit-Manifesten.

### Scope dieses Issues: nur In-App-Branding + Doku
- Diese Issue behandelt **ausschließlich** Code-/Copy-/Doku-Renames innerhalb des bestehenden Repos und unter dem bestehenden Pfad.
- **Keine Repo-Umbenennung** in dieser Issue.
- **Keine Domain-Migration** in dieser Issue.
- **Keine `vite.config.ts` `base`-Pfad-Änderung** in dieser Issue (`/buergerinnenrat/` bleibt bis Infra-Migration).
- **Keine CI-/Workflow-Pfad-Änderungen** (`deploy.yml`, `docker-build.yml` Image-Namen bleiben).

### Infrastruktur-Migration ist explizit deferred (separate Issue später)
- Wahrscheinlicher Pfad nach Iteration 2: Repo zieht in die **`gruene`** GitHub-Org, Domain wird **`personenauswahl.gruene.at`** — aber noch nicht entschieden.
- Trigger für Migration: "wenn das Projekt gut steht" (User-Aussage). Vor diesem Punkt kein Aufwand in Infra-Migration.
- Alle Migrations-AC's aus ISSUE.md (Repo-Rename, 301-Redirect, gh-pages, LIVE_BASE_URL) → in separate Follow-up-Issue `73-infra-migration-personenauswahl-gruene` (anlegen, sobald Migrations-Trigger erreicht ist).

### UI-Framing: Generic-first, Bürgerinnenrat als Use-Case
- App-Header / Sidebar / Default-Copy: **generische Personenauswahl-Sprache** ("Personen-Pool", "Auswahl-Verfahren", "Stratifikation nach …").
- Bürgerinnenrat-Spezifika (BMG §46-Erklärung, Bundes-/Gemeinde-Bürgerrat-Größen-Beispiele) sind **nicht entfernt**, aber **kontext-gebunden**:
  - Im **Use-Case-Hub** (neuer Doku-Bereich) als gleichberechtigtes Beispiel neben anderen Use Cases.
  - **TrustStrip** (`apps/web/src/stage1/TrustStrip.tsx`): BMG §46-Hinweis nur sichtbar, wenn die User aktiv im Bürgerrats-Beispiel-Workflow sind, sonst ausblenden.
- Stage1Panel-Copy / SampleSizeCalculator-Beispiele: generisch reformulieren; Bürgerrat-Größen ("30 für Gemeinde-Bürgerrat") als **eines von mehreren Beispielen** ("z.B. 30 für Gemeinde-Bürgerrat, 50–100 für Landeskongress-Delegation, …").

### Generisches Tool + Use-Case-Beispiele (zentrale Architektur-Aussage)
- **Das Tool ist eine generische Personenauswahl-Toolbox**: drei zusammensetzbare Primitive — **Auswahl** (statistisch stratifiziert + Quoten), **Quoten-Override** (#71), **Nachwahl** (#48 3b mit optionaler Reserve aus #47).
- Verschiedene Verfahren-Typen (BR, Landeskonferenz, Parteitag, Vereinsvorstand-Auswahl, …) sind **dieselbe Tool-Komposition** mit unterschiedlichen Pool-Größen und Workflow-Reihenfolgen — das ist organisatorisch, nicht algorithmisch.
- **Anschreib-/Antwort-Status pflegt der/die Verfahrens-Begleiter:in extern** (Excel, Mail-Merge, Telefon-Liste). Das Tool sieht davon nichts und braucht dafür kein UI.
- Die **Reichhaltigkeit liegt in den Use-Case-Beispielen**, nicht in alternativen Pipeline-Modi. Drei Beispiele werden im Use-Case-Hub dokumentiert (siehe nächster Punkt).

### Use-Case-Hub mit drei Beispielen
- Doku-Bereich `apps/web/src/docs/use-cases/` (oder gleichwertige Route-Struktur) mit gleichberechtigten Use-Case-Seiten:
  1. **Bürgerinnenrat** — BMG §46-Kontext, Herzogenburg-Daten, zweistufige Auswahl (Stage 1 Versand + Stage 3 Panel + Stage 4 Reserve), `sortition-foundation`-Standard.
  2. **Landeskonferenz / Parteitag-Delegation** — Beispiel: 50–100 Delegierte aus N Gemeinden + Bezirke + Altersbänder + Geschlecht, mit konkreter Quoten-Override-Anwendung ("min 50 % unter 50 Jahre"). Einstufige Auswahl direkt aus Mitgliederliste, Anschreiben extern, Nachwahl bei Absage.
  3. **Internes Auswahl-Verfahren / Vereinsgremium** — kleine Pool-Größen (50–500), Quoten weniger statistisch, mehr nach organisatorischer Vorgabe. Demonstriert wie das Tool auch für niedrigschwellige Vereins-Use-Cases brauchbar ist.
- Jede Use-Case-Seite zeigt: typischer Workflow (mit den drei Tool-Primitiven), Beispiel-CSV/XLSX-Download, was im Audit-Trail erscheint.
- Hub-Übersicht macht klar: **das Tool ist immer dasselbe**, nur die Workflow-Komposition ändert sich.

### Issues bleiben File-basiert
- `.issues/`-Ordner-Struktur bleibt die Source-of-Truth. **Keine** Issues-Migration auf GitHub-Issues (existierende GH-Issues #4/#5/#6 sind nur Mirrors für Sichtbarkeit).
- Bei einem späteren Repo-Move zur `gruene`-Org gehen die `.issues/`-Files automatisch mit.

## Claude's Discretion (research darf hier explorieren)

- **Konkrete UI-Copy-Wordings** der generischen Reformulierungen — Vorschläge erarbeiten, vom User abnehmen lassen.
- **Aufbau des Use-Case-Hub** in der Doku: Tab-Layout, separate Routes (`#/docs/use-cases/buergerinnenrat`, `#/docs/use-cases/delegierten-auswahl`), oder Akkordeon auf einer Seite.
- **Konkretes Beispiel-Wording für Delegierten-Auswahl** (Landeskongress) — Research kann hier ein realistisches Szenario skizzieren, bevor Stage1-/Beispiele-Copy umgeschrieben wird.
- **Logo / Favicon-Änderung** — falls aktuell ein Bürgerinnenrat-spezifisches Logo existiert, prüfen und Vorschlag machen. Falls keins: ignorieren.
- **CHANGELOG-Eintrag-Wording** für den Rebrand.

## Deferred (out of scope für diese Issue)

- **Repo-Umbenennung** auf der GitHub-Seite (z.B. → `flomotlik/personenauswahl` oder `gruene/personenauswahl`).
- **Domain-Migration** (`personenauswahl.gruene.at` oder andere).
- **`vite.config.ts` `base`-Pfad-Änderung** und alle Folge-Anpassungen in CI (`deploy.yml`, `docker-build.yml`, `LIVE_BASE_URL`).
- **301-Redirects** für die alte URL.
- **Audit-Manifest-Versionierung** für Rebrand (alte Manifeste mit "Bürgerinnenrat"-Referenzen bleiben gültig — neuer Produktname erscheint nur in neuen Manifesten).
- **Verzeichnis-Rename** `design_handoff_buergerinnenrat/` → bleibt zumindest bis zur Infra-Migration (interner Verweis aus `apps/web/src/index.css:3-4`).
- **Stakeholder-Kommunikation** mit Bürgerinnenrat-Pilot-Partner (Herzogenburg etc.) über den Rebrand — User macht das separat.
- **Multi-Mandanten-Modus** (verschiedene Use-Case-Defaults bei Erststart) — wenn überhaupt, dann separate Issue.

## Offene strategische Entscheidungen, die hier nicht entschieden werden

- S-3 (Hosted PWA vs. signiertes ZIP): bleibt offen, dieser Rebrand neutral dazu.
- S-4 (Erst-Pilot-Kommune) und S-5 (Geschäftsmodell): die Personenauswahl-Anfrage kann ein zweiter Pilot werden, aber das ist Marketing/Vertrieb, nicht Code.
