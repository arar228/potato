import {
  apiErrorSchema,
  coinFlipResultDtoSchema,
  gameDtoSchema,
  ledgerPageDtoSchema,
  meDtoSchema,
  walletDtoSchema,
  dailyRewardStatusDtoSchema,
  dailyRewardClaimDtoSchema,
  poolResultDtoSchema,
  pvpRoomDtoSchema,
  fairnessCommitmentDtoSchema,
  fairnessProofDtoSchema,
  type LedgerPageDto,
  type CoinFlipPlayInput,
  type CoinFlipResultDto,
  type GameDto,
  type MeDto,
  type WalletDto,
  type DailyRewardStatusDto,
  type DailyRewardClaimDto,
  type PoolPlayInput,
  type PoolResultDto,
  type PvpDemoInput,
  type PvpRoomDto,
  type FairGameType,
  type FairnessCommitmentDto,
  type FairnessProofDto,
} from '@night-arcade/shared';
import type { ZodType } from 'zod';

const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;

function getApiUrl(): string {
  return configuredApiUrl ?? window.location.origin;
}

export class ApiClientError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(path: string, schema: ZodType<T>, initData: string, init: RequestInit = {}): Promise<T> {
  const requestInit: RequestInit = {
    ...init,
    headers: { Authorization: `tma ${initData}`, ...init.headers },
  };
  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}/api/v1${path}`, requestInit);
  } catch (error) {
    const headers = new Headers(requestInit.headers);
    const canRetry = (requestInit.method ?? 'GET') === 'GET' || headers.has('Idempotency-Key');
    if (!canRetry || !(error instanceof TypeError)) throw error;
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    response = await fetch(`${getApiUrl()}/api/v1${path}`, requestInit);
  }
  const payload: unknown = await response.json();
  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(payload);
    throw new ApiClientError(
      response.status,
      parsedError.success ? parsedError.data.code : 'UNKNOWN_ERROR',
      parsedError.success ? parsedError.data.message : 'Request failed',
    );
  }
  return schema.parse(payload);
}

export const apiClient = {
  me: (initData: string): Promise<MeDto> => request('/me', meDtoSchema, initData),
  wallet: (initData: string): Promise<WalletDto> => request('/wallet', walletDtoSchema, initData),
  ledger: (initData: string): Promise<LedgerPageDto> =>
    request('/ledger', ledgerPageDtoSchema, initData),
  games: (initData: string): Promise<GameDto[]> => request('/games', gameDtoSchema.array(), initData),
  playCoinFlip: (initData: string, input: CoinFlipPlayInput, idempotencyKey: string): Promise<CoinFlipResultDto> =>
    request('/games/coinflip/play', coinFlipResultDtoSchema, initData, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(input),
    }),
  dailyReward: (initData: string): Promise<DailyRewardStatusDto> =>
    request('/daily-reward', dailyRewardStatusDtoSchema, initData),
  claimDailyReward: (initData: string, idempotencyKey: string): Promise<DailyRewardClaimDto> =>
    request('/daily-reward/claim', dailyRewardClaimDtoSchema, initData, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  playPool: (initData: string, input: PoolPlayInput, idempotencyKey: string): Promise<PoolResultDto> =>
    request('/games/pool/play', poolResultDtoSchema, initData, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(input),
    }),
  pvpRooms: (initData: string): Promise<PvpRoomDto[]> =>
    request('/pvp/rooms', pvpRoomDtoSchema.array(), initData),
  playPvpDemo: (initData: string, input: PvpDemoInput, idempotencyKey: string): Promise<PvpRoomDto> =>
    request('/pvp/match/demo', pvpRoomDtoSchema, initData, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(input),
    }),
  fairnessCommitment: (initData: string, gameType: FairGameType): Promise<FairnessCommitmentDto> =>
    request(`/fairness/commitment/${gameType}`, fairnessCommitmentDtoSchema, initData),
  fairnessProof: (initData: string, roundId: string): Promise<FairnessProofDto> =>
    request(`/fairness/${roundId}`, fairnessProofDtoSchema, initData),
};
