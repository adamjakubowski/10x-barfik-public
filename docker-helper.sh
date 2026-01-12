#!/bin/bash
# Barfik Docker Helper Script

set -e

# Kolory dla outputu
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funkcje pomocnicze
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Sprawdź czy .env istnieje
check_env_file() {
    if [ ! -f .env ]; then
        print_warning "Plik .env nie istnieje. Tworzę z .env.example..."
        cp .env.example .env
        print_warning "UWAGA: Edytuj plik .env i ustaw właściwe wartości!"
        exit 1
    fi
}

# Menu główne
show_menu() {
    echo ""
    echo "🐳 Barfik Docker Manager"
    echo "========================"
    echo "1)  Start Development (hot reload)"
    echo "2)  Start Production"
    echo "3)  Stop wszystko"
    echo "4)  Rebuild wszystko"
    echo "5)  Logi (tail -f)"
    echo "6)  Database backup"
    echo "7)  Database restore"
    echo "8)  Wykonaj migracje"
    echo "9)  Załaduj initial data"
    echo "10) Utwórz superusera"
    echo "11) Shell backend"
    echo "12) Shell frontend"
    echo "13) Testy backend"
    echo "14) Generuj typy API (frontend)"
    echo "15) Wygeneruj SECRET_KEY"
    echo "16) Health check"
    echo "17) Cleanup (prune)"
    echo "0)  Exit"
    echo ""
    read -p "Wybierz opcję: " choice
}

# Implementacja opcji
start_dev() {
    check_env_file
    print_success "Uruchamiam środowisko deweloperskie..."
    docker-compose -f docker-compose.dev.yml up --build
}

start_prod() {
    check_env_file
    print_success "Uruchamiam środowisko produkcyjne..."
    docker-compose up -d --build
    print_success "Aplikacja uruchomiona!"
    print_warning "Nie zapomnij wykonać migracji (opcja 8) przy pierwszym uruchomieniu"
}

stop_all() {
    print_success "Zatrzymuję wszystkie kontenery..."
    docker-compose down
    docker-compose -f docker-compose.dev.yml down
    print_success "Zatrzymano!"
}

rebuild_all() {
    print_success "Rebuilduję wszystkie obrazy..."
    docker-compose build --no-cache
    print_success "Rebuild zakończony!"
}

show_logs() {
    docker-compose logs -f --tail=100
}

backup_db() {
    BACKUP_FILE="backups/db_$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p backups
    print_success "Tworzę backup bazy danych..."
    docker-compose exec -T db pg_dump -U barfik_user barfik > "$BACKUP_FILE"
    print_success "Backup zapisany: $BACKUP_FILE"
}

restore_db() {
    echo "Dostępne backupy:"
    ls -lh backups/*.sql 2>/dev/null || echo "Brak backupów"
    read -p "Podaj nazwę pliku do restore: " backup_file
    if [ -f "$backup_file" ]; then
        print_warning "UWAGA: To nadpisze aktualną bazę danych!"
        read -p "Kontynuować? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            docker-compose exec -T db psql -U barfik_user -d barfik < "$backup_file"
            print_success "Restore zakończony!"
        fi
    else
        print_error "Plik nie istnieje: $backup_file"
    fi
}

run_migrations() {
    print_success "Wykonuję migracje..."
    docker-compose exec backend python manage.py migrate
    print_success "Migracje zakończone!"
}

load_initial_data() {
    print_success "Ładuję dane początkowe..."
    docker-compose exec backend python manage.py loaddata barfik_system/fixtures/initial_data.json
    print_success "Dane załadowane!"
}

create_superuser() {
    print_success "Tworzenie superusera..."
    docker-compose exec backend python manage.py createsuperuser
}

backend_shell() {
    docker-compose exec backend sh
}

frontend_shell() {
    docker-compose -f docker-compose.dev.yml exec frontend sh
}

run_tests() {
    print_success "Uruchamiam testy..."
    docker-compose exec backend pytest -v
}

generate_api_types() {
    print_success "Generuję typy API..."
    docker-compose -f docker-compose.dev.yml exec frontend npm run gen:api-types
    print_success "Typy wygenerowane!"
}

generate_secret_key() {
    print_success "Wygenerowany SECRET_KEY:"
    docker-compose exec backend python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
}

health_check() {
    print_success "Sprawdzam health checks..."
    docker-compose ps
}

cleanup() {
    print_warning "UWAGA: To usunie nieużywane obrazy i volumeny!"
    read -p "Kontynuować? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        docker image prune -a -f
        docker volume prune -f
        print_success "Cleanup zakończony!"
    fi
}

# Główna pętla
while true; do
    show_menu
    case $choice in
        1) start_dev ;;
        2) start_prod ;;
        3) stop_all ;;
        4) rebuild_all ;;
        5) show_logs ;;
        6) backup_db ;;
        7) restore_db ;;
        8) run_migrations ;;
        9) load_initial_data ;;
        10) create_superuser ;;
        11) backend_shell ;;
        12) frontend_shell ;;
        13) run_tests ;;
        14) generate_api_types ;;
        15) generate_secret_key ;;
        16) health_check ;;
        17) cleanup ;;
        0) print_success "Do widzenia!"; exit 0 ;;
        *) print_error "Nieprawidłowa opcja!" ;;
    esac
    echo ""
    read -p "Naciśnij Enter aby kontynuować..."
done
