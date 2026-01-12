import type { components } from './schema';

// Typy domenowe - bezpośrednie re-eksporty
export type Animal = components['schemas']['AnimalList'];
export type AnimalDetail = components['schemas']['AnimalDetail'];
export type AnimalCreate = components['schemas']['AnimalCreateRequest'];

export type Diet = components['schemas']['DietList'];
export type DietDetail = components['schemas']['DietDetail'];
export type DietCreate = components['schemas']['DietCreateRequest'];

export type Ingredient = components['schemas']['Ingredient'];
export type IngredientCreate = components['schemas']['IngredientRequest'];

export type ShoppingList = components['schemas']['ShoppingList'];
export type ShoppingListCreate = components['schemas']['ShoppingListCreateRequest'];
export type ShoppingListItem = components['schemas']['ShoppingListItem'];

export type Unit = components['schemas']['Unit'];
export type AnimalType = components['schemas']['AnimalType'];
export type IngredientCategory = components['schemas']['IngredientCategory'];

export type Permission = components['schemas']['PermissionEnum'];
export type CookingMethod = components['schemas']['CookingMethodEnum'];

// Collaboration types
export type Collaboration = components['schemas']['Collaboration'];
export type CollaborationCreate = {
  user: number;
  permission?: Permission;
};

// User types
export type User = components['schemas']['User'];
export type UserUpdate = components['schemas']['PatchedUserRequest'];

// Auth types
export type TokenPair = components['schemas']['TokenObtainPair'];
export type TokenRefresh = components['schemas']['TokenRefresh'];

// Paginated response type
export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
