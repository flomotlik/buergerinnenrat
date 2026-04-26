---
id: 55
slug: public-github-pages-deployment
title: Public GH Repo + GitHub Pages Deploy + Live-URL-Smoke-Test
track: Z
estimate_pt: 1.5
status: planned
depends_on: [45, 52, 53, 54]
priority: high
priority_rationale: "Deployment-Schluss-Schritt: Tool muss live erreichbar sein, sonst kann keine Verwaltung es ausprobieren"
---

# Public GH Repo + GitHub Pages Deploy

## Kontext

Stage 1 + Stage 1-Reporting + UX-Followup + In-App-Doku sind alle implementiert (Issues #45, #52, #53, #54), 26 Commits auf `worktree-agent-ac76adcb`, 117+ Tests grün. Aber: keine Live-URL, kein öffentliches Repo, keine Möglichkeit für eine Verwaltung das Tool ohne lokale Toolchain auszuprobieren.

User-Anforderungen:
- Public Repo (`flomotlik/buergerinnenrat`) — GH Pages auf Free Plan funktioniert nur mit public
- LICENSE-Datei (GPL-3.0-or-later, entspricht der `package.json` Deklaration)
- GitHub Actions Workflow für Pages-Deploy
- Smoke-Tests gegen die Live-URL als Teil des Workflows
- Bei Rückkehr vom Spaziergang erreichbare Seite

## Ziel

Bei Beendigung dieses Issues:
1. `https://flomotlik.github.io/buergerinnenrat/` erreichbar mit funktionsfähigem Stage 1, Stage 3, Doku
2. Repo öffentlich, mit LICENSE, README mit Live-URL und Build-Badge
3. Jeder Push nach `main` triggert Build → Deploy → Smoke-Test
4. Smoke-Tests scheitern den Deploy wenn die Live-Site kaputt ist

## Acceptance Criteria

### Repo-Setup

- [ ] LICENSE-Datei im Repo-Root: GPL-3.0-or-later (kanonischer Text aus FSF/SPDX)
- [ ] README.md erweitert: Live-URL, Build-Status-Badge, kurze Was-ist-das-Beschreibung am Anfang, Lizenz-Hinweis
- [ ] Squash-Merge der `worktree-agent-ac76adcb`-Branch nach `main` mit logischen Feature-Commits (Vorschlag: 4-5 Commits in Reihenfolge der Issues — Stage 1 / Reporting / UX-Followup / Docs / Deploy-Setup)

### Vite + Build

- [ ] `apps/web/vite.config.ts`: `base: '/buergerinnenrat/'` (per env-Variable überschreibbar für lokale Entwicklung)
- [ ] Lokaler Build (`pnpm --filter @sortition/web build`) erzeugt Asset-Pfade unter `/buergerinnenrat/...`
- [ ] Lokaler `vite preview` funktioniert weiter (env-Default für lokal lässt base bei `/`)

### GitHub Actions Workflow

- [ ] `.github/workflows/deploy.yml` mit Jobs:
  - `build`: pnpm install → typecheck → vitest unit → build dist
  - `deploy`: nutzt `actions/upload-pages-artifact` + `actions/deploy-pages` (offizielle Pages-Action)
  - `smoke`: nach Deploy, läuft Playwright gegen `https://flomotlik.github.io/buergerinnenrat/`, wartet auf Pages-Verfügbarkeit (HTTP 200), führt minimal-Smoke-Tests aus
- [ ] Workflow-Trigger: `push` auf `main`, `workflow_dispatch` (manuell)
- [ ] Pages-Permissions korrekt: `pages: write`, `id-token: write`
- [ ] Workflow-Job-Status-Badge in README

### Repo-Erstellung

- [ ] `gh repo create flomotlik/buergerinnenrat --public --source=. --remote=origin --push --description="Browser-natives Werkzeug für die stratifizierte Auswahl von Personen für Bürger:innenräte"`
- [ ] GitHub Pages aktiviert mit Source = "GitHub Actions" (per `gh api` oder Workflow-Default)
- [ ] Erste Workflow-Run startet automatisch nach Push, deployt nach `gh-pages`
- [ ] Settings repository: Topics `sortition`, `citizens-assembly`, `buergerrat`, `civic-tech`, `germany`, `austria`

### Live-Smoke-Tests

- [ ] Separates Playwright-Spec `apps/web/tests/smoke-live/site-smoke.spec.ts` (NICHT im Standard-e2e-Lauf, sondern nur im Deploy-Workflow)
- [ ] Tests:
  - Hauptseite lädt (HTTP 200, `<title>` enthält "Bürger" oder "Sortition")
  - Tab-Switch zwischen Stage 1, Stage 3, Doku funktioniert
  - Stage 1 zeigt Upload-Feld
  - Doku-Hub zeigt mind. 5 Tile-Karten
  - Algorithmus-Doku-Seite lädt und zeigt Toy-Beispiel-SVG
- [ ] Smoke-Tests nutzen `BASE_URL=https://flomotlik.github.io/buergerinnenrat/` als Playwright-Konfig
- [ ] Bei Smoke-Failure: Workflow-Run rot, Notification (Default GH-Email)

### Verifikation am Ende

- [ ] Workflow-Run ist grün
- [ ] Live-URL ist im Browser erreichbar (manueller curl-Check als Verify-Schritt)
- [ ] Stage 1-Workflow live ausführbar (Upload synthetic CSV → ziehen → download)
- [ ] Doku-Hub zeigt alle Karten

## Out of Scope

- Custom Domain (kein eigenes DNS — `flomotlik.github.io/buergerinnenrat/` reicht)
- HTTPS-Cert (GH Pages liefert das automatisch)
- CDN-Optimierung über GH Pages hinaus
- Analytics / Telemetry (kein Tracking)
- Pull-Request-Preview-Deployments (separates Issue wenn gewünscht)

## Verweise

- GitHub Pages Actions Workflow Doku: <https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow>
- `actions/deploy-pages` v4: <https://github.com/actions/deploy-pages>
- Playwright env-Variable für BASE_URL: <https://playwright.dev/docs/test-webserver#configuring-baseurl>
- Vite GH-Pages-Setup: <https://vitejs.dev/guide/static-deploy.html#github-pages>
- Bestehendes Worktree-Branch: `worktree-agent-ac76adcb` (26 Commits über main)
