import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { WalletService } from '../src/modules/wallet/wallet.service.js';

describe('WalletService', () => {
  it('returns an immutable ledger page and derives the cursor', async () => {
    const createdAt = new Date('2026-08-29T12:00:00.000Z');
    const rows = [
      {
        id: 'd10122b0-0278-4423-9e74-9b57b7ef7e01',
        userId: 'user-id',
        walletId: 'wallet-id',
        type: 'INITIAL_BALANCE' as const,
        amount: 500,
        balanceAfter: 500,
        referenceType: 'USER',
        referenceId: 'user-id',
        idempotencyKey: 'initial:user-id',
        metadata: null,
        createdAt,
      },
      {
        id: 'd10122b0-0278-4423-9e74-9b57b7ef7e02',
        userId: 'user-id',
        walletId: 'wallet-id',
        type: 'ADMIN_ADJUSTMENT' as const,
        amount: 1,
        balanceAfter: 501,
        referenceType: 'TEST',
        referenceId: 'test',
        idempotencyKey: 'test:user-id',
        metadata: null,
        createdAt,
      },
    ];
    const prisma = {
      ledgerEntry: { findMany: vi.fn().mockResolvedValue(rows) },
    } as unknown as PrismaClient;
    const service = new WalletService(prisma);

    const page = await service.getLedger('user-id', { limit: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.amount).toBe(500);
    expect(page.nextCursor).toBe(rows[0]?.id);
  });
});
