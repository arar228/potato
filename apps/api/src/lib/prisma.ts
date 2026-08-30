import { PrismaClient } from '@prisma/client';

export function createPrismaClient(logQueries = false): PrismaClient {
  return new PrismaClient({
    log: logQueries ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });
}
