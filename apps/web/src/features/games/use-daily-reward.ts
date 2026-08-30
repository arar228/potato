import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DailyRewardStatusDto, MeDto } from '@night-arcade/shared';
import { useSessionStore } from '../../app/session.store';
import { apiClient } from '../../lib/api-client';

export function useDailyReward() {
  const initData = useSessionStore((state) => state.initData);
  return useQuery({
    queryKey: ['daily-reward'],
    queryFn: () => apiClient.dailyReward(initData ?? ''),
  });
}

export function useClaimDailyReward() {
  const initData = useSessionStore((state) => state.initData);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (idempotencyKey: string) => apiClient.claimDailyReward(initData ?? '', idempotencyKey),
    onSuccess: (result) => {
      queryClient.setQueryData<DailyRewardStatusDto>(['daily-reward'], result);
      queryClient.setQueryData<MeDto>(['me'], (current) => current
        ? {
            ...current,
            wallet: { ...current.wallet, balance: result.balance, updatedAt: new Date().toISOString() },
          }
        : current);
      void queryClient.invalidateQueries({ queryKey: ['ledger'] });
    },
  });
}
