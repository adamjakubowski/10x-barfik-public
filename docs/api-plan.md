# REST API Plan

## 1. Resources
- `User` — auth users (django.contrib.auth.models.User)
- `AnimalType` — [barfik_system.models.AnimalType]
- `Unit` — [barfik_system.models.Unit]
- `IngredientCategory` — [barfik_system.models.IngredientCategory]
- `Animal` — [barfik_system.models.Animal]
- `Diet` — [barfik_system.models.Diet]
- `Ingredient` — [barfik_system.models.Ingredient]
- `Collaboration` — [barfik_system.models.Collaboration]
- `ShoppingList` — [barfik_system.models.ShoppingList]
- `ShoppingListItem` — [barfik_system.models.ShoppingListItem]

## 2. Endpoints

Notes: all endpoints are under `/api/` prefix. Use JSON request/response. Standard HTTP codes: 200/201/204 success, 400 validation, 401 auth, 403 forbidden, 404 not found, 409 conflict, 422 semantic errors.

### Auth
- POST `/api/auth/register/` — register user
  - body: {"email": string, "password": string, "first_name": string (opt), "last_name": string (opt)}
  - response 201: {"id": int, "email": string, "username": string, "first_name": string, "last_name": string}
- POST `/api/auth/login/` — obtain JWT tokens (SimpleJWT)
  - body: {"username": string (email), "password": string}
  - response 200: {"access": string, "refresh": string}
  - note: użyj adresu email jako username
- POST `/api/auth/refresh/` — refresh token
  - body: {"refresh": string}
  - response 200: {"access": string}

### Users
- GET `/api/users/me/` — get current user
  - response 200: {"id","email","username","first_name","last_name"}
- PATCH `/api/users/me/` — update profile
  - body (partial): {"email", "first_name", "last_name", "username"}

### Reference dictionaries (small lists)
Use caching and long `cache-control` for these lists.
- GET `/api/animal-types/` — list `AnimalType` (pagination optional)
- GET `/api/animal-types/{id}/`
- GET `/api/units/` — list `Unit` (symbol, conversion_factor)
- GET `/api/units/{id}/`
- GET `/api/ingredient-categories/`
- GET `/api/ingredient-categories/{id}/`

These endpoints are typically read-only for normal users; create/update/delete reserved for admin.

### Animals
- GET `/api/animals/` — list animals accessible to the user (owner + active collaborations)
  - query params: `page`, `ordering`, `search=name`, `species_id`
  - includes: `select_related('species','owner')`
  - response item: {"id","owner","owner_email","species":{"id","name","created_at","updated_at"},"name","date_of_birth","weight_kg","is_active","created_at","updated_at"}
- POST `/api/animals/` — create animal
  - body: {"species_id": int, "name": string, "date_of_birth": "YYYY-MM-DD" (opt), "weight_kg": decimal (opt), "note": string (opt)}
  - response 201: created object
- GET `/api/animals/{id}/` — detail (permission check: owner or collaborator read)
  - response includes: {"id","owner","owner_email","species":{...},"name","date_of_birth","weight_kg","note","is_active","created_at","updated_at"}
- PUT `/api/animals/{id}/` — full update (owner or collaborator with EDIT)
- PATCH `/api/animals/{id}/` — partial update (owner or collaborator with EDIT)
  - body: {"species_id" (opt), "name" (opt), "date_of_birth" (opt), "weight_kg" (opt), "note" (opt), "is_active" (opt)}
- DELETE `/api/animals/{id}/` — soft-delete (owner only) -> returns 204

### Collaborations
- GET `/api/animals/{animal_id}/collaborations/` — list
  - query params: `page`, `ordering`
  - response item: {"id","animal","animal_name","user","user_email","permission","is_active","created_at","updated_at"}
- POST `/api/animals/{animal_id}/collaborations/` — add collaborator
  - body: {"user": int, "permission": "READ_ONLY"|"EDIT" (default: READ_ONLY), "is_active": bool (opt)}
  - validations: cannot add owner; cannot duplicate active pair (409)
  - response 201: collaboration object
- GET `/api/animals/{animal_id}/collaborations/{id}/` — detail
- PATCH `/api/animals/{animal_id}/collaborations/{id}/` — change permission / is_active
  - body (partial): {"user" (opt), "permission" (opt), "is_active" (opt)}
- DELETE `/api/animals/{animal_id}/collaborations/{id}/` — soft-delete (owner only) -> 204

### Diets
Design: diets belong to animals; `total_daily_mass` is read-only (calculated by service signals).
- GET `/api/diets/` — list diets user can see (owner or collaborators)
  - filters: `animal_id`, `active` (bool), `start_date__gte`, `end_date__lte`
  - pagination and sorting: `?page&ordering=start_date`
  - response item: {"id","animal","animal_name","start_date","end_date","total_daily_mass","description","ingredients_count","is_active","created_at","updated_at"}
- POST `/api/diets/` — create diet
  - body: {"animal_id": int, "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"|null, "description": string (opt)}
  - server: creates Diet and returns 201; `total_daily_mass` default 0 and recalculated by Ingredient changes
  - validation: `start_date <= end_date` if end_date provided (400)
  - response 201: {"id","animal_id","start_date","end_date","description"}
- GET `/api/diets/{id}/` — detail with nested ingredients
  - response: {"id","animal","animal_name","start_date","end_date","total_daily_mass","description","ingredients":[...],"is_active","created_at","updated_at"}
- PUT `/api/diets/{id}/` — full update (owner or collaborator EDIT)
- PATCH `/api/diets/{id}/` — partial update (owner or collaborator EDIT)
  - body (partial): {"animal" (opt), "start_date" (opt), "end_date" (opt), "description" (opt), "is_active" (opt)}
- DELETE `/api/diets/{id}/` — soft-delete (owner only) -> 204

### Ingredients (nested under Diet)
All ingredient writes recalc `amount_in_base_unit` server-side and trigger diet total recalculation in service layer.
- GET `/api/diets/{diet_id}/ingredients/` — list
  - params: `category_id`, `cooking_method` (`raw`|`cooked`), `search=name`, `page`, `ordering`
  - response item: {"id","diet","name","category":{"id","code","name","description"},"category_id","cooking_method","unit":{"id","name","symbol","conversion_factor"},"amount","amount_in_base_unit","is_active","created_at","updated_at"}
- POST `/api/diets/{diet_id}/ingredients/` — create ingredient
  - body: {"name":string, "category_id":int|null, "cooking_method":"raw"|"cooked", "unit_id":int, "amount": decimal, "is_active": bool (opt)}
  - server computes `amount_in_base_unit = amount * unit.conversion_factor` (returned in response)
  - response 201 includes full ingredient object with nested category and unit
- GET `/api/diets/{diet_id}/ingredients/{id}/` — detail
- PUT `/api/diets/{diet_id}/ingredients/{id}/` — full update (changes recompute and trigger diet update)
- PATCH `/api/diets/{diet_id}/ingredients/{id}/` — partial update
  - body (partial): {"name" (opt), "category_id" (opt), "cooking_method" (opt), "unit_id" (opt), "amount" (opt), "is_active" (opt)}
- DELETE `/api/diets/{diet_id}/ingredients/{id}/` — soft-delete -> 204

### Shopping Lists
Primary operation: generate shopping list aggregated from diets * days_count.
- GET `/api/shopping-lists/` — list shopping lists
  - params: `is_completed` (bool filter), `page`, `ordering`
  - response item: {"id","created_by","title","days_count","is_completed","diets":[...],"diets_info","items":[...],"is_active","created_at","updated_at"}
- POST `/api/shopping-lists/` — create/generate
  - body: {"title": string (opt), "diets": [diet_id,...], "days_count": int}
  - server logic (service):
    1. Validate diets accessible to user
    2. Collect active Ingredients from each diet: use `Ingredient.objects.filter(diet__in=diets, is_active=True)`
    3. For each ingredient compute `total_amount = sum(amount_in_base_unit) * days_count` and map back to a chosen `unit` for display (prefer diet ingredient.unit or standard unit)
    4. Aggregate by `ingredient_name` (case-normalized) — per PRD raw+gotowane should be aggregated together
    5. Create `ShoppingList` and multiple `ShoppingListItem` rows
  - response 201: full shopping list object with nested items
- GET `/api/shopping-lists/{id}/` — detail
  - response: full object with diets_info and items array
- PUT `/api/shopping-lists/{id}/` — full update
- PATCH `/api/shopping-lists/{id}/` — partial update
  - body (partial): {"title" (opt), "days_count" (opt), "is_completed" (opt), "diets" (opt), "is_active" (opt)}
  - note: changing diets or days_count may require re-generation logic
- DELETE `/api/shopping-lists/{id}/` — soft-delete -> 204
- POST `/api/shopping-lists/{id}/complete/` — mark as completed
  - response 200: updated shopping list
- POST `/api/shopping-lists/{id}/uncomplete/` — mark as not completed
  - response 200: updated shopping list

### ShoppingListItems (nested under Shopping List)
- GET `/api/shopping-lists/{shopping_list_id}/items/` — list items
  - params: `page`, `ordering`, `search`
  - response item: {"id","ingredient_name","category","unit":{...},"total_amount","is_checked","is_active","created_at","updated_at"}
- GET `/api/shopping-lists/{shopping_list_id}/items/{id}/` — detail
- PATCH `/api/shopping-lists/{shopping_list_id}/items/{id}/` — partial update
  - body (partial): {"ingredient_name" (opt), "total_amount" (opt), "is_checked" (opt), "is_active" (opt)}

## 3. Request/Response Schemas (examples)

Animal POST body
```json
{
  "species_id": 2,
  "name": "Rex",
  "date_of_birth": "2020-06-10",
  "weight_kg": "12.500",
  "note": "Labrador retriever"
}
```

Animal GET response
```json
{
  "id": 1,
  "owner": 1,
  "owner_email": "user@example.com",
  "species": {
    "id": 1,
    "name": "Pies",
    "created_at": "2025-01-01T10:00:00Z",
    "updated_at": "2025-01-01T10:00:00Z"
  },
  "name": "Rex",
  "date_of_birth": "2020-06-10",
  "weight_kg": "12.500",
  "note": "Labrador retriever",
  "is_active": true,
  "created_at": "2025-01-02T15:30:00Z",
  "updated_at": "2025-01-02T15:30:00Z"
}
```

Diet response (GET detail)
```json
{
  "id": 7,
  "animal": 3,
  "animal_name": "Rex",
  "start_date": "2025-12-01",
  "end_date": null,
  "total_daily_mass": "450.000",
  "description": "Standard BARF",
  "ingredients": [...],
  "is_active": true,
  "created_at": "2025-12-01T08:00:00Z",
  "updated_at": "2025-12-01T08:00:00Z"
}
```

Ingredient response
```json
{
  "id": 13,
  "diet": 7,
  "name": "Wołowina",
  "category": {
    "id": 1,
    "code": "meat",
    "name": "Mięso",
    "description": ""
  },
  "category_id": 1,
  "cooking_method": "raw",
  "unit": {
    "id": 1,
    "name": "gram",
    "symbol": "g",
    "conversion_factor": "1.000000"
  },
  "amount": "300.000",
  "amount_in_base_unit": "300.000",
  "is_active": true,
  "created_at": "2025-12-01T08:05:00Z",
  "updated_at": "2025-12-01T08:05:00Z"
}
```

ShoppingList creation body
```json
{
  "title": "Zakupy 7 dni",
  "diets": [7, 8],
  "days_count": 7
}
```

ShoppingList response
```json
{
  "id": 1,
  "created_by": 1,
  "title": "Zakupy 7 dni",
  "days_count": 7,
  "is_completed": false,
  "diets": [7, 8],
  "diets_info": "Rex (2 diety)",
  "items": [
    {
      "id": 1,
      "ingredient_name": "Wołowina",
      "category": "Mięso",
      "unit": {"id": 1, "name": "gram", "symbol": "g", "conversion_factor": "1.000000"},
      "total_amount": "2100.000",
      "is_checked": false,
      "is_active": true,
      "created_at": "2025-12-15T10:00:00Z",
      "updated_at": "2025-12-15T10:00:00Z"
    }
  ],
  "is_active": true,
  "created_at": "2025-12-15T10:00:00Z",
  "updated_at": "2025-12-15T10:00:00Z"
}
```

## 4. Authentication & Authorization
- Mechanism: JWT via `djangorestframework-simplejwt` (per tech stack). Use short-lived access (15 min) and refresh tokens (24h) stored client-side (HTTP-only cookie recommended when used in browser) or returned to SPA and stored in secure storage.
- Permissions:
  - Owner: full CRUD on their `Animal`, `Diet`, `Ingredient`, `ShoppingList`, `Collaboration` management.
  - Collaboration: if active and permission=`READ_ONLY` → read-only on animal, diets, ingredients, shopping lists; if `EDIT` → may create/update resources for that animal.
  - Admin/staff: full access to dictionaries and management endpoints.
- Enforcement: DRF permission classes calling a service layer helper `has_access(user, resource, action)` that checks owner, Collaboration records (active), and resource `is_active`.

## 5. Validation and Business Logic (server-side)
- Diet: `start_date <= end_date` if `end_date` provided. (Model.clean in `Diet`)
- Ingredient: `amount` must be >= 0.001; `amount_in_base_unit = amount * unit.conversion_factor` computed in save or service. (Model: validators and save override)
- Collaboration: unique active pair (database constraint `uix_collab_active_pair`) — API must catch IntegrityError and return 409.
- ShoppingList generation:
  - Aggregate by normalized `ingredient_name` (case- and whitespace-normalized) — combine raw & cooked per PRD.
  - Multiply per-diet ingredient totals by `days_count`.
  - Map aggregation to a single `unit` — choose the ingredient's `unit` if consistent, otherwise convert using `Unit.conversion_factor` to preferred base unit.
- total_daily_mass on `Diet` persisted and updated when Ingredients change — ensure all Ingredient writes trigger a `services.recalculate_diet_total(diet_id)`.

## 6. Pagination, Filtering, Sorting
- Use cursor or page pagination (DRF PageNumberPagination acceptable). Query params: `page`, `page_size`. Provide `X-Total-Count` header and `next`/`previous` links.
- Filtering via query params (exact and range): e.g. `?animal_id=3&start_date__gte=2025-01-01&ordering=-start_date`

## 7. Performance & Indexes
- Use `select_related` for FK: `Animal.species`, `Animal.owner`, `Diet.animal`, `Ingredient.unit`, `Ingredient.category`, `ShoppingList.created_by`.
- Use `prefetch_related` for M2M: `ShoppingList.diets` and `Diet.ingredients`.
- Honor DB indexes defined in models (e.g. indexes on `animal,start_date,end_date`, `is_active` filters). When listing diets by animal/time, ensure queries use those indexed fields.

## 8. Security, Throttling, and Hardening
- Rate limiting: DRF throttling classes (e.g. `UserRateThrottle`, `AnonRateThrottle`) — sensible defaults (e.g. 200 req/min user, 20 req/min anon) and stricter limits on auth endpoints.
- Input validation: use serializers with explicit fields and `zod`-aligned contracts for front-end.
- CORS: restrict to front-end origin per `django-cors-headers`.
- Use HTTPS, secure cookies for refresh tokens, and standard security headers (HSTS, CSP, X-Frame-Options).
- Use ETag/Last-Modified on read endpoints (shopping lists, diets) to enable front-end caching per techstack.

## 9. Error Handling
- Validation errors return 400 with field-level messages in Polish (PRD requirement). Business rule violations (e.g. duplicate collaboration) return 409.

## 10. OpenAPI & Type Generation
- Expose `/api/schema/` (drf-spectacular) so frontend can run `openapi-typescript` to generate `src/api/schema.ts` as required by tech stack.

## 11. Assumptions
- `User.email` used as username; email unique.
- ShoppingList aggregation uses ingredient `amount_in_base_unit` for arithmetic and stores `total_amount` in a display unit chosen by service.
- Owner is implicit and not stored as a Collaboration record.

