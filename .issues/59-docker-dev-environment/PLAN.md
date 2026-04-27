# Plan — Issue #59 Docker Dev-Environment + Makefile

> Schlanker Plan, ein Commit am Ende.

## Tasks

<task id="1">
**Dockerfile.dev erstellen**

- Datei: `Dockerfile.dev` im Repo-Root
- Base: `mcr.microsoft.com/playwright:v1.49.1-noble`
- Tooling: corepack + pnpm@9.12.3, Python 3 + pip + make (apt-get), tsx global
- WORKDIR /workspace, CMD ["bash"], keine baked-in sources
- Header-Kommentare: erklärt Zweck (lokale Entwicklung, nicht Production)
- Pinned Versionen (Playwright 1.49.1, pnpm 9.12.3) für Reproduzierbarkeit

**Acceptance:** `docker build -f Dockerfile.dev -t buergerinnenrat-dev .` läuft durch, ergebt funktionierendes Image (~1.8-2 GB). `docker run --rm buergerinnenrat-dev pnpm --version` gibt `9.12.3`.

**Verify:** `docker build -f Dockerfile.dev -t buergerinnenrat-dev . && docker run --rm buergerinnenrat-dev sh -c 'node --version && pnpm --version && python3 --version && tsx --version'`
</task>

<task id="2">
**Makefile re-design mit Docker + No-Docker Switch**

- Datei: `Makefile` (überschreibt existing)
- Variable `DOCKER ?= 1`, `IMAGE := buergerinnenrat-dev:latest`
- Conditional ifeq($(DOCKER),1) für `RUN` und `RUN_TTY` Variablen
- Volumes: `buergerinnenrat-pnpm-store`, `buergerinnenrat-node-modules` als named volumes
- Ports: 5173, 4173 mapped
- User-mapping: `--user $(shell id -u):$(shell id -g)` damit File-Permissions stimmen
- Targets:
  - `help` (default, listet Targets)
  - `build-image`, `install`, `dev`, `build`, `preview`, `test`, `typecheck`, `lint`, `e2e`, `e2e-stage1`, `generate-data`, `stage1-cross-validate`, `shell`, `clean`, `clean-all`, `all`
  - Sub-targets nutzen `RUN` (für non-TTY) oder `RUN_TTY` (für interaktive wie shell, dev)
- Header-Kommentare: erklärt DOCKER vs NO_DOCKER

**Acceptance:** 
- `make help` listet alle Targets mit Beschreibung
- `make NO_DOCKER=1 typecheck` läuft direkt ohne Docker (wenn lokal Node + pnpm da sind)
- `make typecheck` (DOCKER=1 default) läuft im Container (vorausgesetzt Image ist gebaut)

**Verify:** `make help && make NO_DOCKER=1 typecheck` (wenn Node lokal verfügbar)
</task>

<task id="3">
**.dockerignore erstellen**

- Datei: `.dockerignore` im Repo-Root
- Ignoriert: `node_modules`, `.git`, `dist`, `*.log`, `.cache`, `.pnpm-store`, etc.
- Reduziert Build-Kontext-Größe (sonst werden GBs an node_modules zum Daemon geschickt)

**Acceptance:** `docker build` ist schnell weil Build-Kontext klein ist.
</task>

<task id="4">
**README.md-Sektion "Lokale Entwicklung mit Docker"**

- Existierende README.md erweitern mit kurzer Sektion (5-10 Zeilen) am Anfang nach Live-URL
- Inhalt:
  - Voraussetzung: Docker installiert
  - 4 Befehle in Reihenfolge: `make build-image`, `make install`, `make dev` → http://localhost:5173
  - Hinweis auf `make help` für vollständige Liste
  - Hinweis auf `NO_DOCKER=1` als Bypass für Power-User mit lokaler Toolchain

**Acceptance:** Sektion liest sich klar in <30 Sekunden, Befehle sind copy-paste-fähig.
</task>

<task id="5">
**CI: Docker-Build-Smoke-Test (optional)**

- Neue Datei: `.github/workflows/docker-build.yml`
- Trigger: `push` auf main wenn `Dockerfile.dev` oder `Makefile` geändert wird (paths-filter)
- Job: `docker build -f Dockerfile.dev -t buergerinnenrat-dev .` + smoke run `docker run --rm buergerinnenrat-dev pnpm --version`
- Optional: Buildx + Cache zu `actions/cache`
- Erwartete Laufzeit: ~5-10 min (Image-Pull dominant)

**Acceptance:** Workflow läuft auf Push grün, blockt nicht den main-Deploy-Workflow.
</task>

<task id="6">
**Verifikation manuell + Commit**

- Lokal verifizieren (im Container, da kein Docker im Claude-Container):
  - `docker build -f Dockerfile.dev -t buergerinnenrat-dev .` (kann nur in echtem Docker-Host laufen)
- Falls kein Docker verfügbar im Issue-Worktree: nur statisch verifizieren via `make help` (zeigt Help-Text auch ohne Docker)
- Single Commit: `feat(dev): docker-based local development environment + makefile (#59)`
- Tests: bestehende Tests bleiben grün (Docker-Issue ändert keinen Source-Code, nur Infrastructure)
</task>

## Tasks die ausserhalb scope sind

- DevContainer-Konfiguration für VSCode (eigener Issue)
- Production-Container (eigener Issue)
- Docker Compose (Single-Container reicht)
- Native Windows-Support (PowerShell-Makefile-Syntax)
