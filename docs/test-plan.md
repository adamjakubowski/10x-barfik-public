# Plan testów – Barfik

## 1. Wprowadzenie i cele testowania
Celem jest zapewnienie jakości aplikacji Barfik (Django REST API + React/Vite) w zakresie funkcjonalnym, niefunkcjonalnym i bezpieczeństwa. Plan obejmuje weryfikację krytycznych procesów: zarządzanie zwierzętami, dietami, składnikami, listami zakupów, współdzieleniem dostępu oraz autoryzacją JWT.

## 2. Zakres testów
- **Backend (Django + DRF):**
	- Warstwa biznesowa: `services.py` (mutacje, kalkulacje) oraz `selectors.py` (złożone read-only query z `select_related`/`prefetch_related`)
	- Autoryzacja i bezpieczeństwo: SimpleJWT (access/refresh), CORS, kontrola dostępu (właściciel + Collaboration READ_ONLY/EDIT), testy „przecieków danych”
	- Modele i walidacje: `Diet.clean()` (start_date ≤ end_date), `MinValueValidator`, ograniczenia unikalności (uix_collab_active_pair)
	- Soft delete: `ActiveManager` (`objects`) vs `all_objects`, zachowanie relacji, „restore”
	- Automatyka: `Ingredient.amount_in_base_unit` oraz aktualizacja `Diet.total_daily_mass` po zmianach składników (FR.7.3–FR.7.4)
	- Kontrakt API: schema OpenAPI (drf-spectacular) oraz konwersja snake_case ↔ camelCase (djangorestframework-camel-case)
	- Migracje i dane: migracje forward/backward, `loaddata` fixtures, komenda `create_demo_data`
- **Frontend (React/Vite/TS):**
	- Widoki i funkcje MVP z PRD: Dashboard (FR.1.1–FR.1.5), Animals (FR.3.*), Diets (FR.4.*), Shopping (FR.5.*), Collaboration (FR.6.*)
	- Server state: React Query (query/mutation + obsługa błędów), zgodność z typami z OpenAPI
	- UI state: Zustand (`uiStore.ts`) – centralne sterowanie modalami
	- Modale: `ModalManager.tsx` jako centralny rejestr dialogów
	- Formularze: react-hook-form + zod (komunikaty walidacji po polsku)
	- Obsługa błędów UI: `ErrorBoundary.tsx`
	- Build i jakość: ESLint, TypeScript strict, brak `console.*` w produkcji
- **Integracja front-back:**
	- OpenAPI → `npm run gen:api-types` → spójne typy w `src/api/schema.ts`
	- Konwersja camelCase ↔ snake_case na payloadach (request/response)
	- Axios interceptory (retry 401) i obsługa sesji JWT
- **Niefunkcjonalne:**
	- Wydajność (cel: do ~50 aktywnych profili bez degradacji – PRD)
	- Smoke E2E (Happy Path) oraz regresja krytycznych ścieżek
	- Podstawowe testy bezpieczeństwa (auth, permissions, CORS)

## 3. Typy testów
- **Testy jednostkowe (backend) – Pytest:**
	- `services.py` (logika biznesowa): agregacja składników, mnożenie przez `days_count`, tworzenie list zakupów (cel: wysoki priorytet)
	- `selectors.py`: filtrowanie danych przez owner/Collaboration + optymalizacja zapytań (N+1)
	- `permissions.py`: owner vs READ_ONLY vs EDIT vs deny
	- Walidacje modeli: `Diet.clean()`, `MinValueValidator`, unique constraints
	- Soft delete: `objects` vs `all_objects`, restore
	- Automatyka: `amount_in_base_unit`, rekalkulacja `total_daily_mass`
- **Testy integracyjne API (backend) – Pytest + DRF test client:**
	- CRUD: Animals/Diets/Ingredients/ShoppingLists/Collaborations
	- Autoryzacja JWT (401/403), CORS, filtracja dostępów (FR.1.4, FR.5.4)
	- Kontrakt OpenAPI: schema dostępne i spójne
	- Konwersja camelCase ↔ snake_case (request/response)
- **Testy jednostkowe (frontend) – Vitest + React Testing Library:**
	- Sekcje/komponenty: Dashboard/Animals/Diets/Shopping
	- Hooki React Query: poprawne wywołania, obsługa błędów, invalidacja cache
	- Zustand (`uiStore.ts`): otwieranie/zamykanie modalów, czyszczenie stanu
	- `ModalManager.tsx`: renderowanie właściwych dialogów
	- Formularze (RHF+Zod): walidacje po polsku, mapowanie błędów API
	- `ErrorBoundary.tsx`: fallback UI po błędzie
- **Testy E2E (smoke) – Playwright:**
	- Happy Path MVP: rejestracja → logowanie → zwierzę → dieta → lista zakupów → odhaczanie
	- Dashboard: statystyki, „wymagające uwagi”, szybkie akcje i przekierowania
- **Testy wydajnościowe (lekkie) – k6/Locust (opcjonalnie w MVP):**
	- Login, listowanie danych (prefetch), generowanie listy zakupów (agregacja)
- **Testy bezpieczeństwa (podstawowe):**
	- Próby dostępu do cudzych zasobów (403), testy regresyjne dla permissions
	- CORS whitelist, 401→refresh→retry (jeśli obsługiwane na froncie)
- **Testy UX/a11y (manual smoke):**
	- focus/tab order, elementy dotykowe min. 48px, podstawowa czytelność/kontrast

## 4. Scenariusze testowe (mapowanie na PRD)

### 4.1 Auth i bezpieczeństwo (US.1, FR.2.1)
- Rejestracja i logowanie e-mail/hasło
- Dostęp do endpointów bez tokenu → 401
- Dostęp do cudzych zasobów mimo tokenu → 403
- CORS: request z `http://localhost:5173` → OK; inne origin → blokada

### 4.2 Uprawnienia i Collaboration (US.6, FR.6.1)
- Owner: pełny dostęp do swoich zwierząt/diet/składników
- Collaboration READ_ONLY: dostęp tylko do odczytu danych zwierzęcia
- Collaboration EDIT: dostęp do edycji danych zwierzęcia (w zakresie endpointów projektu)
- Unikalność aktywnej pary Collaboration (uix_collab_active_pair)
- Właściciel nie posiada wpisu Collaboration (dostęp wynika z Animal.owner)

### 4.3 Zwierzęta (US.2, FR.3.1–FR.3.2)
- CRUD profilu zwierzęcia
- Soft delete: usunięte zwierzę nie widoczne w `objects`, widoczne w `all_objects`
- Walidacje pól: wymagane minimum danych, sensowny zakres wagi

### 4.4 Diety i automatyka masy dziennej (US.3, FR.4.1–FR.4.5, FR.7.4)
- Dieta z zakresem dat: `start_date <= end_date` (lub end_date=null)
- Diety mogą się nakładać (brak walidacji unikalności)
- `total_daily_mass` aktualizuje się po dodaniu/edycji/usunięciu składnika
- Edge cases: dieta bez składników (0), dieta z dużą liczbą składników

### 4.5 Składniki i jednostki (FR.4.4, FR.7.3)
- `amount_in_base_unit = amount * unit.conversion_factor` aktualizowane przy zapisie
- Walidacje min wartości i poprawności cooking_method
- Snapshot: składnik jako wpis tekstowy (brak słownika składników)

### 4.6 Lista zakupów i checklisty (US.4, US.7, FR.5.1, FR.5.3–FR.5.4, FR.7.5–FR.7.7)
- Generowanie listy zakupów z wielu diet (M2M) i mnożenie przez `days_count`
- Agregacja pozycji wyłącznie po `ingredient_name` (surowe+gotowane razem)
- Uprawnienia do list zakupów (FR.5.4): twórca lub dostęp do zwierzęcia z listy
- `is_completed`: widok aktywnych vs ukończonych list
- Checklist: odhaczanie pozycji (is_checked)
- Edge cases: days_count=1, bardzo duże days_count, dieta bez składników

### 4.7 Dashboard (US.8, FR.1.1–FR.1.5)
- Statystyki: zwierzęta aktywne, aktywne diety, diety wygasające w 7 dni, listy aktywne i ukończone
- „Wymagające uwagi”: zwierzęta bez aktywnej diety, diety kończące się w 7 dni, nieukończone listy >7 dni
- Filtrowanie danych po dostępie (owner + Collaboration) – FR.1.4
- Kliknięcie w statystykę/element listy → przekierowanie do właściwej sekcji – FR.1.5
- Szybkie akcje otwierają właściwe modale – FR.1.2

### 4.8 Kontrakt API i typy (techstack)
- OpenAPI schema dostępne i aktualne
- `npm run gen:api-types` generuje typy bez błędów
- Konwersja camelCase ↔ snake_case działa w request/response

### 4.9 Frontend: modale, stan UI i obsługa błędów
- Zustand `uiStore.ts`: otwieranie/zamykanie modalów, brak „przecieków stanu” między modalami
- `ModalManager.tsx`: renderuje wszystkie modale zgodnie ze stanem
- Formularze RHF+Zod: walidacje i komunikaty po polsku
- `ErrorBoundary.tsx`: przechwytuje błędy renderowania i pokazuje fallback

## 5. Środowisko testowe
- Backend: Python 3.12.1, Django 5.1, DRF 3.15.2, SQLite (dev), uruchamiany lokalnie `python manage.py runserver`, migracje aktualne.
- Frontend: Node 20.11 LTS, Vite dev server (`npm run dev`), build prod (`npm run build`).
- E2E: Playwright z backendem na :8000 i frontendem na :5173 (lub build + `vite preview`).
- Dane: fixtury `initial_data.json`; opcjonalnie `create_demo_data`.
- Konfiguracja CORS zgodna z localhost:5173.

## 6. Narzędzia
- Backend: pytest, pytest-django, factory-boy, ruff, mypy, coverage.
- Frontend: Vitest, React Testing Library, @testing-library/user-event, Playwright (E2E), ESLint, TypeScript, Sentry (monitoring).
- Kontrakt: drf-spectacular (OpenAPI), djangorestframework-camel-case (snake↔camel), openapi-typescript (`npm run gen:api-types`).
- Wydajność (opcjonalnie): k6 lub Locust.

## 7. Harmonogram (propozycja iteracyjna)
- T0: Przygotowanie środowiska testowego, fixtures, smoke API (Swagger/Redoc).
- T1 (P0): Backend core – services/selectors/permissions/signals/soft delete.
- T2 (P0): Integracja API – CRUD + JWT/403/401 + CORS + camelCase + OpenAPI.
- T3 (P1): Frontend core – sekcje, hooki React Query, formularze RHF+Zod, Zustand, ModalManager, ErrorBoundary.
- T4 (P0/P1): Kontrakt i typy – `npm run gen:api-types`, zgodność typów i payloadów.
- T5 (P1): E2E smoke – Happy Path + dashboard przekierowania.
- T6 (P2): Wydajność lekka + sanity security + weryfikacja braku N+1.
- T7: Bufor na poprawki, retesty i regresję całości.

## 8. Kryteria akceptacji
- Brak krytycznych defektów (security, data loss, blokery) oraz brak dużych defektów w obszarach MVP (US.1–US.7).
- Backend: wszystkie testy przechodzą; pokrycie testami obejmuje krytyczną logikę (services/permissions/signals/selectors).
- Frontend: testy przechodzą; brak błędów TypeScript/ESLint; build produkcyjny przechodzi.
- Integracja: OpenAPI schema dostępne; `npm run gen:api-types` działa; brak rozjazdu camelCase/snake_case.
- E2E smoke: przechodzi Happy Path (rejestracja/logowanie → zwierzę → dieta → lista zakupów → checklist).
- Dashboard: spełnia FR.1.1–FR.1.5 (statystyki, „wymagające uwagi”, szybkie akcje, filtrowanie dostępów, przekierowania).
- Bezpieczeństwo: próby dostępu do cudzych zasobów kończą się 403; brak dostępu bez tokenu (401); CORS poprawnie ograniczony.
- Migracje i dane: migracje przechodzą; fixtures `initial_data.json` można załadować; `create_demo_data` działa (jeśli używane w testach).

## 9. Role i odpowiedzialności
- QA: przygotowanie przypadków testowych, wykonanie testów manualnych/E2E, raportowanie.
- Dev Backend: utrzymanie testów pytest, migracje, kontrakt OpenAPI, poprawki logiczne.
- Dev Frontend: testy Vitest/RTL, E2E Playwright, poprawki UI/UX, utrzymanie typów.
- DevOps/Infra (jeśli dostępny): wsparcie środowisk, CI/CD, monitoring.

## 10. Procedury raportowania błędów
- Zgłoszenie w trackerze: tytuł, środowisko, wersja commit, kroki, wynik oczekiwany/rzeczywisty, logi (API/console), zrzuty ekranu.
- Kategoryzacja: krytyczny/duży/średni/niski; komponent (Backend API / Frontend UI / Kontrakt / E2E / Wydajność / Bezpieczeństwo).
- Przypisanie do właściciela komponentu; SLA napraw zgodnie z priorytetem.
- Retest po poprawce + regresja powiązanych ścieżek.

## 11. Priorytety i ryzyka

### 11.1 Priorytety testowe
- P0 (blokujące MVP): autoryzacja JWT + permissions, Service Layer (kalkulacje i agregacje), signals (spójność `total_daily_mass`), soft delete, dostęp do danych przez Collaboration.
- P1: dashboard (statystyki i „wymagające uwagi”), integracja OpenAPI → typy TS, podstawowe E2E (happy path).
- P2: wydajność (lekki load), a11y smoke, regresje UI.

### 11.2 Ryzyka wymagające szczególnej uwagi w testach
- Ryzyko błędów autoryzacji danych (przecieki danych między użytkownikami) – szczególnie przez Collaboration i dostęp do list zakupów (FR.5.4).
- Ryzyko niespójności danych przez automatyczne kalkulacje (signals) – zaniżone/zawyżone `total_daily_mass` i błędne sumy list zakupów.
- Ryzyko rozjazdu kontraktu API ↔ frontend (OpenAPI/typy + camelCase) – błędy runtime mimo TypeScript.
- Ryzyko N+1 queries na dashboardzie i listach (selectors bez prefetch) – degradacja przy ~50 zwierzętach/dietach (PRD performance).
