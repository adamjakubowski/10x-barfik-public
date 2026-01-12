import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shoppingListsApi, shoppingListItemsApi } from '../api/services';
import type { ShoppingListCreate } from '../api/types';

export const SHOPPING_LISTS_QUERY_KEY = ['shopping-lists'];

export function useShoppingLists(params?: { is_completed?: boolean; page?: number }) {
  return useQuery({
    queryKey: [...SHOPPING_LISTS_QUERY_KEY, params],
    queryFn: async () => {
      const response = await shoppingListsApi.list(params);
      return response.data;
    },
    staleTime: 1000, // 1 sekunda
  });
}

export function useShoppingList(id: number) {
  return useQuery({
    queryKey: [...SHOPPING_LISTS_QUERY_KEY, id],
    queryFn: async () => {
      const response = await shoppingListsApi.get(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ShoppingListCreate) => shoppingListsApi.create(data),
    onSuccess: (response) => {
      // Invalidate wszystkie zapytania shopping-lists
      queryClient.invalidateQueries({ queryKey: SHOPPING_LISTS_QUERY_KEY, exact: false });
      // Ustaw dane nowo utworzonej listy w cache
      queryClient.setQueryData([...SHOPPING_LISTS_QUERY_KEY, response.data.id], response.data);
    },
  });
}

export function useCompleteShoppingList(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => shoppingListsApi.complete(id),
    onSuccess: () => {
      // Invalidate wszystkie zapytania shopping-lists
      queryClient.invalidateQueries({ queryKey: SHOPPING_LISTS_QUERY_KEY, exact: false });
      // Invalidate konkretną listę
      queryClient.invalidateQueries({ queryKey: [...SHOPPING_LISTS_QUERY_KEY, id] });
    },
  });
}

export function useUncompleteShoppingList(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => shoppingListsApi.uncomplete(id),
    onSuccess: () => {
      // Invalidate wszystkie zapytania shopping-lists
      queryClient.invalidateQueries({ queryKey: SHOPPING_LISTS_QUERY_KEY, exact: false });
      // Invalidate konkretną listę
      queryClient.invalidateQueries({ queryKey: [...SHOPPING_LISTS_QUERY_KEY, id] });
    },
  });
}

export function useToggleShoppingListItem(shoppingListId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, is_checked }: { itemId: number; is_checked: boolean }) =>
      shoppingListItemsApi.update(shoppingListId, itemId, { is_checked }),
    onSuccess: () => {
      // Invalidate konkretną listę aby odświeżyć items
      queryClient.invalidateQueries({ queryKey: [...SHOPPING_LISTS_QUERY_KEY, shoppingListId] });
      // Invalidate również listę wszystkich list (dla progress indicators)
      queryClient.invalidateQueries({ queryKey: SHOPPING_LISTS_QUERY_KEY, exact: true });
    },
  });
}
