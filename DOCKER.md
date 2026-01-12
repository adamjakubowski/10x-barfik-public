# 🐳 Barfik - Dokumentacja Docker

Kompletna konfiguracja konteneryzacji dla aplikacji Barfik (Backend Django + Frontend React).

## 📋 Wymagania

- **Docker Engine** 25.0+
- **docker-compose** 2.24+
- **Make** (opcjonalnie, dla wygodnych komend)

## 🚀 Szybki Start

### Development (z hot reload)

```bash
# 1. Skopiuj plik .env
cp .env.example .env

# 2. Edytuj .env (ustaw wartości dla development)
# DEBUG=True, uproszczone hasła itp.

# 3. Uruchom środowisko deweloperskie
docker-compose -f docker-compose.dev.yml up --build

# 4. Aplikacja dostępna:
# Backend:  http://localhost:8000
# Frontend: http://localhost:5173
# Database: localhost:5432
```

### Production

```bash
# 1. Skopiuj i skonfiguruj .env
cp .env.example .env
# WAŻNE: Ustaw silne hasła, DEBUG=False, właściwe domeny

# 2. Zbuduj i uruchom
docker-compose up -d --build

# 3. Wykonaj migracje (tylko pierwsz raz)
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py loaddata barfik_system/fixtures/initial_data.json

# 4. Utwórz superusera
docker-compose exec backend python manage.py createsuperuser

# 5. Aplikacja dostępna na porcie 80
```

## 📦 Struktura Projektu Docker

```
barfik/
├── backend/
│   ├── Dockerfile              # Produkcja (multi-stage)
│   ├── Dockerfile.dev          # Development (hot reload)
│   └── .dockerignore
├── frontend/
│   ├── Dockerfile              # Produkcja (nginx)
│   ├── Dockerfile.dev          # Development (vite dev server)
│   ├── nginx.conf              # Konfiguracja nginx
│   ├── docker-entrypoint.sh    # Entrypoint script
│   └── .dockerignore
├── docker-compose.yml          # Produkcja (PostgreSQL + nginx + certbot)
├── docker-compose.dev.yml      # Development (hot reload)
├── .env.example                # Template zmiennych środowiskowych
└── DOCKER.md                   # Ten plik
```

## 🔧 Komendy Docker

### Ogólne

```bash
# Wyświetl logi
docker-compose logs -f

# Wyświetl logi konkretnego serwisu
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart serwisu
docker-compose restart backend

# Zatrzymaj wszystko
docker-compose down

# Zatrzymaj i usuń volumeny (UWAGA: usunie bazę danych!)
docker-compose down -v
```

### Backend

```bash
# Wejdź do kontenera backend
docker-compose exec backend sh

# Wykonaj migracje
docker-compose exec backend python manage.py migrate

# Załaduj dane początkowe
docker-compose exec backend python manage.py loaddata barfik_system/fixtures/initial_data.json

# Utwórz superusera
docker-compose exec backend python manage.py createsuperuser

# Uruchom testy
docker-compose exec backend pytest

# Wygeneruj schemat OpenAPI
docker-compose exec backend python manage.py spectacular --file schema.yml
```

### Frontend

```bash
# Wejdź do kontenera frontend (development)
docker-compose -f docker-compose.dev.yml exec frontend sh

# Zainstaluj nowe zależności (w development)
docker-compose -f docker-compose.dev.yml exec frontend npm install <package>

# Wygeneruj typy API
docker-compose -f docker-compose.dev.yml exec frontend npm run gen:api-types
```

### Database

```bash
# Wejdź do PostgreSQL
docker-compose exec db psql -U barfik_user -d barfik

# Backup bazy danych
docker-compose exec db pg_dump -U barfik_user barfik > backup_$(date +%Y%m%d).sql

# Restore z backupu
docker-compose exec -T db psql -U barfik_user -d barfik < backup_20260104.sql

# Sprawdź status bazy
docker-compose exec db pg_isready -U barfik_user
```

## 🔐 Bezpieczeństwo

### Przed wdrożeniem produkcyjnym:

1. **SECRET_KEY**: Wygeneruj silny klucz (min. 50 znaków)
   ```bash
   python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
   ```

2. **POSTGRES_PASSWORD**: Użyj silnego hasła (min. 16 znaków, znaki specjalne)

3. **DEBUG=False**: Nigdy nie używaj DEBUG=True w produkcji!

4. **ALLOWED_HOSTS**: Ustaw tylko właściwe domeny

5. **CORS_ALLOWED_ORIGINS**: Ogranicz do zaufanych domen

## 🌐 SSL/HTTPS (Let's Encrypt)

Konfiguracja certyfikatów SSL jest zawarta w `docker-compose.yml`:

```bash
# 1. Upewnij się że domena wskazuje na Twój serwer

# 2. Ustaw zmienne w .env
CERTBOT_DOMAIN=yourdomain.com
CERTBOT_EMAIL=admin@yourdomain.com

# 3. Uruchom certbot (pierwsze uruchomienie)
docker-compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email ${CERTBOT_EMAIL} \
  --agree-tos \
  --no-eff-email \
  -d ${CERTBOT_DOMAIN}

# 4. Restart nginx
docker-compose restart nginx

# Odnowienie certyfikatu dzieje się automatycznie co 12h
```

## 🔄 Hot Reload (Development)

W trybie development:
- **Backend**: Uvicorn z `--reload` obserwuje zmiany w `backend/src/`
- **Frontend**: Vite dev server z HMR obserwuje zmiany w `frontend/src/`

Zmiany w kodzie są natychmiast widoczne bez restartu kontenerów.

## 📊 Health Checks

Wszystkie serwisy mają health checki:

- **Database**: `pg_isready`
- **Backend**: `GET /api/health/`
- **Frontend**: `GET /health`

Sprawdź status:
```bash
docker-compose ps
```

## 🧹 Czyszczenie

```bash
# Usuń nieużywane obrazy
docker image prune -a

# Usuń nieużywane volumeny
docker volume prune

# Pełne czyszczenie (UWAGA: usunie wszystko!)
docker system prune -a --volumes
```

## 🐛 Troubleshooting

### Problem: "Port already in use"
```bash
# Znajdź proces na porcie 8000
lsof -i :8000
# Zabij proces lub zmień port w docker-compose.yml
```

### Problem: "Database connection failed"
```bash
# Sprawdź logi bazy
docker-compose logs db

# Sprawdź czy baza jest ready
docker-compose exec db pg_isready -U barfik_user
```

### Problem: "Permission denied" na volumenach
```bash
# Usuń volumeny i utwórz na nowo
docker-compose down -v
docker-compose up -d
```

### Problem: Zmiany w kodzie nie są widoczne (dev mode)
```bash
# Sprawdź czy volumeny są prawidłowo zamountowane
docker-compose -f docker-compose.dev.yml exec backend ls -la /app

# Przebuduj kontener
docker-compose -f docker-compose.dev.yml up --build backend
```

## 📈 Monitoring i Logi

### Sentry (Error Tracking)

1. Utwórz projekt na sentry.io
2. Skopiuj DSN
3. Ustaw w `.env`:
   ```
   SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
   ```

### Logi w produkcji

```bash
# Wszystkie logi z timestampem
docker-compose logs -f --tail=100 -t

# Tylko błędy
docker-compose logs -f | grep ERROR

# Export logów do pliku
docker-compose logs --no-color > logs_$(date +%Y%m%d).txt
```

## 🔄 Update i Deployment

### Aktualizacja kodu (produkcja)

```bash
# 1. Pull najnowszego kodu
git pull origin main

# 2. Przebuduj obrazy
docker-compose build

# 3. Wykonaj migracje (jeśli są)
docker-compose exec backend python manage.py migrate

# 4. Restart z nową wersją (zero downtime z --no-deps)
docker-compose up -d --no-deps backend frontend

# 5. Sprawdź health checks
docker-compose ps
```

## 💾 Backup i Restore

### Automatyczny backup (cron)

Dodaj do crontab:
```cron
# Backup bazy co dzień o 2:00
0 2 * * * cd /path/to/barfik && docker-compose exec -T db pg_dump -U barfik_user barfik | gzip > backups/db_$(date +\%Y\%m\%d).sql.gz

# Usuń backupy starsze niż 30 dni
0 3 * * * find /path/to/barfik/backups -name "db_*.sql.gz" -mtime +30 -delete
```

## 📚 Dodatkowe Zasoby

- [Dokumentacja Docker](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/)
- [Nginx Configuration](https://nginx.org/en/docs/)
