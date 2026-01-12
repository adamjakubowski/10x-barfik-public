import apiClient from './client';
import type {
  Animal,
  AnimalCreate,
  AnimalDetail,
  Diet,
  DietDetail,
  DietCreate,
  Ingredient,
  IngredientCreate,
  ShoppingList,
  ShoppingListCreate,
  Unit,
  AnimalType,
  IngredientCategory,
  PaginatedResponse,
  User,
  UserUpdate,
  Collaboration,
  CollaborationCreate,
  Permission,
} from './types';

// Animals API
export const animalsApi = {
  list: (params?: { search?: string; species_id?: number; page?: number }) =>
    apiClient.get<PaginatedResponse<Animal>>('/api/animals/', { params }),

  get: (id: number) =>
    apiClient.get<AnimalDetail>(`/api/animals/${id}/`),

  create: (data: AnimalCreate) =>
    apiClient.post<AnimalDetail>('/api/animals/', data),

  update: (id: number, data: Partial<AnimalCreate>) =>
    apiClient.patch<AnimalDetail>(`/api/animals/${id}/`, data),

  delete: (id: number) =>
    apiClient.delete(`/api/animals/${id}/`),
};

// Diets API
export const dietsApi = {
  list: (params?: { animal_id?: number; active?: boolean; page?: number }) =>
    apiClient.get<PaginatedResponse<Diet>>('/api/diets/', { params }),

  get: (id: number) =>
    apiClient.get<DietDetail>(`/api/diets/${id}/`),

  create: (data: DietCreate) =>
    apiClient.post<DietDetail>('/api/diets/', data),

  update: (id: number, data: Partial<DietCreate>) =>
    apiClient.patch<DietDetail>(`/api/diets/${id}/`, data),

  delete: (id: number) =>
    apiClient.delete(`/api/diets/${id}/`),
};

// Ingredients API
export const ingredientsApi = {
  list: (diet_id: number, params?: { category_id?: number; cooking_method?: string }) =>
    apiClient.get<PaginatedResponse<Ingredient>>(`/api/diets/${diet_id}/ingredients/`, { params }),

  create: (diet_id: number, data: IngredientCreate) =>
    apiClient.post<Ingredient>(`/api/diets/${diet_id}/ingredients/`, data),

  update: (diet_id: number, id: number, data: Partial<IngredientCreate>) =>
    apiClient.patch<Ingredient>(`/api/diets/${diet_id}/ingredients/${id}/`, data),

  delete: (diet_id: number, id: number) =>
    apiClient.delete(`/api/diets/${diet_id}/ingredients/${id}/`),
};

// Shopping Lists API
export const shoppingListsApi = {
  list: (params?: { is_completed?: boolean; page?: number }) =>
    apiClient.get<PaginatedResponse<ShoppingList>>('/api/shopping-lists/', { params }),

  get: (id: number) =>
    apiClient.get<ShoppingList>(`/api/shopping-lists/${id}/`),

  create: (data: ShoppingListCreate) =>
    apiClient.post<ShoppingList>('/api/shopping-lists/', data),

  complete: (id: number) =>
    apiClient.post<ShoppingList>(`/api/shopping-lists/${id}/complete/`),

  uncomplete: (id: number) =>
    apiClient.post<ShoppingList>(`/api/shopping-lists/${id}/uncomplete/`),

  delete: (id: number) =>
    apiClient.delete(`/api/shopping-lists/${id}/`),
};

// Shopping List Items API
export const shoppingListItemsApi = {
  update: (shoppingListId: number, itemId: number, data: { is_checked?: boolean }) =>
    apiClient.patch(`/api/shopping-lists/${shoppingListId}/items/${itemId}/`, data),
};

// Dictionary APIs
export const dictionariesApi = {
  animalTypes: () =>
    apiClient.get<PaginatedResponse<AnimalType>>('/api/animal-types/'),

  units: () =>
    apiClient.get<PaginatedResponse<Unit>>('/api/units/'),

  ingredientCategories: () =>
    apiClient.get<PaginatedResponse<IngredientCategory>>('/api/ingredient-categories/'),
};

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<{ access: string; refresh: string }>('/api/auth/login/', { username, password }),

  register: (data: { email: string; password: string; first_name?: string; last_name?: string }) =>
    apiClient.post('/api/auth/register/', data),

  refresh: (refresh: string) =>
    apiClient.post<{ access: string }>('/api/auth/refresh/', { refresh }),
};

// User API
export const userApi = {
  me: () =>
    apiClient.get<User>('/api/users/me/'),

  updateMe: (data: UserUpdate) =>
    apiClient.patch<User>('/api/users/me/', data),
};

// User Search API
export const userSearchApi = {
  searchByEmail: (email: string) =>
    apiClient.get<User>('/api/users/search/', { params: { email } }),
};

// Collaborations API
export const collaborationsApi = {
  list: (animalId: number) =>
    apiClient.get<PaginatedResponse<Collaboration>>(`/api/animals/${animalId}/collaborations/`),

  create: (animalId: number, data: CollaborationCreate) =>
    apiClient.post<Collaboration>(`/api/animals/${animalId}/collaborations/`, data),

  update: (animalId: number, collaborationId: number, data: { permission: Permission }) =>
    apiClient.patch<Collaboration>(`/api/animals/${animalId}/collaborations/${collaborationId}/`, data),

  delete: (animalId: number, collaborationId: number) =>
    apiClient.delete(`/api/animals/${animalId}/collaborations/${collaborationId}/`),
};
