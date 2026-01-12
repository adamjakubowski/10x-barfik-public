import { useMutation } from '@tanstack/react-query';
import { userSearchApi } from '@/api/services';
import type { User } from '@/api/types';

export function useUserSearch() {
  return useMutation<User, Error, string>({
    mutationFn: (email: string) => userSearchApi.searchByEmail(email).then(res => res.data),
  });
}
