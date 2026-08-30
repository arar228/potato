import { describe, expect, it } from 'vitest';
import { UnauthorizedError } from '../src/lib/errors.js';
import {
  extractInitData,
  validateTelegramInitData,
} from '../src/modules/auth/telegram-init-data.js';
import { signTelegramInitData } from './helpers/telegram.js';

const botToken = '123456:unit-test-secret';
const now = new Date('2026-08-29T12:00:00.000Z');

function validInitData(): string {
  return signTelegramInitData({
    botToken,
    authDate: new Date('2026-08-29T11:59:30.000Z'),
    queryId: 'AAE-test-query',
    user: {
      id: 42,
      first_name: 'Sasha',
      username: 'sasha_test',
      language_code: 'ru',
    },
  });
}

describe('validateTelegramInitData', () => {
  it('accepts a correctly signed and fresh payload', () => {
    const result = validateTelegramInitData(validInitData(), {
      botToken,
      maxAgeSeconds: 3600,
      now,
    });
    expect(result.user.id).toBe(42);
    expect(result.queryId).toBe('AAE-test-query');
  });

  it('accepts current Telegram payloads whose signature field is covered by the HMAC', () => {
    const initData = signTelegramInitData({
      botToken,
      authDate: new Date('2026-08-29T11:59:30.000Z'),
      user: { id: 42, first_name: 'Sasha' },
      signature: 'telegram-ed25519-signature',
    });

    expect(
      validateTelegramInitData(initData, { botToken, maxAgeSeconds: 3600, now }).user.id,
    ).toBe(42);
  });

  it('rejects data changed after it was signed', () => {
    const tampered = validInitData().replace('sasha_test', 'admin');
    expect(() =>
      validateTelegramInitData(tampered, { botToken, maxAgeSeconds: 3600, now }),
    ).toThrow(UnauthorizedError);
  });

  it('rejects expired data even when its signature is valid', () => {
    const expired = signTelegramInitData({
      botToken,
      authDate: new Date('2026-08-28T00:00:00.000Z'),
      user: { id: 42, first_name: 'Sasha' },
    });
    expect(() => validateTelegramInitData(expired, { botToken, maxAgeSeconds: 3600, now })).toThrow(
      'expired',
    );
  });

  it('requires the tma authorization scheme', () => {
    expect(extractInitData(`tma ${validInitData()}`)).toBe(validInitData());
    expect(() => extractInitData('Bearer token')).toThrow(UnauthorizedError);
  });
});
