import { Page, expect } from '@playwright/test';

/**
 * Page Object Model dla sekcji Zwierzęta
 */
export class AnimalsPage {
  constructor(public page: Page) {}

  /**
   * Nawigacja do sekcji zwierząt
   */
  async goto() {
    // Czekaj na link nawigacji (może być w Sidebar lub BottomNav)
    // Użyj .first() aby uniknąć strict mode violation (2 elementy: Sidebar + BottomNav)
    const navLink = this.page.locator('[data-testid="nav-zwierzeta"]').first();
    await navLink.waitFor({ state: 'visible', timeout: 10000 });
    
    // Kliknij w link nawigacji (React Router wymaga rzeczywistej nawigacji)
    await navLink.click();
    
    // Czekaj na zmianę URL i załadowanie strony
    await this.page.waitForURL('/zwierzeta', { timeout: 5000 });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Otwórz modal dodawania nowego zwierzęcia
   */
  async openAddModal() {
    // Czekaj na przycisk (może ładować słowniki)
    await this.page.waitForSelector('[data-testid="add-animal-button"]', { 
      state: 'visible',
      timeout: 15000 
    });
    
    await this.page.click('[data-testid="add-animal-button"]');
    await this.page.waitForSelector('[data-testid="animal-modal"]', { state: 'visible' });
  }

  /**
   * Wypełnij formularz zwierzęcia
   */
  async fillAnimalForm(data: {
    name: string;
    speciesId: number;
    dateOfBirth?: string;
    weightKg?: string;
    note?: string;
  }) {
    // Nazwa (wymagane)
    await this.page.fill('[data-testid="animal-name-input"]', data.name);
    
    // Gatunek (wymagane) - select
    await this.page.click('[data-testid="animal-species-select"]');
    await this.page.click(`[data-testid="species-option-${data.speciesId}"]`);
    
    // Data urodzenia (opcjonalne)
    if (data.dateOfBirth) {
      await this.page.fill('[data-testid="animal-date-input"]', data.dateOfBirth);
    }
    
    // Waga (opcjonalne)
    if (data.weightKg) {
      await this.page.fill('[data-testid="animal-weight-input"]', data.weightKg);
    }
    
    // Notatka (opcjonalne)
    if (data.note) {
      await this.page.fill('[data-testid="animal-note-input"]', data.note);
    }
  }

  /**
   * Kliknij przycisk zapisu formularza
   */
  async clickSubmitButton() {
    await this.page.click('[data-testid="animal-submit-button"]');
  }

  /**
   * Zapisz formularz zwierzęcia i czekaj na zamknięcie modala (sukces)
   */
  async submitAnimalForm() {
    await this.clickSubmitButton();
    
    // Czekaj aż modal zniknie (sukces)
    await this.page.waitForSelector('[data-testid="animal-modal"]', { state: 'hidden', timeout: 5000 });
  }

  /**
   * Sprawdź czy zwierzę istnieje na liście
   */
  async verifyAnimalExists(animalName: string): Promise<boolean> {
    // Poczekaj na załadowanie listy
    await this.page.waitForLoadState('networkidle');
    
    // Sprawdź czy karta zwierzęcia jest widoczna (czekaj do 5 sekund)
    const animalCard = this.page.locator(`[data-testid="animal-card-${animalName}"]`);
    
    try {
      await animalCard.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Pobierz liczbę zwierząt na liście
   */
  async getAnimalsCount(): Promise<number> {
    await this.page.waitForLoadState('networkidle');
    const cards = this.page.locator('[data-testid^="animal-card-"]');
    return await cards.count();
  }

  /**
   * Kliknij kartę zwierzęcia aby otworzyć szczegóły
   */
  async openAnimalDetails(animalName: string) {
    await this.page.click(`[data-testid="animal-card-${animalName}"]`);
  }

  /**
   * Kliknij "Zobacz diety" na karcie zwierzęcia
   */
  async openAnimalDiets(animalName: string) {
    await this.page.click(`[data-testid="animal-diets-button-${animalName}"]`);
    await this.page.waitForURL(/\/zwierzeta\/\d+\/diety/, { timeout: 5000 });
  }

  /**
   * Sprawdź czy modal jest otwarty
   */
  async isModalOpen(): Promise<boolean> {
    return await this.page.isVisible('[data-testid="animal-modal"]');
  }

  /**
   * Zamknij modal (przycisk X lub outside click)
   */
  async closeModal() {
    await this.page.click('[data-testid="animal-modal-close"]');
    await this.page.waitForSelector('[data-testid="animal-modal"]', { state: 'hidden' });
  }
}
