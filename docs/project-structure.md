# Project Structure - Barfik

Ten dokument opisuje strukturę katalogów i kluczowych plików projektu Barfik.

## Spis treści

- [Przegląd struktury](#przegląd-struktury)
- [Backend (Django)](#backend-django)
- [Frontend (React + Vite)](#frontend-react--vite)
- [Dokumentacja](#dokumentacja)
- [Konfiguracja](#konfiguracja)

---

## Przegląd struktury

```
barfik/
├── .github/                    # GitHub workflows i instrukcje dla AI
│   ├── workflows/             # CI/CD pipeline
│   └── copilot-instructions.md # Główny plik instrukcji dla agentów AI
├── backend/                    # Django REST API
│   └── src/                   # Kod źródłowy backendu
│       ├── barfik_backend/    # Projekt Django (settings, urls, wsgi)
│       └── barfik_system/     # Aplikacja główna (models, views, services)
├── frontend/                   # React + Vite SPA
│   └── src/                   # Kod źródłowy frontendu
│       ├── api/               # API client, typy z OpenAPI
│       ├── components/        # Komponenty React (UI, layout, navigation)
│       ├── hooks/             # Custom React hooks (useAuth, useAnimals, etc.)
│       ├── store/             # Zustand store (uiStore.ts)
│       ├── modals/            # Komponenty modalów
│       ├── sections/          # Sekcje stron (Dashboard, Animals, etc.)
│       ├── pages/             # Strony route'ów
│       ├── auth/              # AuthContext, AuthProvider
│       ├── lib/               # Utilities (queryClient, cn helper)
│       └── public/            # Statyczne assety
├── docs/                       # Dokumentacja projektu
│   ├── prd.md                 # Product Requirements Document
│   ├── techstack.md           # Stack technologiczny
│   ├── model-schema.md        # Schemat modeli Django
│   ├── model-planning-summary.md  # Decyzje architektoniczne modeli
│   ├── api-plan.md            # REST API endpoints
│   ├── ui-guidelines.md       # Design system, kolorystyka
│   ├── ui-planning-summary.md # Decyzje architektoniczne UI
│   ├── test-plan.md           # Plan testów
│   ├── backend-patterns.md    # Wzorce implementacyjne Django
│   └── project-structure.md   # TEN PLIK - struktura projektu
├── .venv/                      # Virtual environment Python (lokalny)
├── .gitignore
├── README.md
└── requirements.txt (lub backend/requirements.txt)
```

---

## Backend (Django)

### Struktura `backend/src/`

```
backend/src/
├── barfik_backend/             # Projekt Django
│   ├── __init__.py
│   ├── settings.py            # Konfiguracja Django (DATABASES, INSTALLED_APPS, etc.)
│   ├── urls.py                # URL routing główny
│   ├── wsgi.py                # WSGI entry point
│   └── asgi.py                # ASGI entry point (Uvicorn)
├── barfik_system/              # Aplikacja główna
│   ├── __init__.py
│   ├── models.py              # Modele danych (Animal, Diet, Ingredient, etc.)
│   ├── services.py            # Logika biznesowa (generate_shopping_list, etc.)
│   ├── selectors.py           # Złożone query read-only z optymalizacjami
│   ├── views.py               # ViewSets DRF (cienka warstwa)
│   ├── serializers.py         # DRF serializers
│   ├── permissions.py         # Custom permission classes
│   ├── urls.py                # URL routing aplikacji
│   ├── admin.py               # Django admin
│   ├── apps.py                # App config (signals registration)
│   ├── migrations/            # Migracje bazy danych
│   │   └── ...
│   └── tests/                 # Testy (pytest-django)
│       ├── test_models.py
│       ├── test_services.py
│       ├── test_selectors.py
│       ├── test_views.py
│       └── ...
├── manage.py                   # Django CLI
├── db.sqlite3                  # Baza danych (dev)
├── pytest.ini                  # Konfiguracja pytest
└── requirements.txt (lub ../requirements.txt)
```

### Kluczowe pliki backend

| Plik | Opis |
|------|------|
| **models.py** | Definicje modeli (Animal, Diet, Ingredient, Collaboration, ShoppingList, etc.) z SoftDeletableMixin |
| **services.py** | Logika biznesowa: `generate_shopping_list()`, `recalculate_diet_total_mass()`, signals |
| **selectors.py** | Złożone zapytania: `get_user_accessible_animals()`, `get_dashboard_stats()` z `select_related`/`prefetch_related` |
| **views.py** | ViewSets DRF: `AnimalViewSet`, `DietViewSet`, `ShoppingListViewSet` - tylko wywołania services/selectors |
| **serializers.py** | ModelSerializers z jawnym `fields`, nested serializers dla relacji |
| **permissions.py** | Custom permissions: `IsOwnerOrCollaborator`, `IsShoppingListAccessible` |
| **settings.py** | Konfiguracja: `DATABASES`, `REST_FRAMEWORK`, `CORS_ALLOWED_ORIGINS`, `drf-spectacular` |
| **urls.py** | Routing REST API: `/api/animals/`, `/api/diets/`, `/api/shopping-lists/`, etc. |

---

## Frontend (React + Vite)

### Struktura `frontend/src/src/`

```
frontend/src/src/
├── api/
│   ├── client.ts              # Axios config, interceptors (JWT, retry 401)
│   ├── schema.ts              # Auto-generated types z OpenAPI (npm run gen:api-types)
│   ├── services.ts            # API calls per resource (animalsApi, dietsApi, etc.)
│   └── types.ts               # Shared API types
├── components/
│   ├── ui/                    # shadcn/ui components (button, dialog, input, etc.)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── Topbar.tsx
│   │   └── ...
│   ├── navigation/
│   │   ├── Sidebar.tsx
│   │   └── BottomNav.tsx
│   ├── ErrorBoundary.tsx      # Error boundary z fallback UI
│   └── ModalManager.tsx       # Centralny rejestr modalów (zarządza stanem z uiStore)
├── hooks/
│   ├── useAuth.ts             # Custom hook dla autentykacji
│   ├── useAnimals.ts          # React Query hooks dla zwierząt
│   ├── useDiets.ts            # React Query hooks dla diet
│   ├── useShoppingLists.ts   # React Query hooks dla list zakupów
│   └── ...
├── store/
│   └── uiStore.ts             # Zustand store dla UI state (modale, layout)
├── lib/
│   ├── queryClient.ts         # QueryClient config (staleTime, retry)
│   └── utils.ts               # Utilities: cn() helper (clsx + tailwind-merge)
├── modals/
│   ├── AnimalModal.tsx        # Modal dodawania/edycji zwierzęcia
│   ├── DietModal.tsx          # Modal dodawania/edycji diety
│   ├── ShoppingListModal.tsx  # Modal generowania listy zakupów
│   ├── CollaborationModal.tsx # Modal zarządzania współpracownikami
│   └── ...
├── sections/
│   ├── Dashboard.tsx          # Dashboard z statystykami
│   ├── Animals.tsx            # Widok listy zwierząt
│   ├── AnimalDetail.tsx       # Szczegóły zwierzęcia
│   ├── Diets.tsx              # Widok listy diet
│   ├── DietDetail.tsx         # Szczegóły diety (tabbed: info/składniki/listy)
│   ├── ShoppingLists.tsx      # Widok listy zakupów
│   └── Profile.tsx            # Profil użytkownika
├── pages/
│   ├── LandingPage.tsx        # Landing page (onboarding/redirect)
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   └── ...
├── auth/
│   ├── AuthContext.tsx        # Context dla autentykacji
│   └── AuthProvider.tsx       # Provider opakowujący aplikację
├── public/                     # Statyczne assety (ikony, logo, etc.)
│   └── ...
├── App.tsx                     # Główny komponent app z routing
├── main.tsx                    # Entry point (renderowanie App)
├── index.css                   # Global styles (Tailwind directives)
└── vite-env.d.ts               # Vite type definitions
```

### Kluczowe pliki frontend

| Plik | Opis |
|------|------|
| **api/client.ts** | Axios instance z interceptorami JWT, retry 401 |
| **api/schema.ts** | Auto-generated types z OpenAPI backendu (`npm run gen:api-types`) |
| **api/services.ts** | Funkcje API calls: `getAnimals()`, `createDiet()`, `generateShoppingList()`, etc. |
| **components/ModalManager.tsx** | Centralny rejestr modalów, renderuje wszystkie modale zgodnie z `uiStore` |
| **components/ErrorBoundary.tsx** | Przechwytuje błędy renderowania, pokazuje fallback UI |
| **hooks/useAnimals.ts** | React Query hooks: `useAnimals()`, `useCreateAnimal()`, `useUpdateAnimal()`, etc. |
| **store/uiStore.ts** | Zustand store dla UI: `openAnimalModal()`, `closeAllModals()`, etc. |
| **lib/queryClient.ts** | QueryClient config: `staleTime` per typ danych (słowniki 1h, user 5min) |
| **sections/Dashboard.tsx** | Dashboard z statystykami (FR.1.1-FR.1.5), wymagające uwagi, szybkie akcje |
| **sections/DietDetail.tsx** | Tabbed UI (info/składniki/listy), inline CRUD składników, auto-aktualizacja `total_daily_mass` |
| **App.tsx** | Główny komponent z React Router, opakowany ErrorBoundary i QueryClientProvider |
| **main.tsx** | Entry point: renderowanie `<App />` w DOM |
| **vite.config.ts** | Vite config: path alias `@/`, plugins (React, etc.) |
| **package.json** | Dependencies, scripts (`dev`, `build`, `gen:api-types`) |
| **tsconfig.app.json** | TypeScript config: paths `@/*`, strict mode |

---

## Dokumentacja

### Struktura `docs/`

| Plik | Opis | Dla kogo |
|------|------|----------|
| **prd.md** | Product Requirements Document - wymagania funkcjonalne, user stories, Definition of Done | Product Owner, QA, Dev |
| **techstack.md** | Stack technologiczny - wersje bibliotek, narzędzia, konfiguracja środowiska | Dev, DevOps |
| **model-schema.md** | Szczegółowy schemat modeli Django - pola, indeksy, walidacje, relacje | Backend Dev |
| **model-planning-summary.md** | Kluczowe decyzje architektoniczne dla modeli - uzasadnienia, trade-offs | Backend Dev, Architect |
| **api-plan.md** | REST API endpoints - request/response examples, authentication, permissions | Frontend Dev, Backend Dev, QA |
| **ui-guidelines.md** | Design system - kolorystyka, typografia, komponenty bazowe, spacing | Frontend Dev, Designer |
| **ui-planning-summary.md** | Kluczowe decyzje architektoniczne UI - przepływy, widoki, state management | Frontend Dev, Architect |
| **test-plan.md** | Plan testów - scenariusze, kryteria akceptacji, narzędzia | QA, Dev |
| **backend-patterns.md** | Wzorce implementacyjne Django - Service Layer, Selectors, Signals, Permissions | Backend Dev |
| **project-structure.md** | TEN PLIK - struktura katalogów i plików | Wszyscy devs, nowi członkowie zespołu |

---

## Konfiguracja

### Główne pliki konfiguracyjne

| Plik | Lokalizacja | Opis |
|------|-------------|------|
| **.gitignore** | Root | Ignorowane pliki Git (node_modules, .venv, db.sqlite3, etc.) |
| **requirements.txt** | backend/ lub root | Zależności Python (Django, DRF, pytest, etc.) |
| **package.json** | frontend/src/ | Zależności Node.js, scripts (dev, build, gen:api-types) |
| **vite.config.ts** | frontend/src/ | Vite config: path alias, plugins, build options |
| **tsconfig.json** | frontend/src/ | TypeScript config base |
| **tsconfig.app.json** | frontend/src/ | TypeScript config app: paths `@/*`, strict mode |
| **tailwind.config.js** | frontend/src/ | Tailwind CSS config: theme, plugins, content paths |
| **pytest.ini** | backend/src/ | Pytest config: paths, markers, coverage |
| **.env** | backend/src/ lub root | Environment variables (DATABASE_URL, SECRET_KEY, etc.) - NIE commitować! |
| **.github/workflows/** | .github/ | GitHub Actions CI/CD workflows |

### Environment variables (.env)

Backend (`backend/src/.env`):
```bash
# Django
SECRET_KEY=<your-secret-key>
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=sqlite:///db.sqlite3  # Dev
# DATABASE_URL=postgresql://user:pass@localhost:5432/barfik  # Prod

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Email (POST-MVP)
# EMAIL_BACKEND=...
```

Frontend (opcjonalnie `frontend/src/.env`):
```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

---

## Common Workflows

### Setup projektu (pierwszy raz)

**Backend:**
```bash
# W katalogu głównym projektu (barfik/)
python3 -m venv .venv
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate  # Windows

cd backend/src
pip install -r ../requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver  # http://127.0.0.1:8000
```

**Frontend:**
```bash
cd frontend/src
npm install
npm run gen:api-types  # Generuj typy z OpenAPI (backend musi być uruchomiony!)
npm run dev  # http://localhost:5173
```

### Development workflow

**Terminal 1 - Backend:**
```bash
source .venv/bin/activate
cd backend/src
python manage.py runserver
```

**Terminal 2 - Frontend:**
```bash
cd frontend/src
npm run dev
```

**Terminal 3 - Generowanie typów (po zmianach API):**
```bash
cd frontend/src
npm run gen:api-types
```

### Migracje (po zmianach modeli)

```bash
cd backend/src
python manage.py makemigrations
python manage.py migrate
```

### Testy

**Backend:**
```bash
cd backend/src
pytest
pytest --cov=barfik_system  # Z coverage
```

**Frontend:**
```bash
cd frontend/src
npm run test  # Vitest
npm run test:e2e  # Playwright (jeśli skonfigurowane)
```

---

## Zobacz również

- **[copilot-instructions.md](../.github/copilot-instructions.md)** - główny plik instrukcji dla agentów AI
- **[techstack.md](techstack.md)** - szczegółowe wersje bibliotek i narzędzia
- **[backend-patterns.md](backend-patterns.md)** - wzorce implementacyjne Django
- **[prd.md](prd.md)** - wymagania funkcjonalne
