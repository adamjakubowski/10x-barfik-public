import { useQuery } from '@tanstack/react-query';
import { dictionariesApi } from '../api/services';

export const ANIMAL_TYPES_QUERY_KEY = ['animalTypes'];
export const UNITS_QUERY_KEY = ['units'];
export const INGREDIENT_CATEGORIES_QUERY_KEY = ['ingredientCategories'];

export function useAnimalTypes() {
  return useQuery({
    queryKey: ANIMAL_TYPES_QUERY_KEY,
    queryFn: async () => {
      const response = await dictionariesApi.animalTypes();
      return response.data;
    },
    staleTime: 60 * 60 * 1000, // 1 godzina - słowniki rzadko się zmieniają
  });
}

export function useUnits() {
  return useQuery({
    queryKey: UNITS_QUERY_KEY,
    queryFn: async () => {
      const response = await dictionariesApi.units();
      return response.data;
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useIngredientCategories() {
  return useQuery({
    queryKey: INGREDIENT_CATEGORIES_QUERY_KEY,
    queryFn: async () => {
      const response = await dictionariesApi.ingredientCategories();
      return response.data;
    },
    staleTime: 60 * 60 * 1000,
  });
}
