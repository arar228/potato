import { config as loadDotenv } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { loadEnv } from '../src/config/env.js';
import { UserService } from '../src/modules/users/user.service.js';

loadDotenv({ path: '../../.env' });
const env = loadEnv();
const prisma = new PrismaClient();
const users = new UserService(prisma, env.INITIAL_BALANCE);

await prisma.game.upsert({
  where: { type: 'COIN_FLIP' },
  create: { type: 'COIN_FLIP', title: 'Coin Flip', config: { betOptions: [25, 50, 100, 300] } },
  update: { title: 'Coin Flip', isActive: true, config: { betOptions: [25, 50, 100, 300] } },
});

await prisma.game.upsert({
  where: { type: 'POCKET_POOL' },
  create: {
    type: 'POCKET_POOL',
    title: 'Pocket Pool',
    config: {
      betOptions: [5, 15, 25],
      poolOptions: [
        { betAmount: 5, chanceBps: 100, payout: 500 },
        { betAmount: 15, chanceBps: 300, payout: 500 },
        { betAmount: 25, chanceBps: 500, payout: 500 },
      ],
    },
  },
  update: {
    title: 'Pocket Pool',
    isActive: true,
    config: {
      betOptions: [5, 15, 25],
      poolOptions: [
        { betAmount: 5, chanceBps: 100, payout: 500 },
        { betAmount: 15, chanceBps: 300, payout: 500 },
        { betAmount: 25, chanceBps: 500, payout: 500 },
      ],
    },
  },
});

await users.findOrCreateFromTelegram({
  id: 900_000_001,
  first_name: 'Nova',
  last_name: 'Bot',
  username: 'nova_demo_opponent',
  language_code: 'ru',
});
await users.findOrCreateFromTelegram({
  id: 900_000_002,
  first_name: 'Comet',
  last_name: 'Bot',
  username: 'comet_demo_opponent',
  language_code: 'ru',
});

await prisma.$disconnect();
