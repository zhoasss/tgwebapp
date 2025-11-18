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

debug-backend: ## Debug backend container
	@echo "=== Backend Container Status ==="
	@docker compose ps backend
	@echo ""
	@echo "=== Backend Logs ==="
	@docker compose logs --tail=20 backend
	@echo ""
	@echo "=== Backend Health Check ==="
	@docker compose exec backend python -c "import socket; s=socket.socket(); s.connect(('localhost', 8000)); s.close(); print('Port 8000 is open')" 2>/dev/null || echo "Port 8000 is not accessible"
	@echo ""
	@echo "=== Environment Variables ==="
	@docker compose exec backend env | grep -E "(BOT_TOKEN|WEB_APP_URL)" || echo "Environment variables not set"

diagnose: ## Complete diagnosis of all services
	@echo "=== SYSTEM DIAGNOSIS ==="
	@echo "1. Container Status:"
	@docker compose ps
	@echo ""
	@echo "2. Environment Variables:"
	@docker compose exec backend env | grep -E "(BOT_TOKEN|WEB_APP_URL)" || echo "Variables not accessible"
	@echo ""
	@echo "3. API Health Check:"
	@curl -f http://localhost/api/test 2>/dev/null && echo "✅ API accessible" || echo "❌ API not accessible"
	@echo ""
	@echo "4. Direct Backend Check:"
	@docker compose exec backend curl -f http://localhost:8000/api/debug 2>/dev/null && echo "✅ Backend API accessible" || echo "❌ Backend API not accessible"
	@echo ""
	@echo "5. Nginx Proxy Check:"
	@curl -f http://localhost/api/debug 2>/dev/null && echo "✅ Nginx proxy works" || echo "❌ Nginx proxy failed"
	@echo ""
	@echo "6. Database Check:"
	@docker compose exec backend ls -la /app/data/ || echo "Data directory not accessible"
	@echo ""
	@echo "=== DIAGNOSIS COMPLETE ==="
