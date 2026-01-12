import { test, expect } from '../fixtures/test-fixtures';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Testy E2E dla modułu Diety
 *
 * Przepisane od nowa dla stabilności i czytelności
 */

test.describe('Diets - Complete Flow', () => {
  /**
   * Reset bazy danych przed każdym testem
   */
  test.beforeEach(async () => {
    console.log('🔄 Resetowanie bazy danych...');

    try {
      const { stdout } = await execAsync(
        'cd /Users/ajakubowski/projects/priv/barfik/backend/src && ../../.venv/bin/python manage.py prepare_e2e_tests'
      );
      console.log(stdout);
    } catch (error: any) {
      console.error('❌ Błąd resetu bazy:', error.message);
      throw error;
    }
  });

  /**
   * Test 1: Podstawowy przepływ - dodanie zwierzęcia i diety
   */
  test('should add animal and diet successfully', async ({
    page,
    loginPage,
    animalsPage,
    dietsPage,
    apiHelper
  }) => {
    // ===== KROK 1: Logowanie =====
    await loginPage.goto();
    await loginPage.login('e2e@test.pl', 'TestPass123!');
    await page.waitForURL('/dashboard');
    console.log('✓ Zalogowano pomyślnie');

    // ===== KROK 2: Dodanie zwierzęcia =====
    await animalsPage.goto();
    await animalsPage.openAddModal();

    await animalsPage.fillAnimalForm({
      name: 'Burek',
      speciesId: 1,
      weightKg: '25',
    });

    await animalsPage.submitAnimalForm();
    console.log('✓ Formularz zwierzęcia wysłany');

    // Czekaj na pojawienie się zwierzęcia
    await page.waitForTimeout(1500);
    const animalExists = await animalsPage.verifyAnimalExists('Burek');
    expect(animalExists).toBeTruthy();
    console.log('✓ Zwierzę Burek widoczne na liście');

    // ===== KROK 3: Pobranie ID zwierzęcia przez API =====
    await apiHelper.login('e2e@test.pl', 'TestPass123!');
    const animals = await apiHelper.getAnimals();
    const burek = animals.find(a => a.name === 'Burek');

    expect(burek).toBeDefined();
    console.log(`✓ Pobrano ID zwierzęcia: ${burek!.id}`);

    // ===== KROK 4: Dodanie diety =====
    await dietsPage.goto();

    // Sprawdź początkowy stan
    const initialCount = await dietsPage.getDietsCount();
    expect(initialCount).toBe(0);
    console.log('✓ Lista diet jest pusta');

    // Otwórz modal
    await dietsPage.openAddModal();

    // Przygotuj daty
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const endDate = nextMonth.toISOString().split('T')[0];

    // Wypełnij formularz
    await dietsPage.fillDietForm({
      animalId: burek!.id,
      startDate: today,
      endDate: endDate,
      description: 'Dieta BARF dla psa',
    });

    // Wyślij formularz
    await dietsPage.submitDietForm();
    console.log('✓ Formularz diety wysłany');
    await page.waitForTimeout(500);
    // Po utworzeniu diety otwiera się modal szczegółów - zamknij go klikając X
    await page.locator('[data-testid="dialog-close-button"]').click();
    await page.waitForTimeout(500);
    console.log('✓ Zamknięto modal szczegółów diety');

    // ===== KROK 5: Weryfikacja =====
    const dietExists = await dietsPage.verifyDietExists('Dieta BARF dla psa');
    expect(dietExists).toBeTruthy();
    console.log('✓ Dieta widoczna na liście');

    const finalCount = await dietsPage.getDietsCount();
    expect(finalCount).toBe(1);
    console.log('✓ Liczba diet: 1');

    // Weryfikacja przez API
    const diets = await apiHelper.getDiets();
    expect(diets.length).toBe(1);
    expect(diets[0].description).toBe('Dieta BARF dla psa');
    console.log('✓ Dieta zweryfikowana przez API');
  });

  /**
   * Test 2: Dieta z otwartym końcem (bez end_date)
   */
  test('should add diet with open end date', async ({
    page,
    loginPage,
    animalsPage,
    dietsPage,
    apiHelper
  }) => {
    // Logowanie
    await loginPage.goto();
    await loginPage.login('e2e@test.pl', 'TestPass123!');
    await page.waitForURL('/dashboard');

    // Dodaj zwierzę
    await animalsPage.goto();
    await animalsPage.openAddModal();
    await animalsPage.fillAnimalForm({
      name: 'Azor',
      speciesId: 1,
      weightKg: '15',
    });
    await animalsPage.submitAnimalForm();

    await page.waitForTimeout(1500);
    expect(await animalsPage.verifyAnimalExists('Azor')).toBeTruthy();

    // Pobierz ID zwierzęcia
    await apiHelper.login('e2e@test.pl', 'TestPass123!');
    const animals = await apiHelper.getAnimals();
    const azor = animals.find(a => a.name === 'Azor');
    expect(azor).toBeDefined();

    // Dodaj dietę bez end_date
    await dietsPage.goto();
    await dietsPage.openAddModal();

    const today = new Date().toISOString().split('T')[0];

    await dietsPage.fillDietForm({
      animalId: azor!.id,
      startDate: today,
      // Brak endDate - dieta otwarta
      description: 'Dieta długoterminowa',
    });

    await dietsPage.submitDietForm();
    await page.waitForTimeout(500);

    // Po utworzeniu diety otwiera się modal szczegółów - zamknij go klikając X
    await page.locator('[data-testid="dialog-close-button"]').click();
    await page.waitForTimeout(500);
    console.log('✓ Zamknięto modal szczegółów diety');

    // Weryfikacja
    const dietExists = await dietsPage.verifyDietExists('Dieta długoterminowa');
    expect(dietExists).toBeTruthy();

    // Weryfikacja przez API że end_date jest null
    const diets = await apiHelper.getDiets();
    const openDiet = diets.find(d => d.description === 'Dieta długoterminowa');
    expect(openDiet).toBeDefined();
    expect(openDiet?.end_date).toBeNull();
    console.log('✓ Dieta z otwartym końcem utworzona poprawnie');
  });

  /**
   * Test 3: Wiele diet dla jednego zwierzęcia
   */
  test('should add multiple diets for one animal', async ({
    page,
    loginPage,
    animalsPage,
    dietsPage,
    apiHelper
  }) => {
    // Logowanie
    await loginPage.goto();
    await loginPage.login('e2e@test.pl', 'TestPass123!');
    await page.waitForURL('/dashboard');

    // Dodaj zwierzę
    await animalsPage.goto();
    await animalsPage.openAddModal();
    await animalsPage.fillAnimalForm({
      name: 'Fafik',
      speciesId: 1,
      weightKg: '30',
    });
    await animalsPage.submitAnimalForm();

    await page.waitForTimeout(1500);
    expect(await animalsPage.verifyAnimalExists('Fafik')).toBeTruthy();

    // Pobierz ID zwierzęcia
    await apiHelper.login('e2e@test.pl', 'TestPass123!');
    const animals = await apiHelper.getAnimals();
    const fafik = animals.find(a => a.name === 'Fafik');
    expect(fafik).toBeDefined();

    // Przejdź do diet
    await dietsPage.goto();

    // === Dieta 1 ===
    await dietsPage.openAddModal();
    await dietsPage.fillDietForm({
      animalId: fafik!.id,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      description: 'Dieta zimowa',
    });
    await dietsPage.submitDietForm();
    await page.waitForTimeout(500);

    // Po utworzeniu diety otwiera się modal szczegółów - zamknij go klikając X
    await page.locator('[data-testid="dialog-close-button"]').click();
    await page.waitForTimeout(500);
    console.log('✓ Zamknięto modal szczegółów diety 1');

    expect(await dietsPage.verifyDietExists('Dieta zimowa')).toBeTruthy();
    console.log('✓ Dieta 1 dodana');

    // === Dieta 2 ===
    await dietsPage.openAddModal();
    await dietsPage.fillDietForm({
      animalId: fafik!.id,
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      description: 'Dieta wiosenna',
    });
    await dietsPage.submitDietForm();
    await page.waitForTimeout(500);

    // Po utworzeniu diety otwiera się modal szczegółów - zamknij go klikając X
    await page.locator('[data-testid="dialog-close-button"]').click();
    await page.waitForTimeout(500);
    console.log('✓ Zamknięto modal szczegółów diety 2');

    expect(await dietsPage.verifyDietExists('Dieta wiosenna')).toBeTruthy();
    console.log('✓ Dieta 2 dodana');

    // Weryfikacja liczby diet
    const count = await dietsPage.getDietsCount();
    expect(count).toBe(2);

    // Weryfikacja przez API
    const diets = await apiHelper.getDiets(fafik!.id);
    expect(diets.length).toBe(2);
    console.log('✓ Obie diety zweryfikowane');
  });

  /**
   * Test 4: Walidacja - start_date > end_date
   */
  test('should show validation error for invalid date range', async ({
    page,
    loginPage,
    animalsPage,
    dietsPage,
    apiHelper
  }) => {
    // Logowanie
    await loginPage.goto();
    await loginPage.login('e2e@test.pl', 'TestPass123!');
    await page.waitForURL('/dashboard');

    // Dodaj zwierzę
    await animalsPage.goto();
    await animalsPage.openAddModal();
    await animalsPage.fillAnimalForm({
      name: 'Tester',
      speciesId: 1,
      weightKg: '20',
    });
    await animalsPage.submitAnimalForm();

    await page.waitForTimeout(1500);
    expect(await animalsPage.verifyAnimalExists('Tester')).toBeTruthy();

    // Pobierz ID zwierzęcia
    await apiHelper.login('e2e@test.pl', 'TestPass123!');
    const animals = await apiHelper.getAnimals();
    const tester = animals.find(a => a.name === 'Tester');
    expect(tester).toBeDefined();

    // Przejdź do diet i otwórz modal
    await dietsPage.goto();
    await dietsPage.openAddModal();

    // Wypełnij z nieprawidłowym zakresem dat
    await dietsPage.fillDietForm({
      animalId: tester!.id,
      startDate: '2026-02-01',
      endDate: '2026-01-01', // Wcześniejsza niż start!
      description: 'Nieprawidłowa dieta',
    });

    // Kliknij przycisk submit (bez czekania na zamknięcie)
    await page.click('[data-testid="diet-submit-button"]');

    // Poczekaj na walidację
    await page.waitForTimeout(800);

    // Sprawdź komunikat błędu
    const errorMessage = await dietsPage.getEndDateValidationError();
    expect(errorMessage).toBe('Data zakończenia nie może być wcześniejsza niż data startu');
    console.log('✓ Komunikat walidacji pojawił się poprawnie');

    // Modal powinien pozostać otwarty
    const modalOpen = await dietsPage.isModalOpen();
    expect(modalOpen).toBeTruthy();
    console.log('✓ Modal pozostał otwarty');

    // Weryfikacja że dieta NIE została utworzona
    const diets = await apiHelper.getDiets();
    const invalidDiet = diets.find(d => d.description === 'Nieprawidłowa dieta');
    expect(invalidDiet).toBeUndefined();
    console.log('✓ Dieta nie została utworzona w bazie');
  });

  /**
   * Test 5: Sprawdzenie pustej listy diet
   */
  test('should show empty state when no diets exist', async ({
    page,
    loginPage,
    dietsPage
  }) => {
    await loginPage.goto();
    await loginPage.login('e2e@test.pl', 'TestPass123!');
    await page.waitForURL('/dashboard');

    await dietsPage.goto();

    const count = await dietsPage.getDietsCount();
    expect(count).toBe(0);
    console.log('✓ Lista diet jest pusta po resecie bazy');
  });
});
