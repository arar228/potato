import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MeDto, PoolPlayInput } from '@night-arcade/shared';
import { useSessionStore } from '../../app/session.store';
import { apiClient } from '../../lib/api-client';

export function useGamesConfig() {
  const initData = useSessionStore((state) => state.initData);
  return useQuery({ queryKey: ['games'], queryFn: () => apiClient.games(initData ?? '') });
}

export function usePlayPool() {
  const initData = useSessionStore((state) => state.initData);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: PoolPlayInput; idempotencyKey: string }) =>
      apiClient.playPool(initData ?? '', input, idempotencyKey),
    onSuccess: (result) => {
      queryClient.setQueryData<MeDto>(['me'], (current) => current
        ? { ...current, wallet: { ...current.wallet, balance: result.balance, updatedAt: new Date().toISOString() } }
        : current);
      void queryClient.invalidateQueries({ queryKey: ['ledger'] });
      void queryClient.invalidateQueries({ queryKey: ['fairness', 'commitment', 'POCKET_POOL'] });
    },
  });
}
