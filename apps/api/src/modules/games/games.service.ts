import { createHash, randomUUID } from 'node:crypto';
import { GameType, Prisma, WalletCurrency, type GameRound, type PrismaClient } from '@prisma/client';
import { z } from 'zod';
import type {
  CoinFlipPlayInput,
  CoinFlipResultDto,
  CoinSide,
  GameDto,
  PoolPlayInput,
  PoolResultDto,
} from '@night-arcade/shared';
import { ConflictError, InsufficientBalanceError, NotFoundError } from '../../lib/errors.js';
import { FairnessService } from '../fairness/fairness.service.js';

const coinFlipBets = [25, 50, 100, 300] as const;
const gameConfigSchema = z.object({
  betOptions: z.array(z.number().int().positive()),
  poolOptions: z.array(z.object({
    betAmount: z.number().int().positive(),
    chanceBps: z.number().int().min(0).max(10_000),
    payout: z.number().int().positive(),
  })).optional(),
});

type OutcomeGenerator = () => CoinSide;
type PoolRollGenerator = () => number;

export class GamesService {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly outcomeGenerator?: OutcomeGenerator,
    private readonly poolRollGenerator?: PoolRollGenerator,
    private readonly fairnessService = new FairnessService(prisma),
  ) {}

  public async listGames(): Promise<GameDto[]> {
    const games = await this.prisma.game.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    return games.map((game) => {
      const config = gameConfigSchema.parse(game.config);
      return {
        id: game.id,
        type: game.type,
        title: game.title,
        isActive: game.isActive,
        betOptions: config.betOptions,
        ...(config.poolOptions === undefined ? {} : { poolOptions: config.poolOptions }),
      };
    });
  }

  public async playCoinFlip(userId: string, input: CoinFlipPlayInput, idempotencyKey: string): Promise<CoinFlipResultDto> {
    if (!coinFlipBets.includes(input.betAmount)) {
      throw new ConflictError('Недопустимый размер ставки', 'INVALID_BET');
    }

    try {
      return await this.runSerializable(() => this.executeCoinFlip(userId, input, idempotencyKey));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.gameRound.findUnique({ where: { idempotencyKey } });
        if (existing !== null) return this.existingRoundDto(existing, userId);
      }
      throw error;
    }
  }

  public async playPool(userId: string, input: PoolPlayInput, idempotencyKey: string): Promise<PoolResultDto> {
    try {
      return await this.runSerializable(() => this.executePool(userId, input, idempotencyKey));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.gameRound.findUnique({ where: { idempotencyKey } });
        if (existing !== null) return this.existingPoolRoundDto(existing, userId);
      }
      throw error;
    }
  }

  private async executeCoinFlip(userId: string, input: CoinFlipPlayInput, idempotencyKey: string): Promise<CoinFlipResultDto> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.gameRound.findUnique({ where: { idempotencyKey } });
      if (existing !== null) return this.existingRoundDto(existing, userId, tx);

      const [game, wallet] = await Promise.all([
        tx.game.findUnique({ where: { type: GameType.COIN_FLIP } }),
        tx.wallet.findUnique({ where: { userId_currency: { userId, currency: WalletCurrency.STARS } } }),
      ]);
      if (game === null || !game.isActive) throw new NotFoundError('Coin Flip недоступна');
      if (wallet === null) throw new NotFoundError('STARS wallet not found');

      const debit = await tx.wallet.updateMany({
        where: { id: wallet.id, userId, balance: { gte: input.betAmount } },
        data: { balance: { decrement: input.betAmount }, version: { increment: 1 } },
      });
      if (debit.count !== 1) throw new InsufficientBalanceError();

      const debitedWallet = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
      const fairness = await this.fairnessService.consume(tx, userId, game.id, idempotencyKey);
      const result = this.outcomeGenerator?.() ?? (fairness.fairValue % 2 === 0 ? 'HEADS' : 'TAILS');
      const win = result === input.side;
      const payout = win ? input.betAmount * 2 : 0;
      const roundId = randomUUID();
      const round = await tx.gameRound.create({
        data: {
          id: roundId,
          gameId: game.id,
          userId,
          walletId: wallet.id,
          status: 'FINISHED',
          betAmount: input.betAmount,
          payout,
          selectedSide: input.side,
          result,
          fairValue: fairness.fairValue,
          idempotencyKey,
          resolvedAt: new Date(),
        },
      });

      await tx.ledgerEntry.create({
        data: {
          userId,
          walletId: wallet.id,
          type: 'GAME_BET',
          amount: -input.betAmount,
          balanceAfter: debitedWallet.balance,
          referenceType: 'GAME_ROUND',
          referenceId: roundId,
          idempotencyKey: `${idempotencyKey}:bet`,
          metadata: { game: 'COIN_FLIP', side: input.side },
        },
      });

      let balance = debitedWallet.balance;
      if (win) {
        const paidWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: payout }, version: { increment: 1 } },
        });
        balance = paidWallet.balance;
        await tx.ledgerEntry.create({
          data: {
            userId,
            walletId: wallet.id,
            type: 'GAME_WIN',
            amount: payout,
            balanceAfter: balance,
            referenceType: 'GAME_ROUND',
            referenceId: roundId,
            idempotencyKey: `${idempotencyKey}:win`,
            metadata: { game: 'COIN_FLIP', result },
          },
        });
      }

      await this.fairnessService.reveal(tx, fairness.id, roundId);

      return this.toDto(round, balance);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async executePool(userId: string, input: PoolPlayInput, idempotencyKey: string): Promise<PoolResultDto> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.gameRound.findUnique({ where: { idempotencyKey } });
      if (existing !== null) return this.existingPoolRoundDto(existing, userId, tx);

      const [game, wallet] = await Promise.all([
        tx.game.findUnique({ where: { type: GameType.POCKET_POOL } }),
        tx.wallet.findUnique({ where: { userId_currency: { userId, currency: WalletCurrency.STARS } } }),
      ]);
      if (game === null || !game.isActive) throw new NotFoundError('Pocket Pool недоступна');
      if (wallet === null) throw new NotFoundError('STARS wallet not found');

      const config = gameConfigSchema.parse(game.config);
      const option = config.poolOptions?.find((candidate) => candidate.betAmount === input.betAmount);
      if (option === undefined) throw new ConflictError('Недопустимый размер ставки', 'INVALID_BET');

      const debit = await tx.wallet.updateMany({
        where: { id: wallet.id, userId, balance: { gte: input.betAmount } },
        data: { balance: { decrement: input.betAmount }, version: { increment: 1 } },
      });
      if (debit.count !== 1) throw new InsufficientBalanceError();

      const debitedWallet = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
      const fairness = await this.fairnessService.consume(tx, userId, game.id, idempotencyKey);
      const roll = this.poolRollGenerator?.() ?? fairness.fairValue;
      if (!Number.isInteger(roll) || roll < 0 || roll >= 10_000) throw new Error('Pool roll generator returned an invalid value');
      const win = roll < option.chanceBps;
      const payout = win ? option.payout : 0;
      const roundId = randomUUID();
      const { targetPocket, trajectorySeed } = this.poolTrajectory(roundId);
      const round = await tx.gameRound.create({
        data: {
          id: roundId,
          gameId: game.id,
          userId,
          walletId: wallet.id,
          status: 'FINISHED',
          betAmount: input.betAmount,
          payout,
          selectedSide: `CHANCE_${option.chanceBps}`,
          result: win ? 'JACKPOT' : 'MISS',
          fairValue: fairness.fairValue,
          idempotencyKey,
          resolvedAt: new Date(),
        },
      });

      await tx.ledgerEntry.create({
        data: {
          userId,
          walletId: wallet.id,
          type: 'GAME_BET',
          amount: -input.betAmount,
          balanceAfter: debitedWallet.balance,
          referenceType: 'GAME_ROUND',
          referenceId: roundId,
          idempotencyKey: `${idempotencyKey}:bet`,
          metadata: { game: 'POCKET_POOL', chanceBps: option.chanceBps },
        },
      });

      let balance = debitedWallet.balance;
      if (win) {
        const paidWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: payout }, version: { increment: 1 } },
        });
        balance = paidWallet.balance;
        await tx.ledgerEntry.create({
          data: {
            userId,
            walletId: wallet.id,
            type: 'GAME_WIN',
            amount: payout,
            balanceAfter: balance,
            referenceType: 'GAME_ROUND',
            referenceId: roundId,
            idempotencyKey: `${idempotencyKey}:win`,
            metadata: { game: 'POCKET_POOL', targetPocket, trajectorySeed },
          },
        });
      }


      await this.fairnessService.reveal(tx, fairness.id, roundId);

      return this.toPoolDto(round, balance, option.chanceBps);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async existingRoundDto(round: GameRound, userId: string, tx: Prisma.TransactionClient | PrismaClient = this.prisma): Promise<CoinFlipResultDto> {
    if (round.userId !== userId) throw new ConflictError('Idempotency key уже используется', 'IDEMPOTENCY_CONFLICT');
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: round.walletId } });
    return this.toDto(round, wallet.balance);
  }

  private async existingPoolRoundDto(
    round: GameRound,
    userId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ): Promise<PoolResultDto> {
    if (round.userId !== userId) throw new ConflictError('Idempotency key уже используется', 'IDEMPOTENCY_CONFLICT');
    const [wallet, game] = await Promise.all([
      tx.wallet.findUniqueOrThrow({ where: { id: round.walletId } }),
      tx.game.findUniqueOrThrow({ where: { id: round.gameId } }),
    ]);
    const config = gameConfigSchema.parse(game.config);
    const option = config.poolOptions?.find((candidate) => candidate.betAmount === round.betAmount);
    if (option === undefined) throw new Error('Pocket Pool round configuration is missing');
    return this.toPoolDto(round, wallet.balance, option.chanceBps);
  }

  private toDto(round: GameRound, balance: number): CoinFlipResultDto {
    const side = z.enum(['HEADS', 'TAILS']).parse(round.selectedSide);
    const result = z.enum(['HEADS', 'TAILS']).parse(round.result);
    return {
      roundId: round.id,
      gameId: round.gameId,
      side,
      result,
      win: side === result,
      betAmount: round.betAmount,
      payout: round.payout,
      balance,
      createdAt: round.createdAt.toISOString(),
    };
  }

  private toPoolDto(
    round: GameRound,
    balance: number,
    chanceBps: number,
  ): PoolResultDto {
    const result = z.enum(['JACKPOT', 'MISS']).parse(round.result);
    const { targetPocket, trajectorySeed } = this.poolTrajectory(round.id);
    return {
      roundId: round.id,
      gameId: round.gameId,
      result,
      win: result === 'JACKPOT',
      betAmount: round.betAmount,
      chanceBps,
      payout: round.payout,
      targetPocket,
      trajectorySeed,
      balance,
      createdAt: round.createdAt.toISOString(),
    };
  }

  private poolTrajectory(roundId: string): { targetPocket: number; trajectorySeed: number } {
    const digest = createHash('sha256').update(roundId).digest();
    return {
      targetPocket: (digest[0] ?? 0) % 6,
      trajectorySeed: digest.readUInt32BE(1) & 0x7fff_ffff,
    };
  }

  private async runSerializable<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt === 2) throw error;
      }
    }
    throw new Error('Serializable transaction retry exhausted');
  }
}
