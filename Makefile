# Makefile for Docker development

.PHONY: help build up down restart logs clean dev prod

# Default target
help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

# Development commands
dev: ## Start development environment (with hot reload)
	docker-compose up --build

dev-d: ## Start development environment in background
	docker-compose up --build -d

# Production commands
prod: ## Start production environment
	docker-compose -f docker-compose.yml up --build

prod-d: ## Start production environment in background
	docker-compose -f docker-compose.yml up --build -d

# Basic commands
build: ## Build all services
	docker-compose build

up: ## Start all services
	docker-compose up

up-d: ## Start all services in background
	docker-compose up -d

down: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose restart

# Logs
logs: ## Show logs from all services
	docker-compose logs -f

logs-backend: ## Show backend logs
	docker-compose logs -f backend

logs-frontend: ## Show frontend logs
	docker-compose logs -f frontend

# Cleanup
clean: ## Remove all containers, volumes, and images
	docker-compose down -v --rmi all

clean-volumes: ## Remove all volumes
	docker-compose down -v

# Database
db-shell: ## Open database shell (SQLite)
	docker-compose exec backend sqlite3 /app/database.db

# Utilities
shell-backend: ## Open shell in backend container
	docker-compose exec backend sh

shell-frontend: ## Open shell in frontend container
	docker-compose exec frontend sh

# Setup
setup: ## Initial setup - copy environment file
	cp docker-env.example .env
	@echo "Please edit .env file with your actual values"

# Health check
health: ## Check health of all services
	@echo "Checking backend health..."
	@curl -f http://localhost:8000/health || echo "Backend not healthy"
	@echo "Checking frontend health..."
	@curl -f http://localhost/health || echo "Frontend not healthy"
