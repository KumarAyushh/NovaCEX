# NovaCEX developer commands (P0.4). Run `make help` to list them.
#
# The Makefile is a thin layer over two tools:
#   docker compose  starts/stops Redis and Postgres (docker-compose.yml)
#   bun run ...     runs package scripts across all workspaces via turbo

# Every target here is a command, not a file to build.
.PHONY: help up down clean ps logs dev test lint typecheck format check

# `make` with no target prints the help.
.DEFAULT_GOAL := help

help: ## List the available targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-10s %s\n", $$1, $$2}'

up: .env ## Start Redis + Postgres and wait until both are healthy
	docker compose up -d --wait

# `up` depends on the file `.env`. If it exists this rule is skipped; if not,
# stop early with a clear hint instead of a wall of compose errors.
.env:
	@echo "Missing .env. Run: cp .env.example .env  and fill in real values." >&2
	@exit 1

down: ## Stop the containers (data volumes are kept)
	docker compose down

clean: ## Stop the containers AND delete their data volumes
	docker compose down -v

ps: ## Show container status and health
	docker compose ps

logs: ## Follow container logs
	docker compose logs -f

dev: up ## Start infra, then every app in watch mode
	bun run dev

test: up ## Start infra, then run every workspace's tests
	bun run test

lint: ## ESLint across all workspaces
	bun run lint

typecheck: ## tsc across all workspaces
	bun run typecheck

format: ## Rewrite files with Prettier
	bun run format

check: ## Everything CI checks: format, lint, typecheck, test
	bun run format:check
	bun run lint
	bun run typecheck
	$(MAKE) test
