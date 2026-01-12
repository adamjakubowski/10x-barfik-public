import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { AnimalsPage } from '../pages/AnimalsPage';
import { DietsPage } from '../pages/DietsPage';
import { ApiHelper } from '../utils/api-helpers';

/**
 * Fixtures dla testów E2E
 * 
 * Dostępne fixtures:
 * - loginPage: Page Object Model dla logowania
 * - animalsPage: Page Object Model dla zwierząt
 * - dietsPage: Page Object Model dla diet
 * - apiHelper: Helper do zarządzania danymi przez API
 * - authenticatedPage: Page z już zalogowanym użytkownikiem (auto login before each)
 */

type TestFixtures = {
  loginPage: LoginPage;
  animalsPage: AnimalsPage;
  dietsPage: DietsPage;
  apiHelper: ApiHelper;
  authenticatedPage: any; // Page po zalogowaniu
};

export const test = base.extend<TestFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  animalsPage: async ({ page }, use) => {
    const animalsPage = new AnimalsPage(page);
    await use(animalsPage);
  },

  dietsPage: async ({ page }, use) => {
    const dietsPage = new DietsPage(page);
    await use(dietsPage);
  },

  apiHelper: async ({}, use) => {
    const apiHelper = new ApiHelper();
    await use(apiHelper);
    // Cleanup po teście (opcjonalnie)
    apiHelper.logout();
  },

  /**
   * authenticatedPage - automatyczne logowanie przed testem
   * Użyj tego zamiast zwykłego 'page' jeśli test wymaga zalogowanego użytkownika
   */
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    
    // Auto login z testowym userem
    await loginPage.goto();
    await loginPage.login('e2e@test.pl', 'TestPass123!');
    
    // Czekaj aż załaduje się dashboard
    await page.waitForURL('/dashboard');
    
    await use(page);
  },
});

export { expect } from '@playwright/test';
