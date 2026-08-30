import { Prisma, type PrismaClient, WalletCurrency } from '@prisma/client';
import type { MeDto, TelegramUser } from '@night-arcade/shared';
import { NotFoundError } from '../../lib/errors.js';

export class UserService {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly initialBalance: number,
  ) {}

  public async findOrCreateFromTelegram(telegramUser: TelegramUser): Promise<MeDto> {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.upsert({
          where: { telegramId: BigInt(telegramUser.id) },
          create: {
            telegramId: BigInt(telegramUser.id),
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name ?? null,
            username: telegramUser.username ?? null,
            languageCode: telegramUser.language_code ?? null,
            photoUrl: telegramUser.photo_url ?? null,
            isPremium: telegramUser.is_premium ?? false,
            wallets: { create: { currency: WalletCurrency.STARS } },
          },
          update: {
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name ?? null,
            username: telegramUser.username ?? null,
            languageCode: telegramUser.language_code ?? null,
            photoUrl: telegramUser.photo_url ?? null,
            isPremium: telegramUser.is_premium ?? false,
          },
          include: { wallets: { where: { currency: WalletCurrency.STARS } } },
        });

        const wallet = user.wallets[0];
        if (wallet === undefined) {
          throw new Error('STARS wallet was not created');
        }

        const initialEntry = await tx.ledgerEntry.createMany({
          data: {
            userId: user.id,
            walletId: wallet.id,
            type: 'INITIAL_BALANCE',
            amount: this.initialBalance,
            balanceAfter: this.initialBalance,
            referenceType: 'USER',
            referenceId: user.id,
            idempotencyKey: `initial-balance:${user.id}:stars`,
            metadata: { source: 'telegram-onboarding' },
          },
          skipDuplicates: true,
        });

        if (initialEntry.count === 1) {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: this.initialBalance, version: { increment: 1 } },
          });
        }

        return tx.user.findUniqueOrThrow({
          where: { id: user.id },
          include: { wallets: { where: { currency: WalletCurrency.STARS } } },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return this.toDto(result);
  }

  public async getMe(userId: string): Promise<MeDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallets: { where: { currency: WalletCurrency.STARS } } },
    });
    if (user === null) throw new NotFoundError('User not found');
    return this.toDto(user);
  }

  private toDto(user: {
    id: string;
    telegramId: bigint;
    firstName: string;
    lastName: string | null;
    username: string | null;
    languageCode: string | null;
    photoUrl: string | null;
    wallets: Array<{ id: string; balance: number; updatedAt: Date }>;
  }): MeDto {
    const wallet = user.wallets[0];
    if (wallet === undefined) throw new NotFoundError('STARS wallet not found');
    return {
      id: user.id,
      telegramId: user.telegramId.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      languageCode: user.languageCode,
      photoUrl: user.photoUrl,
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        currency: 'STARS',
        updatedAt: wallet.updatedAt.toISOString(),
      },
    };
  }
}
