import type { FairnessProofDto } from '@night-arcade/shared';

function toHex(value: ArrayBuffer): string {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyFairnessProof(proof: FairnessProofDto): Promise<boolean> {
  const encoder = new TextEncoder();
  const hash = toHex(await crypto.subtle.digest('SHA-256', encoder.encode(proof.serverSeed)));
  if (hash !== proof.serverSeedHash) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(proof.serverSeed),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(`${proof.clientSeed}:${proof.nonce}`)));
  const fairValue = Number(BigInt(`0x${digest.slice(0, 12)}`) % 10_000n);
  if (fairValue !== proof.fairValue) return false;

  const expectedResult = proof.gameType === 'COIN_FLIP'
    ? fairValue % 2 === 0 ? 'HEADS' : 'TAILS'
    : fairValue < Number(proof.selection.replace('CHANCE_', '')) ? 'JACKPOT' : 'MISS';
  return expectedResult === proof.result;
}
