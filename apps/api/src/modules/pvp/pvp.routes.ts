import type { FastifyPluginCallback } from 'fastify';
import { pvpDemoInputSchema } from '@night-arcade/shared';
import { z } from 'zod';

const idempotencyHeaderSchema = z.string().uuid();

export const pvpRoutes: FastifyPluginCallback = (app, _options, done) => {
  app.get('/pvp/rooms', (request) => app.pvpService.listRooms(request.authUser.id));
  app.post('/pvp/match/demo', (request) => {
    const input = pvpDemoInputSchema.parse(request.body);
    const idempotencyKey = idempotencyHeaderSchema.parse(request.headers['idempotency-key']);
    return app.pvpService.playDemo(request.authUser.id, input, idempotencyKey);
  });
  done();
};
