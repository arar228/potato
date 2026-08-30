import type { DailyReward, PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { DailyRewardService } from '../src/modules/daily-reward/daily-reward.service.js';

const userId = '11111111-1111-4111-8111-111111111111';
const walletId = '22222222-2222-4222-8222-222222222222';
const firstRequestId = '33333333-3333-4333-8333-333333333333';
const secondRequestId = '44444444-4444-4444-8444-444444444444';
const now = new Date('2026-08-30T12:00:00.000Z');

function createPrisma(initialBalance: number) {
  let balance = initialBalance;
  const rewards: DailyReward[] = [];
  const ledger: Array<{ amount: number; balanceAfter: number }> = [];
  const wallet = () => ({
    id: walletId,
    userId,
    currency: 'STARS' as const,
    balance,
    version: 0,
    createdAt: now,
    updatedAt: now,
  });

  const findReward = ({ where }: {
    where: {
      idempotencyKey?: string;
      userId_rewardDate?: { userId: string; rewardDate: Date };
    };
  }) => Promise.resolve(rewards.find((reward) => (
    where.idempotencyKey !== undefined
      ? reward.idempotencyKey === where.idempotencyKey
      : reward.userId === where.userId_rewardDate?.userId
        && reward.rewardDate.getTime() === where.userId_rewardDate.rewardDate.getTime()
  )) ?? null);

  const tx = {
    dailyReward: {
      findUnique: vi.fn(findReward),
      create: vi.fn(({ data }: { data: Omit<DailyReward, 'id' | 'claimedAt' | 'createdAt'> }) => {
        const reward: DailyReward = {
          ...data,
          id: `55555555-5555-4555-8555-55555555555${rewards.length}`,
          claimedAt: now,
          createdAt: now,
        };
        rewards.push(reward);
        return Promise.resolve(reward);
      }),
    },
    wallet: {
      findUnique: vi.fn(() => Promise.resolve(wallet())),
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
  };

  const prisma = {
    ...tx,
    $transaction: vi.fn((operation: (client: typeof tx) => unknown) => operation(tx)),
  } as unknown as PrismaClient;

  return { prisma, rewards, ledger, getBalance: () => balance };
}

describe('DailyRewardService', () => {
  it('credits a server-selected reward exactly once and writes the ledger', async () => {
    const state = createPrisma(500);
    const service = new DailyRewardService(state.prisma, () => 20, () => now);

    const result = await service.claim(userId, firstRequestId);

    expect(result.claimedReward).toBe(20);
    expect(result.balance).toBe(520);
    expect(state.rewards).toHaveLength(1);
    expect(state.ledger).toEqual([{ amount: 20, balanceAfter: 520 }]);
  });

  it('returns the original claim for a repeated idempotency key', async () => {
    const state = createPrisma(500);
    const service = new DailyRewardService(state.prisma, () => 50, () => now);

    const first = await service.claim(userId, firstRequestId);
    const duplicate = await service.claim(userId, firstRequestId);

    expect(duplicate).toEqual(first);
    expect(state.getBalance()).toBe(550);
    expect(state.rewards).toHaveLength(1);
    expect(state.ledger).toHaveLength(1);
  });

  it('rejects a second claim with a different key on the same UTC day', async () => {
    const state = createPrisma(500);
    const service = new DailyRewardService(state.prisma, () => 10, () => now);
    await service.claim(userId, firstRequestId);

    await expect(service.claim(userId, secondRequestId)).rejects.toMatchObject({
      code: 'DAILY_REWARD_ALREADY_CLAIMED',
    });
    expect(state.getBalance()).toBe(510);
    expect(state.ledger).toHaveLength(1);
  });

  it('keeps the case locked while a server requirement is incomplete', async () => {
    const state = createPrisma(500);
    const service = new DailyRewardService(
      state.prisma,
      () => 10,
      () => now,
      () => [
        { id: 'OPEN_APP', title: 'Открыть приложение сегодня', completed: true },
        { id: 'DAILY_TASK', title: 'Выполнить ежедневное задание', completed: false },
      ],
    );

    expect(await service.getStatus(userId)).toMatchObject({ status: 'LOCKED' });
    await expect(service.claim(userId, firstRequestId)).rejects.toMatchObject({
      code: 'DAILY_REQUIREMENTS_INCOMPLETE',
    });
    expect(state.getBalance()).toBe(500);
  });
});
