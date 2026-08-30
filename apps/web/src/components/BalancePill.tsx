import { CurrencyAmount } from './CurrencyAmount';

interface BalancePillProps { balance: number; compact?: boolean; }

export function BalancePill({ balance, compact = false }: BalancePillProps) {
  return (
    <div className={`balance-pill${compact ? ' balance-pill--compact' : ''}`}>
      <CurrencyAmount amount={balance} />
    </div>
  );
}
