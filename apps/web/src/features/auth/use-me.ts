import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { useSessionStore } from '../../app/session.store';

export function useMe() {
  const initData = useSessionStore((state) => state.initData);
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(initData ?? ''),
    enabled: initData !== null,
    retry: 1,
    staleTime: 30_000,
  });
}
