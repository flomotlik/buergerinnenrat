---
id: 59
slug: docker-dev-environment
title: Docker-basiertes lokales Development — Makefile-Targets ohne lokale Installs
track: Z
estimate_pt: 1
status: researched
depends_on: [55, 57]
priority: high
priority_rationale: "Senkt Einstiegshürde für Beitragende — keine lokale Node/pnpm/Playwright-Installation nötig"
---

# Docker Dev-Environment + Makefile

## Kontext

Heute braucht man für lokale Entwicklung am Tool:
- Node.js 20+
- pnpm via corepack
- Playwright + Browser-Binaries (chromium + firefox)
- Python 3 + venv mit pandas/numpy für `scripts/stage1_reference.py`
- tsx für TypeScript-Skripte (synthetic-meldedaten Generator)

User-Anforderung: **alles im Container** damit lokal nichts installiert sein muss. Konkret: `make dev` startet die App im Browser, `make test` läuft Tests, `make build` baut, `make generate-data` ruft den Synthetic-Generator. Alles ohne `pnpm install` lokal.

## Ziel

Ein Dockerfile + ein Makefile, das alle Dev-Tasks containerisiert. Funktioniert auf Linux/macOS/Windows-WSL.

## Acceptance Criteria

### Dockerfile

- [ ] `Dockerfile.dev` im Repo-Root: Node 20-LTS-Base + corepack-aktiviertes pnpm + Playwright-Browser (chromium + firefox) + Python 3 + tsx + Build-Essentials
- [ ] Multi-Stage falls sinnvoll: Base-Image mit allen Tools, Layer für `pnpm install --frozen-lockfile`, getrennt von Source-Code-Volumes
- [ ] Image-Größe vertretbar (~2 GB ist OK, Playwright-Browser sind groß)
- [ ] Tag/Name: `buergerinnenrat-dev:latest`
- [ ] Image baut reproduzierbar via `docker build -f Dockerfile.dev -t buergerinnenrat-dev .`

### Makefile

- [ ] `make help` — listet alle Targets mit Kurz-Beschreibung
- [ ] `make build-image` — baut das Docker-Image
- [ ] `make install` — `docker run` mit Source-Mount, ruft `pnpm install --frozen-lockfile`
- [ ] `make dev` — startet `vite dev` auf Port 5173, host-mount source, hot reload funktioniert
- [ ] `make build` — produktiver Build, output landet im host-mounted `apps/web/dist/`
- [ ] `make preview` — `vite preview` auf Port 4173 nach build
- [ ] `make test` — `pnpm -r test` (Vitest)
- [ ] `make typecheck` — `pnpm -r exec tsc --noEmit`
- [ ] `make e2e` — Playwright in headed-OFF mode, chromium + firefox
- [ ] `make e2e-stage1` — nur Stage-1-spezifische e2e
- [ ] `make generate-data` — ruft `tsx scripts/synthetic-meldedaten/generator.ts --profile herzogenburg --output apps/web/public/beispiele/herzogenburg-melderegister-8000.csv`
- [ ] `make stage1-cross-validate` — bash + Python für TS-vs-Python-Cross-Validation (`scripts/stage1_cross_validate.sh`)
- [ ] `make shell` — interaktive bash im Container für Ad-hoc-Debugging
- [ ] `make clean` — entfernt `node_modules`, `dist/`, evtl. weitere Artefakte
- [ ] `make clean-all` — zusätzlich Image entfernen
- [ ] Targets respektieren `DOCKER` Variable: wenn lokal Node + pnpm verfügbar, kann der User `make NO_DOCKER=1 dev` rufen und es läuft direkt ohne Container (Convenience für Power-User)

### Volumes + Performance

- [ ] Source-Code-Mount via `-v $(pwd):/workspace` (host-konsistent)
- [ ] `node_modules` im Container-Volume (named volume `buergerinnenrat-node-modules`) damit es nicht über den Mount geht (sonst auf macOS sehr langsam) — ABER: User kann optional `node_modules` auch host-mount lassen wenn er das vorzieht
- [ ] pnpm-Store als named volume `buergerinnenrat-pnpm-store` für Cache-Persistenz zwischen Container-Runs
- [ ] Playwright-Browser im Image (nicht im Volume) — sind im Base-Image installiert

### Dokumentation

- [ ] `README.md`-Sektion "Lokale Entwicklung mit Docker" mit den 4-5 wichtigsten Befehlen
- [ ] `Dockerfile.dev` und `Makefile` haben Header-Kommentare die das Setup erklären
- [ ] Hinweis auf Linux/macOS/Windows-WSL — KEIN nativen Windows-Support (PowerShell-Makefile-Syntax ist anders, das ist out of scope)

### Tests

- [ ] CI-Smoke: GitHub Action prüft dass `Dockerfile.dev` baut (kann auf separater Workflow-Datei laufen, nicht auf jedem Push, nur bei Änderungen am Dockerfile)
  - Optional: kann gecachet werden via Buildx
- [ ] Lokale-Verifikation manuell durchgespielt + dokumentiert (welche Befehle, welche erwartet output)

## Out of Scope

- Production-Container (das ist ein anderes Issue, Pages-Deploy reicht heute)
- Docker Compose (Single-Container reicht, Compose würde wenig hinzufügen)
- DevContainer-Konfiguration für VSCode (.devcontainer.json) — nice-to-have, eigener Issue
- Native Windows-Support (PowerShell-Makefile-Syntax)
- GPU-Acceleration für Playwright (nicht nötig für unsere Tests)

## Verweise

- Heutiger lokaler Setup-Stand (zum Replizieren im Container): siehe README-Setup-Sektion
- Bestehende `Dockerfile.claude` (für Claude-Flow-Container) als Vorbild für Tooling-Liste
- pnpm Docker Best Practices: <https://pnpm.io/docker>
- Playwright Docker: <https://playwright.dev/docs/docker>
- Make Variable-Pattern für DOCKER vs No-DOCKER: <https://www.gnu.org/software/make/manual/html_node/Conditional-Syntax.html>
