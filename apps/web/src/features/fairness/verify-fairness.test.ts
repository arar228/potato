import { describe, expect, it } from 'vitest';
import { verifyFairnessProof } from './verify-fairness';

describe('local provably fair verifier', () => {
  it('accepts a valid revealed Coin Flip proof', async () => {
    await expect(verifyFairnessProof({
      roundId: '11111111-1111-4111-8111-111111111111',
      gameId: '22222222-2222-4222-8222-222222222222',
      gameType: 'COIN_FLIP',
      algorithm: 'HMAC_SHA256',
      serverSeedHash: 'a8ae6e6ee929abea3afcfc5258c8ccd6f85273e0d4626d26c7279f3250f77c8e',
      serverSeed: '0123456789abcdef'.repeat(4),
      clientSeed: '44444444-4444-4444-8444-444444444444',
      nonce: 0,
      fairValue: 6_752,
      selection: 'HEADS',
      result: 'HEADS',
      createdAt: '2026-08-30T00:00:00.000Z',
      revealedAt: '2026-08-30T00:00:01.000Z',
    })).resolves.toBe(true);
  });

  it('rejects a tampered result', async () => {
    await expect(verifyFairnessProof({
      roundId: '11111111-1111-4111-8111-111111111111',
      gameId: '22222222-2222-4222-8222-222222222222',
      gameType: 'COIN_FLIP',
      algorithm: 'HMAC_SHA256',
      serverSeedHash: 'a8ae6e6ee929abea3afcfc5258c8ccd6f85273e0d4626d26c7279f3250f77c8e',
      serverSeed: '0123456789abcdef'.repeat(4),
      clientSeed: '44444444-4444-4444-8444-444444444444',
      nonce: 0,
      fairValue: 6_752,
      selection: 'TAILS',
      result: 'TAILS',
      createdAt: '2026-08-30T00:00:00.000Z',
      revealedAt: '2026-08-30T00:00:01.000Z',
    })).resolves.toBe(false);
  });
});
