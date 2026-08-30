import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PoolResultDto } from '@night-arcade/shared';
import { CurrencyAmount } from '../../components/CurrencyAmount';
import { FairnessHash } from '../../components/FairnessHash';
import { ApiClientError } from '../../lib/api-client';
import { useMe } from '../auth/use-me';
import { PoolPhysicsCanvas } from './PoolPhysicsCanvas';
import { useGamesConfig, usePlayPool } from './use-pocket-pool';
import { useFairnessCommitment } from '../fairness/use-fairness';

const delay = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export function PocketPoolPage() {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const me = useMe();
  const games = useGamesConfig();
  const pool = usePlayPool();
  const commitment = useFairnessCommitment('POCKET_POOL');
  const [betAmount, setBetAmount] = useState<5 | 15 | 25>(5);
  const [activeResult, setActiveResult] = useState<PoolResultDto | null>(null);
  const [shownResult, setShownResult] = useState<PoolResultDto | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const motionPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('motionPreview');
  const poolConfig = games.data?.find((game) => game.type === 'POCKET_POOL');
  const options = poolConfig?.poolOptions ?? (motionPreview
    ? [{ betAmount: 5, chanceBps: 100, payout: 500 }, { betAmount: 15, chanceBps: 300, payout: 500 }, { betAmount: 25, chanceBps: 500, payout: 500 }]
    : []);
  const balance = motionPreview ? 500 : me.data?.wallet.balance ?? 0;
  const insufficient = balance < betAmount;
  const busy = pool.isPending || isAnimating;
  const errorMessage = pool.error instanceof ApiClientError
    ? pool.error.message
    : pool.isError
      ? 'Не удалось запустить Pocket Pool'
      : null;

  const play = async () => {
    if (busy || insufficient || options.length === 0) return;
    pool.reset();
    setShownResult(null);
    try {
      const result = motionPreview
        ? {
            roundId: crypto.randomUUID(),
            gameId: crypto.randomUUID(),
            result: 'JACKPOT' as const,
            win: true,
            betAmount,
            chanceBps: options.find((option) => option.betAmount === betAmount)?.chanceBps ?? 100,
            payout: 500,
            targetPocket: 2,
            trajectorySeed: 847_291,
            balance: 995,
            createdAt: new Date().toISOString(),
          }
        : await pool.mutateAsync({ input: { betAmount }, idempotencyKey: crypto.randomUUID() });
      setActiveResult(result);
      setIsAnimating(true);
      await delay(reducedMotion ? 1_500 : 3_850);
      setShownResult(result);
    } catch {
      // The mutation error is rendered below the controls.
    } finally {
      setIsAnimating(false);
      setActiveResult(null);
    }
  };

  return (
    <div className="pool-page">
      <section className={`pool-table${activeResult?.win === true ? ' pool-table--jackpot' : ''}${activeResult?.win === false ? ' pool-table--miss' : ''}`} aria-label="Игровой стол Pocket Pool">
        <div className="pool-table__wood"><div className="pool-table__felt">
          {Array.from({ length: 6 }, (_, index) => <i key={index} className={`pool-pocket pool-pocket--${index}`} />)}
          <PoolPhysicsCanvas result={activeResult} reducedMotion={reducedMotion ?? false} />
          <motion.div
            className="pool-cue-stick"
            animate={activeResult === null
              ? { y: 0, opacity: 1 }
              : { y: [0, -24, 86], opacity: [1, 1, 0] }}
            transition={{ duration: reducedMotion ? .1 : .72, times: [0, .36, 1], ease: [0.2, .75, .2, 1] }}
            aria-hidden="true"
          ><i /></motion.div>
          <motion.div
            className="pool-impact"
            animate={activeResult === null ? { scale: 0, opacity: 0 } : { scale: [0, 0, 1.5, 0], opacity: [0, 0, .8, 0] }}
            transition={{ duration: reducedMotion ? .1 : 1.05, times: [0, .62, .72, 1] }}
            aria-hidden="true"
          />
          <div className={`pool-aim-line${activeResult === null ? '' : ' pool-aim-line--hidden'}`} aria-hidden="true" />
        </div></div>
        <div className="pool-table__badge"><small>ДЖЕКПОТ</small><strong><CurrencyAmount amount={500} /></strong></div>
      </section>

      <section className="pool-controls">
        <div className="pool-controls__heading"><div><small>Выберите шанс</small><strong>Ставка</strong></div><span>Баланс <CurrencyAmount amount={balance} /></span></div>
        {errorMessage ? <p className="game-error" role="alert">{errorMessage}</p> : null}
        <motion.button type="button" className="pool-start" disabled={busy || insufficient || options.length === 0 || (!motionPreview && me.isPending)} onClick={() => { void play(); }} whileTap={reducedMotion ? {} : { scale: .98 }}>
          {busy ? <><i className="game-card__spinner" /> Удар…</> : insufficient ? 'Недостаточно звёзд' : options.length === 0 ? 'Загружаем конфиг…' : 'Старт'}
        </motion.button>
        <div className="pool-bets" role="radiogroup" aria-label="Ставка и шанс">
          {options.map((option) => (
            <motion.button
              key={option.betAmount}
              type="button"
              role="radio"
              aria-checked={betAmount === option.betAmount}
              disabled={busy}
              className={betAmount === option.betAmount ? 'pool-bet pool-bet--selected' : 'pool-bet'}
              onClick={() => setBetAmount(option.betAmount as 5 | 15 | 25)}
              whileTap={reducedMotion ? {} : { scale: .95 }}
            ><strong><CurrencyAmount amount={option.betAmount} /></strong><small>Шанс {option.chanceBps / 100}%</small></motion.button>
          ))}
        </div>
        <p className="pool-disclaimer">Шанс приходит с сервера. Результат определяется до воспроизведения анимации.</p>
        {commitment.data ? <FairnessHash hash={commitment.data.serverSeedHash} label="Hash" /> : null}
      </section>

      <AnimatePresence>
        {shownResult !== null ? (
          <motion.div className="pool-result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={reducedMotion ? false : { y: 35, scale: .88 }} animate={{ y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 280, damping: 22 }}>
              <span>{shownResult.win ? 'ДЖЕКПОТ' : 'ПОЧТИ!'}</span>
              <strong>{shownResult.win ? `+${shownResult.payout}` : 'Мимо'}</strong>
              <p>{shownResult.win ? 'Все шары в лунках — награда начислена' : 'Попробуй другую траекторию'}</p>
              <div><small>Новый баланс</small><b><CurrencyAmount amount={shownResult.balance} /></b></div>
              <div className="pool-result__actions">
                <button type="button" className="pool-result__verify" onClick={() => { void navigate(`/fairness/${shownResult.roundId}`); }}>Проверить честность</button>
                <button type="button" onClick={() => setShownResult(null)}>Играть ещё</button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
