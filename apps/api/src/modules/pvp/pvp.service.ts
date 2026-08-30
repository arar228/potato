import { randomInt, randomUUID } from 'node:crypto';
import { Prisma, WalletCurrency, type PrismaClient, type PvpRoom } from '@prisma/client';
import type { PvpDemoInput, PvpRoomDto } from '@night-arcade/shared';
import { ConflictError, InsufficientBalanceError, NotFoundError } from '../../lib/errors.js';

export class PvpService {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly roll: () => number = () => randomInt(0, 2),
  ) {}

  public async listRooms(userId: string): Promise<PvpRoomDto[]> {
    const rooms = await this.prisma.pvpRoom.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
    return rooms.map((room) => this.toDto(room));
  }

  public async playDemo(userId: string, input: PvpDemoInput, idempotencyKey: string): Promise<PvpRoomDto> {
    if (![25, 50, 100].includes(input.betAmount)) throw new ConflictError('Недопустимая ставка', 'INVALID_BET');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.pvpRoom.findUnique({ where: { idempotencyKey } });
        if (existing !== null) return this.existingDto(existing, userId, tx);

        const wallet = await tx.wallet.findUnique({ where: { userId_currency: { userId, currency: WalletCurrency.STARS } } });
        if (wallet === null) throw new NotFoundError('Кошелёк не найден');
        const debit = await tx.wallet.updateMany({
          where: { id: wallet.id, userId, balance: { gte: input.betAmount } },
          data: { balance: { decrement: input.betAmount }, version: { increment: 1 } },
        });
        if (debit.count !== 1) throw new InsufficientBalanceError();

        const debitedWallet = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
        const userWon = this.roll() === 0;
        const payout = userWon ? input.betAmount * 2 : 0;
        const roomId = randomUUID();
        const room = await tx.pvpRoom.create({ data: {
          id: roomId,
          userId,
          betAmount: input.betAmount,
          payout,
          winner: userWon ? 'USER' : 'OPPONENT',
          opponentName: 'Arcade Bot',
          resultSeed: randomInt(0, 2_147_483_647),
          idempotencyKey,
        } });
        await tx.ledgerEntry.create({ data: {
          userId, walletId: wallet.id, type: 'PVP_BET', amount: -input.betAmount,
          balanceAfter: debitedWallet.balance, referenceType: 'PVP_ROOM', referenceId: roomId,
          idempotencyKey: `${idempotencyKey}:bet`, metadata: { opponent: room.opponentName },
        } });
        let balance = debitedWallet.balance;
        if (payout > 0) {
          const paidWallet = await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: payout }, version: { increment: 1 } } });
          balance = paidWallet.balance;
          await tx.ledgerEntry.create({ data: {
            userId, walletId: wallet.id, type: 'PVP_REWARD', amount: payout,
            balanceAfter: balance, referenceType: 'PVP_ROOM', referenceId: roomId,
            idempotencyKey: `${idempotencyKey}:reward`, metadata: { opponent: room.opponentName },
          } });
        }
        return { ...this.toDto(room), balance };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.pvpRoom.findUnique({ where: { idempotencyKey } });
        if (existing !== null) return this.existingDto(existing, userId, this.prisma);
      }
      throw error;
    }
  }

  private async existingDto(room: PvpRoom, userId: string, tx: Prisma.TransactionClient | PrismaClient): Promise<PvpRoomDto> {
    if (room.userId !== userId) throw new ConflictError('Ключ запроса уже используется', 'IDEMPOTENCY_CONFLICT');
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId_currency: { userId, currency: WalletCurrency.STARS } } });
    return { ...this.toDto(room), balance: wallet.balance };
  }

  private toDto(room: PvpRoom): PvpRoomDto {
    return {
      id: room.id,
      status: room.status,
      betAmount: room.betAmount,
      payout: room.payout,
      winner: room.winner === 'USER' ? 'USER' : 'OPPONENT',
      opponentName: room.opponentName,
      resultSeed: room.resultSeed,
      createdAt: room.createdAt.toISOString(),
    };
  }
}
