import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { UserService } from '../src/modules/users/user.service.js';

const updatedAt = new Date('2026-08-29T12:00:00.000Z');
const baseUser = {
  id: '4fd416f9-e017-44c1-956f-62fa8eab0801',
  telegramId: 42n,
  firstName: 'Sasha',
  lastName: null,
  username: 'sasha_test',
  languageCode: 'ru',
  photoUrl: null,
  wallets: [
    {
      id: '265472f8-aea6-4178-8f87-90598058ba77',
      balance: 0,
      updatedAt,
    },
  ],
};

interface InitialEntryArgs {
  data: { amount: number; type: string };
  skipDuplicates: boolean;
}

function createPrismaMock(initialEntryCount: number) {
  const createMany = vi
    .fn<(args: InitialEntryArgs) => Promise<{ count: number }>>()
    .mockResolvedValue({ count: initialEntryCount });
  const transactionClient = {
    user: {
      upsert: vi.fn().mockResolvedValue(baseUser),
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        ...baseUser,
        wallets: [{ ...baseUser.wallets[0], balance: initialEntryCount === 1 ? 500 : 0 }],
      }),
    },
    ledgerEntry: { createMany },
    wallet: { update: vi.fn().mockResolvedValue(undefined) },
  };
  const prisma = {
    $transaction: vi.fn(async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
      callback(transactionClient),
    ),
  } as unknown as PrismaClient;
  return { prisma, transactionClient };
}

describe('UserService', () => {
  it('creates exactly one initial ledger credit and wallet snapshot', async () => {
    const { prisma, transactionClient } = createPrismaMock(1);
    const service = new UserService(prisma, 500);
    const me = await service.findOrCreateFromTelegram({ id: 42, first_name: 'Sasha' });

    const createCall = transactionClient.ledgerEntry.createMany.mock.calls[0]?.[0];
    expect(createCall?.data.amount).toBe(500);
    expect(createCall?.data.type).toBe('INITIAL_BALANCE');
    expect(createCall?.skipDuplicates).toBe(true);
    expect(transactionClient.wallet.update).toHaveBeenCalledOnce();
    expect(me.wallet.balance).toBe(500);
  });

  it('does not credit the wallet when the idempotency key already exists', async () => {
    const { prisma, transactionClient } = createPrismaMock(0);
    const service = new UserService(prisma, 500);
    await service.findOrCreateFromTelegram({ id: 42, first_name: 'Sasha' });
    expect(transactionClient.wallet.update).not.toHaveBeenCalled();
  });
});
