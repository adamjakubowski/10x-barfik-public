# Barfik Backend - Instrukcja Uruchomienia

## Szybki start

```bash
# 1. Przejdź do katalogu src
cd backend/src

# 2. Uruchom skrypt setup (automatyczna konfiguracja)
./setup.sh

# 3. (Opcjonalnie) Utwórz przykładowe dane demo
python manage.py create_demo_data

# 4. Uruchom serwer
python manage.py runserver
```

Gotowe! API dostępne pod: http://127.0.0.1:8000

## Szczegółowa instrukcja

### Wymagania wstępne

Upewnij się, że masz zainstalowane następujące narzędzia:

1.  **Python**: Wersja 3.12.1. Możesz użyć `pyenv` do zarządzania wersjami.
    ```bash
    brew install pyenv
    pyenv install 3.12.1
    pyenv global 3.12.1
    ```
2.  **Node.js**: Wersja 20.11 LTS (tylko dla frontendu). Zalecane użycie `nvm`.
    ```bash
    brew install nvm
    nvm install 20.11
    nvm use 20.11
    ```

### Konfiguracja Backendu (Django)

#### 1. Utwórz i aktywuj wirtualne środowisko

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Na Windows: venv\Scripts\activate
```

#### 2. Zainstaluj zależności Pythona

```bash
pip install -r requirements.txt
```

#### 3. Przejdź do katalogu src

```bash
cd src
```

#### 4. Uruchom migracje bazy danych

```bash
python manage.py migrate
```

#### 5. Załaduj dane początkowe (słowniki)

```bash
python manage.py loaddata barfik_system/fixtures/initial_data.json
```

To załaduje:
- Gatunki zwierząt: Pies, Kot
- Jednostki miar: gram, kilogram, mililitr, litr, sztuka
- Kategorie składników: Mięso, Podroby, Kości, Warzywa, Owoce, Suplementy, Nabiał, Inne

#### 6. (Opcjonalnie) Utwórz superusera

```bash
python manage.py createsuperuser
```

#### 7. (Opcjonalnie) Utwórz przykładowe dane demo

```bash
python manage.py create_demo_data
```

To utworzy:
- Użytkownika demo: `demo@barfik.pl` / `demo123`
- Zwierzę: Rex (labrador, 25.5 kg)
- Dietę z 5 składnikami (wołowina, kurczak, wątroba, marchewka, brokuł)

#### 8. Uruchom serwer deweloperski Django

```bash
python manage.py runserver
```

Serwer będzie dostępny pod adresem `http://127.0.0.1:8000`.

## Dokumentacja API

Gdy serwer jest uruchomiony, dostępne są następujące endpointy dokumentacji:

- **Swagger UI**: http://127.0.0.1:8000/api/schema/swagger/
- **ReDoc**: http://127.0.0.1:8000/api/schema/redoc/
- **Schemat JSON (OpenAPI 3.1)**: http://127.0.0.1:8000/api/schema/

## Panel Admina

Django admin dostępny pod: http://127.0.0.1:8000/admin/

Zaloguj się przy użyciu superusera utworzonego w kroku 6.

## Generowanie typów TypeScript (Frontend)

Po uruchomieniu backendu możesz wygenerować typy TypeScript dla frontendu:

```bash
cd ../../frontend/src
npm install
npm run gen:api-types
```

To utworzy plik `src/api/schema.ts` z typami wszystkich endpointów API.

## Testy

### Uruchomienie wszystkich testów

```bash
cd backend/src
pytest
```

### Uruchomienie konkretnego pliku testów

```bash
pytest barfik_system/tests/test_auth.py
pytest barfik_system/tests/test_animals.py -v
```

### Uruchomienie z pokryciem kodu

```bash
pytest --cov=barfik_system
```

## Przydatne komendy

### Sprawdzenie konfiguracji

```bash
python manage.py check
```

### Utworzenie nowych migracji

```bash
python manage.py makemigrations
```

### Wyświetlenie SQL migracji

```bash
python manage.py sqlmigrate barfik_system 0001
```

### Shell Django (interaktywna konsola)

```bash
python manage.py shell
```

### Dump danych do JSON

```bash
python manage.py dumpdata barfik_system.AnimalType --indent 2 > animal_types.json
```

## Testowanie API z curl

### Rejestracja użytkownika

```bash
curl -X POST http://127.0.0.1:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "first_name": "Jan",
    "last_name": "Kowalski"
  }'
```

### Logowanie

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test@example.com",
    "password": "SecurePass123!"
  }'
```

Odpowiedź zawiera `access` token - użyj go w nagłówku `Authorization: Bearer {token}` w kolejnych requestach.

### Pobranie profilu użytkownika

```bash
curl -X GET http://127.0.0.1:8000/api/users/me/ \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}"
```

### Lista zwierząt

```bash
curl -X GET http://127.0.0.1:8000/api/animals/ \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}"
```

## Struktura projektu

```
backend/
├── requirements.txt          # Zależności Python
├── how_to_setup.md          # Ten plik
├── API_IMPLEMENTATION.md    # Szczegółowa dokumentacja API
└── src/
    ├── manage.py
    ├── setup.sh             # Skrypt automatycznego setupu
    ├── pytest.ini           # Konfiguracja testów
    ├── db.sqlite3          # Baza danych (SQLite)
    ├── barfik_backend/     # Główny projekt Django
    │   ├── settings.py     # Konfiguracja (DRF, JWT, CORS)
    │   ├── urls.py         # Routery API
    │   └── ...
    └── barfik_system/      # Aplikacja główna
        ├── models.py       # Modele Django
        ├── serializers.py  # Serializery DRF
        ├── views.py        # Viewsety DRF
        ├── permissions.py  # Uprawnienia custom
        ├── services.py     # Logika biznesowa
        ├── signals.py      # Sygnały (auto-update)
        ├── fixtures/       # Dane początkowe
        ├── management/     # Komendy Django
        │   └── commands/
        │       └── create_demo_data.py
        └── tests/          # Testy pytest
            ├── conftest.py
            ├── test_auth.py
            ├── test_animals.py
            ├── test_diets.py
            └── test_shopping_lists.py
```

## Rozwiązywanie problemów

### Błąd importu modułów

Jeśli widzisz błędy typu `ModuleNotFoundError`, upewnij się że:
1. Virtualenv jest aktywny: `source venv/bin/activate`
2. Wszystkie zależności są zainstalowane: `pip install -r requirements.txt`

### Błąd migracji

Jeśli migracje nie działają:
```bash
python manage.py migrate --run-syncdb
```

### Błąd CORS w przeglądarce

Upewnij się że frontend działa na `http://localhost:5173` (domyślnie Vite).
Jeśli używasz innego portu, dodaj go do `CORS_ALLOWED_ORIGINS` w `settings.py`.

### Port 8000 zajęty

Uruchom serwer na innym porcie:
```bash
python manage.py runserver 8001
```

## Przydatne linki

- **Dokumentacja Django**: https://docs.djangoproject.com/
- **Dokumentacja DRF**: https://www.django-rest-framework.org/
- **Dokumentacja drf-spectacular**: https://drf-spectacular.readthedocs.io/
- **Dokumentacja Simple JWT**: https://django-rest-framework-simplejwt.readthedocs.io/
- **PRD projektu**: [../docs/prd.md](../docs/prd.md)
- **Tech Stack**: [../docs/techstack.md](../docs/techstack.md)

## Następne kroki

1. Przeczytaj [API_IMPLEMENTATION.md](./API_IMPLEMENTATION.md) aby poznać szczegóły implementacji
2. Eksploruj API przez Swagger UI
3. Uruchom testy: `pytest`
4. Rozpocznij rozwój frontendu (patrz: `frontend/src/README.md`)
