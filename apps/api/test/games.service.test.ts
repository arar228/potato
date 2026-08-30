import type { GameRound, PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { GamesService } from '../src/modules/games/games.service.js';

const userId = '11111111-1111-4111-8111-111111111111';
const walletId = '22222222-2222-4222-8222-222222222222';
const gameId = '33333333-3333-4333-8333-333333333333';
const requestId = '44444444-4444-4444-8444-444444444444';
const fairnessId = '55555555-5555-4555-8555-555555555555';

function createPrisma(initialBalance: number, gameType: 'COIN_FLIP' | 'POCKET_POOL' = 'COIN_FLIP') {
  let balance = initialBalance;
  const rounds = new Map<string, GameRound>();
  const ledger: Array<{ amount: number; balanceAfter: number }> = [];
  let fairnessSeed: {
    id: string;
    userId: string;
    gameId: string;
    gameRoundId: string | null;
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string | null;
    nonce: number;
    createdAt: Date;
    usedAt: Date | null;
    revealedAt: Date | null;
  } | null = null;
  const wallet = () => ({ id: walletId, userId, currency: 'STARS' as const, balance, version: 0, createdAt: new Date(), updatedAt: new Date() });

  const game = () => gameType === 'COIN_FLIP'
    ? { id: gameId, type: 'COIN_FLIP', title: 'Coin Flip', isActive: true, config: { betOptions: [25, 50, 100, 300] }, createdAt: new Date(), updatedAt: new Date() }
    : {
        id: gameId,
        type: 'POCKET_POOL',
        title: 'Pocket Pool',
        isActive: true,
        config: {
          betOptions: [5, 15, 25],
          poolOptions: [
            { betAmount: 5, chanceBps: 100, payout: 500 },
            { betAmount: 15, chanceBps: 300, payout: 500 },
            { betAmount: 25, chanceBps: 500, payout: 500 },
          ],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

  const tx = {
    game: {
      findUnique: vi.fn(() => Promise.resolve(game())),
      findUniqueOrThrow: vi.fn(() => Promise.resolve(game())),
    },
    gameRound: {
      findUnique: vi.fn(({ where }: { where: { idempotencyKey: string } }) => Promise.resolve(rounds.get(where.idempotencyKey) ?? null)),
      create: vi.fn(({ data }: { data: Omit<GameRound, 'createdAt'> }) => {
        const round: GameRound = { ...data, createdAt: new Date() };
        rounds.set(round.idempotencyKey, round);
        return Promise.resolve(round);
      }),
    },
    wallet: {
      findUnique: vi.fn(() => Promise.resolve(wallet())),
      findUniqueOrThrow: vi.fn(() => Promise.resolve(wallet())),
      updateMany: vi.fn(({ where, data }: { where: { balance: { gte: number } }; data: { balance: { decrement: number } } }) => {
        if (balance < where.balance.gte) return Promise.resolve({ count: 0 });
        balance -= data.balance.decrement;
        return Promise.resolve({ count: 1 });
      }),
      update: vi.fn(({ data }: { data: { balance: { increment: number } } }) => {
        balance += data.balance.increment;
        return Promise.resolve(wallet());
      }),
    },
    ledgerEntry: {
      create: vi.fn(({ data }: { data: { amount: number; balanceAfter: number } }) => {
        ledger.push({ amount: data.amount, balanceAfter: data.balanceAfter });
        return Promise.resolve(data);
      }),
    },
    provablyFairSeed: {
      findFirst: vi.fn(() => Promise.resolve(fairnessSeed?.usedAt === null ? fairnessSeed : null)),
      create: vi.fn(({ data }: { data: Omit<NonNullable<typeof fairnessSeed>, 'id' | 'gameRoundId' | 'clientSeed' | 'createdAt' | 'usedAt' | 'revealedAt'> }) => {
        fairnessSeed = { ...data, id: fairnessId, gameRoundId: null, clientSeed: null, createdAt: new Date(), usedAt: null, revealedAt: null };
        return Promise.resolve(fairnessSeed);
      }),
      updateMany: vi.fn(({ data }: { data: { clientSeed: string; usedAt: Date } }) => {
        if (fairnessSeed === null || fairnessSeed.usedAt !== null) return Promise.resolve({ count: 0 });
        fairnessSeed = { ...fairnessSeed, ...data };
        return Promise.resolve({ count: 1 });
      }),
      update: vi.fn(({ data }: { data: { gameRoundId: string; revealedAt: Date } }) => {
        if (fairnessSeed === null) throw new Error('Fairness seed is missing');
        fairnessSeed = { ...fairnessSeed, ...data };
        return Promise.resolve(fairnessSeed);
      }),
    },
  };

  const prisma = {
    ...tx,
    $transaction: vi.fn((operation: (client: typeof tx) => unknown) => operation(tx)),
  } as unknown as PrismaClient;

  return { prisma, rounds, ledger, getBalance: () => balance };
}

describe('GamesService Coin Flip', () => {
  it('atomically debits a valid bet and credits a winning payout', async () => {
    const state = createPrisma(100);
    const service = new GamesService(state.prisma, () => 'HEADS');

    const result = await service.playCoinFlip(userId, { betAmount: 25, side: 'HEADS' }, requestId);

    expect(result.win).toBe(true);
    expect(result.payout).toBe(50);
    expect(result.balance).toBe(125);
    expect(state.ledger).toEqual([{ amount: -25, balanceAfter: 75 }, { amount: 50, balanceAfter: 125 }]);
  });

  it('rejects a bet when the wallet balance is insufficient', async () => {
    const state = createPrisma(20);
    const service = new GamesService(state.prisma, () => 'TAILS');

    await expect(service.playCoinFlip(userId, { betAmount: 25, side: 'HEADS' }, requestId)).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    expect(state.getBalance()).toBe(20);
    expect(state.rounds.size).toBe(0);
    expect(state.ledger).toHaveLength(0);
  });

  it('returns the original round for a duplicate idempotency key without a second debit', async () => {
    const state = createPrisma(100);
    const service = new GamesService(state.prisma, () => 'HEADS');

    const first = await service.playCoinFlip(userId, { betAmount: 25, side: 'HEADS' }, requestId);
    const duplicate = await service.playCoinFlip(userId, { betAmount: 25, side: 'HEADS' }, requestId);

    expect(duplicate.roundId).toBe(first.roundId);
    expect(state.getBalance()).toBe(125);
    expect(state.rounds.size).toBe(1);
    expect(state.ledger).toHaveLength(2);
  });
});

describe('GamesService Pocket Pool', () => {
  it('uses the backend chance config and credits the fixed jackpot atomically', async () => {
    const state = createPrisma(100, 'POCKET_POOL');
    const service = new GamesService(state.prisma, () => 'HEADS', () => 0);

    const result = await service.playPool(userId, { betAmount: 5 }, requestId);

    expect(result).toMatchObject({ win: true, result: 'JACKPOT', chanceBps: 100, payout: 500, balance: 595 });
    expect(result.targetPocket).toBeGreaterThanOrEqual(0);
    expect(result.targetPocket).toBeLessThan(6);
    expect(state.ledger).toEqual([{ amount: -5, balanceAfter: 95 }, { amount: 500, balanceAfter: 595 }]);
  });

  it('returns the same deterministic trajectory for an idempotent replay', async () => {
    const state = createPrisma(100, 'POCKET_POOL');
    const service = new GamesService(state.prisma, () => 'HEADS', () => 9_999);

    const first = await service.playPool(userId, { betAmount: 15 }, requestId);
    const duplicate = await service.playPool(userId, { betAmount: 15 }, requestId);

    expect(duplicate).toEqual(first);
    expect(state.getBalance()).toBe(85);
    expect(state.ledger).toHaveLength(1);
  });
});
