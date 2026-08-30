import { TelegramStar } from './TelegramStar';

interface CurrencyAmountProps { amount: number; className?: string; }

export function CurrencyAmount({ amount, className = '' }: CurrencyAmountProps) {
  return (
    <span className={`currency-amount ${className}`.trim()} aria-label={`${amount} игровых звёзд`}>
      <TelegramStar className="currency-star" />
      <span>{new Intl.NumberFormat('ru-RU').format(amount)}</span>
    </span>
  );
}
