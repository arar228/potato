import { config as loadDotenv } from 'dotenv';
import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';

loadDotenv({ path: '../../.env' });
const env = loadEnv();
const app = await buildApp(env);

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  app.log.fatal({ err: error }, 'API failed to start');
  process.exitCode = 1;
}
