import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CoinFlipPlayInput, MeDto } from '@night-arcade/shared';
import { useSessionStore } from '../../app/session.store';
import { apiClient } from '../../lib/api-client';

export function useCoinFlip() {
  const initData = useSessionStore((state) => state.initData);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CoinFlipPlayInput; idempotencyKey: string }) => apiClient.playCoinFlip(initData ?? '', input, idempotencyKey),
    onSuccess: (result) => {
      queryClient.setQueryData<MeDto>(['me'], (current) => current ? { ...current, wallet: { ...current.wallet, balance: result.balance, updatedAt: new Date().toISOString() } } : current);
      void queryClient.invalidateQueries({ queryKey: ['ledger'] });
      void queryClient.invalidateQueries({ queryKey: ['fairness', 'commitment', 'COIN_FLIP'] });
    },
  });
}
