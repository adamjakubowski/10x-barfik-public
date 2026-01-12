.PHONY: help dev prod stop rebuild logs backup restore migrate loaddata superuser test clean

help: ## Wyświetl pomoc
	@echo "🐳 Barfik Docker Commands"
	@echo "========================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

dev: ## Uruchom development (hot reload)
	docker-compose -f docker-compose.dev.yml up --build

prod: ## Uruchom production
	docker-compose up -d --build
	@echo "✓ Aplikacja uruchomiona!"
	@echo "⚠ Nie zapomnij wykonać migracji: make migrate"

stop: ## Zatrzymaj wszystkie kontenery
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

rebuild: ## Rebuild wszystkich obrazów
	docker-compose build --no-cache

logs: ## Pokaż logi (tail -f)
	docker-compose logs -f --tail=100

backup: ## Backup bazy danych
	@mkdir -p backups
	docker-compose exec -T db pg_dump -U barfik_user barfik > backups/db_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✓ Backup utworzony w backups/"

restore: ## Restore bazy danych (RESTORE_FILE=path/to/backup.sql)
	@if [ -z "$(RESTORE_FILE)" ]; then \
		echo "Użycie: make restore RESTORE_FILE=backups/db_20260104.sql"; \
		exit 1; \
	fi
	docker-compose exec -T db psql -U barfik_user -d barfik < $(RESTORE_FILE)
	@echo "✓ Restore zakończony!"

migrate: ## Wykonaj migracje Django
	docker-compose exec backend python manage.py migrate

loaddata: ## Załaduj dane początkowe
	docker-compose exec backend python manage.py loaddata barfik_system/fixtures/initial_data.json

superuser: ## Utwórz superusera
	docker-compose exec backend python manage.py createsuperuser

test: ## Uruchom testy
	docker-compose exec backend pytest -v

shell-backend: ## Shell backendu
	docker-compose exec backend sh

shell-frontend: ## Shell frontendu (dev)
	docker-compose -f docker-compose.dev.yml exec frontend sh

gen-types: ## Wygeneruj typy API (frontend)
	docker-compose -f docker-compose.dev.yml exec frontend npm run gen:api-types

gen-secret: ## Wygeneruj SECRET_KEY
	docker-compose exec backend python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

health: ## Sprawdź health checks
	docker-compose ps

clean: ## Usuń nieużywane obrazy i volumeny
	docker image prune -a -f
	docker volume prune -f

setup: ## Pierwsza konfiguracja (skopiuj .env, zbuduj, migracje)
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✓ Utworzono .env - EDYTUJ i ustaw właściwe wartości!"; \
		exit 1; \
	fi
	docker-compose build
	docker-compose up -d
	sleep 5
	$(MAKE) migrate
	$(MAKE) loaddata
	@echo "✓ Setup zakończony! Utwórz superusera: make superuser"
