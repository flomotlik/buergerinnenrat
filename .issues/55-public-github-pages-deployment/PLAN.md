# Plan: Public GH Repo + GitHub Pages Deploy + Live-URL-Smoke-Test

<objective>
Was: Stage 1 + Stage 3 + Doku-Stand vom Worktree-Branch öffentlich auf GitHub deployen, sodass `https://flomotlik.github.io/buergerinnenrat/` live erreichbar ist und jeder Push auf `main` einen Build → Deploy → Smoke-Test-Workflow auslöst.

Warum: Ohne Live-URL kann keine Verwaltung das Tool ohne lokale Toolchain ausprobieren — Iteration-1-Abschluss bedeutet "anfassbar im Browser", nicht "läuft auf meinem Laptop".

Scope: in scope = Repo-Erstellung via `gh`, LICENSE, Vite-base-Path-Anpassung, GH-Actions-Workflow (build/deploy/smoke), Live-Smoke-Spec, README-Update mit Badge+Live-URL, Merge-Commit nach `main`. Out of scope = Custom Domain, PR-Preview-Deployments, Analytics, separate Visual-Regression-Tests.

Konventionen: Mechanisches Issue, kompakter Plan. Merge-Commit (nicht Squash) per RESEARCH-Empfehlung — granulare 25-Commit-History bleibt für Auditor:innen sichtbar. CONTEXT.md existiert nicht — alle Detail-Entscheidungen folgen RESEARCH.md.
</objective>

<context>
Issue: @.issues/55-public-github-pages-deployment/ISSUE.md
Research: @.issues/55-public-github-pages-deployment/RESEARCH.md

<interfaces>
<!-- Executor: nutze diese Contracts direkt. Nicht im Codebase explorieren. -->

Aktuelle vite.config.ts (apps/web/vite.config.ts):
- Hat bereits `define: { __GIT_SHA__, __BUILD_DATE__ }` aus Issue #54 (nutzt `execSync('git rev-parse --short HEAD')`)
- Hat `plugins: [solid(), tailwindcss()]` (oder ähnlich)
- KEIN `base` aktuell gesetzt → Vite default `/`
- Anpassung: `base: process.env.VITE_BASE_PATH ?? '/buergerinnenrat/'`

Aktuelle playwright.config.ts (apps/web/playwright.config.ts):
- testDir: './tests/e2e' (oder ähnlich)
- webServer-Block: `vite preview --host 127.0.0.1 --port 4173 --strictPort`
- baseURL: `http://127.0.0.1:4173`
- Bleibt UNVERÄNDERT — Smoke-Live nutzt separate Config-Datei.

Branch-State:
- Aktueller Branch: `worktree-agent-ac76adcb`
- 25 Commits ahead of `main`
- Untracked: `.issues/55-public-github-pages-deployment/`, `.issues/in-app-docs-ideation/`, `.issues/stage-1-group-reporting-ux-review/`, `.issues/stage-1-stratified-sampling-algorithm-conceptual-fit/`
- Diese Untracked Review-Ordner als Teil des Setup-Commits aufnehmen (wertvolle History für Auditor:innen)

gh CLI:
- Bereits authentifiziert als `flomotlik` (vorab geprüft per User)
- Token-Scopes ausreichend: repo + workflow

GH Actions Workflow-Building-Blocks:
- `actions/checkout@v4` — default fetch-depth=1 reicht für `git rev-parse --short HEAD`
- `actions/setup-node@v4` — Node 20 LTS
- `pnpm/action-setup@v4` — pnpm via packageManager-Field
- `actions/configure-pages@v5` — first-time Pages-Aktivierung just-in-time
- `actions/upload-pages-artifact@v3` — path: apps/web/dist
- `actions/deploy-pages@v4` — id-token: write Permission nötig

Required Workflow Permissions (top-level):
  contents: read
  pages: write
  id-token: write
Concurrency: group=pages, cancel-in-progress=false
</interfaces>

Key files:
@apps/web/vite.config.ts — existiert, base hinzufügen
@apps/web/playwright.config.ts — UNVERÄNDERT (nur Referenz)
@apps/web/package.json — ggf. neuen npm-Script `test:smoke-live` ergänzen
@README.md — Live-URL, Badge, kurzer Header, Lizenz-Hinweis
</context>

<commit_format>
Format: conventional ohne issue-prefix (per .issues/config.yaml: `commit.format: conventional`, kein prefix-Flag)
Pattern: `{type}({scope}): {description}` ODER `{type}: {description}`
Beispiel Setup-Commit: `chore: gh repo, license, ghpages workflow, vite base path, live smoke`
Beispiel Merge: `feat: stage 1 sortition tool with reporting, ux polish, in-app docs, ghpages deploy` (Merge-Commit-Message)
</commit_format>

<tasks>

<task type="auto">
  <name>Task 1: LICENSE-Datei (GPL-3.0) im Repo-Root</name>
  <files>LICENSE</files>
  <action>
  Lade den kanonischen GPL-3.0-Volltext herunter und schreibe ihn nach `LICENSE` (Repo-Root, nicht apps/web/).

  Befehl: `curl -sSL https://www.gnu.org/licenses/gpl-3.0.txt -o LICENSE`

  Verifikation: `wc -l LICENSE` muss > 600 Zeilen ergeben (kanonischer Text), `head -3 LICENSE` muss "GNU GENERAL PUBLIC LICENSE" + "Version 3, 29 June 2007" enthalten.

  Fallback wenn curl fehlschlägt: `gh api licenses/gpl-3.0 -q .body > LICENSE` (gh CLI ist authentifiziert).

  KEINE SPDX-Header in einzelne Source-Files einfügen — die LICENSE im Root + `license: "GPL-3.0-or-later"` in `package.json` reichen für SPDX-Compliance (per RESEARCH.md Risiko #7).
  </action>
  <verify>
  <automated>test -f LICENSE && grep -q "GNU GENERAL PUBLIC LICENSE" LICENSE && grep -q "Version 3, 29 June 2007" LICENSE && test "$(wc -l < LICENSE)" -gt 600 && echo OK</automated>
  </verify>
  <done>
  - `LICENSE` existiert im Repo-Root
  - Erste Zeilen identifizieren GPL Version 3
  - Datei mindestens 600 Zeilen (kanonischer Volltext, nicht Stub)
  </done>
</task>

<task type="auto">
  <name>Task 2: Vite base-Path auf /buergerinnenrat/ mit env-Override</name>
  <files>apps/web/vite.config.ts</files>
  <action>
  Lies `apps/web/vite.config.ts` zuerst (es hat bereits `define: { __GIT_SHA__, __BUILD_DATE__ }`-Block und plugins-Array — nicht überschreiben).

  Füge an passender Stelle in der `defineConfig({...})`-Object ein:

  ```ts
  base: process.env.VITE_BASE_PATH ?? '/buergerinnenrat/',
  ```

  Logik:
  - Default (CI-Build, Production-Build): `/buergerinnenrat/` → matched GH-Pages-Path `flomotlik.github.io/buergerinnenrat/`
  - Lokal (`pnpm --filter @sortition/web dev`): User MUSS `VITE_BASE_PATH=/` setzen ODER der dev-Server lädt Assets falsch
  - e2e (existing playwright.config.ts mit `vite preview`): User MUSS `VITE_BASE_PATH=/` exportieren VOR `pnpm test:e2e` — sonst bricht e2e

  Pragmatismus: Die existing `playwright.config.ts` startet `vite preview` ohne env-Override. Damit e2e weiter grün bleibt: füge in `apps/web/playwright.config.ts` im `webServer.env`-Block (oder als Process-Env in webServer.command) `VITE_BASE_PATH=/` ein. ABER: nur wenn die aktuelle e2e-Konfig dadurch nicht regrediert. Lies playwright.config.ts und füge `env: { VITE_BASE_PATH: '/' }` in den webServer-Block ein.

  Kein `define`-Block ändern, keine Plugins ändern, kein Build-Output-Pfad ändern.
  </action>
  <verify>
  <automated>VITE_BASE_PATH=/ pnpm --filter @sortition/web build 2>&1 | tail -5 && grep -q "buergerinnenrat\|base.*VITE_BASE_PATH" apps/web/vite.config.ts && echo OK</automated>
  </verify>
  <done>
  - `apps/web/vite.config.ts` enthält `base: process.env.VITE_BASE_PATH ?? '/buergerinnenrat/'`
  - Build mit `VITE_BASE_PATH=/` läuft durch (e2e-relevant)
  - Build ohne env (oder mit `VITE_BASE_PATH=/buergerinnenrat/`) erzeugt Asset-Pfade unter `/buergerinnenrat/...` in `apps/web/dist/index.html`
  - playwright.config.ts hat `webServer.env.VITE_BASE_PATH = '/'` — existing e2e bleibt grün
  </done>
</task>

<task type="auto">
  <name>Task 3: GH Actions Deploy-Workflow (build → deploy → smoke)</name>
  <files>.github/workflows/deploy.yml</files>
  <action>
  Erstelle `.github/workflows/deploy.yml`. Drei Jobs in dieser Reihenfolge: `build` → `deploy` (needs build) → `smoke` (needs deploy).

  Top-level:
  ```yaml
  name: Deploy
  on:
    push:
      branches: [main]
    workflow_dispatch:
  permissions:
    contents: read
    pages: write
    id-token: write
  concurrency:
    group: pages
    cancel-in-progress: false
  ```

  Job `build`:
  - runs-on: ubuntu-latest
  - steps:
    1. `actions/checkout@v4` (default fetch-depth=1 reicht für git rev-parse, das aus #54 in vite.config eingebaut ist)
    2. `pnpm/action-setup@v4` (nutzt packageManager-field aus root package.json)
    3. `actions/setup-node@v4` mit `node-version: 20` und `cache: 'pnpm'`
    4. `pnpm install --frozen-lockfile`
    5. `pnpm -r exec tsc --noEmit` (typecheck workspace)
    6. `pnpm -r --filter './packages/**' test --run` (vitest unit only, NICHT e2e — e2e läuft lokal nicht im deploy-workflow)
    7. `pnpm --filter @sortition/web build` (kein VITE_BASE_PATH-Override → default `/buergerinnenrat/`)
    8. `actions/configure-pages@v5` (just-in-time Pages-Aktivierung; ist idempotent bei bereits aktivierten Pages)
    9. `actions/upload-pages-artifact@v3` mit `path: apps/web/dist`

  Job `deploy`:
  - needs: build
  - runs-on: ubuntu-latest
  - environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
  - steps:
    1. `actions/deploy-pages@v4` mit `id: deployment`
  - Wichtig: deploy-pages@v4 wartet bis Pages-Verfügbarkeit fertig ist (löst Polling-Problem laut RESEARCH).

  Job `smoke`:
  - needs: deploy
  - runs-on: ubuntu-latest
  - steps:
    1. `actions/checkout@v4`
    2. `pnpm/action-setup@v4`
    3. `actions/setup-node@v4` mit cache pnpm
    4. `pnpm install --frozen-lockfile`
    5. `pnpm --filter @sortition/web exec playwright install --with-deps chromium`
    6. `pnpm --filter @sortition/web exec playwright test --config=playwright-live.config.ts`
       (env: `LIVE_BASE_URL: https://flomotlik.github.io/buergerinnenrat/`)
    7. On failure: `actions/upload-artifact@v4` mit `name: smoke-traces` und `path: apps/web/test-results/`

  Pragmatik:
  - Ein Workflow-File, drei Jobs, keine Matrix.
  - Default GH-Email-Notification bei Workflow-Failure reicht (kein zusätzliches Slack/Discord).
  - Falls in Schritt 6 (build) der workspace-test fehlschlägt weil ein Filter falsch ist: Filter pragmatisch anpassen, Hauptziel ist dass Pages-Build durchläuft.
  </action>
  <verify>
  <automated>test -f .github/workflows/deploy.yml && grep -q "actions/deploy-pages@v4" .github/workflows/deploy.yml && grep -q "actions/configure-pages@v5" .github/workflows/deploy.yml && grep -q "actions/upload-pages-artifact@v3" .github/workflows/deploy.yml && grep -q "playwright-live.config.ts" .github/workflows/deploy.yml && grep -q "id-token: write" .github/workflows/deploy.yml && echo OK</automated>
  </verify>
  <done>
  - `.github/workflows/deploy.yml` existiert mit 3 Jobs (build/deploy/smoke)
  - Permissions: pages:write + id-token:write
  - Build-Job lädt Dist als Pages-Artifact hoch
  - Deploy-Job nutzt actions/deploy-pages@v4
  - Smoke-Job läuft Playwright gegen Live-URL via separater Config
  - Workflow-Trigger: push main + workflow_dispatch
  - Concurrency-Group `pages` mit cancel-in-progress=false
  </done>
</task>

<task type="auto">
  <name>Task 4: Playwright Live-Config + Smoke-Spec (5 Tests)</name>
  <files>apps/web/playwright-live.config.ts, apps/web/tests/smoke-live/site-smoke.spec.ts, apps/web/package.json</files>
  <action>
  **Datei 1: `apps/web/playwright-live.config.ts`**

  Separates Config (NICHT die existing playwright.config.ts ändern). Inhalt:

  ```ts
  import { defineConfig, devices } from '@playwright/test';

  const BASE_URL =
    process.env.LIVE_BASE_URL ?? 'https://flomotlik.github.io/buergerinnenrat/';

  export default defineConfig({
    testDir: './tests/smoke-live',
    timeout: 60_000,
    retries: 2, // GH Pages cold-cache kann 30s+ dauern
    use: {
      baseURL: BASE_URL,
      headless: true,
      trace: 'retain-on-failure',
      screenshot: 'only-on-failure',
    },
    projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
    // KEIN webServer-Block — wir testen gegen die Live-URL, nicht lokal
  });
  ```

  **Datei 2: `apps/web/tests/smoke-live/site-smoke.spec.ts`**

  Minimal-Smoke (5 Tests, je ein `test(...)`-Block). Keine deep functional tests — nur "ist die Seite überhaupt da, lädt Asset-Bundle, sind die Hauptbereiche sichtbar".

  ```ts
  import { test, expect } from '@playwright/test';

  test.describe('Live Site Smoke', () => {
    test('Hauptseite lädt mit korrektem Title', async ({ page }) => {
      const response = await page.goto('/');
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(/Bürger|Sortition|Buergerinnenrat/i);
    });

    test('Tab-Navigation: Stage 1 / Stage 3 / Doku alle erreichbar', async ({ page }) => {
      await page.goto('/');
      // Selektoren je nach actual Tab-UI — nutze Text-Matcher (resilient gegen CSS-Refactor)
      await page.getByRole('tab', { name: /Stage 1|Versand/i }).click();
      await page.getByRole('tab', { name: /Stage 3|Panel|Auswahl/i }).click();
      await page.getByRole('tab', { name: /Doku|Dokumentation/i }).click();
    });

    test('Stage 1 zeigt CSV-Upload-Feld', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('tab', { name: /Stage 1|Versand/i }).click();
      // Upload-Feld via input[type=file] ODER Drop-Zone-Text
      const fileInput = page.locator('input[type="file"]').first();
      await expect(fileInput).toBeAttached();
    });

    test('Doku-Hub zeigt mindestens 5 Karten', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('tab', { name: /Doku|Dokumentation/i }).click();
      // Karten-Selektor je nach actual UI — z.B. <article> oder Card-Class
      const cards = page.locator('a[href*="/docs/"], article, [class*="card" i]');
      await expect(cards.first()).toBeVisible();
      const count = await cards.count();
      expect(count).toBeGreaterThanOrEqual(5);
    });

    test('Algorithmus-Doku-Seite lädt mit SVG', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('tab', { name: /Doku|Dokumentation/i }).click();
      // Klick auf Algorithmus-Doku-Karte (Text-Matcher auf "Algorithmus" oder "Maximin")
      await page.getByRole('link', { name: /Algorithmus|Maximin|Walkthrough/i }).first().click();
      // Toy-Beispiel-SVG aus #54
      await expect(page.locator('svg').first()).toBeVisible();
    });
  });
  ```

  **WICHTIG zu Selektoren:** Die exakten Tab-Namen / Karten-Texte hängen vom Stand der Issues #45/#52/#53/#54 ab. Lies VOR dem Schreiben einmal `apps/web/src/App.tsx` (oder Top-Level Tab-Komponente) sowie eine Doku-Karten-Komponente, um die tatsächlichen Texte zu kennen. Wenn die o.g. Regex-Matcher nicht greifen: passe die Texte an, halte aber die Test-Struktur bei (5 Tests, je ein klarer Smoke-Aspekt). Nutze role-basierte Locators (`getByRole`) bevorzugt, fallback auf Text-Matching.

  **Datei 3: `apps/web/package.json`**

  Ergänze in `scripts`:
  ```json
  "test:smoke-live": "playwright test --config=playwright-live.config.ts"
  ```

  Erlaubt lokales Ausprobieren via `LIVE_BASE_URL=https://... pnpm --filter @sortition/web test:smoke-live`.
  </action>
  <verify>
  <automated>test -f apps/web/playwright-live.config.ts && test -f apps/web/tests/smoke-live/site-smoke.spec.ts && grep -q "LIVE_BASE_URL" apps/web/playwright-live.config.ts && grep -c "test(" apps/web/tests/smoke-live/site-smoke.spec.ts | grep -q "^5$" && grep -q "test:smoke-live" apps/web/package.json && pnpm --filter @sortition/web exec playwright test --config=playwright-live.config.ts --list 2>&1 | grep -q "5 tests" && echo OK</automated>
  </verify>
  <done>
  - `playwright-live.config.ts` existiert, liest `LIVE_BASE_URL` aus env mit Default Live-URL
  - `tests/smoke-live/site-smoke.spec.ts` enthält exakt 5 Tests
  - Tests prüfen: HTTP 200 + Title, Tab-Switch, Upload-Feld, Doku-Karten ≥5, Algorithmus-Doku-SVG
  - `pnpm --filter @sortition/web test:smoke-live` Script existiert
  - Playwright erkennt die 5 Tests via `--list`
  </done>
</task>

<task type="auto">
  <name>Task 5: README-Update (Live-URL, Badge, Header, Lizenz)</name>
  <files>README.md</files>
  <action>
  Lies aktuelle `README.md`. Füge ein:

  **Am Anfang (vor allem anderen):**
  ```markdown
  # Bürgerinnenrat — Sortition Tool

  [![Deploy](https://github.com/flomotlik/buergerinnenrat/actions/workflows/deploy.yml/badge.svg)](https://github.com/flomotlik/buergerinnenrat/actions/workflows/deploy.yml)

  Browser-natives Werkzeug für die stratifizierte Zufallsauswahl von Personen für Bürger:innenräte (Deutschland und Österreich). Alle Daten bleiben im Browser, kein Server-Backend.

  **Live: <https://flomotlik.github.io/buergerinnenrat/>**
  ```

  **Am Ende:**
  ```markdown
  ## Lizenz

  GPL-3.0-or-later. Volltext in [LICENSE](LICENSE).
  ```

  Dazwischen: existing README-Inhalt unverändert lassen (oder leicht reorganisieren wenn der existing Header bereits einen anderen Titel hat — dann den neuen Header oben drauf, alten Titel zur Zwischenüberschrift degradieren).

  Mindest-Anforderungen aus ISSUE.md:
  - Live-URL als Link sichtbar
  - Build-Status-Badge (Deploy-Workflow)
  - Kurze "Was ist das"-Beschreibung am Anfang
  - Lizenz-Hinweis am Ende mit Verweis auf LICENSE-Datei
  </action>
  <verify>
  <automated>grep -q "flomotlik.github.io/buergerinnenrat" README.md && grep -q "actions/workflows/deploy.yml/badge.svg" README.md && grep -q "GPL-3.0" README.md && grep -q "stratifiziert\|Bürger" README.md && echo OK</automated>
  </verify>
  <done>
  - README.md hat Live-URL als klickbaren Link
  - Build-Status-Badge zeigt auf deploy.yml-Workflow
  - Kurz-Beschreibung "Was ist das" in den ersten 5 Zeilen
  - Lizenz-Sektion am Ende mit Verweis auf LICENSE
  </done>
</task>

<task type="auto">
  <name>Task 6: Setup-Commit auf worktree-agent-ac76adcb (alle 5 Vor-Tasks zusammen)</name>
  <files>git working tree</files>
  <action>
  Auf Branch `worktree-agent-ac76adcb` bleiben (nicht wechseln).

  **Schritt 1 — Stage prüfen:**
  ```bash
  git status --short
  ```
  Erwartet: modifizierte Files aus Tasks 1-5 (LICENSE, vite.config.ts, playwright.config.ts, .github/workflows/deploy.yml, apps/web/playwright-live.config.ts, apps/web/tests/smoke-live/site-smoke.spec.ts, apps/web/package.json, README.md) + die existing untracked Review-Ordner (`.issues/in-app-docs-ideation/`, `.issues/stage-1-group-reporting-ux-review/`, `.issues/stage-1-stratified-sampling-algorithm-conceptual-fit/`, `.issues/55-public-github-pages-deployment/`).

  **Schritt 2 — Alles staging (inkl. Review-Ordner als wertvolle History):**
  ```bash
  git add LICENSE README.md
  git add apps/web/vite.config.ts apps/web/playwright.config.ts apps/web/playwright-live.config.ts apps/web/tests/smoke-live/ apps/web/package.json
  git add .github/workflows/deploy.yml
  git add .issues/55-public-github-pages-deployment/
  git add .issues/in-app-docs-ideation/ .issues/stage-1-group-reporting-ux-review/ .issues/stage-1-stratified-sampling-algorithm-conceptual-fit/
  ```

  Vor jedem add: prüfe via `git status --short`, dass keine sensitive Dateien (.env, credentials) dabei sind.

  **Schritt 3 — Commit (HEREDOC für saubere Multi-Line-Message):**
  ```bash
  git commit -m "$(cat <<'EOF'
  chore: gh repo setup, license, ghpages workflow, vite base path, live smoke

  - LICENSE (GPL-3.0-or-later, kanonischer FSF-Volltext)
  - apps/web/vite.config.ts: base auf /buergerinnenrat/ mit VITE_BASE_PATH-env-Override
  - apps/web/playwright.config.ts: webServer-env VITE_BASE_PATH=/ (e2e bleibt grün)
  - .github/workflows/deploy.yml: build → deploy (actions/deploy-pages@v4) → smoke (Playwright gegen Live-URL)
  - apps/web/playwright-live.config.ts + tests/smoke-live/site-smoke.spec.ts: 5 Smoke-Tests gegen Live-URL
  - README.md: Live-URL-Header, Build-Badge, Lizenz-Sektion

  Issue #55: Public GH Repo + GH Pages Deploy + Smoke
  EOF
  )"
  ```

  **Schritt 4 — Verifikation:**
  ```bash
  git log -1 --stat
  git status --short  # muss leer sein
  ```
  </action>
  <verify>
  <automated>git status --short | wc -l | grep -q "^0$" && git log -1 --pretty=format:"%s" | grep -q "ghpages\|gh repo\|deploy" && git log -1 --stat | grep -q "LICENSE\|deploy.yml" && echo OK</automated>
  </verify>
  <done>
  - Working tree clean (`git status --short` leer)
  - Letzter Commit auf `worktree-agent-ac76adcb` ist der Setup-Commit
  - Commit enthält LICENSE, vite.config.ts, .github/workflows/deploy.yml, README.md, smoke-Specs, Review-Ordner
  - Commit-Message folgt conventional-Format (`chore: ...`)
  </done>
</task>

<task type="auto">
  <name>Task 7: Merge nach main (Merge-Commit, NICHT Squash)</name>
  <files>git: branch main</files>
  <action>
  Empfehlung aus RESEARCH umsetzen: Merge-Commit (nicht Squash) bewahrt die granulare 25+1=26 Commit-Historie für Auditor:innen.

  **Schritt 1 — Pre-Flight:**
  ```bash
  git status --short  # MUSS leer sein (sonst stop und Task 6 nochmal prüfen)
  ```
  Falls nicht leer: STOP, ASK User. Niemals mit dirty tree mergen.

  **Schritt 2 — Auf main wechseln und mergen:**
  ```bash
  git fetch origin main 2>/dev/null || true  # Origin existiert noch nicht — egal
  git checkout main
  git status --short  # auch hier MUSS leer sein
  git merge --no-ff worktree-agent-ac76adcb -m "$(cat <<'EOF'
  feat: stage 1 sortition tool with reporting, ux polish, in-app docs, ghpages deploy

  Merge worktree-agent-ac76adcb (26 commits) covering:
  - #45 Stage 1 invitation list draw with stratified sampling
  - #52 Stage 1 group reporting view with print protocol
  - #53 Stage 1 UX review followup (a11y, audit binding, plain language)
  - #54 In-app documentation hub with algorithm walkthrough + tech manifest
  - #55 GH repo + GitHub Pages workflow + LICENSE + live smoke
  EOF
  )"
  ```

  **Schritt 3 — Verifikation:**
  ```bash
  git log --oneline -5  # Top: Merge-Commit, darunter: Setup-Commit + 25 Feature-Commits
  git log --oneline main | wc -l  # >= 26 (vorherige main-Commits + 26 neue)
  git status --short  # leer
  ```

  **WICHTIG:** Falls der Merge Konflikte hat (sollte nicht — main ist seit Worktree-Branch-Erstellung unverändert): STOP, ASK User. Niemals blind `git checkout --ours` oder `--theirs`.
  </action>
  <verify>
  <automated>test "$(git branch --show-current)" = "main" && git log -1 --pretty=format:"%s" | grep -qi "stage 1 sortition\|merge.*worktree" && git log --oneline main | head -30 | grep -q "ghpages\|gh repo" && git status --short | wc -l | grep -q "^0$" && echo OK</automated>
  </verify>
  <done>
  - Aktueller Branch ist `main`
  - HEAD ist Merge-Commit mit no-ff (sichtbare Branch-Topology)
  - Alle 26 Branch-Commits sind als Vorgänger im History vorhanden
  - Working tree clean
  </done>
</task>

<task type="auto">
  <name>Task 8: gh repo create + push main + Topics</name>
  <files>(remote: github.com/flomotlik/buergerinnenrat)</files>
  <action>
  **DESTRUKTIV-WARNUNG:** `gh repo create` ist nicht ohne weiteres reversibel — manuelles Repo-Löschen via GH-UI nötig wenn etwas falsch läuft. User hat aber explizit autorisiert ("Mit der GH cli solltest du das alles machen können"). Proceed-default.

  **Schritt 1 — Pre-Flight:**
  ```bash
  gh auth status  # muss "Logged in to github.com as flomotlik" zeigen
  test "$(git branch --show-current)" = "main"  # MUSS main sein
  ! git remote get-url origin 2>/dev/null  # origin darf NOCH NICHT existieren
  ```

  Falls `origin` schon existiert: STOP, ASK User. Niemals existing remote überschreiben.

  **Schritt 2 — Repo erstellen + Initial-Push:**
  ```bash
  gh repo create flomotlik/buergerinnenrat \
    --public \
    --source=. \
    --remote=origin \
    --push \
    --description="Browser-natives Werkzeug für die stratifizierte Auswahl von Personen für Bürger:innenräte"
  ```

  Erwartet: Repo erstellt, `origin` als remote hinzugefügt, `main` gepusht. Workflow startet automatisch nach Push (Trigger: push on main).

  **Schritt 3 — Topics setzen:**
  ```bash
  gh repo edit flomotlik/buergerinnenrat \
    --add-topic sortition \
    --add-topic citizens-assembly \
    --add-topic civic-tech \
    --add-topic buergerrat \
    --add-topic germany \
    --add-topic austria
  ```

  **Schritt 4 — Verifikation:**
  ```bash
  gh repo view flomotlik/buergerinnenrat --json name,visibility,description,url
  # → erwarte name: buergerinnenrat, visibility: PUBLIC, description gesetzt, url
  git remote get-url origin
  # → erwarte git@github.com:flomotlik/buergerinnenrat.git ODER https://...
  ```
  </action>
  <verify>
  <automated>gh repo view flomotlik/buergerinnenrat --json name,visibility,description 2>&1 | grep -q '"visibility":"PUBLIC"' && gh repo view flomotlik/buergerinnenrat --json repositoryTopics 2>&1 | grep -q "sortition" && git remote get-url origin | grep -q "buergerinnenrat" && echo OK</automated>
  </verify>
  <done>
  - GH Repo `flomotlik/buergerinnenrat` existiert und ist public
  - `origin` remote auf das neue Repo gesetzt
  - `main` ist gepusht
  - Topics gesetzt (mind. sortition, citizens-assembly, civic-tech, buergerrat)
  - Description gesetzt
  </done>
</task>

<task type="auto">
  <name>Task 9: Workflow-Run pollen bis Abschluss</name>
  <files>(GH Actions runtime)</files>
  <action>
  Der Push aus Task 8 hat den Workflow getriggert. Erste Run kann 5-15 min dauern (Pages-First-Time-Aktivierung via `actions/configure-pages@v5`).

  **Schritt 1 — Run-ID holen:**
  ```bash
  sleep 10  # kurzen Moment Workflow-Start abwarten
  RUN_ID=$(gh run list --workflow=deploy.yml -L 1 --json databaseId --jq '.[0].databaseId')
  echo "Polling Run ID: $RUN_ID"
  ```

  Falls keine Run gelistet: warte weitere 30s, retry. Wenn nach 2 Versuchen nichts: STOP, ASK User (Workflow-Trigger könnte fehlschlagen — z.B. weil Workflow-File-Syntax kaputt ist).

  **Schritt 2 — Polling-Loop (max 15 min):**
  ```bash
  gh run watch "$RUN_ID" --exit-status --interval 15
  ```

  `gh run watch` blockt bis Run fertig ist; `--exit-status` gibt non-zero return wenn Run failed. Default-Timeout vom gh CLI ist sehr großzügig — kein eigener Timeout-Wrap nötig.

  **Schritt 3 — Conclusion auswerten:**
  ```bash
  CONCLUSION=$(gh run view "$RUN_ID" --json conclusion --jq '.conclusion')
  echo "Workflow conclusion: $CONCLUSION"
  ```

  Erwartet: `success`. Bei `failure`, `cancelled`, `timed_out`: weiter mit Task 11 (ASK).
  </action>
  <verify>
  <automated>RUN_ID=$(gh run list --workflow=deploy.yml -L 1 --json databaseId --jq '.[0].databaseId') && gh run view "$RUN_ID" --json conclusion --jq '.conclusion' | grep -q "success" && echo OK</automated>
  </verify>
  <done>
  - Erste Workflow-Run hat conclusion `success`
  - Build-Job grün, Deploy-Job grün, Smoke-Job grün
  - Pages ist aktiviert (entweder schon vorab oder via configure-pages@v5)
  </done>
</task>

<task type="auto">
  <name>Task 10: Manueller Live-URL-Smoke-Check (curl + Logs)</name>
  <files>(verification only, no file changes)</files>
  <action>
  Belt-and-suspenders nach erfolgtem Workflow.

  **Schritt 1 — HTTP-Status:**
  ```bash
  curl -sS -o /dev/null -w "%{http_code}\n" https://flomotlik.github.io/buergerinnenrat/
  # erwarte: 200
  ```

  **Schritt 2 — Title-Check:**
  ```bash
  curl -sSL https://flomotlik.github.io/buergerinnenrat/ | grep -o "<title>[^<]*</title>"
  # erwarte: <title>...Bürger... ODER ...Sortition...</title>
  ```

  **Schritt 3 — Asset-Path-Check (kritisch — base-path-Validation):**
  ```bash
  curl -sSL https://flomotlik.github.io/buergerinnenrat/ | grep -oE 'src="[^"]+\.js"|href="[^"]+\.css"' | head -5
  # erwarte: alle Asset-URLs beginnen mit /buergerinnenrat/ (NICHT mit / direkt)
  # falls Asset-Paths mit nur / starten → vite base ist falsch → STOP, ASK User
  ```

  **Schritt 4 — Smoke-Job-Logs anschauen:**
  ```bash
  RUN_ID=$(gh run list --workflow=deploy.yml -L 1 --json databaseId --jq '.[0].databaseId')
  gh run view "$RUN_ID" --log --job=$(gh run view "$RUN_ID" --json jobs --jq '.jobs[] | select(.name == "smoke") | .databaseId') 2>&1 | tail -40
  # erwarte: alle 5 Tests passed
  ```

  Wenn alle 4 Schritte grün: Issue ist gelöst. Wenn ein Schritt rot: weiter zu Task 11.
  </action>
  <verify>
  <automated>test "$(curl -sS -o /dev/null -w '%{http_code}' https://flomotlik.github.io/buergerinnenrat/)" = "200" && curl -sSL https://flomotlik.github.io/buergerinnenrat/ | grep -qE '(Bürger|Sortition|Buergerinnenrat)' && curl -sSL https://flomotlik.github.io/buergerinnenrat/ | grep -qE 'src="/buergerinnenrat/' && echo OK</automated>
  </verify>
  <done>
  - HTTP 200 auf Live-URL
  - Title enthält "Bürger" oder "Sortition"
  - Asset-Pfade unter `/buergerinnenrat/...` (vite base korrekt)
  - Smoke-Job-Logs zeigen 5/5 passed
  </done>
</task>

<task type="checkpoint:decision">
  <name>Task 11: Wenn Workflow rot → STOP + ASK</name>
  <files>(checkpoint, kein file)</files>
  <action>
  Diese Task ist ein expliziter Stopping-Point. Sie wird NUR aktiv wenn Task 9 oder Task 10 fehlgeschlagen sind.

  **Wenn alle Vor-Tasks grün waren:** überspringen, Plan ist fertig.

  **Wenn Task 9 (Workflow-Run) rot:**
  ```bash
  RUN_ID=$(gh run list --workflow=deploy.yml -L 1 --json databaseId --jq '.[0].databaseId')
  echo "=== FAILED RUN $RUN_ID ==="
  gh run view "$RUN_ID" --log-failed 2>&1 | tail -100
  echo "=== JOB SUMMARY ==="
  gh run view "$RUN_ID" --json jobs --jq '.jobs[] | {name, conclusion, completedAt}'
  ```

  Sammle: welcher Job (build/deploy/smoke) failed, erste Error-Message in Logs, Job-Step-Index.

  **Wenn Task 10 (Live-Smoke) rot:**
  - HTTP non-200 → Pages-Aktivierung verzögert? Warte 2 min, retry curl. Falls weiter rot: GH-Pages-Repo-Settings prüfen via `gh api repos/flomotlik/buergerinnenrat/pages`.
  - Asset-Path mit nur `/` (statt `/buergerinnenrat/`) → vite base ist falsch geladen worden → bug in Task 2.
  - Smoke-Tests fail → Selektoren in `site-smoke.spec.ts` matchen nicht zum tatsächlichen UI → Texte aus actual UI nachschlagen.

  **In allen Failure-Cases:** STOP. Nicht blind fix-and-retry. Sondern:
  1. Sammle die o.g. Diagnostik-Output
  2. Schreibe ein 5-10-Zeilen-Failure-Summary (welcher Job, welcher Step, welche Error-Message, vermutete Ursache, Fix-Vorschlag)
  3. Übergib an User für Entscheidung — User kann dann Fix freigeben oder Plan-Anpassung anweisen

  **Niemals:**
  - Workflow-File leer-pushen "um den Trigger neu auszulösen"
  - Repo löschen und neu erstellen (Geschichte verloren)
  - Smoke-Tests wegkommentieren um Workflow grün zu machen
  - Force-Push auf main
  </action>
  <verify>
  <automated>echo "Manual checkpoint — überspringen wenn alles grün, sonst Failure-Summary an User"</automated>
  </verify>
  <done>
  - Wenn alles grün: nichts zu tun, Plan komplett
  - Wenn rot: Failure-Summary an User übergeben, KEIN blinder Fix
  </done>
</task>

</tasks>

<verification>
Nach Abschluss aller Tasks (Issue gelöst):
- `curl -sS -o /dev/null -w "%{http_code}" https://flomotlik.github.io/buergerinnenrat/` → `200`
- `gh run list --workflow=deploy.yml -L 1 --json conclusion --jq '.[0].conclusion'` → `success`
- `gh repo view flomotlik/buergerinnenrat --json visibility --jq '.visibility'` → `PUBLIC`
- `git log --oneline main | head -1` → Merge-Commit aus Task 7
- `git remote get-url origin` → enthält `buergerinnenrat`
</verification>

<success_criteria>
Mappt 1:1 auf ISSUE.md Acceptance Criteria:

Repo-Setup:
- LICENSE im Repo-Root mit kanonischem GPL-3.0-Volltext (Task 1)
- README.md mit Live-URL, Build-Badge, Was-ist-das-Header, Lizenz-Hinweis (Task 5)
- Merge nach main mit logischer History — Merge-Commit + 26 sichtbare Vorgänger (Task 7)

Vite + Build:
- `apps/web/vite.config.ts` hat `base: '/buergerinnenrat/'` mit `VITE_BASE_PATH`-env-Override (Task 2)
- Lokaler Build mit `VITE_BASE_PATH=/` läuft (Task 2 verify)
- Asset-Pfade live unter `/buergerinnenrat/...` (Task 10 verify Schritt 3)

GitHub Actions Workflow:
- `.github/workflows/deploy.yml` mit 3 Jobs build/deploy/smoke (Task 3)
- Pages-Permissions: pages:write + id-token:write (Task 3)
- Trigger: push main + workflow_dispatch (Task 3)
- Build-Status-Badge in README (Task 5)

Repo-Erstellung:
- `gh repo create flomotlik/buergerinnenrat --public ...` ausgeführt (Task 8)
- Pages aktiviert via configure-pages@v5 just-in-time (Task 3 + Task 9)
- Erste Workflow-Run automatisch nach Push (Task 9)
- Topics: sortition, citizens-assembly, buergerrat, civic-tech, germany, austria (Task 8)

Live-Smoke-Tests:
- `apps/web/tests/smoke-live/site-smoke.spec.ts` separate von e2e (Task 4)
- 5 Tests: Hauptseite-Title, Tab-Switch, Stage-1-Upload, Doku-Hub-≥5-Karten, Algorithmus-Doku-SVG (Task 4)
- BASE_URL via `LIVE_BASE_URL` env (Task 4)
- Smoke-Failure → Workflow rot → Default-GH-Email-Notification (Task 3 + GH-Standard)

Verifikation am Ende:
- Workflow-Run grün (Task 9)
- Live-URL erreichbar via curl (Task 10)
- Smoke-Job-Logs zeigen 5/5 passed (Task 10)
</success_criteria>
