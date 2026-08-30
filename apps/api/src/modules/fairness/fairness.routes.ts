import type { FastifyPluginCallback } from 'fastify';
import { fairGameTypeSchema } from '@night-arcade/shared';
import { z } from 'zod';

const roundParamsSchema = z.object({ gameId: z.string().uuid() });
const commitmentParamsSchema = z.object({ gameType: fairGameTypeSchema });

export const fairnessRoutes: FastifyPluginCallback = (app, _options, done) => {
  app.get('/fairness/commitment/:gameType', async (request) => {
    const { gameType } = commitmentParamsSchema.parse(request.params);
    return app.fairnessService.getCommitment(request.authUser.id, gameType);
  });

  app.get('/fairness/:gameId', async (request) => {
    const { gameId } = roundParamsSchema.parse(request.params);
    return app.fairnessService.getProof(request.authUser.id, gameId);
  });
  done();
};
