import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collaborationsApi } from '@/api/services';
import type { CollaborationCreate } from '@/api/types';

export function useCollaborations(animalId: number | null) {
  return useQuery({
    queryKey: ['collaborations', animalId],
    queryFn: () => animalId ? collaborationsApi.list(animalId).then(res => res.data) : Promise.resolve({ results: [], count: 0, next: null, previous: null }),
    enabled: !!animalId,
  });
}

export function useCreateCollaboration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ animalId, data }: { animalId: number; data: CollaborationCreate }) =>
      collaborationsApi.create(animalId, data),
    onSuccess: (_, { animalId }) => {
      queryClient.invalidateQueries({ queryKey: ['collaborations', animalId] });
      queryClient.invalidateQueries({ queryKey: ['collaborations'] });
    },
  });
}

export function useDeleteCollaboration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ animalId, collaborationId }: { animalId: number; collaborationId: number }) =>
      collaborationsApi.delete(animalId, collaborationId),
    onSuccess: (_, { animalId }) => {
      queryClient.invalidateQueries({ queryKey: ['collaborations', animalId] });
      queryClient.invalidateQueries({ queryKey: ['collaborations'] });
    },
  });
}
