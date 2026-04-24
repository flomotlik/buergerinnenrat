.PHONY: install dev build test test-e2e lint typecheck clean all

install:
	pnpm install

dev:
	pnpm dev

build:
	pnpm build

test:
	pnpm test

test-e2e:
	pnpm test:e2e

lint:
	pnpm lint

typecheck:
	pnpm typecheck

clean:
	rm -rf apps/*/dist apps/*/node_modules node_modules
	rm -rf apps/*/playwright-report apps/*/test-results apps/*/.vite

all: install typecheck lint test build
