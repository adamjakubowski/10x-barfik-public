import { test, expect } from '../fixtures/test-fixtures';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Testy E2E dla modułu Zwierzęta
 * 
 * Scenariusz: Login -> Add animal -> Check if animal exists -> Logout
 */

test.describe('Animals - Basic Flow', () => {
  /**
   * Reset bazy danych przed całym suite (beforeAll)
   */
  test.beforeEach(async () => {
    console.log('🔄 Resetowanie bazy danych dla testów...');
    
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
   * Test 1: Login -> Add animal -> Verify exists -> Logout
   */
  test('should login, add animal, verify it exists, and logout', async ({ 
    page, 
    loginPage, 
    animalsPage 
  }) => {
    // 1. Login
    await loginPage.goto();
    await loginPage.login('e2e@test.pl', 'TestPass123!');
    
    // Verify logged in
    const isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeTruthy();
    
    // 2. Nawigacja do sekcji zwierząt
    await animalsPage.goto();
    
    // Sprawdź początkową liczbę zwierząt (powinna być 0)
    const initialCount = await animalsPage.getAnimalsCount();
    expect(initialCount).toBe(0);
    
    // 3. Dodaj nowe zwierzę
    await animalsPage.openAddModal();
    
    await animalsPage.fillAnimalForm({
      name: 'Rex',
      speciesId: 1, // Pies (z fixtures)
      dateOfBirth: '2020-05-15',
      weightKg: '25.5',
      note: 'Testowy labrador',
    });
    
    await animalsPage.submitAnimalForm();
    
    // 4. Sprawdź czy zwierzę istnieje na liście
    const animalExists = await animalsPage.verifyAnimalExists('Rex');
    expect(animalExists).toBeTruthy();
    
    // Sprawdź czy liczba zwierząt wzrosła
    const finalCount = await animalsPage.getAnimalsCount();
    expect(finalCount).toBeGreaterThanOrEqual(initialCount + 1);
    
    // 5. Logout
    await loginPage.logout();
    
    // Verify logged out (przekierowanie do /login)
    expect(page.url()).toContain('/login');
  });

  /**
   * Test 2: Dodanie wielu zwierząt
   */
  test('should add multiple animals', async ({ 
    page,
    loginPage, 
    animalsPage 
  }) => {
    // Login before each test
    await loginPage.goto();
    await loginPage.login('e2e@test.pl', 'TestPass123!');
    
    await animalsPage.goto();
    
    // Dodaj pierwsze zwierzę - psa
    await animalsPage.openAddModal();
    await animalsPage.fillAnimalForm({
      name: 'Burek',
      speciesId: 1, // Pies
      weightKg: '30',
    });
    await animalsPage.submitAnimalForm();
    
    // Dodaj drugie zwierzę - kota
    await animalsPage.openAddModal();
    await animalsPage.fillAnimalForm({
      name: 'Mruczek',
      speciesId: 2, // Kot (z fixtures)
      weightKg: '4.5',
    });
    await animalsPage.submitAnimalForm();
    
    // Verify both exist
    expect(await animalsPage.verifyAnimalExists('Burek')).toBeTruthy();
    expect(await animalsPage.verifyAnimalExists('Mruczek')).toBeTruthy();
    
    // Verify count
    const count = await animalsPage.getAnimalsCount();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  /**
   * Test 3: Walidacja formularza - puste pole nazwa
   */
  test('should show validation error when name is empty', async ({ 
    loginPage, 
    animalsPage 
  }) => {
    await loginPage.goto();
    await loginPage.login('e2e@test.pl', 'TestPass123!');
    
    await animalsPage.goto();
    await animalsPage.openAddModal();
    
    // Wypełnij tylko gatunek (bez nazwy)
    await animalsPage.fillAnimalForm({
      name: '', // Puste pole
      speciesId: 1,
    });
    
    // Kliknij przycisk zapisu (NIE czekaj na zamknięcie)
    await animalsPage.clickSubmitButton();
    
    // Czekaj chwilę na walidację
    await animalsPage.page.waitForTimeout(500);
    
    // Modal powinien pozostać otwarty (błąd walidacji)
    const modalOpen = await animalsPage.isModalOpen();
    expect(modalOpen).toBeTruthy();
  });
});
