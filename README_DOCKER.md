# 🐳 Barfik - Quick Docker Start

## Szybki start (3 kroki)

```bash
# 1. Skopiuj i edytuj plik konfiguracyjny
cp .env.example .env
# Edytuj .env i ustaw hasła i domeny

# 2. Uruchom (development z hot reload)
make dev

# 3. Lub użyj interaktywnego helpera
./docker-helper.sh
```

## Co zostało utworzone?

### 📦 Pliki Docker

- `backend/Dockerfile` - Obraz produkcyjny backendu (multi-stage, Python 3.14)
- `backend/Dockerfile.dev` - Obraz deweloperski backendu (hot reload)
- `frontend/Dockerfile` - Obraz produkcyjny frontendu (nginx)
- `frontend/Dockerfile.dev` - Obraz deweloperski frontendu (vite dev server)
- `docker-compose.yml` - Orkiestracja produkcyjna (PostgreSQL + SSL)
- `docker-compose.dev.yml` - Orkiestracja deweloperska (hot reload)

### 🛠 Pliki pomocnicze

- `.env.example` - Template zmiennych środowiskowych
- `Makefile` - Wygodne komendy (make dev, make prod, etc.)
- `docker-helper.sh` - Interaktywny skrypt zarządzania
- `DOCKER.md` - Pełna dokumentacja Docker
- `nginx.conf` - Konfiguracja nginx dla frontendu
- `docker-entrypoint.sh` - Entrypoint dla frontendu

## Najczęstsze komendy

### Make (zalecane)

```bash
make dev          # Start development
make prod         # Start production
make stop         # Zatrzymaj wszystko
make logs         # Pokaż logi
make migrate      # Wykonaj migracje
make test         # Uruchom testy
make backup       # Backup bazy
make help         # Lista wszystkich komend
```

### Docker Compose

```bash
# Development
docker-compose -f docker-compose.dev.yml up --build

# Production
docker-compose up -d --build
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser

# Logi
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Porty

### Development
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend**: http://localhost:8000 (Django API)
- **Database**: localhost:5432 (PostgreSQL)
- **API Docs**: http://localhost:8000/api/schema/swagger/

### Production
- **HTTP**: Port 80 (przekierowanie do HTTPS)
- **HTTPS**: Port 443 (nginx + Let's Encrypt)
- Backend i baza NIE są wystawione na zewnątrz (tylko przez nginx)

## Bezpieczeństwo (WAŻNE!)

Przed wdrożeniem produkcyjnym **KONIECZNIE** zmień w `.env`:

```env
SECRET_KEY=<wygeneruj-silny-klucz>  # make gen-secret
POSTGRES_PASSWORD=<silne-haslo-min-16-znakow>
DEBUG=False
ALLOWED_HOSTS=yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

## Architektura

```
┌─────────────────────────────────────────┐
│  Nginx (reverse proxy + SSL)            │
│  Port 80/443                             │
└───────────┬─────────────────────────────┘
            │
    ┌───────┴────────┐
    │                │
┌───▼────────┐  ┌───▼────────┐
│  Frontend  │  │  Backend   │
│  (nginx)   │  │  (Django)  │
│  SPA React │  │  REST API  │
└────────────┘  └─────┬──────┘
                      │
                ┌─────▼──────┐
                │ PostgreSQL │
                │  Database  │
                └────────────┘
```

## Troubleshooting

### Port zajęty
```bash
# Sprawdź co używa portu
lsof -i :8000
# Zmień port w docker-compose.yml lub zabij proces
```

### Baza danych nie startuje
```bash
# Sprawdź logi
docker-compose logs db
# Usuń volumeny i zrestartuj
docker-compose down -v
docker-compose up -d
```

### Zmiany w kodzie nie widoczne (dev)
```bash
# Sprawdź volumeny
docker-compose -f docker-compose.dev.yml ps
# Rebuild
docker-compose -f docker-compose.dev.yml up --build
```

## Więcej informacji

- **Pełna dokumentacja**: [DOCKER.md](DOCKER.md)
- **Interaktywny helper**: `./docker-helper.sh`
- **Backend setup**: [backend/how_to_setup.md](backend/how_to_setup.md)
- **PRD projektu**: [docs/prd.md](docs/prd.md)

## Wsparcie

W razie problemów:
1. Sprawdź [DOCKER.md](DOCKER.md) - sekcja Troubleshooting
2. Przejrzyj logi: `make logs`
3. Sprawdź health checks: `make health`
