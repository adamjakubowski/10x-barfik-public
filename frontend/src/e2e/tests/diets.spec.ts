import { test, expect } from '../fixtures/test-fixtures';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Testy E2E dla modułu Diety
 * 
 * Scenariusz: Login -> Add diet for animal -> Check if diet exists
 */

test.describe('Diets - Basic Flow', () => {
  /**
   * Reset bazy danych przed całym suite (beforeAll)
   */
  test.beforeEach(async () => {
    console.log('🔄 Resetowanie bazy danych dla testów diet...');
    
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
   * Test 1: Login -> Add animal (UI) -> Add diet (UI) -> Verify diet exists
   */
  test('should login, add animal with diet, and verify diet exists', async ({ 
    page,
    loginPage, 
    animalsPage, 
    dietsPage,
    apiHelper 
  }) => {
    // 1. Login
    await loginPage.goto();
    await loginPage.login('e2e@test.pl', 'TestPass123!');
    
    // 2. Dodaj zwierzę przez UI
    await animalsPage.goto();
    await animalsPage.openAddModal();
    await animalsPage.fillAnimalForm({
      name: 'Max',
      speciesId: 1, // Pies
      weightKg: '28',
    });
    await animalsPage.submitAnimalForm();
    
    // Poczekaj na odświeżenie cache i pojawienie się zwierzęcia
    await page.waitForTimeout(1500);
    
    // Weryfikacja że zwierzę zostało utworzone
    const animalExists = await animalsPage.verifyAnimalExists('Max');
    expect(animalExists).toBeTruthy();
    
    console.log('✓ Zwierzę utworzone przez UI: Max');
    
    // Pobierz ID zwierzęcia przez API (do użycia w formularzu diety)
    await apiHelper.login('e2e@test.pl', 'TestPass123!');
    const animals = await apiHelper.getAnimals();
    const maxAnimal = animals.find(a => a.name === 'Max');
    expect(maxAnimal).toBeDefined();
    
    // 3. Nawigacja do sekcji diet
    await dietsPage.goto();
    
    // Sprawdź początkową liczbę diet (powinna być 0)
    const initialCount = await dietsPage.getDietsCount();
    expect(initialCount).toBe(0);
    
    // 4. Dodaj nową dietę przez UI
    await dietsPage.openAddModal();
    
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const endDate = nextMonth.toISOString().split('T')[0];
    
    await dietsPage.fillDietForm({
      animalId: maxAnimal!.id,
      startDate: today,
      endDate: endDate,
      description: 'Dieta testowa BARF',
    });
    
    await dietsPage.submitDietForm();
    
    // 5. Sprawdź czy dieta istnieje
    const dietExists = await dietsPage.verifyDietExists('Dieta testowa BARF');
    expect(dietExists).toBeTruthy();
    
    // Sprawdź czy liczba diet wzrosła
    const finalCount = await dietsPage.getDietsCount();
    expect(finalCount).toBe(initialCount + 1);
    
    // 6. Opcjonalnie: weryfikacja przez API
    const diets = await apiHelper.getDiets();
    expect(diets.length).toBeGreaterThan(0);
  });

  /**
   * Test 2: Dodanie diety z otwartym końcem (end_date = null)
   */
  test('should add diet with open end date', async ({ 
    page,
    loginPage,
    animalsPage, 
    dietsPage,
    apiHelper 
  }) => {
    // Login
    await loginPage.goto();
    await loginPage.login('e2e@test.pl', 'TestPass123!');
    
    // Dodaj zwierzę przez UI
    await animalsPage.goto();
    await animalsPage.openAddModal();
    await animalsPage.fillAnimalForm({
      name: 'Luna',
      speciesId: 1, // pies
      weightKg: '4.2',
    });
    await animalsPage.submitAnimalForm();
    
    // Poczekaj na odświeżenie cache i pojawienie się zwierzęcia
    await page.waitForTimeout(1500);
    
    // Weryfikacja
    expect(await animalsPage.verifyAnimalExists('Luna')).toBeTruthy();
    console.log('✓ Zwierzę utworzone przez UI: Luna');
    
    // Pobierz ID zwierzęcia przez API
    await apiHelper.login('e2e@test.pl', 'TestPass123!');
    const animals = await apiHelper.getAnimals();
    const lunaAnimal = animals.find(a => a.name === 'Luna');
    expect(lunaAnimal).toBeDefined();
    
    // Nawigacja do diet
    await dietsPage.goto();
    
    // Dodaj dietę bez end_date przez UI
    await dietsPage.openAddModal();
    
    const today = new Date().toISOString().split('T')[0];
    
    await dietsPage.fillDietForm({
      animalId: lunaAnimal!.id,
      startDate: today,
      // Brak endDate - dieta otwarta
      description: 'Dieta otwarta',
    });
    
    await dietsPage.submitDietForm();
    
    // Verify przez UI
    const dietExists = await dietsPage.verifyDietExists('Dieta otwarta');
    expect(dietExists).toBeTruthy();
    
    // Opcjonalna weryfikacja przez API (już zalogowani wcześniej)
    const diets = await apiHelper.getDiets();
    const openDiet = diets.find(d => d.description === 'Dieta otwarta');
    expect(openDiet).toBeDefined();
    expect(openDiet?.end_date).toBeNull();
  });

  /**
   * Test 3: Dodanie wielu diet dla jednego zwierzęcia
   */
  test('should add multiple diets for one animal', async ({ 
    page,
    loginPage,
    animalsPage, 
    dietsPage,
    apiHelper 
  }) => {
    await loginPage.goto();
    await loginPage.login('e2e@test.pl', 'TestPass123!');
    
    // Dodaj zwierzę przez UI
    await animalsPage.goto();
    await animalsPage.openAddModal();
    await animalsPage.fillAnimalForm({
      name: 'Reksio',
      speciesId: 1, // Pies
      weightKg: '22',
    });
    await animalsPage.submitAnimalForm();
    
    // Poczekaj na odświeżenie cache i pojawienie się zwierzęcia
    await page.waitForTimeout(1500);
    
    // Weryfikacja
    const reksioExists = await animalsPage.verifyAnimalExists('Reksio');
    expect(reksioExists).toBeTruthy();
    console.log('✓ Zwierzę utworzone przez UI: Reksio');
    
    // Pobierz ID zwierzęcia przez API
    await apiHelper.login('e2e@test.pl', 'TestPass123!');
    const animals = await apiHelper.getAnimals();
    const reksioAnimal = animals.find(a => a.name === 'Reksio');
    expect(reksioAnimal).toBeDefined();
    
    await dietsPage.goto();
    
    // Upewnij się że żaden modal nie jest otwarty z poprzednich operacji
    const modalVisible = await page.locator('[data-testid="diet-modal"]').isVisible().catch(() => false);
    if (modalVisible) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }
    
    // Dieta 1: Styczeń
    await dietsPage.openAddModal();
    await dietsPage.fillDietForm({
      animalId: reksioAnimal!.id,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      description: 'Dieta styczeń',
    });
    await dietsPage.submitDietForm();
    
 // 5. Sprawdź czy dieta istnieje
    const dietExists = await dietsPage.verifyDietExists('Dieta styczeń');
    expect(dietExists).toBeTruthy();


    
    // Dieta 2: Luty
    await dietsPage.openAddModal();
    await dietsPage.fillDietForm({
      animalId: reksioAnimal!.id,
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      description: 'Dieta luty',
    });
    await dietsPage.submitDietForm();
    
    // Verify both przez UI

    expect(await dietsPage.verifyDietExists('Dieta luty')).toBeTruthy();
    
    const count = await dietsPage.getDietsCount();
    expect(count).toBe(2);
    
    // Opcjonalna weryfikacja przez API
    const diets = await apiHelper.getDiets(reksioAnimal!.id);
    expect(diets.length).toBe(2);
  });

  /**
   * Test 4: Walidacja - start_date > end_date
   */
  test('should show validation error when start date is after end date', async ({ 
    page,
    loginPage,
    animalsPage, 
    dietsPage,
    apiHelper 
  }) => {
    await loginPage.goto();
    await loginPage.login('e2e@test.pl', 'TestPass123!');
    
    // Dodaj zwierzę przez UI
    await animalsPage.goto();
    await animalsPage.openAddModal();
    await animalsPage.fillAnimalForm({
      name: 'Validacja',
      speciesId: 1, // Pies
       weightKg: '22',
    });
    await animalsPage.submitAnimalForm();
    
    // Poczekaj na odświeżenie cache i pojawienie się zwierzęcia
    await page.waitForTimeout(1500);
    
    // Weryfikacja
    expect(await animalsPage.verifyAnimalExists('Validacja')).toBeTruthy();
    console.log('✓ Zwierzę utworzone przez UI: Validacja');
    
    // Pobierz ID zwierzęcia przez API
    await apiHelper.login('e2e@test.pl', 'TestPass123!');
    const animals = await apiHelper.getAnimals();
    const validacjaAnimal = animals.find(a => a.name === 'Validacja');
    expect(validacjaAnimal).toBeDefined();
    
    await dietsPage.goto();
    
    await dietsPage.openAddModal();
    
    // Nieprawidłowy zakres dat
    await dietsPage.fillDietForm({
      animalId: validacjaAnimal!.id,
      startDate: '2026-02-01',
      endDate: '2026-01-01', // Wcześniejsza niż start!
      description: 'Invalid diet',
    });
    
    // Kliknij przycisk Utwórz (submitDietForm czeka na zamknięcie, więc klikamy tylko przycisk)
    await page.click('[data-testid="diet-submit-button"]');
    
    // Poczekaj na walidację
    await page.waitForTimeout(500);
    
    // Sprawdź czy pojawił się komunikat błędu walidacji
    const errorMessage = await dietsPage.getEndDateValidationError();
    expect(errorMessage).toBe('Data zakończenia nie może być wcześniejsza niż data startu');
    
    // Modal powinien pozostać otwarty (błąd walidacji)
    const modalOpen = await dietsPage.isModalOpen();
    expect(modalOpen).toBeTruthy();
    
    console.log('✓ Komunikat błędu walidacji pojawił się poprawnie');
    
    // Opcjonalna weryfikacja przez API - dieta NIE powinna zostać utworzona
    const diets = await apiHelper.getDiets();
    const invalidDiet = diets.find(d => d.description === 'Invalid diet');
    expect(invalidDiet).toBeUndefined();
  });
});
