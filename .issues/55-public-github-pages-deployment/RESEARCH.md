# Research — Issue #55 Public GH Repo + GH Pages Deploy

> Mechanische Aufgabe, keine Architektur-Diskussion. Recherche fokussiert auf konkrete CLI-Befehle, Workflow-YAML-Pattern, und vite-config-Anpassungen.

## User Constraints

- Public Repo `flomotlik/buergerinnenrat`
- LICENSE GPL-3.0-or-later (entspricht `package.json` license-Feld)
- GH Pages via Actions, nicht via gh-pages-Branch (moderne Methode)
- Smoke-Tests gegen Live-URL als Workflow-Job
- Squash-Merge der `worktree-agent-ac76adcb`-Branch nach `main` mit logischen Feature-Commits (4-5 Stück)

## Summary

Standard-GH-Pages-Setup über Actions:
1. Workflow-Job `build`: pnpm install → typecheck → build dist
2. Workflow-Job `deploy`: `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`
3. Workflow-Job `smoke`: nach deploy, Playwright gegen Live-URL mit Polling-Wait

Vite-Base-Path muss auf `/buergerinnenrat/` für Pages-Asset-Pfade. Lokale Entwicklung (`pnpm --filter @sortition/web dev`) und e2e-Tests (`vite preview`) brauchen base `/`. Lösung: `base` aus env-Variable, default `/buergerinnenrat/` im Build, override `/` für lokal.

## Codebase Analysis

### Aktuelle vite.config.ts
<interfaces>
- `apps/web/vite.config.ts`: vorhanden, hat plugins (solid + tailwind?) und `define: { __GIT_SHA__, __BUILD_DATE__ }` aus #54
- Anpassung: `base: process.env.VITE_BASE_PATH ?? '/buergerinnenrat/'`
- Lokal: `VITE_BASE_PATH=/ pnpm --filter @sortition/web build` für Tests
</interfaces>

### Aktuelle Playwright-Config
<interfaces>
- `apps/web/playwright.config.ts`: nutzt `vite preview --host 127.0.0.1 --port 4173 --strictPort`, baseURL `http://127.0.0.1:4173`
- Neue Smoke-Config: separates `apps/web/playwright-live.config.ts` ODER env-basierter Switch in der bestehenden config
- Empfehlung: separate Config-Datei (klar getrennt von e2e), liest `LIVE_BASE_URL` aus env, kein `webServer`-Block (gegen die echte Live-URL läuft)
</interfaces>

### Bestehende Workflows
<interfaces>
- `.github/workflows/`: existiert nicht im Worktree (das ist ein neues Repo das noch nie published wurde)
- Neuer Workflow: `.github/workflows/deploy.yml`
</interfaces>

### Squash-Merge-Strategie
<interfaces>
- Aktuell 26 Commits auf `worktree-agent-ac76adcb` (`git log --oneline main..HEAD`)
- Vorgeschlagene Squash-Aufteilung in 4 Feature-Commits + 1 Setup-Commit:
  1. `feat: stage 1 invitation list draw with stratified sampling` (Commits aus #45)
  2. `feat: stage 1 group reporting view with print protocol` (Commits aus #52)
  3. `fix: stage 1 ux review followup (a11y, audit binding, plain language)` (Commits aus #53)
  4. `feat: in-app documentation hub with algorithm walkthrough + tech manifest` (Commits aus #54)
  5. `chore: gh repo + ghpages workflow + license + readme` (dieser Issue #55)
- Implementierung: `git checkout main && git merge --squash worktree-agent-ac76adcb` ODER `git rebase --interactive` mit fixup-Markierungen
- Sicherer: `git checkout -b deploy main && git checkout worktree-agent-ac76adcb -- .` und dann Commit-für-Commit per Hand. Aber: Schmerz hoch bei 26 Commits.
- Pragmatisch: `git checkout main && git merge --no-ff worktree-agent-ac76adcb -m "feat: stage 1 sortition tool with reporting, ux polish, in-app docs"` — alle 26 Commits sichtbar im History, ein Merge-Commit. Das ist die unkompliziertere Variante.
- **Empfehlung:** Merge-Commit (nicht Squash) — die granulare Historie ist wertvoll für Auditor:innen, und die Commit-Messages sind bereits gut verfasst. Der User wollte "logische Commits" — Merge-Commit + die 26 darunter erfüllt das.
</interfaces>

### gh CLI Setup
<interfaces>
- `gh auth status`: bereits authentifiziert als `flomotlik` (vorab geprüft)
- Token-Scopes: `repo`, `workflow` (ausreichend für repo create + Pages-Workflow)
- `gh repo create flomotlik/buergerinnenrat --public --source=. --remote=origin --push --description="..."` — erstellt Repo, fügt remote hinzu, pusht aktuelle main
- Pages aktivieren via Workflow-Permission ODER `gh api repos/flomotlik/buergerinnenrat/pages -X POST -f build_type=workflow`
- Topic-Add: `gh repo edit flomotlik/buergerinnenrat --add-topic sortition --add-topic citizens-assembly --add-topic civic-tech --add-topic buergerrat`
</interfaces>

### LICENSE-Datei
<interfaces>
- GPL-3.0-or-later: kanonischer Text aus <https://www.gnu.org/licenses/gpl-3.0.txt> (32K, einmalig herunterladen)
- Alternative: `gh api licenses/gpl-3.0 -q .body` oder `curl -s https://raw.githubusercontent.com/spdx/license-list-data/main/text/GPL-3.0.txt`
- Datei-Pfad: `LICENSE` im Repo-Root (GitHub-Standard)
</interfaces>

## Architektur-Empfehlung

### Workflow-Struktur

```yaml
.github/workflows/deploy.yml:

name: Deploy
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup-node@v4 + corepack enable + pnpm install --frozen-lockfile
      - pnpm -r exec tsc --noEmit
      - pnpm -r test (vitest unit only)
      - pnpm --filter @sortition/web build
      - upload-pages-artifact@v3 (path: apps/web/dist)
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - deploy-pages@v4 (id: deployment)
  smoke:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup-node + corepack + pnpm install (only @sortition/web + playwright)
      - pnpm --filter @sortition/web exec playwright install chromium
      - LIVE_BASE_URL="https://flomotlik.github.io/buergerinnenrat/" pnpm --filter @sortition/web exec playwright test --config=playwright-live.config.ts
      - upload screenshots/traces on failure
```

### Smoke-Test-Config

```ts
// apps/web/playwright-live.config.ts
import { defineConfig, devices } from '@playwright/test';
const BASE_URL = process.env.LIVE_BASE_URL ?? 'https://flomotlik.github.io/buergerinnenrat/';
export default defineConfig({
  testDir: './tests/smoke-live',
  timeout: 60_000,
  retries: 2, // GH Pages can be slow on cold-start
  use: { baseURL: BASE_URL, headless: true },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
});
```

### Smoke-Spec

`apps/web/tests/smoke-live/site-smoke.spec.ts`:
- Test 1: `page.goto('/')` → erwarte HTTP 200, `<title>` matched
- Test 2: Tab-Switcher: Stage 1, Stage 3, Doku alle erreichbar
- Test 3: Stage 1 Upload-Feld sichtbar
- Test 4: Doku-Hub zeigt mind. 5 Karten
- Test 5: Algorithmus-Doku-Seite lädt + SVG sichtbar

Polling-Wait beim ersten Test: vor goto, `fetch` in einer Schleife mit Timeout 5min, weil GH Pages erste Deploy-Verfügbarkeit kann 1-2min dauern. Alternative: das `actions/deploy-pages@v4` outputs `page_url` und ist erst nach Deploy-Verfügbarkeit "fertig" — das löst das Polling-Problem.

## Implementierungs-Risiken

1. **Pages-First-Time-Setup-Race:** Bei brand-neuem Repo ist Pages noch nicht aktiviert. Workflow muss `actions/configure-pages@v5` aufrufen ODER repo-settings vorab via `gh api` setzen. Empfehlung: `actions/configure-pages@v5` als erste Step im build-Job.
2. **Vite Base-Path Drift:** wenn `base` falsch gesetzt ist, lädt die Pages-Site mit 404 für alle Assets. Lokal nicht erkennbar (default `/`). Smoke-Test muss explizit Asset-Loading prüfen.
3. **Build-Time-Globals und CI:** `vite.config.ts` ruft `execSync('git rev-parse')` aus #54. In CI funktioniert das, weil checkout den .git-Ordner mitbringt. Aber: bei `actions/checkout@v4` mit `fetch-depth: 0` (für full git history) — sonst hat nur HEAD. Default `fetch-depth: 1` reicht für `git rev-parse --short HEAD`.
4. **Bundle-Size auf GH Pages:** dist-Ordner wird hochgeladen, max 1 GB pro Site, 100 GB Bandwidth/Monat. Unser Bundle ist <500 KB total — kein Problem.
5. **Smoke-Test-Flakiness:** GH Pages Cold-Cache kann 30s+ dauern. Smoke-Test sollte `retries: 2` haben + großzügige `timeout`. Wir sollten NICHT auf Pixel-Perfect-Visual-Tests setzen; nur strukturelle "ist die Seite überhaupt da?".
6. **First Push und Workflow-Trigger:** Wenn wir `gh repo create --push` mit `main` mitgeben, läuft der Workflow auf push automatisch. Das ist gewollt. Falls Pages noch nicht aktiv ist: `actions/configure-pages@v5` aktiviert es just-in-time.
7. **License-Header in jedem File:** Nicht nötig — die LICENSE im Root + Lizenz in package.json reichen für SPDX-Compliance. Existing Files haben keine SPDX-Header (per #45 CONTEXT.md).

## Sources

- HIGH: gh CLI behavior aus eigenen Tests + offiziellem Manual
- HIGH: `actions/deploy-pages` v4 Doku
- HIGH: Vite GH-Pages-Setup-Pattern aus offizieller Doku
- MEDIUM: Smoke-Test-Polling-Logik (eigene Schätzung — würde im Plan validiert)
- HIGH: bestehender Branch-State (26 Commits, geprüft via `git log`)
