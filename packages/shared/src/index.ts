import { z } from 'zod';

export const telegramUserSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.string().min(1),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
  is_premium: z.boolean().optional(),
  photo_url: z.string().url().optional(),
});

export type TelegramUser = z.infer<typeof telegramUserSchema>;

export const walletDtoSchema = z.object({
  id: z.string(),
  balance: z.number().int().nonnegative(),
  currency: z.literal('STARS'),
  updatedAt: z.string().datetime(),
});

export type WalletDto = z.infer<typeof walletDtoSchema>;

export const meDtoSchema = z.object({
  id: z.string(),
  telegramId: z.string(),
  firstName: z.string(),
  lastName: z.string().nullable(),
  username: z.string().nullable(),
  languageCode: z.string().nullable(),
  photoUrl: z.string().nullable(),
  wallet: walletDtoSchema,
});

export type MeDto = z.infer<typeof meDtoSchema>;

export const ledgerEntryDtoSchema = z.object({
  id: z.string(),
  type: z.enum([
    'INITIAL_BALANCE',
    'DAILY_REWARD',
    'MISSION_REWARD',
    'GAME_BET',
    'GAME_WIN',
    'PVP_BET',
    'PVP_REWARD',
    'ADMIN_ADJUSTMENT',
  ]),
  amount: z.number().int(),
  balanceAfter: z.number().int().nonnegative(),
  referenceType: z.string(),
  referenceId: z.string(),
  createdAt: z.string().datetime(),
});

export type LedgerEntryDto = z.infer<typeof ledgerEntryDtoSchema>;

export const ledgerPageDtoSchema = z.object({
  items: z.array(ledgerEntryDtoSchema),
  nextCursor: z.string().nullable(),
});

export type LedgerPageDto = z.infer<typeof ledgerPageDtoSchema>;

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const coinSideSchema = z.enum(['HEADS', 'TAILS']);
export type CoinSide = z.infer<typeof coinSideSchema>;

export const coinFlipPlayInputSchema = z.object({
  betAmount: z.union([z.literal(25), z.literal(50), z.literal(100), z.literal(300)]),
  side: coinSideSchema,
});
export type CoinFlipPlayInput = z.infer<typeof coinFlipPlayInputSchema>;

export const coinFlipResultDtoSchema = z.object({
  roundId: z.string().uuid(),
  gameId: z.string().uuid(),
  side: coinSideSchema,
  result: coinSideSchema,
  win: z.boolean(),
  betAmount: z.number().int().positive(),
  payout: z.number().int().nonnegative(),
  balance: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});
export type CoinFlipResultDto = z.infer<typeof coinFlipResultDtoSchema>;

export const gameDtoSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['COIN_FLIP', 'POCKET_POOL']),
  title: z.string(),
  isActive: z.boolean(),
  betOptions: z.array(z.number().int().positive()),
  poolOptions: z.array(z.object({
    betAmount: z.number().int().positive(),
    chanceBps: z.number().int().min(0).max(10_000),
    payout: z.number().int().positive(),
  })).optional(),
});
export type GameDto = z.infer<typeof gameDtoSchema>;

export const poolPlayInputSchema = z.object({
  betAmount: z.union([z.literal(5), z.literal(15), z.literal(25)]),
});
export type PoolPlayInput = z.infer<typeof poolPlayInputSchema>;

export const poolResultDtoSchema = z.object({
  roundId: z.string().uuid(),
  gameId: z.string().uuid(),
  result: z.enum(['JACKPOT', 'MISS']),
  win: z.boolean(),
  betAmount: z.number().int().positive(),
  chanceBps: z.number().int().min(0).max(10_000),
  payout: z.number().int().nonnegative(),
  targetPocket: z.number().int().min(0).max(5),
  trajectorySeed: z.number().int().nonnegative(),
  balance: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});
export type PoolResultDto = z.infer<typeof poolResultDtoSchema>;

export const dailyRewardRequirementSchema = z.object({
  id: z.enum(['OPEN_APP', 'DAILY_TASK']),
  title: z.string(),
  completed: z.boolean(),
});
export type DailyRewardRequirement = z.infer<typeof dailyRewardRequirementSchema>;

export const dailyRewardStatusDtoSchema = z.object({
  status: z.enum(['LOCKED', 'AVAILABLE', 'CLAIMED']),
  requirements: z.array(dailyRewardRequirementSchema),
  rewardOptions: z.array(z.number().int().positive()),
  claimedReward: z.number().int().positive().nullable(),
  claimedAt: z.string().datetime().nullable(),
  nextResetAt: z.string().datetime(),
});
export type DailyRewardStatusDto = z.infer<typeof dailyRewardStatusDtoSchema>;

export const dailyRewardClaimDtoSchema = dailyRewardStatusDtoSchema.extend({
  status: z.literal('CLAIMED'),
  claimedReward: z.number().int().positive(),
  claimedAt: z.string().datetime(),
  balance: z.number().int().nonnegative(),
});
export type DailyRewardClaimDto = z.infer<typeof dailyRewardClaimDtoSchema>;

export const pvpDemoInputSchema = z.object({
  betAmount: z.union([z.literal(25), z.literal(50), z.literal(100)]),
});
export type PvpDemoInput = z.infer<typeof pvpDemoInputSchema>;

export const pvpRoomDtoSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['FINISHED', 'CANCELLED']),
  betAmount: z.number().int().positive(),
  payout: z.number().int().nonnegative(),
  winner: z.enum(['USER', 'OPPONENT']),
  opponentName: z.string(),
  resultSeed: z.number().int().nonnegative(),
  balance: z.number().int().nonnegative().optional(),
  createdAt: z.string().datetime(),
});
export type PvpRoomDto = z.infer<typeof pvpRoomDtoSchema>;

export const fairGameTypeSchema = z.enum(['COIN_FLIP', 'POCKET_POOL']);
export type FairGameType = z.infer<typeof fairGameTypeSchema>;

export const fairnessCommitmentDtoSchema = z.object({
  id: z.string().uuid(),
  gameId: z.string().uuid(),
  gameType: fairGameTypeSchema,
  serverSeedHash: z.string().regex(/^[a-f0-9]{64}$/),
  nonce: z.number().int().nonnegative(),
});
export type FairnessCommitmentDto = z.infer<typeof fairnessCommitmentDtoSchema>;

export const fairnessProofDtoSchema = z.object({
  roundId: z.string().uuid(),
  gameId: z.string().uuid(),
  gameType: fairGameTypeSchema,
  algorithm: z.literal('HMAC_SHA256'),
  serverSeedHash: z.string().regex(/^[a-f0-9]{64}$/),
  serverSeed: z.string().regex(/^[a-f0-9]{64}$/),
  clientSeed: z.string().min(1),
  nonce: z.number().int().nonnegative(),
  fairValue: z.number().int().min(0).max(9_999),
  selection: z.string(),
  result: z.string(),
  createdAt: z.string().datetime(),
  revealedAt: z.string().datetime(),
});
export type FairnessProofDto = z.infer<typeof fairnessProofDtoSchema>;
