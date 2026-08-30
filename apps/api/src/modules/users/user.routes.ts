import type { FastifyPluginCallback } from 'fastify';

export const userRoutes: FastifyPluginCallback = (app, _options, done) => {
  app.get('/me', (request) => app.userService.getMe(request.authUser.id));
  done();
};
