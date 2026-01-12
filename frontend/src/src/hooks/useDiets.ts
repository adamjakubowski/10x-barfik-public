import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dietsApi } from '../api/services';
import type { DietCreate } from '../api/types';

export const DIETS_QUERY_KEY = ['diets'];

export function useDiets(params?: { animal_id?: number; active?: boolean; page?: number }) {
  return useQuery({
    queryKey: [...DIETS_QUERY_KEY, params],
    queryFn: async () => {
      const response = await dietsApi.list(params);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

export function useDiet(id: number) {
  return useQuery({
    queryKey: [...DIETS_QUERY_KEY, id],
    queryFn: async () => {
      const response = await dietsApi.get(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateDiet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DietCreate) => dietsApi.create(data),
    onSuccess: (response) => {
      // Invalidate wszystkie zapytania diets (z różnymi parametrami)
      queryClient.invalidateQueries({ queryKey: DIETS_QUERY_KEY, exact: false });
      // Ustaw dane nowo utworzonej diety w cache, aby były od razu dostępne
      queryClient.setQueryData([...DIETS_QUERY_KEY, response.data.id], response.data);
    },
  });
}

export function useUpdateDiet(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<DietCreate>) => dietsApi.update(id, data),
    onSuccess: () => {
      // Invalidate wszystkie zapytania diets
      queryClient.invalidateQueries({ queryKey: DIETS_QUERY_KEY, exact: false });
      // Invalidate konkretną dietę
      queryClient.invalidateQueries({ queryKey: [...DIETS_QUERY_KEY, id] });
    },
  });
}

export function useDeleteDiet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => dietsApi.delete(id),
    onSuccess: () => {
      // Invalidate wszystkie zapytania diets
      queryClient.invalidateQueries({ queryKey: DIETS_QUERY_KEY, exact: false });
    },
  });
}
