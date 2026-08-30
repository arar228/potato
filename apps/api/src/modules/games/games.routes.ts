import type { FastifyPluginCallback } from 'fastify';
import { coinFlipPlayInputSchema, poolPlayInputSchema } from '@night-arcade/shared';
import { z } from 'zod';

const idempotencyHeaderSchema = z.string().uuid();

export const gamesRoutes: FastifyPluginCallback = (app, _options, done) => {
  app.get('/games', () => app.gamesService.listGames());

  app.post('/games/coinflip/play', async (request) => {
    const body = coinFlipPlayInputSchema.parse(request.body);
    const idempotencyKey = idempotencyHeaderSchema.parse(request.headers['idempotency-key']);
    return app.gamesService.playCoinFlip(request.authUser.id, body, idempotencyKey);
  });

  app.post('/games/pool/play', async (request) => {
    const body = poolPlayInputSchema.parse(request.body);
    const idempotencyKey = idempotencyHeaderSchema.parse(request.headers['idempotency-key']);
    return app.gamesService.playPool(request.authUser.id, body, idempotencyKey);
  });
  done();
};
