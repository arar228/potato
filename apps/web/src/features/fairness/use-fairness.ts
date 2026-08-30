import { useQuery } from '@tanstack/react-query';
import type { FairGameType } from '@night-arcade/shared';
import { useSessionStore } from '../../app/session.store';
import { apiClient } from '../../lib/api-client';

export function useFairnessCommitment(gameType: FairGameType) {
  const initData = useSessionStore((state) => state.initData);
  return useQuery({
    queryKey: ['fairness', 'commitment', gameType],
    queryFn: () => apiClient.fairnessCommitment(initData ?? '', gameType),
    staleTime: Infinity,
  });
}

export function useFairnessProof(roundId: string | undefined) {
  const initData = useSessionStore((state) => state.initData);
  return useQuery({
    queryKey: ['fairness', 'proof', roundId],
    queryFn: () => apiClient.fairnessProof(initData ?? '', roundId ?? ''),
    enabled: roundId !== undefined,
  });
}
