import type { PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';
import type { AuthenticatedUser } from '../modules/auth/auth.types.js';
import type { UserService } from '../modules/users/user.service.js';
import type { WalletService } from '../modules/wallet/wallet.service.js';
import type { GamesService } from '../modules/games/games.service.js';
import type { DailyRewardService } from '../modules/daily-reward/daily-reward.service.js';
import type { PvpService } from '../modules/pvp/pvp.service.js';
import type { FairnessService } from '../modules/fairness/fairness.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthenticatedUser;
  }

  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis;
    userService: UserService;
    walletService: WalletService;
    gamesService: GamesService;
    dailyRewardService: DailyRewardService;
    pvpService: PvpService;
    fairnessService: FairnessService;
  }
}

export {};
