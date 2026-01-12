import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { animalsApi } from '../api/services';
import type { AnimalCreate } from '../api/types';

export const ANIMALS_QUERY_KEY = ['animals'];

export function useAnimals(params?: { search?: string; species_id?: number; page?: number; active?: boolean }) {
  return useQuery({
    queryKey: [...ANIMALS_QUERY_KEY, params],
    queryFn: async () => {
      const response = await animalsApi.list(params);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

export function useAnimal(id: number) {
  return useQuery({
    queryKey: [...ANIMALS_QUERY_KEY, id],
    queryFn: async () => {
      const response = await animalsApi.get(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateAnimal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AnimalCreate) => animalsApi.create(data),
    onSuccess: () => {
      // Invalidate wszystkie zapytania animals (z różnymi parametrami)
      queryClient.invalidateQueries({ queryKey: ANIMALS_QUERY_KEY, exact: false });
    },
  });
}

export function useUpdateAnimal(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<AnimalCreate>) => animalsApi.update(id, data),
    onSuccess: () => {
      // Invalidate wszystkie zapytania animals
      queryClient.invalidateQueries({ queryKey: ANIMALS_QUERY_KEY, exact: false });
      // Invalidate konkretne zwierzę
      queryClient.invalidateQueries({ queryKey: [...ANIMALS_QUERY_KEY, id] });
    },
  });
}

export function useDeleteAnimal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => animalsApi.delete(id),
    onSuccess: () => {
      // Invalidate wszystkie zapytania animals
      queryClient.invalidateQueries({ queryKey: ANIMALS_QUERY_KEY, exact: false });
    },
  });
}
