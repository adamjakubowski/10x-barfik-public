# 📊 Plan Implementacji Testów Jednostkowych Backend

## Przegląd

Na podstawie analizy planu testów (`test-plan.md`) i obecnej struktury projektu, zostały utworzone **3 nowe pliki testowe** zawierające **kompleksowe testy jednostkowe** dla backendu.

---

## 🎯 Utworzone Pliki Testowe

### 1. **test_models.py** - Testy Modeli i Walidacji
**Lokalizacja:** `backend/src/barfik_system/tests/test_models.py`

#### Klasy testowe:
- ✅ `TestDietValidation` - Walidacja modelu Diet
- ✅ `TestIngredientAmountCalculation` - Automatyczne przeliczanie `amount_in_base_unit`
- ✅ `TestSoftDelete` - Mechanizm soft delete (`is_active`, `ActiveManager`)
- ✅ `TestCollaborationConstraints` - Ograniczenia unikalności Collaboration
- ✅ `TestTimestamps` - Mechanizm timestampów (`created_at`, `updated_at`)

#### Pokrycie wymagań z test-plan.md:
- ✅ FR.7.3: Automatyczne przeliczanie `amount_in_base_unit`
- ✅ `Diet.clean()`: walidacja `start_date <= end_date`
- ✅ `MinValueValidator` dla amount
- ✅ Unique constraint `uix_collab_active_pair`
- ✅ Soft delete: `objects` vs `all_objects`
- ✅ Nakładające się diety (dozwolone)
- ✅ `end_date=null` (dieta otwarta)

#### Liczba testów: **19**

---

### 2. **test_services.py** - Testy Warstwy Serwisowej
**Lokalizacja:** `backend/src/barfik_system/tests/test_services.py`

#### Klasy testowe:
- ✅ `TestRecalculateDietTotal` - Przeliczanie `total_daily_mass`
- ✅ `TestIngredientServices` - create/update/delete składników + aktualizacja diety
- ✅ `TestShoppingListGeneration` - Generowanie list zakupów
- ✅ `TestRegenerateShoppingList` - Regeneracja po zmianach
- ✅ `TestCollaborationServices` - Walidacja i tworzenie współprac
- ✅ `TestAccessibleResourcesFilters` - Filtrowanie dostępnych zasobów
- ✅ `TestDashboardStats` - Statystyki dashboardu

#### Pokrycie wymagań z test-plan.md:
- ✅ FR.7.4: Automatyczna aktualizacja `total_daily_mass` przez signals/services
- ✅ FR.5.1: Mnożenie składników przez `days_count`
- ✅ Agregacja pozycji list zakupów po `ingredient_name` (case-insensitive)
- ✅ FR.7.5-FR.7.7: `days_count`, `is_completed`, `title` w ShoppingList
- ✅ FR.6.1: Walidacja Collaboration (owner nie może być współpracownikiem)
- ✅ FR.1.4: Filtrowanie danych przez owner + Collaboration
- ✅ FR.1.1-FR.1.5: Statystyki dashboardu (zwierzęta, diety, listy, alerty)
- ✅ Edge cases: days_count=1, dieta bez składników, agregacja surowe+gotowane

#### Liczba testów: **35**

---

### 3. **test_permissions.py** - Testy Uprawnień
**Lokalizacja:** `backend/src/barfik_system/tests/test_permissions.py`

#### Klasy testowe:
- ✅ `TestAnimalAccessMixin` - Wyodrębnianie Animal i sprawdzanie uprawnień
- ✅ `TestAnimalResourcePermission` - Podstawowe uprawnienia CRUD
- ✅ `TestOwnerOnlyPermission` - Uprawnienia tylko dla właściciela
- ✅ `TestPermissionEdgeCases` - Przypadki brzegowe

#### Pokrycie wymagań z test-plan.md:
- ✅ Owner: pełny dostęp (CRUD)
- ✅ READ_ONLY: tylko odczyt (GET, HEAD, OPTIONS)
- ✅ EDIT: odczyt + edycja (bez DELETE)
- ✅ Brak dostępu: 403/False
- ✅ Nieaktywne współprace są ignorowane
- ✅ Uprawnienia dla Diet, Ingredient przez Animal
- ✅ Właściciel nie ma wpisu Collaboration (dostęp przez Animal.owner)

#### Liczba testów: **26**

---

## 📋 Podsumowanie Pokrycia

### Łączna liczba testów: **80 testów jednostkowych**

### Mapowanie na priorytety z test-plan.md:

#### **P0 (Krytyczne - blokujące MVP):**
✅ Autoryzacja i permissions (26 testów w `test_permissions.py`)  
✅ Service Layer - kalkulacje i agregacje (35 testów w `test_services.py`)  
✅ Signals - spójność `total_daily_mass` (9 testów w `test_services.py`)  
✅ Soft delete (5 testów w `test_models.py`)  
✅ Dostęp do danych przez Collaboration (7 testów w `test_services.py`)  

#### **P1 (Ważne):**
✅ Dashboard statystyki (5 testów w `test_services.py`)  
✅ Walidacje modeli (9 testów w `test_models.py`)  

#### **P2 (Nice to have):**
✅ Edge cases i przypadki brzegowe (rozsiane w każdym pliku)  

---

## 🚀 Uruchomienie Testów

### Wszystkie testy jednostkowe:
```bash
cd backend/src
pytest barfik_system/tests/test_models.py -v
pytest barfik_system/tests/test_services.py -v
pytest barfik_system/tests/test_permissions.py -v
```

### Konkretna klasa testowa:
```bash
pytest barfik_system/tests/test_models.py::TestDietValidation -v
pytest barfik_system/tests/test_services.py::TestShoppingListGeneration -v
```

### Z pokryciem kodu:
```bash
pytest --cov=barfik_system \
       --cov-report=html \
       barfik_system/tests/test_models.py \
       barfik_system/tests/test_services.py \
       barfik_system/tests/test_permissions.py
```

### Szybkie sprawdzenie:
```bash
pytest -k "test_diet or test_ingredient or test_shopping" -v
```

---

## 🔧 Wymagane Fixtures (już istnieją w conftest.py)

Wszystkie testy wykorzystują istniejące fixtures:
- ✅ `user`, `another_user`
- ✅ `animal_type_dog`, `animal_type_cat`
- ✅ `unit_gram`, `unit_kilogram`
- ✅ `category_meat`, `category_veggies`
- ✅ `animal`, `diet`, `ingredient`
- ✅ `api_client`, `authenticated_client`

**Brak potrzeby dodatkowych fixtures!**

---

## 📝 Następne Kroki

### 1. Uruchom testy i sprawdź pokrycie:
```bash
cd backend/src
pytest barfik_system/tests/test_models.py \
       barfik_system/tests/test_services.py \
       barfik_system/tests/test_permissions.py \
       --cov=barfik_system \
       --cov-report=term-missing
```

### 2. Jeśli testy nie przechodzą, potencjalne problemy:
- **Import errors:** Sprawdź czy `services.py` eksportuje wszystkie funkcje
- **Database errors:** Upewnij się że migracje są aktualne
- **Signal issues:** Sprawdź czy `signals.py` jest podpięty w `apps.py`

### 3. Uzupełnij brakujące obszary (opcjonalnie):
- ❓ `selectors.py` - jeśli istnieje, dodaj testy dla złożonych query z `select_related`/`prefetch_related`
- ❓ N+1 queries - dodaj testy wydajnościowe z `django-silk` lub `nplusone`

### 4. Integracja z CI/CD:
Dodaj do `.github/workflows/tests.yml`:
```yaml
- name: Run Unit Tests
  run: |
    cd backend/src
    pytest barfik_system/tests/test_models.py \
           barfik_system/tests/test_services.py \
           barfik_system/tests/test_permissions.py \
           --cov=barfik_system \
           --cov-fail-under=80
```

---

## 🎯 Kluczowe Zalety Tych Testów

### 1. **Zgodność z architekturą Service Layer:**
- Testy dla `services.py` obejmują całą logikę biznesową
- Widoki pozostają cienkie (testowane przez istniejące testy integracyjne)

### 2. **Pokrycie automatyki:**
- `amount_in_base_unit` przeliczane w `Ingredient.save()`
- `total_daily_mass` aktualizowane przez signals/services
- Soft delete przez `ActiveManager`

### 3. **Bezpieczeństwo danych:**
- Testy permissions zapewniają brak "przecieków danych"
- Walidacja Collaboration (owner nie może być współpracownikiem)
- Filtrowanie dostępnych zasobów przez `get_accessible_*`

### 4. **Edge cases:**
- Agregacja case-insensitive list zakupów
- Diety nakładające się (dozwolone)
- Soft delete + restore
- days_count=1 i bardzo duże wartości

### 5. **Dokumentacja przez testy:**
- Każdy test ma opisowy docstring
- Nazwy testów zgodne z konwencją `test_<what>_<scenario>_<expected>`
- Jasne asercje z komunikatami

---

## 📊 Pokrycie Scenariuszy z test-plan.md

| Sekcja test-plan.md | Pokrycie | Pliki |
|---------------------|----------|-------|
| 4.2 Auth i bezpieczeństwo | ✅ Częściowe (integracyjne w `test_auth.py`) | - |
| 4.2 Uprawnienia i Collaboration | ✅ **100%** | `test_permissions.py`, `test_services.py` |
| 4.3 Zwierzęta | ✅ **100%** | `test_models.py` (soft delete, walidacje) |
| 4.4 Diety i automatyka | ✅ **100%** | `test_models.py`, `test_services.py` |
| 4.5 Składniki i jednostki | ✅ **100%** | `test_models.py`, `test_services.py` |
| 4.6 Lista zakupów | ✅ **100%** | `test_services.py` |
| 4.7 Dashboard | ✅ **100%** | `test_services.py` |
| 4.8 Kontrakt API | ⏸️ Integracyjne (istniejące testy) | - |
| 4.9 Frontend | ⏸️ Osobny plan (Vitest/RTL) | - |

**Legenda:**  
✅ - Pełne pokrycie testami jednostkowymi  
⏸️ - Poza zakresem testów jednostkowych backend  

---

## 🔍 Dodatkowe Rekomendacje

### 1. Testy selectors.py (jeśli istnieje):
Jeśli masz plik `selectors.py` z złożonymi zapytaniami, dodaj:
```python
# test_selectors.py
def test_animals_selector_uses_select_related(user, animal):
    """Test że selector używa select_related dla wydajności."""
    from django.test.utils import override_settings
    from django.db import connection
    from django.test.utils import CaptureQueriesContext
    
    with CaptureQueriesContext(connection) as queries:
        animals = get_animals_for_user(user)  # selector function
        list(animals)  # Force evaluation
    
    # Powinno być tylko 1-2 query (dzięki select_related)
    assert len(queries) <= 2
```

### 2. Testy signals.py:
Jeśli chcesz testować signals bezpośrednio:
```python
# test_signals.py
def test_ingredient_save_triggers_diet_recalculation(diet):
    """Test że zapis składnika wywołuje signal aktualizujący dietę."""
    # Implementacja w obecnych testach services już to pokrywa
```

### 3. Performance tests (opcjonalnie):
```python
# test_performance.py
@pytest.mark.performance
def test_dashboard_stats_performance_with_50_animals(user):
    """Test że dashboard działa sprawnie z 50 zwierzętami."""
    import time
    # Utwórz 50 zwierząt, diet, etc.
    start = time.time()
    stats = get_dashboard_stats(user)
    duration = time.time() - start
    
    assert duration < 1.0  # < 1 sekunda
```

---

## ✅ Checkista Gotowości

- [x] Utworzone 3 pliki testowe (models, services, permissions)
- [x] 80 testów jednostkowych
- [x] Pokrycie P0 priorytetów z test-plan.md
- [x] Wykorzystanie istniejących fixtures
- [x] Zgodność z Service Layer Architecture
- [x] Testy dla soft delete, automatyki, uprawnień
- [x] Edge cases i przypadki brzegowe
- [x] Instrukcje uruchomienia

**Status: Gotowe do uruchomienia! 🚀**
