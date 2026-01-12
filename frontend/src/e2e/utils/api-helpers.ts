import axios, { AxiosInstance } from 'axios';

/**
 * API Helper do zarządzania danymi testowymi przez REST API
 * Używany do setup/cleanup testów zamiast klikania przez UI
 */
export class ApiHelper {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor(baseURL: string = 'http://127.0.0.1:8000/api') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor do automatycznego dodawania tokena
    this.client.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });
  }

  /**
   * Zaloguj się i zapisz access token
   */
  async login(email: string, password: string): Promise<void> {
    const response = await this.client.post('/auth/login/', {
      username: email, // Django używa username ale przyjmuje email
      password,
    });
    
    this.accessToken = response.data.access;
  }

  /**
   * Wyczyść token (logout)
   */
  logout(): void {
    this.accessToken = null;
  }

  /**
   * Utwórz zwierzę przez API
   */
  async createAnimal(data: {
    name: string;
    speciesId: number;
    dateOfBirth?: string;
    weightKg?: number;
    note?: string;
  }): Promise<any> {
    const response = await this.client.post('/animals/', {
      name: data.name,
      species_id: data.speciesId,  // Backend oczekuje snake_case
      date_of_birth: data.dateOfBirth || null,
      weight_kg: data.weightKg || null,
      note: data.note || '',
    });
    
    return response.data;
  }

  /**
   * Pobierz listę zwierząt
   */
  async getAnimals(): Promise<any[]> {
    const response = await this.client.get('/animals/');
    return response.data.results || response.data;
  }

  /**
   * Usuń zwierzę (soft delete)
   */
  async deleteAnimal(animalId: number): Promise<void> {
    await this.client.delete(`/animals/${animalId}/`);
  }

  /**
   * Utwórz dietę przez API
   */
  async createDiet(data: {
    animalId: number;
    startDate: string;
    endDate?: string;
    description?: string;
  }): Promise<any> {
    const response = await this.client.post('/diets/', {
      animal: data.animalId,
      start_date: data.startDate,  // Backend oczekuje snake_case
      end_date: data.endDate || null,
      description: data.description || '',
    });
    
    return response.data;
  }

  /**
   * Pobierz listę diet
   */
  async getDiets(animalId?: number): Promise<any[]> {
    const params = animalId ? { animal: animalId } : {};
    const response = await this.client.get('/diets/', { params });
    return response.data.results || response.data;
  }

  /**
   * Usuń dietę (soft delete)
   */
  async deleteDiet(dietId: number): Promise<void> {
    await this.client.delete(`/diets/${dietId}/`);
  }

  /**
   * Utwórz składnik diety przez API
   */
  async createIngredient(dietId: number, data: {
    name: string;
    categoryId: number;
    cookingMethod: 'raw' | 'cooked';
    unitId: number;
    amount: number;
  }): Promise<any> {
    const response = await this.client.post(`/diets/${dietId}/ingredients/`, {
      name: data.name,
      category: data.categoryId,
      cookingMethod: data.cookingMethod,
      unit: data.unitId,
      amount: data.amount,
    });
    
    return response.data;
  }

  /**
   * Pobierz słowniki (AnimalType, Unit, IngredientCategory)
   */
  async getDictionaries(): Promise<{
    animalTypes: any[];
    units: any[];
    ingredientCategories: any[];
  }> {
    const [animalTypes, units, ingredientCategories] = await Promise.all([
      this.client.get('/animal-types/').then(r => r.data.results || r.data),
      this.client.get('/units/').then(r => r.data.results || r.data),
      this.client.get('/ingredient-categories/').then(r => r.data.results || r.data),
    ]);

    return { animalTypes, units, ingredientCategories };
  }

  /**
   * Wyczyść wszystkie dane testowe (użyj przed testem jeśli potrzeba)
   * UWAGA: To usuwa WSZYSTKIE dane użytkownika, używaj ostrożnie
   */
  async cleanupAllData(): Promise<void> {
    // Pobierz wszystkie zwierzęta i usuń je (to usunie powiązane diety przez CASCADE)
    const animals = await this.getAnimals();
    
    for (const animal of animals) {
      await this.deleteAnimal(animal.id);
    }
  }
}

/**
 * Factory function do tworzenia ApiHelper w testach
 */
export function createApiHelper(): ApiHelper {
  return new ApiHelper();
}
