import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';

const ledgerQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const walletRoutes: FastifyPluginCallback = (app, _options, done) => {
  app.get('/wallet', (request) => app.walletService.getWallet(request.authUser.id));

  app.get('/ledger', (request) => {
    const query = ledgerQuerySchema.parse(request.query);
    return app.walletService.getLedger(request.authUser.id, {
      limit: query.limit,
      ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
    });
  });
  done();
};
