import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';

const idempotencyHeaderSchema = z.string().uuid();

export const dailyRewardRoutes: FastifyPluginCallback = (app, _options, done) => {
  app.get('/daily-reward', (request) => app.dailyRewardService.getStatus(request.authUser.id));

  app.post('/daily-reward/claim', (request) => {
    const idempotencyKey = idempotencyHeaderSchema.parse(request.headers['idempotency-key']);
    return app.dailyRewardService.claim(request.authUser.id, idempotencyKey);
  });
  done();
};
