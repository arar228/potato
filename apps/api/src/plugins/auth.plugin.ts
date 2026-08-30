import fp from 'fastify-plugin';
import type { FastifyPluginCallback } from 'fastify';
import type { AppEnv } from '../config/env.js';
import { extractInitData, validateTelegramInitData } from '../modules/auth/telegram-init-data.js';

export interface AuthPluginOptions {
  env: AppEnv;
}

const authPluginImplementation: FastifyPluginCallback<AuthPluginOptions> = (app, options, done) => {
  app.decorateRequest('authUser');

  app.addHook('preHandler', async (request) => {
    if (request.routeOptions.url === '/health') return;
    const initData = extractInitData(request.headers.authorization);
    const validated = validateTelegramInitData(initData, {
      botToken: options.env.TELEGRAM_BOT_TOKEN,
      maxAgeSeconds: options.env.TELEGRAM_AUTH_MAX_AGE_SECONDS,
    });
    const user = await app.userService.findOrCreateFromTelegram(validated.user);
    request.authUser = { id: user.id, telegramId: BigInt(user.telegramId) };
  });
  done();
};

export const authPlugin = fp(authPluginImplementation, { name: 'telegram-auth' });
