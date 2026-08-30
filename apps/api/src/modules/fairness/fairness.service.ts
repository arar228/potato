import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { GameType, Prisma, PrismaClient, ProvablyFairSeed } from '@prisma/client';
import type { FairGameType, FairnessCommitmentDto, FairnessProofDto } from '@night-arcade/shared';
import { ConflictError, NotFoundError } from '../../lib/errors.js';

const FAIR_MODULUS = 10_000n;

export function hashServerSeed(serverSeed: string): string {
  return createHash('sha256').update(serverSeed).digest('hex');
}

export function createFairDigest(serverSeed: string, clientSeed: string, nonce: number): string {
  return createHmac('sha256', serverSeed).update(`${clientSeed}:${nonce}`).digest('hex');
}

export function fairValueFromDigest(digest: string): number {
  return Number(BigInt(`0x${digest.slice(0, 12)}`) % FAIR_MODULUS);
}

export interface ConsumedFairness {
  id: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  digest: string;
  fairValue: number;
}

export class FairnessService {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getCommitment(userId: string, gameType: FairGameType): Promise<FairnessCommitmentDto> {
    const game = await this.prisma.game.findUnique({ where: { type: gameType } });
    if (game === null || !game.isActive) throw new NotFoundError('Игра недоступна');

    const existing = await this.prisma.provablyFairSeed.findFirst({
      where: { userId, gameId: game.id, usedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    const seed = existing ?? await this.prisma.provablyFairSeed.create({
      data: this.newSeedData(userId, game.id),
    });
    return this.toCommitment(seed, game.type);
  }

  public async consume(
    tx: Prisma.TransactionClient,
    userId: string,
    gameId: string,
    clientSeed: string,
  ): Promise<ConsumedFairness> {
    let seed = await tx.provablyFairSeed.findFirst({
      where: { userId, gameId, usedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    seed ??= await tx.provablyFairSeed.create({ data: this.newSeedData(userId, gameId) });

    const claimed = await tx.provablyFairSeed.updateMany({
      where: { id: seed.id, usedAt: null },
      data: { clientSeed, usedAt: new Date() },
    });
    if (claimed.count !== 1) throw new ConflictError('Fairness commitment уже использован', 'FAIRNESS_COMMITMENT_USED');

    const digest = createFairDigest(seed.serverSeed, clientSeed, seed.nonce);
    return {
      id: seed.id,
      serverSeed: seed.serverSeed,
      serverSeedHash: seed.serverSeedHash,
      clientSeed,
      nonce: seed.nonce,
      digest,
      fairValue: fairValueFromDigest(digest),
    };
  }

  public async reveal(tx: Prisma.TransactionClient, seedId: string, roundId: string): Promise<void> {
    await tx.provablyFairSeed.update({
      where: { id: seedId },
      data: { gameRoundId: roundId, revealedAt: new Date() },
    });
  }

  public async getProof(userId: string, roundId: string): Promise<FairnessProofDto> {
    const seed = await this.prisma.provablyFairSeed.findUnique({
      where: { gameRoundId: roundId },
      include: { game: true, gameRound: true },
    });
    if (seed === null || seed.gameRound === null || seed.gameRound.userId !== userId) {
      throw new NotFoundError('Раунд не найден');
    }
    if (seed.clientSeed === null || seed.revealedAt === null) {
      throw new ConflictError('Server seed ещё не раскрыт', 'FAIRNESS_NOT_REVEALED');
    }
    return {
      roundId: seed.gameRound.id,
      gameId: seed.game.id,
      gameType: seed.game.type,
      algorithm: 'HMAC_SHA256',
      serverSeedHash: seed.serverSeedHash,
      serverSeed: seed.serverSeed,
      clientSeed: seed.clientSeed,
      nonce: seed.nonce,
      fairValue: seed.gameRound.fairValue,
      selection: seed.gameRound.selectedSide,
      result: seed.gameRound.result,
      createdAt: seed.gameRound.createdAt.toISOString(),
      revealedAt: seed.revealedAt.toISOString(),
    };
  }

  private newSeedData(userId: string, gameId: string) {
    const serverSeed = randomBytes(32).toString('hex');
    return { userId, gameId, serverSeed, serverSeedHash: hashServerSeed(serverSeed), nonce: 0 };
  }

  private toCommitment(seed: ProvablyFairSeed, gameType: GameType): FairnessCommitmentDto {
    return { id: seed.id, gameId: seed.gameId, gameType, serverSeedHash: seed.serverSeedHash, nonce: seed.nonce };
  }
}
