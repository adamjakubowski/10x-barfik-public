# 🛠 Dokumentacja Stosu Technologicznego (techstack.md)

Ten dokument definiuje standardy technologiczne, strukturę projektu oraz zasady kodowania. Agencie AI, przestrzegaj tych wytycznych przy generowaniu kodu.

## 1. Architektura Systemu

- **Model:** Decoupled Full-stack (Separacja Backend/Frontend).
- **Komunikacja:** REST API z pełną dokumentacją OpenAPI 3.1 (drf-spectacular 0.27.2 → Swagger/Redoc, podstawa kontraktów dla frontu).
- **Backend:** Python 3.13.1 | Django 5.2 | Django REST Framework 3.15.2 | ASGI via Uvicorn 0.30.0.
- **Frontend:** Node.js 24.12.0 LTS | Vite 7.2.4 | React 19.2.0 | TypeScript 5.9.3 | Tailwind CSS 3.4.19.
- **Baza danych:** SQLite 3.x (Development) | PostgreSQL 16.x (Production planned)
- **Konteneryzacja:** Docker Engine 25.0 + docker-compose 2.24 (obrazy dla backendu, frontendu).

---

## 2. Backend (Python & Django)

### Kluczowe biblioteki (najnowsze stabilne) backend

- `djangorestframework==3.15.2` – API CRUD, walidacja.
- `drf-spectacular==0.27.2` – OpenAPI 3.1, Swagger/Redoc.
- `djangorestframework-simplejwt==5.4.0` – Stateless JWT (access 15 min, refresh 24 h).
- `django-environ==0.11.2` – konfiguracja z `.env`.
- `django-cors-headers` – whitelista domen frontendu.
- `django-anymail[mailgun]` – wysyłka resetu hasła i zaproszeń.
- `sentry-sdk[django]==1.40.6` – monitoring błędów.
- `django[argon2]==5.2` (`argon2-cffi==23.1.0`) – bezpieczne hashowanie.
- `uvicorn==0.30.0` – ASGI server dla Django.

### Zasady dla Agenta AI backend

- **Service Layer:** logika biznesowa w `services.py`, złożone zapytania w `selectors.py`; widoki i modele pozostają cienkie.
- **Serializery:** `ModelSerializer` z jawnym `fields`
- **Typowanie:** każda funkcja/metoda posiada adnotacje typów; używaj `mypy` friendly signatures.
- **Migracje:** po każdej zmianie modeli uruchom `makemigrations`; w CI `migrate --check`
- **Bezpieczeństwo:** wymuszamy HTTPS (Let's Encrypt), HTTP-only cookies dla refresh tokenów jeśli trzymane w przeglądarce, Strict-Transport-Security, Content Security Policy.
- **Testy:** `pytest==8.1.0`, `pytest-django==4.8.0`, `factory-boy==3.3.0`, `ruff==0.1.13`, `mypy==1.8.0` – uruchamiane w CI.

---

## 3. Frontend (React & Tailwind CSS)

### Kluczowe biblioteki (najnowsze stabilne) Frontend

- `vite@7.2.4` (+ plugin React) – build tool i dev server.
- `react@19.2.0`, `react-dom@19.2.0` – framework UI.
- `typescript@5.9.3` – typowanie statyczne.
- `@tanstack/react-query@5.90.16` – jedyne źródło pobierania danych (zakaz `useEffect` dla fetchy).
- `zustand@5.0.9` – opcjonalny client state (wizardy, layouty); unikamy nadmiarowych store'ów.
- `axios@1.13.2` – HTTP klient z interceptorami JWT i retry 401.
- `tailwindcss@3.4.19`, `postcss@8.5.6`, `autoprefixer@10.4.23` – utility-first CSS.
- `tailwind-merge@3.4.0`, `clsx@2.1.1` – warunkowe klasy CSS.
- `shadcn/ui` (Radix UI 2.x) + `lucide-react@0.562.0` – komponenty dostępnościowe.
- `react-hook-form@7.69.0` + `zod@4.3.4` – formularze zgodne z backendem.
- `react-router-dom@6.30.2` – routing kliencki.
- `openapi-typescript@7.10.1` – generowanie typów z OpenAPI.

### Generowanie typów API (OpenAPI → TypeScript)

Aby zapewnić spójność typów między backendem a frontendem, wykorzystujemy automatyczne generowanie interfejsów TypeScript na podstawie schematu OpenAPI 3.1 dostarczanego przez `drf-spectacular`.

- **Narzędzie:** `openapi-typescript`
- **Proces:**
  1. Backend (uruchomiony lokalnie) udostępnia schemat pod adresem `/api/schema/`.
  2. W frontendzie uruchamiany jest skrypt, który pobiera ten schemat i generuje plik `src/api/schema.ts`.
- **Skrypt w `package.json`:**
  ```json
  "scripts": {
    "gen:api-types": "openapi-typescript ../../docs/api_spec.yaml -o src/api/schema.ts"
  }
  ```

  **UWAGA:** Obecnie typy generowane są z pliku YAML (`docs/api_spec.yaml`), a nie z live backendu. Jeśli backend jest uruchomiony i schemat dostępny pod `/api/schema/`, można użyć: `openapi-typescript http://127.0.0.1:8000/api/schema/ --output src/api/schema.ts`
- **Zależność deweloperska:** `npm install openapi-typescript --save-dev`

### Zasady dla Agenta AI frontend

- **Generowanie typów:** Przed rozpoczęciem pracy z nowym lub zmienionym endpointem, zawsze uruchom `npm run gen:api-types`, aby zaktualizować lokalne typy TypeScript. Używaj wygenerowanych typów we wszystkich hookach `react-query` i schematach `zod`.
- Komponenty wyłącznie funkcyjne (arrow functions) z typowanymi propsami/interfejsami.
- Fetching danych tylko przez `useQuery`/`useMutation`; używaj sensownych wartości `staleTime` dla różnych typów danych (słowniki: 1h, dane użytkownika: 5min).
- Tailwind mobile-first, elementy dotykowe (CTA, checkboxy) min. 48 px wysokości; klasy dynamiczne łącz przez `clsx` + `tailwind-merge`.
- Formularze korzystają z jednego źródła prawdy (schemat Zod) współdzielonego z backendowym serializerem; walidacja błędów w języku polskim (zgodnie z PRD).
- Krytyczne moduły (auth, checklisty, kalkulator zakupów) mają testy Vitest + Testing Library oraz podstawowe testy e2e (Playwright 1.40) uruchamiane przed release.

---

## 4. Baza Danych i Migracja

- **Dev:** SQLite 3.x – domyślna baza w `db.sqlite3`, wykorzystywana przy szybkim prototypowaniu.
- **Prod (planned):** PostgreSQL 16.x w kontenerze Docker.
- **Konfiguracja:** `DATABASE_URL` w `.env`. Dla lokalnych środowisk używamy `docker-compose.dev.yml` z usługami DB.
- **Optymalizacja:** Produkcyjne zapytania powinny używać `select_related`/`prefetch_related`; w selectors zapisujemy QuerySety gotowe do ponownego użycia.
- **Snapshoty:** Codzienny `pg_dump` (retencja 7/30 dni) + możliwość ręcznego snapshotu przed zmianą przepisów; pliki szyfrowane (np. `age`/`gpg`).

---

