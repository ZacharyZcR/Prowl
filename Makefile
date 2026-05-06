.PHONY: all dev prod build clean lint test help
.PHONY: backend-dev backend-build backend-lint backend-test
.PHONY: frontend-dev frontend-build frontend-lint frontend-test
.PHONY: cli-build desktop-dev desktop-build
.PHONY: proto docker-dev docker-prod
.PHONY: e2e
.PHONY: db-shell redis-shell backup restore
.PHONY: docs-dev docs-build

# ──────────────────────────────────────────────
# Variables
# ──────────────────────────────────────────────
COMPOSE_DEV  = docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml
COMPOSE_PROD = docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml

# ──────────────────────────────────────────────
# Development
# ──────────────────────────────────────────────
dev: ## Start development environment (infrastructure only)
	$(COMPOSE_DEV) up -d

dev-all: dev backend-dev frontend-dev ## Start all services in dev mode

stop: ## Stop all services
	$(COMPOSE_DEV) down

# ──────────────────────────────────────────────
# Build
# ──────────────────────────────────────────────
build: backend-build cli-build frontend-build ## Build all components

backend-build: ## Build backend binary
	$(MAKE) -C backend build

frontend-build: ## Build frontend
	pnpm --filter frontend build

cli-build: ## Build CLI
	$(MAKE) -C cli build

desktop-build: ## Build desktop app
	pnpm --filter desktop build

# ──────────────────────────────────────────────
# Development Servers
# ──────────────────────────────────────────────
backend-dev: ## Run backend in dev mode
	$(MAKE) -C backend run

frontend-dev: ## Run frontend dev server
	pnpm --filter frontend dev

desktop-dev: ## Run desktop in dev mode
	pnpm --filter desktop dev

# ──────────────────────────────────────────────
# Quality
# ──────────────────────────────────────────────
lint: backend-lint frontend-lint ## Run all linters

backend-lint: ## Lint backend
	$(MAKE) -C backend lint

backend-test: ## Test backend
	$(MAKE) -C backend test

frontend-lint: ## Lint frontend
	pnpm --filter frontend lint

test: backend-test frontend-test ## Run all tests

frontend-test: ## Test frontend
	pnpm --filter frontend test

e2e: ## Run E2E tests (requires backend + frontend running; set E2E_BASE_URL for Docker dev)
	pnpm --filter e2e test

# ──────────────────────────────────────────────
# Documentation
# ──────────────────────────────────────────────
docs-dev: ## Run docs dev server
	pnpm --filter docs-site dev

docs-build: ## Build docs site
	pnpm --filter docs-site build

# ──────────────────────────────────────────────
# Protobuf
# ──────────────────────────────────────────────
proto: ## Generate protobuf code
	protoc --go_out=backend --go-grpc_out=backend \
		--js_out=import_style=commonjs,binary:frontend/src/lib/proto \
		proto/*.proto

# ──────────────────────────────────────────────
# Docker
# ──────────────────────────────────────────────
docker-dev: ## Start full dev stack in Docker
	$(COMPOSE_DEV) up -d --build

docker-prod: ## Start production stack
	$(COMPOSE_PROD) up -d --build

docker-down: ## Stop Docker stack
	$(COMPOSE_DEV) down
	$(COMPOSE_PROD) down 2>/dev/null || true

docker-logs: ## Tail all Docker logs
	$(COMPOSE_DEV) logs -f

docker-ps: ## List running containers
	$(COMPOSE_DEV) ps

# ──────────────────────────────────────────────
# Database
# ──────────────────────────────────────────────
db-shell: ## Open PostgreSQL shell
	$(COMPOSE_DEV) exec postgres psql -U prowl -d prowl

redis-shell: ## Open Redis CLI
	$(COMPOSE_DEV) exec redis redis-cli

# ──────────────────────────────────────────────
# Cleanup
# ──────────────────────────────────────────────
clean: ## Clean build artifacts
	$(MAKE) -C backend clean
	$(MAKE) -C cli clean
	rm -rf frontend/dist desktop/src-tauri/target

# ──────────────────────────────────────────────
# Help
# ──────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
