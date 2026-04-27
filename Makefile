# Makefile — buergerinnenrat sortition tool, local dev workflow.
#
# Two modes, switched via the DOCKER variable:
#
#   DOCKER=1 (default)  Run every target inside the Dockerfile.dev image.
#                       Contributors need ONLY docker installed locally —
#                       no Node, no pnpm, no Playwright browsers, no Python.
#
#   DOCKER=0 / NO_DOCKER=1
#                       Run targets directly on the host. Power-user mode
#                       for people who already have Node 20 + pnpm@9.12.3
#                       + Playwright + Python 3 installed. Used in CI too.
#
# Examples:
#   make build-image                # build the dev image
#   make install                    # pnpm install --frozen-lockfile in container
#   make dev                        # vite dev server on http://localhost:5173
#   make NO_DOCKER=1 typecheck      # run tsc directly on host
#   make help                       # full target list
#
# Volumes (when DOCKER=1):
#   - $(PWD) bind-mounted at /workspace                    (source code, host-edited)
#   - named vol buergerinnenrat-pnpm-store at /pnpm/store  (pnpm content-addressed cache)
#   - named vol buergerinnenrat-node-modules at /workspace/node_modules
#       (pnpm hoists here; keeping it in a named volume is much faster than going
#        through a bind mount on macOS / Windows-WSL).

DOCKER ?= 1
# NO_DOCKER=1 is a friendlier alias commonly typed by hand.
ifeq ($(NO_DOCKER),1)
  DOCKER := 0
endif

IMAGE := buergerinnenrat-dev:latest
PNPM_VOLUME := buergerinnenrat-pnpm-store
NODE_MODULES_VOLUME := buergerinnenrat-node-modules

ifeq ($(DOCKER),1)
  # Non-TTY runner — for tests, typecheck, lint, scripted commands.
  RUN := docker run --rm \
    -v $(PWD):/workspace \
    -v $(PNPM_VOLUME):/pnpm/store \
    -v $(NODE_MODULES_VOLUME):/workspace/node_modules \
    --user $(shell id -u):$(shell id -g) \
    $(IMAGE)
  # Interactive runner with port forwarding — for `dev`, `preview`, `shell`.
  RUN_TTY := docker run --rm -it \
    -v $(PWD):/workspace \
    -v $(PNPM_VOLUME):/pnpm/store \
    -v $(NODE_MODULES_VOLUME):/workspace/node_modules \
    -p 5173:5173 -p 4173:4173 \
    --user $(shell id -u):$(shell id -g) \
    $(IMAGE)
else
  # Host mode — RUN is a no-op prefix, commands execute directly.
  RUN :=
  RUN_TTY :=
endif

.PHONY: help build-image install dev build preview test typecheck lint \
        e2e e2e-stage1 generate-data stage1-cross-validate \
        shell clean clean-all all

.DEFAULT_GOAL := help

help:
	@echo "Verfügbare Targets (DOCKER=1 default, NO_DOCKER=1 für lokale Toolchain):"
	@echo "  build-image            Baut das Dev-Image"
	@echo "  install                pnpm install --frozen-lockfile"
	@echo "  dev                    Vite Dev-Server auf Port 5173"
	@echo "  build                  Production Build"
	@echo "  preview                Vite Preview auf Port 4173"
	@echo "  test                   Vitest Unit-Tests"
	@echo "  typecheck              TypeScript-Check über alle Workspaces"
	@echo "  lint                   ESLint"
	@echo "  e2e                    Playwright e2e (chromium + firefox)"
	@echo "  e2e-stage1             Nur Stage-1 e2e"
	@echo "  generate-data          Synthetic Herzogenburg-CSV generieren"
	@echo "  stage1-cross-validate  TS vs Python Cross-Validation"
	@echo "  shell                  Interaktive bash im Container"
	@echo "  clean                  Entfernt node_modules, dist, etc."
	@echo "  clean-all              Plus Volumes und Image entfernen"
	@echo "  all                    install + typecheck + test + build"

# --- Image lifecycle --------------------------------------------------------

build-image:
	docker build -f Dockerfile.dev -t $(IMAGE) .

# --- Dependency install -----------------------------------------------------

install:
	$(RUN) pnpm install --frozen-lockfile

# --- Dev / build / preview --------------------------------------------------
# `dev` and `preview` need RUN_TTY because they are long-running interactive
# foreground processes the user wants to Ctrl-C cleanly.

dev:
	$(RUN_TTY) pnpm --filter @sortition/web dev --host 0.0.0.0

build:
	$(RUN) pnpm --filter @sortition/web build

preview:
	$(RUN_TTY) pnpm --filter @sortition/web preview --host 0.0.0.0

# --- Quality gates ----------------------------------------------------------

test:
	$(RUN) pnpm test

typecheck:
	$(RUN) pnpm typecheck

lint:
	$(RUN) pnpm lint

# --- e2e --------------------------------------------------------------------
# The Playwright base image already has chromium + firefox under
# /ms-playwright; PLAYWRIGHT_BROWSERS_PATH is preset by that image so no
# extra `playwright install` is needed.

e2e:
	$(RUN) pnpm --filter @sortition/web exec playwright test

e2e-stage1:
	$(RUN) pnpm --filter @sortition/web exec playwright test stage1.spec.ts

# --- Data + reference scripts ----------------------------------------------

generate-data:
	$(RUN) pnpm tsx scripts/synthetic-meldedaten/generator.ts \
	    --profile herzogenburg \
	    --output apps/web/public/beispiele/herzogenburg-melderegister-8000.csv \
	    --seed 4711

stage1-cross-validate:
	$(RUN) bash scripts/stage1_cross_validate.sh

# --- Convenience ------------------------------------------------------------

shell:
	$(RUN_TTY) bash

# --- Cleanup ----------------------------------------------------------------
# `clean` removes only host-side build artefacts. `clean-all` additionally
# drops the named volumes and the dev image — useful when bumping the
# Dockerfile or pnpm-lock.yaml from scratch.

clean:
	rm -rf apps/*/dist apps/*/node_modules node_modules
	rm -rf apps/*/playwright-report apps/*/test-results apps/*/.vite
	rm -rf packages/*/dist packages/*/node_modules

clean-all: clean
	-docker volume rm $(PNPM_VOLUME) $(NODE_MODULES_VOLUME)
	-docker image rm $(IMAGE)

# --- Composite --------------------------------------------------------------

all: install typecheck test build
