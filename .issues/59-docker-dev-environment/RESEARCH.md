# Research — Issue #59 Docker Dev-Environment + Makefile

> Lightweight: alle nötigen Komponenten existieren bereits (im `Dockerfile.claude`), Makefile braucht erweitert werden.

## User Constraints

- `make dev`, `make build`, `make test`, `make e2e`, `make generate-data` ohne lokale Installation
- Funktioniert auf Linux/macOS/Windows-WSL (nicht native Windows)
- Kein Docker Compose nötig
- DOCKER vs NO_DOCKER Schalter via Make-Variable

## Summary

Existierende Bausteine:
- `Dockerfile.claude` — vollständige Tool-Liste (Node 20 base mit Playwright-libs, corepack-pnpm, Python 3.12 mit sortition-algorithms-Stack). KANN als Vorlage dienen. ABER: Base-Image `ghcr.io/flomotlik/claude-code:latest` ist user-spezifisch + bringt Claude-Flow-Tooling mit — für Pure-Dev-Container überdimensioniert.
- `Makefile` — minimal mit 7 Targets, alle direkt ohne Docker

Plan: **Eigene `Dockerfile.dev`** mit klarem schmalen Tool-Set:
- Base: `mcr.microsoft.com/playwright:v1.49.1-noble` (Node 20 + alle Playwright-Browser pre-installed, offizielles Microsoft-Image, ~1.8GB)
- corepack + pnpm@9.12.3
- Python 3 + tsx
- WORKDIR /workspace, USER node oder root je nach Volume-Permissions

## Codebase Analysis

<interfaces>

### Bestehende Tooling-Anforderungen
- `package.json:packageManager`: `pnpm@9.12.3` — pinned
- `apps/web/package.json` deps: solid-js, vite 6, tailwind 3.4, highs.wasm, @playwright/test 1.49.1
- Python deps für `scripts/stage1_reference.py`: nur stdlib (csv, json, math, sys, hashlib) — KEIN pandas/numpy nötig im dev-container (das war für Statistik-Test, nicht für CI/dev-loop)
- tsx für TypeScript-Scripts (synthetic-meldedaten generator) — als devDep im root oder global

### Makefile-Targets (heute)
`install, dev, build, test, test-e2e, lint, typecheck, clean, all` — alle direkt ohne Container.

### Docker-Patterns aus Dockerfile.claude
- `corepack enable && corepack prepare pnpm@9.12.3 --activate`
- Playwright-Libs werden im Microsoft-Playwright-Image schon mitgeliefert — keine apt-list nötig
- `WORKDIR /workspace` mit volume mount

### Permission-Probleme bei Volume-Mounts
- Linux: UID des Containers muss matchen sonst gehören Files Root
- Lösung: `--user $(id -u):$(id -g)` beim docker run, oder alternativ: `USER node` (UID 1000) im Dockerfile

</interfaces>

## Architektur-Empfehlung

### Dockerfile.dev (Skeleton)

```dockerfile
FROM mcr.microsoft.com/playwright:v1.49.1-noble

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# Python 3 für stage1_reference.py + scripts (Ubuntu Noble hat Python 3.12)
RUN apt-get update && apt-get install -y python3 python3-pip make && rm -rf /var/lib/apt/lists/*

# tsx über pnpm global
RUN pnpm add -g tsx

WORKDIR /workspace

# Container does not bake source — assumes $(pwd) is mounted at /workspace
CMD ["bash"]
```

### Makefile (Re-Design)

Variable `DOCKER` (Default 1) steuert ob im Container oder direkt:

```makefile
DOCKER ?= 1
IMAGE := buergerinnenrat-dev:latest

ifeq ($(DOCKER),1)
RUN := docker run --rm -it \
    -v $(PWD):/workspace \
    -v buergerinnenrat-pnpm-store:/pnpm/store \
    -v buergerinnenrat-node-modules:/workspace/node_modules \
    -p 5173:5173 -p 4173:4173 \
    --user $(shell id -u):$(shell id -g) \
    $(IMAGE)
else
RUN :=
endif

build-image:
	docker build -f Dockerfile.dev -t $(IMAGE) .

install:
	$(RUN) pnpm install --frozen-lockfile

dev:
	$(RUN) pnpm dev

# ... etc
```

### Alternative: Single-Container, run-and-stop

Statt langlebiger Container starten Targets jeweils einen kurzen Container, der nach Abschluss endet (`--rm`). Das ist robuster als Container-zu-managen.

### NO_DOCKER-Pfad

Wenn `make NO_DOCKER=1 dev` gerufen wird, entfällt die `docker run`-Vorlauf, alles läuft direkt mit der hostlokalen Toolchain. Ist 1-zeiliger ifeq-Switch.

## Implementierungs-Risiken

1. **macOS-Performance bei Volume-Mount**: bind-Mount von `node_modules` über `osxfs` ist langsam. Lösung: `node_modules` als named-volume (im Plan vorgesehen).
2. **Permissions**: Files in node_modules / dist gehören sonst root. Lösung: `--user $(id -u):$(id -g)` beim docker run.
3. **Playwright-Image-Größe**: ~1.8GB. Akzeptiert weil User explizit "alles im Container" wollte.
4. **Vite-HMR aus Container**: braucht `host: '0.0.0.0'` in vite-config + Port-Mapping, sonst kein hot reload.
5. **Image-Build im CI**: GitHub Actions kann Image bauen + cachen via `docker/build-push-action@v6`. Optional, nicht-blockend.
6. **pnpm-store-Sharing**: named volume `buergerinnenrat-pnpm-store` persistent macht subsequent `pnpm install` schnell.
7. **TTY-Detection**: `make dev` braucht `-it`; nicht-interaktive `make test` braucht das nicht. Aufteilung im Makefile via `RUN_TTY` und `RUN_NOTTY`.

## Quellen

- Microsoft Playwright Image: <https://hub.docker.com/_/microsoft-playwright>
- pnpm Docker: <https://pnpm.io/docker>
- Make conditional: <https://www.gnu.org/software/make/manual/html_node/Conditional-Syntax.html>
