import { describe, expect, it } from 'vitest';
import { createFairDigest, fairValueFromDigest, hashServerSeed } from '../src/modules/fairness/fairness.service.js';

describe('Provably fair primitives', () => {
  it('matches the published HMAC-SHA256 proof vector', () => {
    const serverSeed = '0123456789abcdef'.repeat(4);
    const clientSeed = '44444444-4444-4444-8444-444444444444';
    const digest = createFairDigest(serverSeed, clientSeed, 0);

    expect(hashServerSeed(serverSeed)).toBe('a8ae6e6ee929abea3afcfc5258c8ccd6f85273e0d4626d26c7279f3250f77c8e');
    expect(digest).toBe('5005443e5ed0a3f1af946cea90e1fa322ce581cbb3948436618ad32d1b763c44');
    expect(fairValueFromDigest(digest)).toBe(6_752);
    expect(fairValueFromDigest(digest) % 2 === 0 ? 'HEADS' : 'TAILS').toBe('HEADS');
  });
});
