import { useMe } from '../features/auth/use-me';
import { BalancePill } from './BalancePill';

export function TelegramHeader() {
  const me = useMe();
  const motionPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('motionPreview');
  const balance = motionPreview ? 500 : me.data?.wallet.balance;
  return (
    <header className="telegram-header">
      {balance !== undefined ? <BalancePill compact balance={balance} /> : null}
    </header>
  );
}
