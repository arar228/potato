import { randomInt } from 'node:crypto';
import { Prisma, WalletCurrency, type DailyReward, type PrismaClient } from '@prisma/client';
import type {
  DailyRewardClaimDto,
  DailyRewardRequirement,
  DailyRewardStatusDto,
} from '@night-arcade/shared';
import { ConflictError, NotFoundError } from '../../lib/errors.js';

const rewardOptions = [5, 10, 20, 50, 100] as const;
const millisecondsPerDay = 86_400_000;

type RewardGenerator = () => number;
type Clock = () => Date;
type RequirementsProvider = (
  userId: string,
  rewardDate: Date,
) => DailyRewardRequirement[] | Promise<DailyRewardRequirement[]>;

const defaultRequirements: RequirementsProvider = () => [
  { id: 'OPEN_APP', title: 'Открыть приложение сегодня', completed: true },
  { id: 'DAILY_TASK', title: 'Выполнить ежедневное задание', completed: true },
];

export class DailyRewardService {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly rewardGenerator: RewardGenerator = () => rewardOptions[randomInt(0, rewardOptions.length)] ?? 5,
    private readonly clock: Clock = () => new Date(),
    private readonly requirementsProvider: RequirementsProvider = defaultRequirements,
  ) {}

  public async getStatus(userId: string): Promise<DailyRewardStatusDto> {
    const now = this.clock();
    const rewardDate = this.utcDate(now);
    const [claimed, requirements] = await Promise.all([
      this.prisma.dailyReward.findUnique({
        where: { userId_rewardDate: { userId, rewardDate } },
      }),
      this.requirementsProvider(userId, rewardDate),
    ]);

    return this.statusDto(claimed, requirements, rewardDate);
  }

  public async claim(userId: string, idempotencyKey: string): Promise<DailyRewardClaimDto> {
    const rewardDate = this.utcDate(this.clock());
    try {
      return await this.runSerializable(() => this.executeClaim(userId, rewardDate, idempotencyKey));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.dailyReward.findUnique({ where: { idempotencyKey } });
        if (existing !== null) return this.existingClaimDto(existing, userId);
        throw new ConflictError('Ежедневная награда уже получена', 'DAILY_REWARD_ALREADY_CLAIMED');
      }
      throw error;
    }
  }

  private async executeClaim(
    userId: string,
    rewardDate: Date,
    idempotencyKey: string,
  ): Promise<DailyRewardClaimDto> {
    return this.prisma.$transaction(async (tx) => {
      const duplicate = await tx.dailyReward.findUnique({ where: { idempotencyKey } });
      if (duplicate !== null) return this.existingClaimDto(duplicate, userId);

      const claimedToday = await tx.dailyReward.findUnique({
        where: { userId_rewardDate: { userId, rewardDate } },
      });
      if (claimedToday !== null) {
        throw new ConflictError('Ежедневная награда уже получена', 'DAILY_REWARD_ALREADY_CLAIMED');
      }

      const requirements = await this.requirementsProvider(userId, rewardDate);
      if (!requirements.every((requirement) => requirement.completed)) {
        throw new ConflictError('Ежедневный ключ ещё закрыт', 'DAILY_REQUIREMENTS_INCOMPLETE');
      }

      const wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: WalletCurrency.STARS } },
      });
      if (wallet === null) throw new NotFoundError('STARS wallet not found');

      const amount = this.rewardGenerator();
      if (!rewardOptions.includes(amount as (typeof rewardOptions)[number])) {
        throw new Error('Daily reward generator returned an unsupported amount');
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount }, version: { increment: 1 } },
      });
      const reward = await tx.dailyReward.create({
        data: {
          userId,
          walletId: wallet.id,
          rewardDate,
          amount,
          balanceAfter: updatedWallet.balance,
          idempotencyKey,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          userId,
          walletId: wallet.id,
          type: 'DAILY_REWARD',
          amount,
          balanceAfter: updatedWallet.balance,
          referenceType: 'DAILY_REWARD',
          referenceId: reward.id,
          idempotencyKey: `${idempotencyKey}:ledger`,
          metadata: { rewardDate: rewardDate.toISOString().slice(0, 10) },
        },
      });

      return this.claimDto(reward);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private existingClaimDto(
    reward: DailyReward,
    userId: string,
  ): DailyRewardClaimDto {
    if (reward.userId !== userId) {
      throw new ConflictError('Idempotency key уже используется', 'IDEMPOTENCY_CONFLICT');
    }
    return this.claimDto(reward);
  }

  private claimDto(reward: DailyReward): DailyRewardClaimDto {
    return {
      status: 'CLAIMED',
      requirements: [
        { id: 'OPEN_APP', title: 'Открыть приложение сегодня', completed: true },
        { id: 'DAILY_TASK', title: 'Выполнить ежедневное задание', completed: true },
      ],
      rewardOptions: [...rewardOptions],
      claimedReward: reward.amount,
      claimedAt: reward.claimedAt.toISOString(),
      nextResetAt: new Date(reward.rewardDate.getTime() + millisecondsPerDay).toISOString(),
      balance: reward.balanceAfter,
    };
  }

  private statusDto(
    claimed: DailyReward | null,
    requirements: DailyRewardRequirement[],
    rewardDate: Date,
  ): DailyRewardStatusDto {
    return {
      status: claimed !== null
        ? 'CLAIMED'
        : requirements.every((requirement) => requirement.completed)
          ? 'AVAILABLE'
          : 'LOCKED',
      requirements,
      rewardOptions: [...rewardOptions],
      claimedReward: claimed?.amount ?? null,
      claimedAt: claimed?.claimedAt.toISOString() ?? null,
      nextResetAt: new Date(rewardDate.getTime() + millisecondsPerDay).toISOString(),
    };
  }

  private utcDate(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
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
