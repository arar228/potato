import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { CoinFlipResultDto } from '@night-arcade/shared';
import { CurrencyAmount } from './CurrencyAmount';
import { TelegramStar } from './TelegramStar';

interface GameResultModalProps {
  result: CoinFlipResultDto | null;
  onClose: () => void;
  onVerify?: (roundId: string) => void;
}

export function GameResultModal({ result, onClose, onVerify }: GameResultModalProps) {
  const reducedMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {result ? (
        <motion.div className="result-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section className={result.win ? 'result-modal result-modal--win' : 'result-modal result-modal--loss'} initial={reducedMotion ? false : { opacity: 0, scale: .88, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .94 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }} aria-label="Результат игры">
            <span className="result-modal__eyebrow">{result.win ? 'ПОБЕДА' : 'В ЭТОТ РАЗ НЕ ПОВЕЗЛО'}</span>
            <div className={result.result === 'TAILS' ? 'result-modal__coin result-modal__coin--night' : 'result-modal__coin'}>{result.result === 'HEADS' ? <TelegramStar /> : <span>☾</span>}</div>
            <h2>{result.result === 'HEADS' ? 'Выпала сторона «Свет»' : 'Выпала сторона «Ночь»'}</h2>
            <p>{result.win ? `Начислено ${result.payout} игровых звёзд` : `Ставка ${result.betAmount} звёзд проиграла`}</p>
            <div className="result-modal__balance"><small>Новый баланс</small><strong><CurrencyAmount amount={result.balance} /></strong></div>
            <div className="result-modal__actions">
              {onVerify ? <button type="button" className="secondary-button" onClick={() => onVerify(result.roundId)}>Проверить честность</button> : null}
              <button type="button" className="primary-button" onClick={onClose}>Играть ещё</button>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
