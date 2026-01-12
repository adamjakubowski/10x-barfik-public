# UI Planning Summary - Kluczowe Decyzje Architektoniczne Frontend

Ten dokument podsumowuje kluczowe decyzje architektoniczne podjęte podczas projektowania interfejsu użytkownika aplikacji Barfik.

## Spis treści

- [Kluczowe Decyzje](#kluczowe-decyzje)
- [Przyjęte Rekomendacje](#przyjęte-rekomendacje)
- [Architektura UI](#architektura-ui)
- [Nierozwiązane Kwestie](#nierozwiązane-kwestie)

---

## Kluczowe Decyzje

### 1. Landing flow i onboarding

**Decyzja:** Rozdzielenie przepływu dla nowych i powracających użytkowników.

**Implementacja:**
- **Nowi użytkownicy:** 2-3 krokowy onboarding (Dodaj zwierzę → Stwórz dietę → Wygeneruj listę zakupów)
- **Powracający:** Bezpośrednie przekierowanie na dashboard ze zwierzętami

### 2. Nawigacja: mobile vs desktop

**Decyzja:** Różna nawigacja dla mobile i desktop, ale te same sekcje.

**Mobile (<768px):**
- Bottom tab bar (sticky, min 56px wysokości)
- 4 sekcje: Zwierzęta, Diety, Zakupy, Profil
- Ikony + labele, aktywna highlightowana primary color

**Desktop (≥768px):**
- Lewy sidebar (collapsed/expanded)
- Te same 4 sekcje + quick links (Dodaj zwierzę, Nowa dieta)
- Header z logo i user menu (Mój profil, Wyloguj)

### 3. Dashboard: karty zwierząt

**Decyzja:** Grid layout z kartami zwierząt zawierającymi kluczowe informacje i akcje.

**Struktura karty:**
- Imię (heading)
- Gatunek + waga (subheading)
- Badge z liczbą aktywnych diet
- 3 quick actions: Zobacz diety / Dodaj dietę / Udostępnij
- Hover state: data ostatniej aktualizacji

**Uwaga:** System NIE obsługuje zdjęć/avatarów zwierząt w MVP.

### 4. Widok szczegółów diety: tabbed interface

**Decyzja:** Trzy zakładki dla organizacji informacji.

**Zakładki:**
1. **Informacje** - daty (start/end), opis, prominentnie `total_daily_mass`
2. **Składniki** - nagłówek z `total_daily_mass` + "Dodaj składnik", tabela z inline CRUD
3. **Listy zakupów** - domyślnie tylko aktywne (`is_completed=false`), toggle "Pokaż ukończone"

**Tabela składników:**
- Desktop: Nazwa | Kategoria | Sposób | Ilość | Akcje
- Mobile: karty z tymi samymi danymi
- Inline edycja: kliknięcie zamienia wiersz na formularz
- Usuwanie: modal z potwierdzeniem + toast + auto-aktualizacja `total_daily_mass`

**UWAGA:** Brak autocomplete nazw składników w MVP.

### 5. Flow generowania listy zakupów

**Decyzja:** Modal/slide-over z formularzem do generowania listy.

**Formularz:**
- Tytuł listy (opcjonalny text input)
- Multi-select diet:
  - Wszystkie diety użytkownika dla wszystkich zwierząt
  - Każda pozycja: nazwa zwierzęcia + zakres dat + badge aktywna/zakończona
  - Filtrowanie po zwierzęciu
  - Default: aktywne diety zaznaczone
- `days_count` (number input, default: 7)
- Przycisk "Generuj" → automatyczne przekierowanie do widoku listy

### 6. Widok listy zakupów

**Decyzja:** Grupowanie po kategoriach z checklistą i progress tracking.

**Struktura:**
- Sticky header z:
  - Progress bar (X/Y kupione)
  - Licznik tekstowy
  - Przycisk "Oznacz jako ukończone" (PATCH endpoint)
- Sekcje kategorii (domyślnie rozwinięte)
  - Opcja "Zwiń/Rozwiń wszystkie" w headerze
- Pozycje:
  - `ingredient_name`, `total_amount` + unit
  - Checkbox `is_checked` (min 48px touch-friendly)
  - Zaznaczone pozycje: wyszarzone lub przeniesione na dół sekcji

### 7. Udostępnianie zwierząt (Collaboration)

**Decyzja:** Modal/slide-over z zarządzaniem współpracownikami.

**Sekcje:**
- **Góra:** Lista obecnych współpracowników
  - `user_email`, permission badge (READ_ONLY/EDIT)
  - Akcje: "Zmień uprawnienia" / "Usuń dostęp"
- **Dół:** Formularz dodawania
  - Email input
  - Select permission (default: READ_ONLY)
  - Przycisk "Dodaj"
  - Walidacja backend: błąd "Użytkownik nie znaleziony"

### 8. Profil użytkownika

**Decyzja:** Prosty formularz edycji danych osobowych.

**Endpoint:** `/users/me/` (GET/PATCH)

**Pola:**
- `first_name`, `last_name`
- Email (opcjonalnie z potwierdzeniem - do ustalenia)
- Przycisk "Zapisz zmiany" + toast notification

**POST-MVP:** Zmiana hasła przesunięta do kolejnej iteracji.

### 9. Formularze: walidacja i error handling

**Decyzja:** Jednolita obsługa błędów zgodna z DRF.

**Stack:**
- react-hook-form + zod
- Typy wygenerowane z OpenAPI (`npm run gen:api-types`)
- Walidacje po polsku (zgodnie z PRD)

**Error handling:**
- **Inline errors:** pod polami (ValidationError z DRF)
- **Global errors:** toast notifications (sonner z shadcn) dla `non_field_errors` i permission denied
- **Krytyczne błędy:** ErrorBoundary z CTA "Spróbuj ponownie" (401, 500)

### 10. Zarządzanie stanem: server vs client

**Decyzja:** Wyraźne rozdzielenie server state i client state.

**Server state (React Query):**
- Jedyne źródło pobierania danych (zakaz `useEffect` dla fetch)
- `staleTime` zróżnicowane:
  - Słowniki (AnimalType, Unit, IngredientCategory): **1 godzina**
  - Dane użytkownika: **5 minut**
  - Pozostałe: domyślne
- Axios z interceptorami JWT i retry 401

**Client state (Zustand):**
- Opcjonalnie dla UI state (wizardy, layout, modale)
- Unikanie nadmiarowych store'ów
- `uiStore.ts` - centralne zarządzanie modalami

### 11. UI: mobile-first i dostępność

**Decyzja:** Mobile-first z breakpointem 768px.

**Standardy:**
- Wszystkie interaktywne elementy: **min 48px**
- Spacing: **min 16px**
- Tailwind CSS 3.4.19 + shadcn/ui (Radix UI 2.x) + lucide-react
- Dynamiczne klasy: `clsx` + `tailwind-merge`

### 12. MVP: wykluczenia funkcjonalności

**Decyzja:** Usunięcie funkcjonalności zwiększających kompleksność MVP.

**Wykluczone:**
- **Offline/PWA:** Brak service workers, IndexedDB, ETag headers - aplikacja wymaga połączenia internetowego
- **Widok "w kuchni":** Instrukcje krok po kroku przesunięte do POST-MVP
- **Reset hasła przez email:** Przesunięte do POST-MVP
- **Autocomplete nazw składników:** Prosty text input w MVP
- **Zdjęcia/avatary zwierząt:** Uproszczenie bezpieczeństwa i UX

---

## Przyjęte Rekomendacje

### Integracja API i typy

1. **openapi-typescript** - generowanie typów (`npm run gen:api-types → src/api/schema.ts`)
2. **React Query** - jedyne źródło danych sieciowych, `staleTime` per typ danych
3. **axios + interceptory** - JWT, retry 401
4. **react-hook-form + zod** - walidacje z typami z OpenAPI

### Architektura komponentów

1. **Mobile-first layout** - breakpoint 768px, touch-friendly (min 48px), spacing ≥16px
2. **shadcn/ui + Radix UI 2.x** - komponenty dostępnościowe (ARIA, keyboard navigation)
3. **Tailwind CSS 3.4.19** - utility-first, `clsx` + `tailwind-merge` dla dynamicznych klas
4. **lucide-react** - ikony outline

### Error handling i monitoring

1. **ErrorBoundary** - przechwytywanie błędów renderowania
2. **Inline errors** - pod polami (DRF ValidationError)
3. **Toast notifications** - globalne błędy (sonner z shadcn)
4. **Sentry** - monitoring produkcji (@sentry/react + @sentry/vite-plugin)

### Brak offline w MVP

1. **Usunięte:** service workers, vite-plugin-pwa, Workbox
2. **Usunięte:** IndexedDB cache, ETag/Last-Modified headers
3. **Wymagane:** Połączenie internetowe dla pełnej funkcjonalności

---

## Architektura UI

### Stack technologiczny (aktualne wersje)

| Kategoria | Technologia | Wersja |
|-----------|-------------|--------|
| **Runtime** | Node.js LTS | 24.12.0 |
| **Build tool** | Vite | 7.2.4 |
| **Framework** | React | 19.2.0 |
| **Language** | TypeScript | 5.9.3 |
| **Styling** | Tailwind CSS | 3.4.19 |
| **State (server)** | @tanstack/react-query | 5.90.16 |
| **State (client)** | zustand | 5.0.9 |
| **Formularze** | react-hook-form | 7.69.0 |
| **Walidacja** | zod | 4.3.4 |
| **HTTP client** | axios | 1.13.2 |
| **Komponenty** | shadcn/ui + Radix UI | 2.x |
| **Ikony** | lucide-react | 0.562.0 |
| **Routing** | react-router-dom | 6.30.2 |
| **Type gen** | openapi-typescript | 7.10.1 |
| **Testing** | Vitest + @testing-library/react | - |
| **E2E** | Playwright | 1.40 |
| **Monitoring** | @sentry/react | - |

### Struktura projektu frontend

```
frontend/src/
├── api/
│   ├── client.ts         # axios config, interceptors
│   ├── schema.ts         # auto-generated from OpenAPI (npm run gen:api-types)
│   ├── services.ts       # API calls per resource
│   └── types.ts          # shared API types
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # Topbar, etc.
│   ├── navigation/       # Sidebar, BottomNav
│   ├── ErrorBoundary.tsx
│   └── ModalManager.tsx  # Centralny rejestr modalów
├── hooks/
│   ├── useAuth.ts        # auth hook
│   ├── useAnimals.ts     # React Query hooks
│   └── useDiets.ts
├── store/
│   └── uiStore.ts        # Zustand UI state (modale)
├── lib/
│   ├── queryClient.ts    # QueryClient config
│   └── utils.ts          # cn() helper (clsx + tailwind-merge)
├── modals/               # Dialog components
├── sections/             # Page sections (Dashboard, Animals, etc.)
├── pages/                # Route pages
└── auth/
    └── AuthContext.tsx   # Auth provider
```

### Przepływy użytkownika

**Onboarding (nowi użytkownicy):**
```
Rejestracja → Logowanie → Krok 1: Dodaj zwierzę → Krok 2: Stwórz dietę → Krok 3: Wygeneruj listę zakupów → Dashboard
```

**Powracający użytkownicy:**
```
Logowanie → Dashboard
```

**Happy Path (MVP E2E):**
```
Rejestracja/Logowanie → Dodaj zwierzę → Utwórz dietę → Dodaj składniki → Generuj listę zakupów → Odhaczaj pozycje → Oznacz jako ukończone
```

### Widoki i funkcje

| Widok | Funkcjonalność | Status |
|-------|----------------|--------|
| **Dashboard** | Statystyki, wymagające uwagi, szybkie akcje | MVP |
| **Animals** | CRUD zwierząt, karty w grid | MVP |
| **Diets** | CRUD diet, tabbed UI (info/składniki/listy) | MVP |
| **Ingredients** | Inline CRUD w tabeli, auto-aktualizacja `total_daily_mass` | MVP |
| **Shopping Lists** | Generowanie, grupowanie po kategoriach, checklist | MVP |
| **Collaboration** | Zarządzanie współpracownikami, uprawnienia READ_ONLY/EDIT | MVP |
| **Profile** | Edycja danych osobowych (first_name, last_name, email) | MVP |
| **Reset hasła** | Email z linkiem resetującym | POST-MVP |
| **Widok "w kuchni"** | Instrukcje krok po kroku | POST-MVP |

---

## Nierozwiązane Kwestie

### 1. Copy i assety onboardingowe

**Status:** Nie ustalone

**Opis:** Szczegóły dotyczące:
- Teksty slajdów onboardingu
- Ilustracje/grafiki
- Kolorystyka/temat (primary color, paleta) - obecnie podstawowa z ui-guidelines.md

**Akcja:** Ustalić z właścicielem produktu przed implementacją onboardingu

### 2. Filtrowanie i sortowanie list

**Status:** Nie ustalone

**Opis:** Dokładne reguły:
- Kolejność kart zwierząt na dashboardzie (alfabetycznie? data utworzenia?)
- Domyślne sortowanie diet w widoku zwierzęcia (data startu desc?)
- Filtrowanie składników w widoku diety (po kategorii?)

**Akcja:** Określić domyślne sortowanie przy implementacji każdego widoku

### 3. Retry policy dla mutacji

**Status:** Nie określono

**Opis:** Polityka retry dla mutacji innych niż 401:
- Czy próbować ponownie przy 500?
- Ile razy retry?
- Jaki backoff?

**Akcja:** Ustalić strategię przy konfiguracji axios interceptorów

---

## Zobacz również

- **[ui-guidelines.md](ui-guidelines.md)** - design system, kolorystyka, typografia, komponenty bazowe
- **[techstack.md](techstack.md)** - szczegółowe wersje bibliotek i konfiguracja
- **[prd.md](prd.md)** - wymagania funkcjonalne (user stories FR.*)
- **[api-plan.md](api-plan.md)** - endpointy REST API wykorzystywane przez frontend
- **[copilot-instructions.md](../.github/copilot-instructions.md)** - wzorce frontendowe (path aliases, state management)
