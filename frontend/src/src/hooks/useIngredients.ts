import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ingredientsApi } from '../api/services';
import type { IngredientCreate } from '../api/types';
import { DIETS_QUERY_KEY } from './useDiets';

export function useCreateIngredient(dietId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: IngredientCreate) => ingredientsApi.create(dietId, data),
    onSuccess: () => {
      // Invalidate wszystkie zapytania diets (auto-aktualizacja total_daily_mass)
      queryClient.invalidateQueries({ queryKey: DIETS_QUERY_KEY, exact: false });
      // Invalidate konkretną dietę
      queryClient.invalidateQueries({ queryKey: [...DIETS_QUERY_KEY, dietId] });
    },
  });
}

export function useUpdateIngredient(dietId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ingredientId, data }: { ingredientId: number; data: Partial<IngredientCreate> }) => 
      ingredientsApi.update(dietId, ingredientId, data),
    onSuccess: () => {
      // Invalidate wszystkie zapytania diets
      queryClient.invalidateQueries({ queryKey: DIETS_QUERY_KEY, exact: false });
      // Invalidate konkretną dietę
      queryClient.invalidateQueries({ queryKey: [...DIETS_QUERY_KEY, dietId] });
    },
  });
}

export function useDeleteIngredient(dietId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ingredientId: number) => ingredientsApi.delete(dietId, ingredientId),
    onSuccess: () => {
      // Invalidate wszystkie zapytania diets
      queryClient.invalidateQueries({ queryKey: DIETS_QUERY_KEY, exact: false });
      // Invalidate konkretną dietę
      queryClient.invalidateQueries({ queryKey: [...DIETS_QUERY_KEY, dietId] });
    },
  });
}
