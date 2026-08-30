import { createHmac } from 'node:crypto';
import type { TelegramUser } from '@night-arcade/shared';

export function signTelegramInitData(input: {
  botToken: string;
  authDate: Date;
  user: TelegramUser;
  queryId?: string;
  signature?: string;
}): string {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(input.authDate.getTime() / 1000)),
    user: JSON.stringify(input.user),
  });
  if (input.queryId !== undefined) params.set('query_id', input.queryId);
  if (input.signature !== undefined) params.set('signature', input.signature);

  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(input.botToken).digest();
  const hash = createHmac('sha256', secret).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}
