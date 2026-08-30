import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { useSessionStore } from '../../app/session.store';

export function useLedger() {
  const initData = useSessionStore((state) => state.initData);
  return useQuery({
    queryKey: ['ledger'],
    queryFn: () => apiClient.ledger(initData ?? ''),
    enabled: initData !== null,
    staleTime: 30_000,
  });
}
