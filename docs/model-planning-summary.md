# Model Planning Summary - Kluczowe Decyzje Architektoniczne

Ten dokument podsumowuje kluczowe decyzje architektoniczne podjęte podczas projektowania modeli danych dla aplikacji Barfik.

## Spis treści

- [Kluczowe Decyzje](#kluczowe-decyzje)
- [Przyjęte Rekomendacje](#przyjęte-rekomendacje)
- [Architektura Modeli](#architektura-modeli)
- [Nierozwiązane Kwestie](#nierozwiązane-kwestie)

---

## Kluczowe Decyzje

### 1. Słowniki referencyjne

**Decyzja:** AnimalType i Unit są prostymi tabelami słownikowymi z ID, nazwą prezentacyjną i współczynnikiem konwersji do jednostki bazowej dla Unit.

**Uzasadnienie:**
- Brak podziału na masę/objętość/sztuki upraszcza model
- Kategorie składników jako osobny słownik z nazwą i kodem
- `cooking_method` pozostaje polem w Ingredient (nie osobny słownik)

### 2. Diet: daty i nakładanie się

**Decyzja:**
- `end_date` może być `null` (dieta otwarta)
- Diety mogą się nakładać - brak walidacji unikalności dat
- `total_daily_mass` jest persystowane i przeliczane automatycznie przez signals

**Uzasadnienie:**
- Flexibility dla użytkowników (eksperymentowanie z różnymi dietami)
- Persystowane `total_daily_mass` zmniejsza koszt odczytu
- Signals zapewniają spójność danych przy zmianach składników

### 3. Ingredient: snapshot vs. foreign key

**Decyzja:** Ingredient przechowuje:
- `amount` - ilość w zadanej jednostce
- `unit` (FK do Unit) - jednostka miary
- `amount_in_base_unit` - automatycznie wyliczane z `amount * unit.conversion_factor`
- `cooking_method` - na poziomie składnika ('raw' lub 'cooked')
- `category` (FK do IngredientCategory) - kategoria jako słownik

**Uzasadnienie:**
- Snapshot składnika (nazwa jako tekst, nie FK do słownika) - lista zakupów nie zmienia się po edycji słownika
- Auto-kalkulacja `amount_in_base_unit` ułatwia agregacje
- `cooking_method` per składnik daje flexibility (ten sam produkt surowy i gotowany w jednej diecie)

### 4. Collaboration: uprawnienia i unikalność

**Decyzja:**
- Tylko dla istniejących użytkowników
- Właściciel zwierzęcia NIE dostaje rekordu Collaboration
- Poziomy uprawnień: `READ_ONLY` (domyślny) lub `EDIT`
- Unikalność aktywnej pary (animal, user) przez constraint `uix_collab_active_pair`

**Uzasadnienie:**
- Eliminacja redundancji - relacja Animal.owner wystarczy dla właściciela
- Dwa poziomy uprawnień pokrywają wszystkie user stories z PRD
- Unique constraint na aktywnych parach zapobiega duplikatom

### 5. ShoppingList: agregacja i relacje

**Decyzja:**
- ManyToMany do Diet (wiele diet → jedna lista)
- Ma soft delete (`is_active`) i flagę `is_completed`
- `days_count` określa mnożnik (np. 7 dni → składniki × 7)
- Agreguje pozycje **wyłącznie po nazwie składnika** (np. kark wołowy surowy+gotowany sumują się w jedną pozycję)
- Zapisuje już zsumowane wartości w ShoppingListItem

**Uzasadnienie:**
- M2M pozwala generować listy z wielu diet naraz
- Agregacja po nazwie upraszcza zakupy (użytkownik kupuje "wołowina 3kg", nie "wołowina surowa 2kg + wołowina gotowana 1kg")
- Persystowane sumy = szybszy odczyt, niezależność od zmian diet

### 6. Soft Delete: wspólny wzorzec

**Decyzja:** Wszystkie główne modele (Animal, Diet, Ingredient, Collaboration, ShoppingList, ShoppingListItem) używają:
- `is_active = models.BooleanField(default=True, db_index=True)`
- `objects = ActiveManager()` - domyślnie zwraca tylko `is_active=True`
- `all_objects = models.Manager()` - pełny dostęp do wszystkich rekordów

**Uzasadnienie:**
- Audyt i możliwość odzyskania danych bez backupu
- Spójny wzorzec dla całej aplikacji
- Indeks na `is_active` dla wydajności

### 7. Auto-calculated fields

**Decyzja:**
- `Ingredient.amount_in_base_unit` - obliczane w `save()` z `amount * unit.conversion_factor`
- `Diet.total_daily_mass` - aktualizowane przez signals po zmianach składników

**Uzasadnienie:**
- Persystowane wartości = szybki odczyt bez join/aggregate
- Signals zapewniają automatyczną spójność
- Logika zamknięta w warstwie serwisowej (nie w modelach)

---

## Przyjęte Rekomendacje

### Implementacja techniczna

1. **Signals dla automatycznej rekalkulacji** - logika zamknięta w `services.py`, nie w `models.py`
2. **Persystowanie `total_daily_mass`** w Diet - aktualizacja po każdej zmianie `amount_in_base_unit` w Ingredient
3. **Unit jako słownik z konwersją** - `conversion_factor` do jednostki bazowej; Ingredient przechowuje `amount_in_base_unit`
4. **Collaboration z ograniczeniem unikalności** - aktywne pary (animal, user) oraz poziomy READ_ONLY/EDIT, bez wpisu dla właściciela
5. **ShoppingList jako ManyToMany do Diet** - z `is_completed` i soft delete; pozycje listy to zsumowane ilości per nazwa składnika
6. **Soft delete via `is_active`** - wspólny `ActiveManager` dla spójności dostępu

---

## Architektura Modeli

### Modele kluczowe

| Model | Opis | Kluczowe relacje |
|-------|------|------------------|
| **AnimalType** | Słownik gatunków (pies, kot) | - |
| **Unit** | Słownik jednostek miar z `conversion_factor` | → Ingredient, ShoppingListItem |
| **IngredientCategory** | Słownik kategorii składników | → Ingredient |
| **Animal** | Profile zwierząt użytkownika | FK owner (User), FK species (AnimalType) |
| **Diet** | Plany żywieniowe z zakresem dat | FK animal; persystowane `total_daily_mass` |
| **Ingredient** | Składniki diety (snapshot) | FK diet, FK unit, FK category; auto `amount_in_base_unit` |
| **Collaboration** | Współdzielenie dostępu do zwierząt | FK animal, FK user; unique aktywna para |
| **ShoppingList** | Listy zakupów z wielu diet | FK created_by (User); M2M diets; `days_count`, `is_completed` |
| **ShoppingListItem** | Pozycje listy (zagregowane) | FK shopping_list, FK unit; snapshot `ingredient_name` |

### Relacje i kardynalność

```
User 1──N Animal
Animal 1──N Diet
Diet 1──N Ingredient
Animal N──M User (przez Collaboration, bez właściciela)
ShoppingList N──M Diet
ShoppingList 1──N ShoppingListItem
```

### Bezpieczeństwo i dostęp

- **Autoryzacja:** Django auth + custom permissions
- **Collaboration kontroluje dostęp:**
  - `READ_ONLY` - odczyt danych zwierzęcia, diet, składników, list zakupów
  - `EDIT` - pełna edycja (w zakresie endpointów)
- **Właściciel:** Pełne uprawnienia bez dodatkowego wpisu w Collaboration
- **Soft delete:** Zabezpiecza przed twardym kasowaniem danych
- **RLS (Row Level Security):** Do doprecyzowania na etapie PostgreSQL (nie ustalono szczegółów w MVP)

### Skalowalność i wydajność

**Optymalizacje:**
- Persystowane `total_daily_mass` → szybki odczyt, signals zapewniają spójność
- Agregacja ShoppingListItems po nazwie → minimalizacja liczby pozycji
- Indeksy na FK: `animal`, `diet`, `user`
- Indeksy composite:
  - Diet: (`animal`, `is_active`, `start_date`, `end_date`)
  - Collaboration: (`animal`, `user`, `is_active`)
  - Ingredient: (`diet`, `is_active`, `category`)

**Oczekiwania wydajności:**
- Do ~50 aktywnych profili zwierząt bez degradacji (PRD)
- Selectors używają `select_related`/`prefetch_related` dla uniknięcia N+1

---

## Nierozwiązane Kwestie

### 1. Row Level Security (RLS) w PostgreSQL

**Status:** Nie ustalono w MVP

**Opis:** Dokładne reguły RLS na poziomie PostgreSQL. Obecnie dostęp opiera się na:
- Logice aplikacji Django (permissions, selectors)
- Filtracji przez Collaboration

**Akcja:** Doprecyzować w fazie produkcyjnej (po przejściu z SQLite na PostgreSQL)

### 2. Walidacja phone_number

**Status:** Niepotwerdzone w MVP

**Opis:** Format i kraj dla pola `phone_number` (jeśli zostanie dodane)

**Akcja:** Określić wymagania jeśli pole będzie potrzebne

### 3. Initial data dla słowników

**Status:** Do decyzji w migracji danych

**Opis:** Zakres danych początkowych dla:
- `AnimalType` (pies, kot, inne?)
- `Unit` (g, kg, ml, l, szt, łyżka, łyżeczka?)
- `IngredientCategory` (mięso surowe, mięso gotowane, warzywa, suplementy, inne?)

**Akcja:** Ustalić z właścicielem produktu przed pierwszym wdrożeniem

---

## Zobacz również

- **[model-schema.md](model-schema.md)** - szczegółowy schemat modeli z polami i indeksami
- **[backend-patterns.md](backend-patterns.md)** - wzorce implementacyjne (Service Layer, Selectors, Signals)
- **[prd.md](prd.md)** - wymagania funkcjonalne uzasadniające decyzje modelowe
- **[api-plan.md](api-plan.md)** - endpointy REST API wykorzystujące te modele
