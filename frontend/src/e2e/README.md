# Testy E2E Playwright - Barfik

## 📋 Przegląd

Testy End-to-End dla aplikacji Barfik używające Playwright. Testujemy krytyczne ścieżki użytkownika w realnym środowisku (backend + frontend).

## 🚀 Uruchomienie testów

### Wymagania wstępne

1. **Backend musi być uruchomiony** na `http://127.0.0.1:8000`
   ```bash
   cd backend/src
   source ../../.venv/bin/activate
   python manage.py runserver
   ```

2. **Frontend dev server** zostanie uruchomiony automatycznie przez Playwright

### Komendy testowe

```bash
cd frontend/src

# Uruchom wszystkie testy E2E (headless)
npm run test:e2e

# Uruchom w trybie UI (interaktywny)
npm run test:e2e:ui

# Uruchom z widoczną przeglądarką (headed)
npm run test:e2e:headed

# Debug pojedynczego testu
npm run test:e2e:debug

# Pokaż raport HTML z ostatniego uruchomienia
npm run test:e2e:report
```

### Uruchomienie konkretnych testów

```bash
# Tylko testy zwierząt
npx playwright test animals.spec.ts

# Tylko testy diet
npx playwright test diets.spec.ts

# Konkretny test po nazwie
npx playwright test -g "should login, add animal"
```

## 🏗️ Architektura testów

### Struktura katalogów

```
frontend/src/e2e/
├── fixtures/
│   └── test-fixtures.ts      # Custom fixtures (auth, API helper)
├── pages/
│   ├── LoginPage.ts           # Page Object Model dla logowania
│   ├── AnimalsPage.ts         # POM dla zwierząt
│   └── DietsPage.ts           # POM dla diet
├── tests/
│   ├── animals.spec.ts        # Testy CRUD zwierząt
│   └── diets.spec.ts          # Testy CRUD diet
└── utils/
    └── api-helpers.ts         # Helper do zarządzania danymi przez API
```

### Wzorce implementacyjne

#### 1. **Reset bazy przed całym suite** (`beforeAll`)

Każdy suite testowy (`animals.spec.ts`, `diets.spec.ts`) resetuje bazę danych raz przed wszystkimi testami:

```typescript
test.beforeAll(async () => {
  await execAsync('cd ../../backend/src && python manage.py prepare_e2e_tests');
});
```

**Komenda Django:** `prepare_e2e_tests`
- Usuwa wszystkie dane użytkowników (animals, diets, shopping lists)
- Zachowuje słowniki (AnimalType, Unit, IngredientCategory)
- Tworzy testowego użytkownika: `e2e@test.pl` / `TestPass123!`

#### 2. **Login przed każdym testem** (`beforeEach`)

Każdy test loguje się na początku używając Page Object Model:

```typescript
test('test description', async ({ page, loginPage, animalsPage }) => {
  await loginPage.goto();
  await loginPage.login('e2e@test.pl', 'TestPass123!');
  
  // ... test logic
});
```

Alternatywnie można użyć `authenticatedPage` fixture:

```typescript
test('test description', async ({ authenticatedPage, animalsPage }) => {
  // authenticatedPage jest już zalogowany
  await animalsPage.goto();
  // ... test logic
});
```

#### 3. **data-testid dla selektorów**

Wszystkie kluczowe elementy mają stabilne selektory `data-testid`:

**Login:**
- `[data-testid="login-email"]`
- `[data-testid="login-password"]`
- `[data-testid="login-submit"]`
- `[data-testid="login-error"]`
- `[data-testid="user-menu-button"]`
- `[data-testid="logout-button"]`

**Animals:**
- `[data-testid="add-animal-button"]`
- `[data-testid="animal-modal"]`
- `[data-testid="animal-name-input"]`
- `[data-testid="animal-species-select"]`
- `[data-testid="species-option-{id}"]`
- `[data-testid="animal-date-input"]`
- `[data-testid="animal-weight-input"]`
- `[data-testid="animal-note-input"]`
- `[data-testid="animal-submit-button"]`
- `[data-testid="animal-modal-close"]`
- `[data-testid="animal-card-{name}"]`
- `[data-testid="animal-diets-button-{name}"]`

**Diets:**
- `[data-testid="add-diet-button"]`
- `[data-testid="diet-modal"]`
- `[data-testid="diet-animal-select"]`
- `[data-testid="animal-option-{id}"]`
- `[data-testid="diet-start-date-input"]`
- `[data-testid="diet-end-date-input"]`
- `[data-testid="diet-description-input"]`
- `[data-testid="diet-submit-button"]`
- `[data-testid="diet-modal-close"]`
- `[data-testid="diet-card"]` (z atrybutami `data-start`, `data-end`)

## 📝 Page Object Models

### LoginPage

```typescript
const loginPage = new LoginPage(page);

await loginPage.goto();                          // Nawigacja do /login
await loginPage.login(email, password);          // Logowanie
await loginPage.logout();                        // Wylogowanie
const isLoggedIn = await loginPage.isLoggedIn(); // Sprawdzenie statusu
```

### AnimalsPage

```typescript
const animalsPage = new AnimalsPage(page);

await animalsPage.goto();                        // Nawigacja do /zwierzeta
await animalsPage.openAddModal();                // Otwórz modal dodawania
await animalsPage.fillAnimalForm({               // Wypełnij formularz
  name: 'Rex',
  speciesId: 1,
  dateOfBirth: '2020-05-15',
  weightKg: '25.5',
  note: 'Labrador'
});
await animalsPage.submitAnimalForm();            // Zapisz
const exists = await animalsPage.verifyAnimalExists('Rex'); // Sprawdź istnienie
const count = await animalsPage.getAnimalsCount();          // Liczba zwierząt
```

### DietsPage

```typescript
const dietsPage = new DietsPage(page);

await dietsPage.goto();                          // Nawigacja do /diety
await dietsPage.gotoAnimalDiets(animalId);      // Diety konkretnego zwierzęcia
await dietsPage.openAddModal();                  // Otwórz modal
await dietsPage.fillDietForm({                   // Wypełnij formularz
  animalId: 1,                                   // Opcjonalne jeśli w kontekście zwierzęcia
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  description: 'Dieta testowa'
});
await dietsPage.submitDietForm();                // Zapisz
const exists = await dietsPage.verifyDietExists('Dieta testowa');
const count = await dietsPage.getDietsCount();
```

## 🛠️ API Helpers

Do szybkiego setupu danych (zamiast klikania przez UI):

```typescript
import { createApiHelper } from '../utils/api-helpers';

const apiHelper = createApiHelper();

// Login
await apiHelper.login('e2e@test.pl', 'TestPass123!');

// Utwórz zwierzę przez API (szybsze niż UI)
const animal = await apiHelper.createAnimal({
  name: 'Max',
  speciesId: 1,
  weightKg: 28
});

// Utwórz dietę
const diet = await apiHelper.createDiet({
  animalId: animal.id,
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  description: 'Test diet'
});

// Pobierz słowniki
const { animalTypes, units, ingredientCategories } = await apiHelper.getDictionaries();

// Cleanup (usuń dane testowe)
await apiHelper.cleanupAllData();
```

## 📊 Scenariusze testowe

### Animals Suite

1. **Basic flow:** Login → Add animal → Verify exists → Logout
2. **Multiple animals:** Dodanie wielu zwierząt (pies + kot)
3. **Validation:** Puste pole nazwa → błąd walidacji

### Diets Suite

1. **Basic flow:** Login → Add animal (API) → Add diet → Verify exists
2. **Open-ended diet:** Dieta bez `end_date` (otwarta)
3. **Multiple diets:** Wiele diet dla jednego zwierzęcia
4. **Validation:** `start_date > end_date` → błąd walidacji

## 🐛 Debugowanie

### Playwright Inspector

```bash
npm run test:e2e:debug
```

Pozwala:
- Krokować przez test
- Podglądać selektory na stronie
- Sprawdzać DOM w czasie rzeczywistym

### Traces i Screenshots

Po nieudanym teście sprawdź:
```bash
npm run test:e2e:report
```

Raport HTML zawiera:
- Screenshots z momentu błędu
- Trace (nagranie sesji)
- Logi konsoli i network requests

### Verbose logging

```bash
DEBUG=pw:api npx playwright test
```

## ⚙️ Konfiguracja (playwright.config.ts)

```typescript
- testDir: './e2e/tests'
- baseURL: 'http://localhost:5173'
- timeout: 30s per test
- retries: 0 (local), 2 (CI)
- workers: parallel=false (sekwencyjnie dla stabilności)
- projects: chromium, firefox
- webServer: auto-start Vite dev server
```

## 🚨 Problemy i rozwiązania

### Problem: Backend nie działa na :8000

**Rozwiązanie:**
```bash
cd backend/src
source ../../.venv/bin/activate
python manage.py runserver
```

### Problem: Timeout podczas logowania

**Przyczyna:** Frontend próbuje połączyć się z API ale backend nie odpowiada.

**Rozwiązanie:** Sprawdź czy backend działa i CORS jest poprawnie skonfigurowany:
```python
# backend/src/barfik_backend/settings.py
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
```

### Problem: "animal-card-Rex" not found

**Przyczyna:** React Query nie zdążyło załadować danych lub name zawiera whitespace.

**Rozwiązanie:** 
1. Dodaj `await page.waitForLoadState('networkidle')` przed weryfikacją
2. Sprawdź czy `data-testid` używa dokładnie tej samej nazwy (case-sensitive)

### Problem: Modal nie otwiera się

**Przyczyna:** Zustand store nie zaktualizował stanu lub komponent nie ma data-testid.

**Rozwiązanie:**
1. Sprawdź czy przycisk ma `data-testid="add-animal-button"`
2. Dodaj wait: `await page.waitForSelector('[data-testid="animal-modal"]', { state: 'visible' })`

## 📖 Dalsze kroki

### Rozbudowa testów (TODO)

- [ ] Testy dla Dashboard (statystyki, wymagające uwagi)
- [ ] Testy dla Shopping Lists (generowanie, checklist)
- [ ] Testy dla Collaborations (udostępnianie zwierząt)
- [ ] Testy permissions (READ_ONLY vs EDIT)
- [ ] Testy walidacji formularzy (więcej edge cases)
- [ ] Testy responsywności (mobile viewport)
- [ ] Visual regression testing (Percy/Chromatic)

### CI/CD Integration

Dodaj do `.github/workflows/e2e.yml`:
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.13'
      - uses: actions/setup-node@v3
        with:
          node-version: '24'
      - name: Start backend
        run: |
          cd backend/src
          pip install -r ../requirements.txt
          python manage.py migrate
          python manage.py prepare_e2e_tests
          python manage.py runserver &
      - name: Run E2E tests
        run: |
          cd frontend/src
          npm install
          npm run test:e2e
```

## 📚 Dokumentacja

- [Playwright Docs](https://playwright.dev/docs/intro)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging](https://playwright.dev/docs/debug)

---

**Autor:** Barfik Team  
**Data:** 2026-01-05  
**Wersja:** 1.0.0
