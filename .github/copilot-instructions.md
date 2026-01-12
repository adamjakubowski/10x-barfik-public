# Barfik - AI Coding Agent Instructions

Barfik to responsywna aplikacja webowa do planowania i przygotowywania posiłków BARF/gotowanych dla psów i kotów. Projekt hobbystyczny dla wąskiego grona użytkowników.

## Documentation Hierarchy & Navigation Guide

**Użyj tych plików w kolejności priorytetów przy konfliktach informacji:**

1. **copilot-instructions.md** (TEN PLIK) - źródło prawdy dla architektury, wzorców i workflow
2. **[prd.md](../docs/prd.md)** - wymagania funkcjonalne, user stories, Definition of Done
3. **[techstack.md](../docs/techstack.md)** - szczegółowe wersje bibliotek, narzędzia, konfiguracja środowiska
4. **[model-schema.md](../docs/model-schema.md)** - szczegółowy schemat modeli Django z indeksami i walidacjami
5. **[model-planning-summary.md](../docs/model-planning-summary.md)** - kluczowe decyzje architektoniczne dla modeli
6. **[api-plan.md](../docs/api-plan.md)** - kontrakt REST API, endpointy, przykłady request/response
7. **[ui-guidelines.md](../docs/ui-guidelines.md)** - design system, kolorystyka, komponenty UI
8. **[ui-planning-summary.md](../docs/ui-planning-summary.md)** - kluczowe decyzje architektoniczne dla frontendu
9. **[test-plan.md](../docs/test-plan.md)** - strategia testowania, scenariusze, kryteria akceptacji
10. **[project-structure.md](../docs/project-structure.md)** - mapa katalogów i plików projektu
11. **[backend-patterns.md](../docs/backend-patterns.md)** - szczegółowe wzorce implementacyjne Django

**Kiedy używać którego pliku:**
- **Nowa funkcjonalność?** → Zacznij od PRD (wymagania) → Model Schema/API Plan (dane) → Backend/UI Patterns (implementacja)
- **Bug fix?** → Copilot Instructions (wzorce) → odpowiedni plik techniczny (backend-patterns/ui-guidelines)
- **Refactoring?** → Copilot Instructions → Planning Summaries (dlaczego tak zrobiono)
- **Testy?** → Test Plan → PRD (scenariusze biznesowe)
- **Konflikt informacji?** → Użyj hierarchii powyżej (wyżej = większy priorytet)

## Quick Reference

### Backend Django
- **Logika biznesowa:** `services.py` (mutacje) + `selectors.py` (read-only)
- **Widoki:** Tylko wywołania services/selectors + serializacja
- **Soft delete:** Używaj `Model.objects` (aktywne) lub `Model.all_objects` (wszystkie)
- **Auto-fields:** `Ingredient.amount_in_base_unit`, `Diet.total_daily_mass` - NIE modyfikuj ręcznie
- **Signals:** Definiuj w `services.py`, nie w `models.py`

### Frontend React
- **State management:** React Query (server) + Zustand (UI modals)
- **Path imports:** Zawsze `@/components`, NIGDY `../../../`
- **Komponenty:** shadcn/ui + Radix UI 2.x
- **Formularze:** react-hook-form + zod + typy z OpenAPI
- **Typy API:** `npm run gen:api-types` z `docs/api_spec.yaml`

### Common Commands
```bash
# Backend
cd backend/src
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend/src
npm run gen:api-types  # Generuj typy z OpenAPI
npm run dev
```

## Architektura

**Decoupled Full-stack:** Backend Django (REST API) + Frontend React/Vite komunikują się przez REST. Brak monolitu.

- **Backend:** `backend/src/` - Django 5.2, DRF 3.15.2, Python 3.13.1, SQLite (dev), PostgreSQL (prod planned)
- **Frontend:** `frontend/src/` - React 19.2, Vite 7.2.4, TypeScript 5.9.3, Node.js 24.12.0
- **API Contract:** OpenAPI 3.1 generowany przez `drf-spectacular` dostępny pod `/api/schema/`

## Backend Patterns (Django)

### Service Layer Architecture

**KRYTYCZNE:** Logika biznesowa NIE należy do widoków ani modeli. Struktura projektu:
- `models.py` - tylko definicje modeli, relacje, podstawowe walidacje
- `services.py` - **TUTAJ** cała logika biznesowa, mutacje, kalkulacje (np. `create_diet`, `generate_shopping_list`)
- `selectors.py` - złożone zapytania read-only z optymalizacjami (`select_related`, `prefetch_related`)
- `views.py` - cienka warstwa wywołująca services/selectors

**Przykład:** Generowanie listy zakupów wymaga agregacji składników z wielu diet, mnożenia przez `days_count`, sumowania po nazwach. Ta logika należy do `services.py`, NIE do widoku.

### Soft Delete Pattern

Wszystkie główne modele dziedziczą z `SoftDeletableMixin`:
```python
# Modele: Animal, Diet, Ingredient, Collaboration, ShoppingList, ShoppingListItem
is_active = models.BooleanField(default=True, db_index=True)
objects = ActiveManager()  # domyślny - tylko is_active=True
all_objects = models.Manager()  # pełny dostęp
```

**Używaj:** `Model.objects.filter()` dla aktywnych rekordów, `Model.all_objects.filter()` dla audytu.

### Auto-calculated Fields

Modele mają pola przeliczane automatycznie - **NIE modyfikuj ich ręcznie:**

1. **Ingredient.amount_in_base_unit** - przeliczane w `save()` z `amount * unit.conversion_factor`
2. **Diet.total_daily_mass** - aktualizowane przez signals po zmianach składników (logika w services)

**Dodając signal:** Umieść w `services.py`, nie w `models.py`.

### Model-Specific Rules

**Diet:** 
- `end_date` może być `null` (dieta otwarta)
- Diety mogą się nakładać - brak walidacji unikalności dat
- Walidacja: `start_date <= end_date` w `clean()`

**Ingredient:**
- Snapshot składnika (NIE FK do słownika składników)
- `cooking_method` wybór: `raw` lub `cooked`
- `category` FK do `IngredientCategory` (słownik)

**Collaboration:**
- Właściciel zwierzęcia NIE ma wpisu w Collaboration (pełny dostęp z relacji Animal.owner)
- Ograniczenie: tylko jeden aktywny rekord na parę (animal, user) - `uix_collab_active_pair`
- Uprawnienia: `READ_ONLY` (domyślne) lub `EDIT`

**ShoppingList:**
- M2M do Diet (wiele diet → jedna lista)
- `days_count` określa mnożnik (np. 7 dni → składniki × 7)
- Agregacja: składniki sumowane tylko po `ingredient_name` (surowe + gotowane razem)

## Workflow Commands

### Backend Setup
```bash
# Projekt ma już skonfigurowane środowisko wirtualne w katalogu .venv
# UŻYWAJ GO zamiast tworzenia nowego:
# Przejdź do katalogu głównego projektu (barfik/)
source .venv/bin/activate  # aktywacja istniejącego .venv

# Jeśli .venv NIE ISTNIEJE w katalogu głównym projektu, utwórz go DOKŁADNIE tam:
# cd do_katalogu_głównego_projektu  # katalog główny projektu (barfik/)
# python3 -m venv .venv  # utworzenie w katalogu głównym
# source .venv/bin/activate
# pip install -r backend/requirements.txt  # instalacja wymagań

cd backend/src
python manage.py migrate
python manage.py runserver  # http://127.0.0.1:8000
```

### Migracje
Po każdej zmianie modelu:
```bash
python manage.py makemigrations
python manage.py migrate
```

### Frontend Setup
```bash
cd frontend/src
npm install
npm run gen:api-types  # WYMAGA działającego backendu na :8000
npm run dev  # http://localhost:5173
```

## Type Generation (Frontend)

**OBOWIĄZKOWE przed pracą z API:** Typy TypeScript generowane z OpenAPI backendu:
```bash
npm run gen:api-types
# Generuje: src/api/schema.ts
```

Skrypt w `package.json`:
```json
"gen:api-types": "openapi-typescript http://127.0.0.1:8000/api/schema/ --output src/api/schema.ts"
```

**Używaj wygenerowanych typów** w `react-query` hooks i schematach `zod`.

## Frontend Conventions (Implemented)

### State Management Patterns

**UI State - Zustand Store:**
```typescript
// src/store/uiStore.ts - centralne zarządzanie modals, UI state
import { useUIStore } from '@/store/uiStore'

// ZAMIAST useState w komponentach:
const { openAnimalModal, openCreateDietModal, closeAllModals } = useUIStore()
```

**Server State - React Query:**
```typescript
// src/hooks/useAnimals.ts, useDiets.ts, etc.
import { useQuery, useMutation } from '@tanstack/react-query'

const { data: animals, isLoading } = useAnimals()
const { mutate: createDiet } = useCreateDiet()
```

### Path Aliases (`@/`)

**OBOWIĄZKOWE:** Używaj path alias zamiast względnych ścieżek:
```typescript
// ✅ DOBRZE:
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'

// ❌ ŹLE:
import { Button } from '../../../components/ui/button'
```

**Konfiguracja:**
- `vite.config.ts`: `alias: { '@': path.resolve(__dirname, './src') }`
- `tsconfig.app.json`: `"paths": { "@/*": ["./src/*"] }`

### Component Patterns

**shadcn/ui Components (zainstalowane):**
- używaj gotowych komponentów shadcn/ui dla spójnego UI
- jeśli potrzebujesz niestandardowego komponentu, rozszerzaj shadcn/ui zamiast tworzyć od zera
- przed stworzeniem nowego komponentu sprawdź, czy shadcn/ui go nie oferuje


```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
```

**Modals - Dialog Pattern:**
```typescript
export function AnimalModal({ animal, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edytuj zwierzę</DialogTitle>
        </DialogHeader>
        {/* Form content */}
      </DialogContent>
    </Dialog>
  )
}
```

**Centralne zarządzanie modalami:**
- `src/components/ModalManager.tsx` - renderuje wszystkie modals
- `App.tsx` - deleguje do ModalManager, outlet context (5 props)
- Komponenty używają `useUIStore()` do otwierania/zamykania

### TypeScript Guidelines

**ZERO `any` types - używaj:**
```typescript
// Type guards:
if (axios.isAxiosError(error)) { /* ... */ }
if (error instanceof Error) { /* ... */ }

// Explicit types:
function handleSubmit(data: FormData): Promise<void>
const items: ShoppingListItem[] = []
```

**Custom hooks zamiast useContext:**
```typescript
// ✅ DOBRZE:
import { useAuth } from '@/hooks/useAuth'
const { user, login, logout } = useAuth()

// ❌ ŹLE:
import { AuthContext } from '@/auth/AuthContext'
const auth = useContext(AuthContext)
```

### Error Handling

**ErrorBoundary:**
```typescript
// App.tsx opakowane w ErrorBoundary
<ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      {/* app */}
    </AuthProvider>
  </QueryClientProvider>
</ErrorBoundary>
```

**BRAK console statements:**
- Zero `console.log()` / `console.error()` w produkcji, dopuszczalne użycie w celach debugowych, ale zawsze po skończeniu debugu trzeba posprzątać. 
- Używaj ErrorBoundary do catch errors
- React Query automatyczne error handling


### Forms Pattern

**react-hook-form + zod:**
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana'),
  // ...
})

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema)
})
```

### Styling Conventions

- **Tailwind CSS:** mobile-first, utility classes
- **Class merging:** `cn()` helper z `clsx` + `tailwind-merge`
- **CSS variables:** dark/light mode support w `index.css`
- **Naming:** camelCase (API auto-konwersja przez `djangorestframework-camel-case`)

### File Structure

```
src/
├── api/
│   ├── client.ts         # axios config, interceptors
│   ├── schema.ts         # auto-generated from OpenAPI
│   ├── services.ts       # API calls per resource
│   └── types.ts          # shared API types
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # Topbar, etc.
│   ├── navigation/       # Sidebar, BottomNav
│   ├── ErrorBoundary.tsx
│   └── ModalManager.tsx
├── hooks/
│   ├── useAuth.ts        # auth hook
│   ├── useAnimals.ts     # React Query hooks
│   └── useDiets.ts
├── store/
│   └── uiStore.ts        # Zustand UI state
├── lib/
│   ├── queryClient.ts    # QueryClient config
│   └── utils.ts          # cn() helper
├── modals/               # Dialog components
├── sections/             # Page sections
├── pages/                # Route pages
└── auth/
    └── AuthContext.tsx   # Auth provider
```

### Code Quality Standards

- **ESLint:** Zero errors, zero warnings
- **Fast Refresh:** Komponenty tylko export (exception: AuthContext)
- **Build:** Success w <2s, bundle <500kB
- **TypeScript:** Strict mode, zero implicit any

## Development Constraints

- **Język:** Wszystkie komunikaty, etykiety, błędy walidacji **PO POLSKU**
- **No tracking:** Brak zewnętrznych skryptów analytics/social login
- **Hosting:** VPS (przyszłość), obecnie lokalny development
- **SQLite:** Dev only, produkcja PostgreSQL (not yet configured)

## Key Files Reference

- [Model Definitions](../backend/src/barfik_system/models.py) - wzorce soft delete, auto-calculation
- [PRD](../docs/prd.md) - user stories, wymagania funkcjonalne
- [Tech Stack](../docs/techstack.md) - szczegółowe wersje bibliotek, API contract rules
- [Model Planning](../docs/model-planning-summary.md) - decyzje architektoniczne, relacje
- [Backend Setup](../backend/how_to_setup.md) - komendy uruchomieniowe

## Critical "Why" Decisions

1. **Service Layer:** Ułatwia testowanie i reużycie logiki (np. kalkulator zakupów używany przez API i admin)
2. **Soft Delete:** Audyt i możliwość odzyskania danych bez backupu
3. **Persisted Calculations:** `total_daily_mass` w bazie → szybki odczyt, signals zapewniają spójność
4. **No Owner in Collaboration:** Eliminacja redundancji, relacja Animal.owner wystarczy
5. **Snapshot Ingredients:** Lista zakupów nie zmienia się po edycji słownika składników
6. **OpenAPI Contract:** Frontend-backend kontrakt testowany automatycznie, typy TS zawsze aktualne
