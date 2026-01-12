# Naprawa ładowania stylów panelu administracyjnego Django

## Problem
Panel administracyjny Django nie ładował stylów CSS, ponieważ brakowało konfiguracji plików statycznych w `settings.py` oraz odpowiedniego procesu zbierania tych plików.

## Zmiany

### 1. Konfiguracja Django (`backend/src/barfik_backend/settings.py`)
- Dodano `STATIC_ROOT = BASE_DIR / 'staticfiles'` - katalog docelowy dla zebranych plików statycznych
- Dodano `MEDIA_ROOT = BASE_DIR / 'media'` i `MEDIA_URL = '/media/'` - konfiguracja dla uploadowanych plików
- Zainstalowano i skonfigurowano **WhiteNoise** - middleware do efektywnego serwowania plików statycznych
- Dodano `WHITENOISE_USE_FINDERS = True` i `STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'`

### 2. Dockerfile produkcyjny (`backend/Dockerfile`)
- Dodano krok `RUN python manage.py collectstatic --noinput` po skopiowaniu kodu
- Ten krok zbiera wszystkie pliki statyczne Django (w tym style admina) do katalogu `/app/staticfiles`

### 3. Dockerfile deweloperski (`docker-compose.dev.yml`)
- Dodano `python manage.py collectstatic --noinput` do komendy startowej
- Zapewnia to, że w trybie deweloperskim również dostępne są style admina

### 4. Konfiguracja nginx (`nginx/conf.d/default.conf`)
- Stworzono kompletną konfigurację nginx
- Dodano `location /static/` kierujące do `/var/www/static/` (volumen z django)
- Dodano `location /media/` dla uploadowanych plików
- Skonfigurowano proxy dla `/admin/` i `/api/`

### 5. `.gitignore`
- Dodano `/staticfiles/`, `backend/src/staticfiles/` i `backend/src/media/` do ignorowanych plików

### 6. Requirements (`backend/requirements.txt`)
- Dodano `whitenoise==6.7.0`

## Jak to działa?

### Development (z docker-compose.dev.yml)
1. Kontener startuje i wykonuje `collectstatic`
2. WhiteNoise middleware automatycznie serwuje pliki statyczne bezpośrednio z Django
3. Dostęp do admina: `http://localhost:8000/admin/`

### Production (z docker-compose.yml)
1. Podczas budowania obrazu Docker wykonuje się `collectstatic`
2. Pliki statyczne trafiają do volumen `static_volume`
3. Nginx serwuje pliki statyczne z `/var/www/static/`
4. Zapytania do `/admin/` są proxy do backendu
5. Dostęp przez nginx: `http://localhost/admin/` lub `https://domena.pl/admin/`

## Weryfikacja

Po uruchomieniu:
```bash
# Development
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose up --build
```

Panel administracyjny powinien być dostępny ze stylami pod:
- Development: http://localhost:8000/admin/
- Production: http://localhost/admin/ (przez nginx)
