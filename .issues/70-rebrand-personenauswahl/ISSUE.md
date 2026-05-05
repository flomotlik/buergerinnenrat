---
id: '70'
title: 'Rebranding: Bürgerinnenrat → Personenauswahl (verallgemeinerte stratifizierte Auswahl)'
status: done
priority: high
labels:
- branding
- product
- ux
- docs
- naming
source: github
source_id: 4
source_url: https://github.com/flomotlik/buergerinnenrat/issues/4
---

## Kontext

Eine zweite Organisation hat angefragt, die App **intern** für eine **statistisch faire Personenauswahl** zu verwenden — konkret z.B. Delegierten-Auswahl für einen **Landeskongress** aus verschiedenen **Gemeinden / Bezirken / Altersgruppen / Geschlecht / weiteren Strata**. Anforderungs-Profil ist faktisch identisch mit dem Bürgerinnenrat-Use-Case (stratifizierte Zufallsauswahl auf einer Personen-Liste mit Quoten), aber das Branding "Bürgerinnenrat" passt nicht.

**Ziel:** Tool als generisches **"Personenauswahl"**-Werkzeug für stratifizierte Zufallsauswahl positionieren — Bürgerinnenrat ist *einer* der Anwendungsfälle, nicht *der einzige*. Hypothetische Domain: `personenauswahl.gruene.at` (oder ähnlich).

**Wichtig:** Bürgerinnenrat-Funktionalität, BMG-§46-Kontext und Bürgerrats-Beispiele bleiben **vollständig erhalten**. Die Bürgerinnenrat-Doku, die §46-Erklärungen und die Herzogenburg-Test-Daten sind weiterhin wertvolle Beispiele und sollen prominent als Anwendungsbeispiel verlinkt sein.

## Aktueller Stand der Branding-Referenzen (Stand 2026-05-04)

`grep -rln "Bürgerinnenrat\|Bürgerrat\|buergerinnenrat\|BuergerInnenRat"` findet u.a.:

**Code/Config:**
- `README.md:1` — `# Bürgerinnenrat — Sortition Tool` (Titel)
- `README.md:7` — Live-URL `https://flomotlik.github.io/buergerinnenrat/`
- `apps/web/index.html:6` — `<title>Bürger:innenrat — Versand-Liste & Panel-Auswahl</title>`
- `apps/web/vite.config.ts:37` — `base: process.env.VITE_BASE_PATH ?? '/buergerinnenrat/'`
- `apps/web/playwright.config.ts`, `playwright-live.config.ts`, `tailwind.config.cjs`, `src/index.css`, `src/docs/Beispiele.tsx`
- `apps/web/src/stage1/SampleSizeCalculator.tsx:114` — UI-Copy "30 für einen Gemeinde-Bürgerrat, 160 für einen Bundes-Bürgerrat"
- `apps/web/src/stage1/Stage1Panel.tsx:41,43` — UI-Copy "Standard-Stratifikation in jeder Bürgerrats-Methodik"
- `packages/core/src/stage1/sample-size.ts` — Konstanten/Konfig

**CI / Deploy:**
- `.github/workflows/deploy.yml:124,127,194,215` — base path und LIVE_BASE_URL
- `.github/workflows/docker-build.yml:23,30` — Image-Name `buergerinnenrat-dev`

**Docs / Issues:**
- `docs/iteration-2-issue-synthesis.md`
- `packages/engine-a/.issues/...`
- `design_handoff_buergerinnenrat/` (Verzeichnisname) und `apps/web/src/index.css:3-4` Verweis darauf

## Ziel

App und Repository als generisches **Personenauswahl**-Werkzeug positionieren, mit Bürgerinnenrat als erstem dokumentierten Anwendungsbeispiel. Keine Code-Funktionalität entfernen, nur Naming, Copy und Doku öffnen.

## Acceptance Criteria

### Strategische Entscheidungen vor Implementierung

- [ ] **Produktname festgelegt** — Vorschlag "Personenauswahl"; Alternativen prüfen ("Lostool", "Stratified Selection Tool", o.ä.)
- [ ] **Domain-Strategie geklärt** — bleibt `flomotlik.github.io/buergerinnenrat/` oder Migration auf `personenauswahl.gruene.at` / eigene Domain (S-3 in CLAUDE.md verbunden)
- [ ] **Repo-Rename geklärt** — bleibt `flomotlik/buergerinnenrat` (mit Redirect via GitHub) oder Umzug auf neues Repo. Risiko: bestehende Links, Issues, PRs, Workflow-Badges
- [ ] **Pfad-Änderung in `vite.config.ts` abgestimmt** — `base` ändern bricht alle Bookmarks; entweder Redirect-Layer oder beide Pfade temporär

### Code- / Config-Renames

- [ ] `README.md` Titel + Beschreibung → "Personenauswahl — stratifizierte Zufallsauswahl (z.B. für Bürgerinnenräte, Delegierten-Auswahl, …)"
- [ ] `apps/web/index.html` `<title>` aktualisieren
- [ ] `apps/web/vite.config.ts` `base` umstellen (siehe oben — Migrations-Plan dokumentieren)
- [ ] `.github/workflows/deploy.yml` und `docker-build.yml` Base-Pfade / Image-Namen aktualisieren
- [ ] Tailwind / CSS / Playwright Configs Branding-Strings angleichen
- [ ] Test-Daten-Pfade (`herzogenburg-*`, `kleinstadt-*`) bleiben — sind reale Beispiele

### UI-Copy

- [ ] App-Header / Sidebar: Produktname → "Personenauswahl"
- [ ] Stage1Panel.tsx, SampleSizeCalculator.tsx: Generische Formulierungen ("für eine stratifizierte Personenauswahl", "z.B. Bürgerinnenrat, Delegierten-Auswahl, …") statt Bürgerinnenrat-spezifisch
- [ ] Bürgerinnenrat-Beispiele bleiben sichtbar als **eines von mehreren** Use-Case-Beispielen
- [ ] Deutsche Hauptsprache bleibt (User ist deutschsprachig, Quellen sind DE)

### Doku-Erweiterung — Use-Case-Hub mit drei Beispielen

Das Tool ist generisch (drei Primitive: Auswahl + Override + Nachwahl). Die Reichhaltigkeit liegt in den dokumentierten Use Cases, die zeigen wie diese Primitive für verschiedene Verfahren komponiert werden — alle nutzen dasselbe Tool.

- [ ] Neuer Doku-Bereich `apps/web/src/docs/use-cases/` mit drei gleichberechtigten Use-Case-Seiten:
  1. **Bürgerinnenrat** (bestehend, Herzogenburg-Daten, BMG §46-Kontext) — zweistufig (Stage 1 Versand + Stage 3 Panel + Stage 4 Reserve), `sortition-foundation`-Standard
  2. **Landeskonferenz / Parteitag-Delegation** (neu) — z.B. "50–100 Delegierte aus N Gemeinden, min. 50 % unter 50 Jahre" — einstufige Auswahl direkt aus Mitgliederliste, Anschreiben extern, Nachwahl bei Absage. Demonstriert #71 (Override) und #72 (Excel-Upload) in Aktion.
  3. **Internes Auswahl-Verfahren / Vereinsgremium** (neu) — kleine Pool-Größen (50–500), niedrigschwelliger Use Case
- [ ] Jede Use-Case-Seite zeigt: typischer Workflow mit den drei Tool-Primitiven, Beispiel-Datei-Download, was im Audit-Trail erscheint
- [ ] Hub-Übersicht macht klar: **Tool ist immer dasselbe**, nur die Workflow-Komposition ändert sich
- [ ] **Anschreib-/Antwort-Status pflegt der/die Verfahrens-Begleiter:in extern** (Excel/Mail-Merge) — Doku stellt das explizit klar, das Tool macht das nicht
- [ ] Trust-Strip (`apps/web/src/stage1/TrustStrip.tsx`) prüfen: BMG §46-Hinweis nur im Bürgerinnenrat-Use-Case-Kontext zeigen, nicht generisch
- [ ] Generische Doku-Sektion "Wofür ist dieses Tool geeignet?" auf der Startseite — verweist auf den Use-Case-Hub

### Migration / Backward-Compat

- [ ] **301-Redirect** von alter URL auf neue (falls Domain wechselt)
- [ ] **Repo-Rename via GitHub** macht Issue-/PR-Links automatisch redirecten — aber `gh-pages`-Branch und Workflow-Badges checken
- [ ] CHANGELOG-Eintrag dokumentiert den Rename und liefert Begründung
- [ ] CLAUDE.md aktualisieren: Projekt-Beschreibung in Satz 1 ("browser-native Personenauswahl …, ursprünglich für Bürgerinnenräte konzipiert")

### Verifikation

- [ ] Alle bestehenden Playwright-Tests (`apps/web/tests/e2e/`) laufen grün — keine harten Asserts auf "Bürgerinnenrat"-Strings, die durch Rename brechen
- [ ] Live-Smoke-Tests aktualisiert (`tests/smoke-live/site-smoke.spec.ts`)
- [ ] Manuelles Smoke: App lädt unter neuem Pfad, Stage 1 + Stage 3 + Audit-Export funktional
- [ ] Audit-Export-JSON / Manifest enthält neuen Produktnamen (falls dort referenziert)

## Out-of-Scope

- Keine algorithmischen Änderungen
- Keine neuen Sprachen (Deutsch bleibt)
- Issue #71 (Gruppen-Editor) und Issue #72 (Excel-Upload) sind separate Issues — werden nur in Doku verlinkt
- Logo-Redesign nur falls vorhandenes Logo "Bürgerinnenrat" enthält (sonst separate Issue)

## Bezug zu offenen strategischen Entscheidungen

- Berührt **S-4** (Erst-Pilot-Kommune): die zweite Organisation könnte zweiter Pilot werden
- Berührt **S-5** (Geschäftsmodell): wenn das Tool generischer ist, breiteres Markt-Potential
- Berührt **S-3** (Deployment-Primär): Hosted PWA bleibt sinnvoll; Pfad-/Domain-Umstellung ist Teil davon

## Risiken

- Repo-Rename + Pfad-Änderung kann externe Links brechen — sorgfältige Migrations-Strategie nötig
- Zu generisches Naming kann Bürgerinnenrat-Stakeholder verunsichern ("ist das noch unser Tool?") — Doku muss klar machen, dass Bürgerinnenrat-Use-Case unverändert unterstützt wird
- Branding-Änderungen treten in Audit-Exports auf, die juristisch relevant sein können — Versionierung im Audit-Manifest beachten

## Erledigt am 2026-05-04

In-Scope (umgesetzt):
- **UI-Wordmark + Test-IDs** (Phase A): Brand.tsx, Overview.tsx, App.tsx (sr-only h1 + DocsRoute), index.html (`<title>`); 3 E2E-Specs auf `getByTestId('brand')` migriert (Brand-Immunität gegen weitere Renames), live-smoke-Regex erweitert. Commit `1934254`.
- **UI-Copy generisch** (Phase B): Stage1Panel Tooltips (Geschlecht-Achse) + BMG-§46-Banner (Variante A: konservativ, generisch, immer sichtbar, mit Cross-Link auf `#/docs/use-cases`); SampleSizeCalculator Helper-Text mit drei Pool-Größen-Beispielen. Commit `3e6bf22`.
- **Use-Case-Hub** (Phase C): Neue DocsRoute `use-cases`, neue Component `UseCases.tsx` als Akkordeon (drei `<details open>`: Bürgerinnenrat, Landeskonferenz/Parteitag, Vereinsgremium), Tile in DocsHub. Commit `3c50ed2`.
- **README + CLAUDE.md + Code-Kommentare** (Phase D): README-Titel + Beschreibung + Live-URL-Note + Rebrand-Note + Disclaimer für historische Brand-Referenzen; CLAUDE.md Satz 1 generisch; Code-Kommentar-Neutralisierung in `tailwind.config.cjs` und `packages/core/src/stage1/sample-size.ts`. Commit `b0153d8`.

Deferred (explizit out-of-scope laut CONTEXT.md, an Issue #73 abgegeben):
- Repo-Rename, Domain-Migration, 301-Redirects, gh-pages-Update
- `vite.config.ts` `base`-Pfad, `.github/workflows/deploy.yml`, `docker-build.yml`
- Verzeichnis-Rename `design_handoff_buergerinnenrat/`
- Audit-Manifest-Versionierung (kein Brand-String im Manifest, keine Änderung nötig)
- Pipeline-Wahl / Modus-Toggle / Multi-Mandanten-Modus (ein anderes Produkt)

Acceptance Criteria — alle in-scope-Items erfüllt; out-of-scope-Items per CONTEXT.md vertagt. Verbleibende historische Brand-Referenzen in `sortition-tool/`, `research/`, `docs/iteration-*` sind durch README-Disclaimer als historische Artefakte markiert.
