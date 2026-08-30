import { motion, useReducedMotion } from 'framer-motion';
import { CurrencyAmount } from './CurrencyAmount';

interface BetSelectorProps {
  options: readonly number[];
  selected: number;
  disabled?: boolean;
  onChange: (amount: number) => void;
}

export function BetSelector({ options, selected, disabled = false, onChange }: BetSelectorProps) {
  const reducedMotion = useReducedMotion();
  return (
    <div className="bet-selector" role="radiogroup" aria-label="Размер ставки">
      {options.map((amount) => (
        <motion.button
          key={amount}
          type="button"
          role="radio"
          aria-checked={selected === amount}
          disabled={disabled}
          className={selected === amount ? 'bet-selector__option bet-selector__option--selected' : 'bet-selector__option'}
          onClick={() => onChange(amount)}
          whileTap={reducedMotion ? {} : { scale: 0.94 }}
        >
          <CurrencyAmount amount={amount} />
        </motion.button>
      ))}
    </div>
  );
}
