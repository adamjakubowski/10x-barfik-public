# 🐾 Barfik

Responsywna aplikacja webowa do planowania i przygotowywania posiłków BARF/gotowanych dla psów i kotów.

## 📖 O Projekcie

Barfik to narzędzie pomagające właścicielom psów i kotów planować i przygotowywać domowe posiłki BARF oraz gotowane. Aplikacja umożliwia:

- 📊 Zarządzanie profilami zwierząt
- 🍖 Planowanie diet z precyzyjnym składem składników
- 🛒 Generowanie list zakupów z automatycznym przeliczaniem ilości
- 👥 Współdzielenie planów żywieniowych z opiekunami
- 📱 Pełne wsparcie dla urządzeń mobilnych (RWD)

Projekt ma charakter hobbystyczny dla wąskiego grona użytkowników (rodzina + znajomi).

## 🛠 Stack Technologiczny

### Backend
- **Python 3.13.1** - język programowania
- **Django 5.2** - framework webowy
- **Django REST Framework 3.15.2** - REST API
- **drf-spectacular 0.27.2** - dokumentacja OpenAPI 3.1
- **Simple JWT 5.4.0** - autentykacja JWT
- **SQLite 3.x** - baza danych (development)
- **PostgreSQL 16.x** - baza danych (production planned)

### Frontend
- **Node.js 24.12.0 LTS** - środowisko wykonawcze
- **React 19.2.0** - biblioteka UI
- **TypeScript 5.9.3** - typowanie statyczne
- **Vite 7.2.4** - build tool
- **Tailwind CSS 3.4.19** - framework CSS
- **TanStack Query 5.90.16** - zarządzanie stanem serwera
- **Zustand 5.0.9** - zarządzanie stanem klienta
- **shadcn/ui** - komponenty UI (Radix UI)
- **React Hook Form 7.69.0 + Zod 4.3.4** - formularze

### Architektura
- **Decoupled Full-stack** - separacja backend/frontend
- **REST API** - komunikacja przez HTTP
- **OpenAPI 3.1** - kontrakt API
- **Docker** - konteneryzacja (opcjonalnie)

## 🚀 Szybki Start

### Wymagania Wstępne

- Python 3.13.1
- Node.js 24.12.0 LTS
- Docker & Docker Compose (opcjonalnie)

### Opcja 1: Uruchomienie z Dockerem (Zalecane)

```bash
# Klonowanie repozytorium
git clone <repository-url>
cd barfik

# Uruchomienie w trybie development
docker-compose -f docker-compose.dev.yml up

# Backend dostępny na: http://localhost:8000
# Frontend dostępny na: http://localhost:5173
```

### Opcja 2: Uruchomienie Manualne

#### Backend Setup

```bash
# Przejdź do katalogu głównego projektu
cd barfik

# Utwórz i aktywuj wirtualne środowisko
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Zainstaluj zależności
pip install -r backend/requirements.txt

# Przejdź do katalogu src
cd backend/src

# Uruchom migracje
python manage.py migrate

# Załaduj dane początkowe (słowniki)
python manage.py loaddata barfik_system/fixtures/initial_data.json

# (Opcjonalnie) Utwórz superusera
python manage.py createsuperuser

# (Opcjonalnie) Utwórz dane demo
python manage.py create_demo_data

# Uruchom serwer
python manage.py runserver
```

Backend dostępny pod: **http://127.0.0.1:8000**

#### Frontend Setup

```bash
# W nowym terminalu, przejdź do katalogu frontend
cd frontend/src

# Zainstaluj zależności
npm install

# Wygeneruj typy TypeScript z API (backend musi być uruchomiony!)
npm run gen:api-types

# Uruchom serwer deweloperski
npm run dev
```

Frontend dostępny pod: **http://localhost:5173**

## 📚 Dokumentacja API

Po uruchomieniu backendu dostępne są:

- **Swagger UI**: http://127.0.0.1:8000/api/schema/swagger/
- **ReDoc**: http://127.0.0.1:8000/api/schema/redoc/
- **Schemat OpenAPI**: http://127.0.0.1:8000/api/schema/
- **Admin Panel**: http://127.0.0.1:8000/admin/

## 🧪 Testy

### Backend (pytest)

```bash
cd backend/src

# Wszystkie testy
pytest

# Z pokryciem kodu
pytest --cov=barfik_system

# Konkretny plik testów
pytest barfik_system/tests/test_animals.py -v
```

### Frontend (Vitest)

```bash
cd frontend/src

# Wszystkie testy
npm run test

# Tryb watch
npm run test:watch
```

## 📁 Struktura Projektu

```
barfik/
├── backend/                    # Django REST API
│   ├── src/
│   │   ├── barfik_backend/    # Konfiguracja Django
│   │   ├── barfik_system/     # Główna aplikacja
│   │   │   ├── models.py      # Modele danych
│   │   │   ├── serializers.py # Serializery DRF
│   │   │   ├── views.py       # Viewsety API
│   │   │   ├── services.py    # Logika biznesowa
│   │   │   ├── permissions.py # Kontrola dostępu
│   │   │   ├── signals.py     # Auto-updates
│   │   │   ├── fixtures/      # Dane początkowe
│   │   │   └── tests/         # Testy pytest
│   │   └── manage.py
│   └── requirements.txt
│
├── frontend/                   # React + TypeScript
│   └── src/
│       ├── api/               # API client + typy
│       ├── components/        # Komponenty React
│       │   ├── ui/           # shadcn/ui
│       │   ├── layout/       # Layout
│       │   └── navigation/   # Nawigacja
│       ├── hooks/            # Custom hooks
│       ├── pages/            # Strony (routing)
│       ├── modals/           # Dialog components
│       ├── store/            # Zustand store
│       ├── auth/             # Autentykacja
│       └── lib/              # Utilities
│
├── docs/                      # Dokumentacja projektu
│   ├── prd.md                # Product Requirements
│   ├── techstack.md          # Stack technologiczny
│   ├── model-planning-summary.md
│   └── ui-guidelines.md
│
└── docker-compose.yml         # Docker setup
```

## 🔑 Dane Demo

Po uruchomieniu komendy `python manage.py create_demo_data`:

- **Email**: demo@barfik.pl
- **Hasło**: demo123
- **Zwierzę**: Rex (labrador, 25.5 kg)
- **Dieta**: 5 składników (wołowina, kurczak, wątroba, marchewka, brokuł)

## 🌟 Kluczowe Funkcjonalności

### Dashboard
- Podsumowanie stanu systemu (zwierzęta, diety, listy zakupów)
- Szybkie akcje (dodaj zwierzę, utwórz dietę, generuj listę)
- Alerty wymagające uwagi (wygasające diety, niekompletne listy)

### Zarządzanie Zwierzętami
- Profile z wagą, datą urodzenia, gatunkiem
- Możliwość dodawania notatek
- Soft delete (możliwość odzyskania)

### Planowanie Diet
- Zakres dat (start_date - end_date lub otwarta)
- Składniki z kategoriami (mięso, podroby, warzywa, suplementy)
- Sposób przygotowania (surowe/gotowane)
- Automatyczne przeliczanie masy dziennej porcji

### Listy Zakupów
- Generowanie z wielu diet jednocześnie
- Automatyczne agregowanie składników
- Mnożenie przez liczbę dni
- Checklist z możliwością odhaczania

### Współpraca
- Udostępnianie zwierząt innym użytkownikom
- Poziomy uprawnień: READ_ONLY, EDIT
- Bezpieczna współpraca (unique constraint)

## 🏗 Architektura Backend

### Service Layer Pattern
- **models.py** - definicje modeli, relacje, podstawowe walidacje
- **services.py** - **cała logika biznesowa** (create, update, kalkulacje)
- **selectors.py** - złożone zapytania read-only z optymalizacjami
- **views.py** - cienka warstwa wywołująca services/selectors

### Soft Delete
- Pole `is_active` na wszystkich głównych modelach
- `objects` - domyślny manager (tylko aktywne)
- `all_objects` - pełny dostęp (audyt)

### Auto-calculated Fields
- **Ingredient.amount_in_base_unit** - przeliczane w `save()`
- **Diet.total_daily_mass** - aktualizowane przez signals

## 🎨 Frontend Patterns

### State Management
- **Server State**: TanStack Query (`useQuery`, `useMutation`)
- **UI State**: Zustand (`useUIStore`)
- **ZAKAZ**: `useEffect` dla fetching data

### Path Aliases
```typescript
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
```

### Type Generation
```bash
npm run gen:api-types  # generuje src/api/schema.ts z OpenAPI
```

### Styling
- Tailwind CSS (mobile-first)
- shadcn/ui components
- `cn()` helper (clsx + tailwind-merge)

## 📋 Przydatne Komendy

```bash
# Backend
python manage.py makemigrations      # Utwórz migracje
python manage.py migrate             # Zastosuj migracje
python manage.py shell              # Django shell
python manage.py check              # Sprawdź konfigurację

# Frontend
npm run gen:api-types               # Generuj typy TS
npm run build                       # Build produkcyjny
npm run preview                     # Podgląd buildu

# Docker
docker-compose up                   # Uruchom produkcyjnie
docker-compose -f docker-compose.dev.yml up  # Development
docker-compose down                 # Zatrzymaj
docker-compose logs -f backend      # Logi backendu
```

## 🔗 Dodatkowa Dokumentacja

- [PRD - Product Requirements](docs/prd.md)
- [Tech Stack - Szczegóły techniczne](docs/techstack.md)
- [Model Planning - Architektura danych](docs/model-planning-summary.md)
- [Backend Setup - Szczegółowa instrukcja](backend/how_to_setup.md)
- [API Implementation - Dokumentacja API](backend/API_IMPLEMENTATION.md)
- [UI Guidelines - Standardy UI/UX](docs/ui-guidelines.md)

## 🐛 Rozwiązywanie Problemów

### Port 8000 zajęty
```bash
python manage.py runserver 8001
```

### Błąd CORS
Upewnij się, że frontend działa na `http://localhost:5173` (domyślnie Vite).

### Błąd migracji
```bash
python manage.py migrate --run-syncdb
```

### Brak typów TypeScript
```bash
# Upewnij się, że backend jest uruchomiony na :8000
cd frontend/src
npm run gen:api-types
```

## 👨‍💻 Autor

Projekt hobbystyczny Adama Jakubowskiego

## 📄 Licencja

Projekt prywatny - brak licencji publicznej.

---

**Status projektu**: 🚧 W fazie development  
**Ostatnia aktualizacja**: Styczeń 2026
