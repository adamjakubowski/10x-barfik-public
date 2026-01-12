import { defineConfig, devices } from '@playwright/test';

/**
 * Konfiguracja Playwright E2E dla Barfik
 * 
 * Strategie:
 * - Reset DB: beforeAll (przed całym suite)
 * - Auth: login beforeEach (przed każdym testem)
 * - Selektory: data-testid w komponentach
 */
export default defineConfig({
  testDir: './e2e/tests',
  
  /* Maksymalny czas na jeden test */
  timeout: 30 * 1000,
  
  /* Timeout dla expect */
  expect: {
    timeout: 5000
  },
  
  /* Uruchom testy równolegle (false = sekwencyjnie dla stabilności) */
  fullyParallel: false,
  
  /* Zatrzymaj testy po pierwszym błędzie w CI */
  forbidOnly: !!process.env.CI,
  
  /* Retry w CI, bez retry lokalnie */
  retries: process.env.CI ? 2 : 0,
  
  /* Ilość workerów */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter */
  reporter: [
    ['html'],
    ['list']
  ],
  
  /* Wspólne ustawienia dla wszystkich projektów */
  use: {
    /* Base URL dla aplikacji */
    baseURL: 'http://localhost:5173',
    
    /* Zbieraj trace tylko przy błędzie */
    trace: 'on',
    
    /* Screenshot tylko przy błędzie */
    screenshot: 'on',
    
    /* Video tylko przy retry */
    video: 'on',
    
    /* Timeout dla navigation */
    navigationTimeout: 10 * 1000,
    
    /* Timeout dla action */
    actionTimeout: 10 * 1000,
  },

  /* Konfiguracja projektów (przeglądarek) */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // Webkit wyłączony - dodaj jeśli potrzebny
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Webserver - automatyczne uruchomienie Vite dev server */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
