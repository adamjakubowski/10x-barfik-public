import { Page } from '@playwright/test';

/**
 * Page Object Model dla strony logowania
 */
export class LoginPage {
  constructor(private page: Page) {}

  /**
   * Nawigacja do strony logowania
   */
  async goto() {
    await this.page.goto('/login');
  }

  /**
   * Wypełnij formularz logowania i zaloguj się
   */
  async login(email: string, password: string) {
    // Czekaj na formularz logowania (może się renderować)
    await this.page.waitForSelector('[data-testid="login-email"]', { timeout: 15000 });
    
    await this.page.fill('[data-testid="login-email"]', email);
    await this.page.fill('[data-testid="login-password"]', password);
    await this.page.click('[data-testid="login-submit"]');
    
    // Czekaj na przekierowanie do dashboard (sukces logowania)
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
    
    // KRYTYCZNE: Czekaj na pełne załadowanie nawigacji (Sidebar lub BottomNav)
    // Nawigacja może ładować się asynchronicznie po zalogowaniu
    await this.page.waitForSelector('[data-testid^="nav-"]', { 
      state: 'visible',
      timeout: 10000 
    });
    
    // Czekaj na network idle - wszystkie zapytania API się zakończyły
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wyloguj się (kliknij przycisk wylogowania w menu użytkownika)
   */
  async logout() {
    // Otwórz menu użytkownika
    await this.page.click('[data-testid="user-menu-button"]');
    
    // Kliknij "Wyloguj"
    await this.page.click('[data-testid="logout-button"]');
    
    // Czekaj na przekierowanie do /login
    await this.page.waitForURL('/login', { timeout: 5000 });
  }

  /**
   * Sprawdź czy użytkownik jest zalogowany (czy jesteśmy na dashboard)
   */
  async isLoggedIn(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('/dashboard') || 
           url.includes('/zwierzeta') || 
           url.includes('/diety') || 
           url.includes('/zakupy') || 
           url.includes('/profil');
  }

  /**
   * Sprawdź czy jest błąd logowania
   */
  async hasLoginError(): Promise<boolean> {
    return await this.page.isVisible('[data-testid="login-error"]');
  }

  /**
   * Pobierz tekst błędu logowania
   */
  async getLoginErrorText(): Promise<string> {
    return await this.page.textContent('[data-testid="login-error"]') || '';
  }
}
