import { WalletCurrency, type PrismaClient } from '@prisma/client';
import type { LedgerPageDto, WalletDto } from '@night-arcade/shared';
import { NotFoundError } from '../../lib/errors.js';

export interface LedgerQuery {
  cursor?: string;
  limit: number;
}

export class WalletService {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getWallet(userId: string): Promise<WalletDto> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: WalletCurrency.STARS } },
    });
    if (wallet === null) throw new NotFoundError('STARS wallet not found');
    return {
      id: wallet.id,
      balance: wallet.balance,
      currency: 'STARS',
      updatedAt: wallet.updatedAt.toISOString(),
    };
  }

  public async getLedger(userId: string, query: LedgerQuery): Promise<LedgerPageDto> {
    const rows = await this.prisma.ledgerEntry.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor === undefined ? {} : { cursor: { id: query.cursor }, skip: 1 }),
    });
    const hasNextPage = rows.length > query.limit;
    const items = rows.slice(0, query.limit);
    return {
      items: items.map((entry) => ({
        id: entry.id,
        type: entry.type,
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        createdAt: entry.createdAt.toISOString(),
      })),
      nextCursor: hasNextPage ? (items.at(-1)?.id ?? null) : null,
    };
  }
}
