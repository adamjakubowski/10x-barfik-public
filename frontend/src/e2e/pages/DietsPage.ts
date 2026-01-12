import { Page } from '@playwright/test';

/**
 * Page Object Model dla sekcji Diet
 */
export class DietsPage {
  constructor(private page: Page) {}

  /**
   * Nawigacja do sekcji diet
   */
  async goto() {
    // Czekaj na link nawigacji (może być w Sidebar lub BottomNav)
    // Użyj .first() aby uniknąć strict mode violation (2 elementy: Sidebar + BottomNav)
    const navLink = this.page.locator('[data-testid="nav-diety"]').first();
    await navLink.waitFor({ state: 'visible', timeout: 10000 });
    
    // Kliknij w link nawigacji (React Router wymaga rzeczywistej nawigacji)
    await navLink.click();
    
    // Czekaj na zmianę URL i załadowanie strony
    await this.page.waitForURL('/diety', { timeout: 5000 });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Nawigacja do diet konkretnego zwierzęcia (z /zwierzeta)
   */
  async gotoAnimalDiets(animalId: number) {
    await this.page.goto(`/zwierzeta/${animalId}/diety`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Otwórz modal dodawania nowej diety
   */
  async openAddModal() {
    // Poczekaj aż przycisk będzie dostępny
    const button = this.page.locator('[data-testid="add-diet-button"]');
    await button.waitFor({ state: 'visible', timeout: 10000 });

    // Kliknij przycisk (bez warunków - niech zawsze klika)
    await button.click();

    // Poczekaj na modal tworzenia
    await this.page.waitForSelector('[data-testid="diet-modal"]', { state: 'visible', timeout: 10000 });
  }

  /**
   * Wypełnij formularz diety
   */
  async fillDietForm(data: {
    animalId?: number;  // Opcjonalne jeśli jesteśmy już w kontekście zwierzęcia
    startDate: string;
    endDate?: string;
    description?: string;
  }) {
    // Zwierzę (jeśli dostępne - może być preselected jeśli jesteśmy w /zwierzeta/:id/diety)
    if (data.animalId) {
      // Kliknij trigger aby otworzyć dropdown
      await this.page.click('[data-testid="diet-animal-select"]');
      // Poczekaj na otwarcie dropdown
      await this.page.waitForTimeout(200);
      // Kliknij opcję
      await this.page.click(`[data-testid="animal-option-${data.animalId}"]`);
      // Poczekaj aż dropdown się zamknie
      await this.page.waitForTimeout(200);
    }
    
    // Data rozpoczęcia (wymagane)
    await this.page.fill('[data-testid="diet-start-date-input"]', data.startDate);
    
    // Data zakończenia (opcjonalne)
    if (data.endDate) {
      await this.page.fill('[data-testid="diet-end-date-input"]', data.endDate);
    }
    
    // Opis (opcjonalne)
    if (data.description) {
      await this.page.fill('[data-testid="diet-description-input"]', data.description);
    }
  }

  /**
   * Zapisz formularz diety
   */
  async submitDietForm() {
    await this.page.click('[data-testid="diet-submit-button"]');
    
  }

  /**
   * Sprawdź czy dieta istnieje na liście
   */
  async verifyDietExists(description: string): Promise<boolean> {
    // Poczekaj na załadowanie listy
    await this.page.waitForLoadState('networkidle');
    
    // Sprawdź czy karta diety jest widoczna
    // Używamy description jako identyfikatora (można też date range)
    const dietCard = this.page.locator(`[data-testid="diet-card"]`, { hasText: description });
    return await dietCard.first().isVisible();
  }

  /**
   * Sprawdź czy dieta z określonym zakresem dat istnieje
   */
  async verifyDietByDateRange(startDate: string, endDate?: string): Promise<boolean> {
    await this.page.waitForLoadState('networkidle');
    
    // Szukaj karty z data-start i data-end attributes
    const selector = endDate 
      ? `[data-testid="diet-card"][data-start="${startDate}"][data-end="${endDate}"]`
      : `[data-testid="diet-card"][data-start="${startDate}"]`;
    
    return await this.page.isVisible(selector);
  }

  /**
   * Pobierz liczbę diet na liście
   */
  async getDietsCount(): Promise<number> {
    await this.page.waitForLoadState('networkidle');
    const cards = this.page.locator('[data-testid="diet-card"]');
    return await cards.count();
  }

  /**
   * Kliknij kartę diety aby otworzyć szczegóły (zakładki: info/składniki/listy)
   */
  async openDietDetails(dietIndex: number = 0) {
    const dietCards = this.page.locator('[data-testid="diet-card"]');
    await dietCards.nth(dietIndex).click();
    
    // Czekaj na załadowanie zakładek
    await this.page.waitForSelector('[data-testid="diet-tabs"]', { state: 'visible' });
  }

  /**
   * Przełącz na zakładkę "Składniki"
   */
  async switchToIngredientsTab() {
    await this.page.click('[data-testid="diet-tab-ingredients"]');
    await this.page.waitForSelector('[data-testid="ingredients-list"]', { state: 'visible' });
  }

  /**
   * Przełącz na zakładkę "Listy zakupów"
   */
  async switchToShoppingListsTab() {
    await this.page.click('[data-testid="diet-tab-shopping-lists"]');
  }

  /**
   * Sprawdź total_daily_mass na karcie diety
   */
  async getTotalDailyMass(): Promise<string> {
    const massElement = this.page.locator('[data-testid="diet-total-mass"]');
    return await massElement.textContent() || '0';
  }

  /**
   * Sprawdź czy modal jest otwarty
   */
  async isModalOpen(): Promise<boolean> {
    return await this.page.isVisible('[data-testid="diet-modal"]');
  }

  /**
   * Zamknij modal
   */
  async closeModal() {
    await this.page.click('[data-testid="diet-modal-close"]');
    await this.page.waitForSelector('[data-testid="diet-modal"]', { state: 'hidden' });
  }

  /**
   * Sprawdź czy pojawił się komunikat błędu walidacji dla pola end_date
   */
  async getEndDateValidationError(): Promise<string | null> {
    // Znajdź pole end_date
    const endDateInput = this.page.locator('[data-testid="diet-end-date-input"]');
    
    // Znajdź najbliższy kontener (space-y-2 div)
    const fieldContainer = endDateInput.locator('..');
    
    // Znajdź komunikat błędu (span.text-destructive)
    const errorSpan = fieldContainer.locator('span.text-destructive');
    
    // Sprawdź czy jest widoczny
    const isVisible = await errorSpan.isVisible().catch(() => false);
    
    if (!isVisible) {
      return null;
    }
    
    return await errorSpan.textContent();
  }
}
