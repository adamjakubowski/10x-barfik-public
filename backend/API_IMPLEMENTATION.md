# Barfik Backend API

REST API dla aplikacji Barfik - system planowania diet BARF dla psów i kotów.

## Zaimplementowane funkcjonalności

### ✅ Kompletne REST API

#### Uwierzytelnianie (JWT)
- `POST /api/auth/register/` - Rejestracja nowego użytkownika
- `POST /api/auth/login/` - Logowanie (zwraca access/refresh token)
- `POST /api/auth/refresh/` - Odświeżanie access token

#### Profil użytkownika
- `GET /api/users/me/` - Pobranie profilu zalogowanego użytkownika
- `PATCH /api/users/me/` - Aktualizacja profilu

#### Słowniki (read-only)
- `GET /api/animal-types/` - Lista gatunków zwierząt
- `GET /api/units/` - Lista jednostek miar z konwersjami
- `GET /api/ingredient-categories/` - Lista kategorii składników

#### Zwierzęta (CRUD)
- `GET /api/animals/` - Lista zwierząt (własne + współdzielone)
- `POST /api/animals/` - Dodanie zwierzęcia
- `GET /api/animals/{id}/` - Szczegóły zwierzęcia
- `PATCH /api/animals/{id}/` - Aktualizacja zwierzęcia
- `DELETE /api/animals/{id}/` - Usunięcie (soft delete)

Filtry: `?search=nazwa`, `?species_id=1`

#### Współpraca
- `GET /api/animals/{animal_id}/collaborations/` - Lista współpracowników
- `POST /api/animals/{animal_id}/collaborations/` - Dodanie współpracownika
- `PATCH /api/animals/{animal_id}/collaborations/{id}/` - Zmiana uprawnień
- `DELETE /api/animals/{animal_id}/collaborations/{id}/` - Usunięcie współpracy

Poziomy uprawnień: `READ_ONLY` (domyślny), `EDIT`

#### Diety (CRUD)
- `GET /api/diets/` - Lista diet (własne + współdzielone)
- `POST /api/diets/` - Dodanie diety
- `GET /api/diets/{id}/` - Szczegóły diety ze składnikami
- `PATCH /api/diets/{id}/` - Aktualizacja diety
- `DELETE /api/diets/{id}/` - Usunięcie (soft delete)

Filtry: `?animal_id=1`, `?active=true`, `?start_date__gte=2025-01-01`

#### Składniki (CRUD)
- `GET /api/diets/{diet_id}/ingredients/` - Lista składników
- `POST /api/diets/{diet_id}/ingredients/` - Dodanie składnika
- `GET /api/diets/{diet_id}/ingredients/{id}/` - Szczegóły składnika
- `PATCH /api/diets/{diet_id}/ingredients/{id}/` - Aktualizacja
- `DELETE /api/diets/{diet_id}/ingredients/{id}/` - Usunięcie (soft delete)

**Automatyka:**
- `amount_in_base_unit` przeliczane automatycznie (amount × unit.conversion_factor)
- `Diet.total_daily_mass` aktualizowane przez signals po każdej zmianie składników

Filtry: `?category_id=1`, `?cooking_method=raw`, `?search=nazwa`

#### Listy zakupów (CRUD)
- `GET /api/shopping-lists/` - Lista zakupów użytkownika
- `POST /api/shopping-lists/` - Generowanie nowej listy
- `GET /api/shopping-lists/{id}/` - Szczegóły listy z pozycjami
- `PATCH /api/shopping-lists/{id}/` - Aktualizacja (regeneruje pozycje jeśli zmieniono diety/days_count)
- `DELETE /api/shopping-lists/{id}/` - Usunięcie (soft delete)
- `POST /api/shopping-lists/{id}/complete/` - Oznacz jako ukończoną
- `POST /api/shopping-lists/{id}/uncomplete/` - Odznacz ukończenie

**Logika generowania:**
1. Zbiera składniki z wybranych diet
2. Mnoży `amount_in_base_unit` przez `days_count`
3. Agreguje po nazwie składnika (case-insensitive, surowe+gotowane razem)
4. Tworzy pozycje `ShoppingListItem`

#### Pozycje list zakupów
- `GET /api/shopping-lists/{shopping_list_id}/items/` - Lista pozycji
- `GET /api/shopping-lists/{shopping_list_id}/items/{id}/` - Szczegóły pozycji
- `PATCH /api/shopping-lists/{shopping_list_id}/items/{id}/` - Aktualizacja (is_checked, total_amount)
- `POST /api/shopping-lists/{shopping_list_id}/items/{id}/check/` - Toggle zaznaczenia

### 🔐 System uprawnień

**Poziomy dostępu:**
- **Właściciel** - pełny CRUD na swoich zwierzętach, dietach, składnikach
- **Współpracownik READ_ONLY** - tylko odczyt
- **Współpracownik EDIT** - może tworzyć/edytować (nie może DELETE)

**Permissions classes:**
- `IsOwnerOrCollaborator` - dla zwierząt, diet, składników
- `IsOwnerOnly` - dla DELETE i zarządzania współpracą
- `IsShoppingListOwner` - dla list zakupów
- `CanAccessAnimal` - sprawdza dostęp przy tworzeniu zasobów

### 🏗️ Architektura

**Service Layer:**
- `services.py` - cała logika biznesowa (generowanie list, kalkulacje, walidacje)
- `selectors.py` - nie zaimplementowano (opcjonalne dla złożonych zapytań)
- `views.py` - cienka warstwa wywołująca services
- `models.py` - tylko definicje i podstawowe walidacje

**Kluczowe serwisy:**
- `recalculate_diet_total(diet_id)` - przelicza sumę składników
- `create_ingredient()`, `update_ingredient()`, `delete_ingredient()` - zarządzanie składnikami z auto-update diety
- `generate_shopping_list()` - generowanie listy z agregacją
- `regenerate_shopping_list()` - przeliczanie po zmianach
- `create_collaboration()` - dodawanie współpracowników z walidacją

**Signals:**
- `post_save` na Ingredient → aktualizuje `Diet.total_daily_mass`
- `post_delete` na Ingredient → aktualizuje `Diet.total_daily_mass`

### 📊 OpenAPI Schema

**Dostępne endpointy dokumentacji:**
- `GET /api/schema/` - Schemat OpenAPI 3.1 (JSON)
- `GET /api/schema/swagger/` - Swagger UI
- `GET /api/schema/redoc/` - ReDoc UI

**Konfiguracja drf-spectacular:**
- Wszystkie endpointy otagowane (auth, users, animals, diets, itp.)
- Parametry query opisane w `@extend_schema`
- Typy request/response zdefiniowane w serializerach

### 🧪 Testy (pytest)

**Struktura testów:**
```
barfik_system/tests/
├── conftest.py          # Fixtures (users, animals, diets)
├── test_auth.py         # Rejestracja, logowanie, profil
├── test_animals.py      # CRUD zwierząt, współpraca, uprawnienia
├── test_diets.py        # CRUD diet i składników, auto-kalkulacje
└── test_shopping_lists.py  # Generowanie, agregacja, mnożenie
```

**Pokrycie:**
- ✅ Rejestracja i walidacja hasła
- ✅ Logowanie JWT
- ✅ Profil użytkownika
- ✅ CRUD zwierząt
- ✅ Filtrowanie i wyszukiwanie
- ✅ Uprawnienia (owner/collaborator/READ_ONLY/EDIT)
- ✅ CRUD diet
- ✅ CRUD składników
- ✅ Automatyczne przeliczanie `amount_in_base_unit`
- ✅ Automatyczne aktualizowanie `total_daily_mass`
- ✅ Generowanie list zakupów
- ✅ Agregacja składników po nazwie
- ✅ Mnożenie przez `days_count`
- ✅ Zaznaczanie pozycji jako kupionych

**Uruchomienie:**
```bash
cd backend/src
pytest
```

### 📦 Soft Delete

Wszystkie główne modele używają `SoftDeletableMixin`:
- `is_active=True` - rekord aktywny
- `is_active=False` - rekord usunięty (soft delete)

**Managery:**
- `Model.objects` - zwraca tylko aktywne (`is_active=True`)
- `Model.all_objects` - zwraca wszystkie (do audytu)

**Zastosowanie:**
- Animal, Diet, Ingredient, Collaboration, ShoppingList, ShoppingListItem

### 🔧 Konfiguracja

**settings.py:**
- REST Framework z JWT authentication
- PageNumberPagination (page_size=100)
- CORS dla localhost:5173 (Vite frontend)
- drf-spectacular dla OpenAPI
- Język: `pl-pl`, Timezone: `Europe/Warsaw`

**SIMPLE_JWT:**
- Access token: 15 minut
- Refresh token: 24 godziny
- Bearer token w header

## Uruchomienie

### 1. Instalacja zależności

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Migracje i initial data

```bash
cd src
python manage.py migrate
python manage.py loaddata barfik_system/fixtures/initial_data.json
```

### 3. (Opcjonalnie) Superuser

```bash
python manage.py createsuperuser
```

### 4. Uruchomienie serwera

```bash
python manage.py runserver
```

API dostępne pod: `http://127.0.0.1:8000`

### 5. Dokumentacja API

- Swagger UI: http://127.0.0.1:8000/api/schema/swagger/
- ReDoc: http://127.0.0.1:8000/api/schema/redoc/
- Schemat JSON: http://127.0.0.1:8000/api/schema/

## Generowanie typów TypeScript (Frontend)

Gdy backend jest uruchomiony:

```bash
cd frontend/src
npm run gen:api-types
```

Wygeneruje `src/api/schema.ts` z typami wszystkich endpointów.

## Initial Data (Fixtures)

**AnimalTypes:**
- Pies
- Kot

**Units:**
- gram (g), conversion_factor=1
- kilogram (kg), conversion_factor=1000
- mililitr (ml), conversion_factor=1
- litr (l), conversion_factor=1000
- sztuka (szt), conversion_factor=1

**IngredientCategories:**
- Mięso
- Podroby
- Kości
- Warzywa
- Owoce
- Suplementy
- Nabiał
- Inne

## Przykładowe flow

### 1. Rejestracja i logowanie
```bash
# Rejestracja
curl -X POST http://127.0.0.1:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"email": "jan@example.com", "password": "SecurePass123!"}'

# Logowanie
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "jan@example.com", "password": "SecurePass123!"}'

# Zwraca: {"access": "...", "refresh": "..."}
```

### 2. Dodanie zwierzęcia
```bash
curl -X POST http://127.0.0.1:8000/api/animals/ \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "species_id": 1,
    "name": "Rex",
    "weight_kg": 25.5,
    "date_of_birth": "2020-05-15"
  }'
```

### 3. Dodanie diety
```bash
curl -X POST http://127.0.0.1:8000/api/diets/ \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "animal_id": 1,
    "start_date": "2025-01-01",
    "end_date": "2025-01-31",
    "description": "Dieta zimowa"
  }'
```

### 4. Dodanie składników
```bash
curl -X POST http://127.0.0.1:8000/api/diets/1/ingredients/ \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wołowina",
    "category_id": 1,
    "cooking_method": "raw",
    "unit_id": 1,
    "amount": 300
  }'
```

### 5. Generowanie listy zakupów
```bash
curl -X POST http://127.0.0.1:8000/api/shopping-lists/ \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Zakupy na tydzień",
    "diets": [1],
    "days_count": 7
  }'
```

## Brakujące funkcjonalności (POST-MVP)

Zgodnie z PRD, poniższe funkcjonalności są planowane ale nie zaimplementowane w MVP:

- [ ] Reset hasła przez email (POST-MVP, wymaga konfiguracji SMTP)
- [ ] Wysyłanie zaproszeń email do współpracy (POST-MVP)
- [ ] Widok "w kuchni" z instrukcjami krok po kroku
- [ ] Historia zmian wagi zwierzęcia
- [ ] Dziennik zdrowia (objawy, alergie)
- [ ] Baza wiedzy o suplementach
- [ ] Eksport listy zakupów do PDF

## Znane ograniczenia i założenia

1. **SQLite w dev** - produkcja wymaga PostgreSQL (zgodnie z techstack.md)
2. **Email** - endpoints istnieją ale bez konfiguracji SMTP nie działają (POST-MVP)
3. **Walidacja współpracy** - właściciel NIE dostaje wpisu w Collaboration (dostęp przez Animal.owner)
4. **Agregacja list zakupów** - tylko po `ingredient_name` (case-insensitive), cooking_method NIE rozróżnia
5. **Overlapping diets** - diety mogą się nakładać (brak walidacji unikalności dat)

## Dodatkowe narzędzia

**Linting/Type checking:**
```bash
ruff check .
mypy .
```

**Admin panel:**
http://127.0.0.1:8000/admin/

## Kontakt

Projekt: Barfik  
Status: ✅ MVP Ready  
Stack: Django 5.2 + DRF 3.15.2 + JWT + drf-spectacular
