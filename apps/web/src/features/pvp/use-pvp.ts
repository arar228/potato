import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MeDto, PvpDemoInput } from '@night-arcade/shared';
import { useSessionStore } from '../../app/session.store';
import { apiClient } from '../../lib/api-client';

export function usePvpRooms() {
  const initData = useSessionStore((state) => state.initData);
  return useQuery({ queryKey: ['pvp-rooms'], queryFn: () => apiClient.pvpRooms(initData ?? '') });
}

export function usePlayPvpDemo() {
  const initData = useSessionStore((state) => state.initData);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: PvpDemoInput; idempotencyKey: string }) => apiClient.playPvpDemo(initData ?? '', input, idempotencyKey),
    onSuccess: (result) => {
      if (result.balance !== undefined) queryClient.setQueryData<MeDto>(['me'], (current) => current ? { ...current, wallet: { ...current.wallet, balance: result.balance ?? current.wallet.balance, updatedAt: new Date().toISOString() } } : current);
      void queryClient.invalidateQueries({ queryKey: ['pvp-rooms'] });
      void queryClient.invalidateQueries({ queryKey: ['ledger'] });
    },
  });
}
