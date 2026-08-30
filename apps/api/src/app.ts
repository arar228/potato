import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import type Redis from 'ioredis';
import { ZodError } from 'zod';
import type { AppEnv } from './config/env.js';
import { AppError } from './lib/errors.js';
import { createPrismaClient } from './lib/prisma.js';
import { createRedisClient } from './lib/redis.js';
import { authPlugin } from './plugins/auth.plugin.js';
import { userRoutes } from './modules/users/user.routes.js';
import { UserService } from './modules/users/user.service.js';
import { walletRoutes } from './modules/wallet/wallet.routes.js';
import { WalletService } from './modules/wallet/wallet.service.js';
import { gamesRoutes } from './modules/games/games.routes.js';
import { GamesService } from './modules/games/games.service.js';
import { dailyRewardRoutes } from './modules/daily-reward/daily-reward.routes.js';
import { DailyRewardService } from './modules/daily-reward/daily-reward.service.js';
import { pvpRoutes } from './modules/pvp/pvp.routes.js';
import { PvpService } from './modules/pvp/pvp.service.js';
import { fairnessRoutes } from './modules/fairness/fairness.routes.js';
import { FairnessService } from './modules/fairness/fairness.service.js';

export interface AppDependencies {
  prisma?: ReturnType<typeof createPrismaClient>;
  redis?: Redis;
}

export async function buildApp(
  env: AppEnv,
  dependencies: AppDependencies = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : { level: env.LOG_LEVEL },
    trustProxy: true,
    requestIdHeader: 'x-request-id',
  });

  const prisma = dependencies.prisma ?? createPrismaClient(env.NODE_ENV === 'development');
  const redis = dependencies.redis ?? createRedisClient(env.REDIS_URL);
  app.decorate('prisma', prisma);
  app.decorate('redis', redis);
  app.decorate('userService', new UserService(prisma, env.INITIAL_BALANCE));
  app.decorate('walletService', new WalletService(prisma));
  const fairnessService = new FairnessService(prisma);
  app.decorate('fairnessService', fairnessService);
  app.decorate('gamesService', new GamesService(prisma, undefined, undefined, fairnessService));
  app.decorate('dailyRewardService', new DailyRewardService(
    prisma,
    undefined,
    undefined,
    () => [
      { id: 'OPEN_APP', title: 'Открыть приложение сегодня', completed: true },
      {
        id: 'DAILY_TASK',
        title: 'Выполнить ежедневное задание',
        completed: env.NODE_ENV !== 'production',
      },
    ],
  ));
  app.decorate('pvpService', new PvpService(prisma));

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: [env.WEB_APP_URL],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Request-Id'],
  });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });

  app.get('/health', { config: { public: true } }, () => ({ status: 'ok' }));

  await app.register(authPlugin, { env });
  await app.register(userRoutes, { prefix: '/api/v1' });
  await app.register(walletRoutes, { prefix: '/api/v1' });
  await app.register(gamesRoutes, { prefix: '/api/v1' });
  await app.register(dailyRewardRoutes, { prefix: '/api/v1' });
  await app.register(pvpRoutes, { prefix: '/api/v1' });
  await app.register(fairnessRoutes, { prefix: '/api/v1' });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        requestId: request.id,
      });
    }
    if (error instanceof ZodError) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        requestId: request.id,
      });
    }
    request.log.error({ err: error }, 'Unhandled request error');
    return reply.status(500).send({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId: request.id,
    });
  });

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
    if (redis.status !== 'end') redis.disconnect();
  });

  return app;
}
