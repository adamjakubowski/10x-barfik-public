# Schemat modeli Django (MVP)

## Konwencje wspólne
- Wszystkie modele dziedziczą po `TimeStampedModel` (`created_at`, `updated_at`) oraz po `SoftDeletableMixin` (`is_active`, `objects=ActiveManager` zwracającym tylko aktywne rekordy, `all_objects` dla pełnego dostępu).
- Klucze główne: domyślne `BigAutoField`.
- Pola ilości: `DecimalField(max_digits=12, decimal_places=3)`; masy objętości w jednostce bazowej po konwersji.
- Daty zakresowe: `DateField`; dopuszczalne `null` tam, gdzie wskazano.
- Wszystkie modele posiadają indeks na `is_active` jeśli korzystają z soft delete.

## Modele

### AnimalType (słownik gatunków)
- `name: CharField(max_length=64, unique=True)` — nazwa prezentacyjna (np. "pies", "kot").
- Znaczniki czasu.
- Indeksy: (`name`).

### Unit (słownik jednostek z konwersją do bazowej)
- `name: CharField(max_length=64, unique=True)` — nazwa (np. "gram").
- `symbol: CharField(max_length=16, unique=True)` — skrót (np. "g").
- `conversion_factor: DecimalField(max_digits=12, decimal_places=6)` — mnożnik do jednostki bazowej (ustalonej globalnie, np. gram dla masy). Musi być > 0.
- Indeksy: (`name`), (`symbol`).

### IngredientCategory (słownik kategorii)
- `code: CharField(max_length=32, unique=True)` — stały kod (np. `MEAT_RAW`).
- `name: CharField(max_length=64)` — etykieta PL.
- `description: TextField(blank=True)`.
- Indeksy: (`code`).

### Animal
- `owner: ForeignKey(User, on_delete=CASCADE, related_name="animals")`.
- `species: ForeignKey(AnimalType, on_delete=PROTECT, related_name="animals")`.
- `name: CharField(max_length=64)`.
- `date_of_birth: DateField(null=True, blank=True)`.
- `weight_kg: DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)` — aktualna waga.
- `note: TextField(blank=True)`.
- `is_active: BooleanField(default=True, db_index=True)`.
- Indeksy: (`owner`, `is_active`), (`species`, `is_active`).

### Diet
- `animal: ForeignKey(Animal, on_delete=CASCADE, related_name="diets")`.
- `start_date: DateField()`.
- `end_date: DateField(null=True, blank=True)` — może być otwarta.
- `total_daily_mass: DecimalField(max_digits=12, decimal_places=3)` — persystowane, aktualizowane sygnałem/serwisem po zmianie składników.
- `description: TextField(blank=True)` — opis diety.
- `is_active: BooleanField(default=True, db_index=True)`.
- Znaczniki czasu.
- Indeksy: (`animal`, `is_active`), (`animal`, `start_date`, `end_date`).

### Ingredient
- `diet: ForeignKey(Diet, on_delete=CASCADE, related_name="ingredients")`.
- `name: CharField(max_length=128)` — nazwa składnika (snapshot, nie słownik).
- `category: ForeignKey(IngredientCategory, on_delete=PROTECT, related_name="ingredients", null=True, blank=True)`.
- `cooking_method: CharField(max_length=24, choices=[("raw","raw"),("cooked","cooked")])`.
- `unit: ForeignKey(Unit, on_delete=PROTECT, related_name="ingredients")`.
- `amount: DecimalField(max_digits=12, decimal_places=3)` — w zadanej jednostce.
- `amount_in_base_unit: DecimalField(max_digits=12, decimal_places=3)` — automatycznie przeliczone przez `unit.conversion_factor`.
- `is_active: BooleanField(default=True, db_index=True)`.
- Indeksy: (`diet`, `is_active`), (`category`, `is_active`).

### Collaboration
- `animal: ForeignKey(Animal, on_delete=CASCADE, related_name="collaborations")`.
- `user: ForeignKey(User, on_delete=CASCADE, related_name="collaborations")`.
- `permission: CharField(max_length=16, choices=[("READ_ONLY","READ_ONLY"),("EDIT","EDIT")], default="READ_ONLY")`.
- `is_active: BooleanField(default=True, db_index=True)`.
- Znaczniki czasu.
- Ograniczenia: `UniqueConstraint(fields=["animal","user"], condition=Q(is_active=True), name="uix_collab_active_pair")` — unikalność aktywnej pary.
- Indeksy: (`animal`, `user`, `is_active`).

### ShoppingList
- `created_by: ForeignKey(User, on_delete=CASCADE, related_name="shopping_lists")`.
- `diets: ManyToManyField(Diet, related_name="shopping_lists")` — listy generowane z wielu diet.
- `title: CharField(max_length=128, blank=True)` — opcjonalna etykieta.
- `days_count: IntegerField(validators=[MinValueValidator(1)])` — liczba dni dla której generowana jest lista zakupów.
- `is_completed: BooleanField(default=False, db_index=True)`.
- `is_active: BooleanField(default=True, db_index=True)`.
- Znaczniki czasu.
- Indeksy: (`created_by`, `is_active`), (`is_completed`, `is_active`).

### ShoppingListItem
- `shopping_list: ForeignKey(ShoppingList, on_delete=CASCADE, related_name="items")`.
- `ingredient_name: CharField(max_length=128)` — agregowana nazwa (snapshot).
- `unit: ForeignKey(Unit, on_delete=PROTECT, related_name="shopping_list_items")` — jednostka zapisana po agregacji (preferowana bazowa).
- `total_amount: DecimalField(max_digits=12, decimal_places=3)` — zsumowana ilość.
- `is_checked: BooleanField(default=False, db_index=True)` — odhaczanie w widoku zakupów.
- `is_active: BooleanField(default=True, db_index=True)`.
- Znaczniki czasu.
- Indeksy: (`shopping_list`, `is_active`), (`shopping_list`, `is_checked`).

## Relacje i kardynalność
- `User` 1..N `Animal` (przez `owner`).
- `AnimalType` 1..N `Animal`.
- `Animal` 1..N `Diet`.
- `Diet` 1..N `Ingredient`.
- `IngredientCategory` 1..N `Ingredient` (opcjonalnie).
- `Unit` 1..N `Ingredient` oraz 1..N `ShoppingListItem`.
- `Animal` N..M `User` przez `Collaboration` (bez wpisu dla właściciela; aktywna para unikalna).
- `ShoppingList` N..M `Diet`.
- `ShoppingList` 1..N `ShoppingListItem`.

## Dodatkowe uwagi implementacyjne
- Po zmianach `Ingredient` (dodanie/aktualizacja/usunięcie miękkie) serwis/sygnał powinien przeliczać `amount_in_base_unit` i aktualizować `Diet.total_daily_mass` oraz agregaty list zakupów.
- Soft delete (`is_active`) obowiązuje dla `Animal`, `Diet`, `Ingredient`, `Collaboration`, `ShoppingList`, `ShoppingListItem`; manager `ActiveManager` powinien domyślnie filtrować `is_active=True`.
- Zalecane walidacje: `conversion_factor > 0`, `amount > 0`, `total_amount > 0`, `start_date <= end_date` gdy `end_date` ustawione.
