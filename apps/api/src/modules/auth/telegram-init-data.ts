import { createHmac, timingSafeEqual } from 'node:crypto';
import { telegramUserSchema, type TelegramUser } from '@night-arcade/shared';
import { UnauthorizedError } from '../../lib/errors.js';

export interface ValidatedInitData {
  authDate: Date;
  queryId: string | undefined;
  user: TelegramUser;
}

export interface InitDataValidationOptions {
  botToken: string;
  maxAgeSeconds: number;
  now?: Date;
}

function calculateHash(params: URLSearchParams, botToken: string): Buffer {
  const dataCheckString = [...params.entries()]
    // Bot-token HMAC validation covers every received field except `hash`.
    // Telegram's newer `signature` field is excluded only by the separate
    // Ed25519 third-party validation flow, not by this HMAC flow.
    .filter(([key]) => key !== 'hash')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  return createHmac('sha256', secretKey).update(dataCheckString).digest();
}

export function validateTelegramInitData(
  initData: string,
  options: InitDataValidationOptions,
): ValidatedInitData {
  if (initData.length === 0) {
    throw new UnauthorizedError('Telegram initData is empty');
  }

  const params = new URLSearchParams(initData);
  const suppliedHash = params.get('hash');
  const authDateRaw = params.get('auth_date');
  const userRaw = params.get('user');

  if (suppliedHash === null || authDateRaw === null || userRaw === null) {
    throw new UnauthorizedError('Telegram initData is incomplete');
  }

  if (!/^[a-f\d]{64}$/i.test(suppliedHash)) {
    throw new UnauthorizedError('Telegram initData hash is malformed');
  }

  const expectedHash = calculateHash(params, options.botToken);
  const receivedHash = Buffer.from(suppliedHash, 'hex');
  if (receivedHash.length !== expectedHash.length || !timingSafeEqual(receivedHash, expectedHash)) {
    throw new UnauthorizedError('Telegram initData signature is invalid');
  }

  const authDateSeconds = Number(authDateRaw);
  if (!Number.isInteger(authDateSeconds) || authDateSeconds <= 0) {
    throw new UnauthorizedError('Telegram auth_date is invalid');
  }

  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000);
  const ageSeconds = nowSeconds - authDateSeconds;
  if (ageSeconds < -30 || ageSeconds > options.maxAgeSeconds) {
    throw new UnauthorizedError('Telegram initData has expired');
  }

  let parsedUser: unknown;
  try {
    parsedUser = JSON.parse(userRaw);
  } catch {
    throw new UnauthorizedError('Telegram user payload is invalid JSON');
  }

  const userResult = telegramUserSchema.safeParse(parsedUser);
  if (!userResult.success) {
    throw new UnauthorizedError('Telegram user payload is invalid');
  }

  return {
    authDate: new Date(authDateSeconds * 1000),
    queryId: params.get('query_id') ?? undefined,
    user: userResult.data,
  };
}

export function extractInitData(authorization: string | undefined): string {
  if (authorization === undefined || !authorization.startsWith('tma ')) {
    throw new UnauthorizedError('Expected Authorization: tma <initData>');
  }

  return authorization.slice(4).trim();
}
