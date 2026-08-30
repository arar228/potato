import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CoinFlipResultDto, CoinSide } from '@night-arcade/shared';
import { BetSelector } from '../../components/BetSelector';
import { CurrencyAmount } from '../../components/CurrencyAmount';
import { GameResultModal } from '../../components/GameResultModal';
import { TelegramStar } from '../../components/TelegramStar';
import { FairnessHash } from '../../components/FairnessHash';
import { ApiClientError } from '../../lib/api-client';
import { useMe } from '../auth/use-me';
import { useCoinFlip } from './use-coin-flip';
import { useFairnessCommitment } from '../fairness/use-fairness';

const betOptions = [25, 50, 100, 300] as const;
const delay = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

function createSpinTimes(halfTurns: number): number[] {
  const segmentWeights = Array.from({ length: halfTurns }, (_, index) => {
    const progress = halfTurns === 1 ? 1 : index / (halfTurns - 1);
    return 1 + 2.8 * progress ** 3;
  });
  const totalWeight = segmentWeights.reduce((total, weight) => total + weight, 0);
  let elapsedWeight = 0;

  return [
    0,
    ...segmentWeights.map((weight) => {
      elapsedWeight += weight;
      return elapsedWeight / totalWeight;
    }),
  ];
}

export function CoinFlipPage() {
  const navigate = useNavigate();
  const me = useMe();
  const coinFlip = useCoinFlip();
  const commitment = useFairnessCommitment('COIN_FLIP');
  const reducedMotion = useReducedMotion();
  const [side, setSide] = useState<CoinSide>('HEADS');
  const [betAmount, setBetAmount] = useState<number>(25);
  const [isAnimating, setIsAnimating] = useState(false);
  const [result, setResult] = useState<CoinFlipResultDto | null>(null);
  const [coinRotation, setCoinRotation] = useState(0);
  const [landedSide, setLandedSide] = useState<CoinSide>('HEADS');
  const [spinHalfTurns, setSpinHalfTurns] = useState(12);

  const motionPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('motionPreview');
  const balance = motionPreview ? 500 : me.data?.wallet.balance ?? 0;
  const insufficient = balance < betAmount;
  const busy = isAnimating || coinFlip.isPending;
  const errorMessage = coinFlip.error instanceof ApiClientError ? coinFlip.error.message : coinFlip.isError ? 'Не удалось запустить игру' : null;

  const play = async () => {
    if (busy || insufficient) return;
    coinFlip.reset();
    setResult(null);
    try {
      const round = await coinFlip.mutateAsync({ input: { betAmount: betAmount as 25 | 50 | 100 | 300, side }, idempotencyKey: crypto.randomUUID() });
      const halfTurn = round.result === landedSide ? 0 : 180;
      setSpinHalfTurns(halfTurn === 0 ? 12 : 13);
      setIsAnimating(true);
      setCoinRotation((current) => current + 2160 + halfTurn);
      await delay(reducedMotion ? 150 : 1900);
      setLandedSide(round.result);
      setResult(round);
    } catch {
      // TanStack Query exposes the typed error state below the controls.
    } finally {
      setIsAnimating(false);
    }
  };

  const selectSide = (nextSide: CoinSide) => {
    if (busy || nextSide === side) return;
    setSide(nextSide);
    if (nextSide !== landedSide) {
      setCoinRotation((current) => current + 180);
      setLandedSide(nextSide);
    }
  };

  const faceOpacity = (face: CoinSide): number | number[] => {
    if (!isAnimating) return landedSide === face ? 1 : 0;
    return Array.from({ length: spinHalfTurns + 1 }, (_, index) => {
      const visibleSide = index % 2 === 0 ? landedSide : landedSide === 'HEADS' ? 'TAILS' : 'HEADS';
      return visibleSide === face ? 1 : 0;
    });
  };
  const spinTimes = createSpinTimes(spinHalfTurns);
  const spinRotation = Array.from(
    { length: spinHalfTurns + 1 },
    (_, index) => coinRotation - spinHalfTurns * 180 + index * 180,
  );

  return (
    <div className="coinflip-page">
      <section className="coin-stage" aria-live="polite">
        <div className="coin-stage__halo" aria-hidden="true" />
        <motion.div
          className={`coin-3d coin-3d--${landedSide.toLowerCase()}${isAnimating ? ' coin-3d--spinning' : ''}`}
          animate={{
            rotateY: isAnimating ? spinRotation : coinRotation,
            rotateX: isAnimating && !reducedMotion ? [0, 14, -10, 8, 0] : 0,
            rotateZ: isAnimating && !reducedMotion ? [0, -5, 6, -3, 0] : 0,
            y: isAnimating && !reducedMotion ? [0, -22, -5, -15, 0] : 0,
            scale: isAnimating && !reducedMotion ? [1, 1.08, 1.02, 1.05, 1] : 1,
          }}
          transition={{
            rotateY: isAnimating
              ? { duration: reducedMotion ? .15 : 1.9, ease: 'linear', times: spinTimes }
              : { duration: reducedMotion ? .15 : .42, ease: [0.16, 0.72, 0.18, 1] },
            rotateX: { duration: reducedMotion ? .15 : 1.9, ease: 'easeInOut' },
            rotateZ: { duration: reducedMotion ? .15 : 1.9, ease: 'easeInOut' },
            y: { duration: reducedMotion ? .15 : 1.9, ease: 'easeInOut' },
            scale: { duration: reducedMotion ? .15 : 1.9, ease: 'easeInOut' },
          }}
        >
          <div className="coin-3d__thickness" aria-hidden="true">
            {Array.from({ length: 33 }, (_, index) => (
              <i key={index} style={{ transform: `translateZ(${index - 16}px)` }} />
            ))}
          </div>
          <motion.div
            className="coin-face coin-face--heads"
            animate={{ opacity: faceOpacity('HEADS') }}
            transition={
              isAnimating
                ? { duration: reducedMotion ? .15 : 1.9, ease: 'linear', times: spinTimes }
                : { duration: .12 }
            }
          ><TelegramStar /><small>ARCADE</small></motion.div>
          <motion.div
            className="coin-face coin-face--tails"
            animate={{ opacity: faceOpacity('TAILS') }}
            transition={
              isAnimating
                ? { duration: reducedMotion ? .15 : 1.9, ease: 'linear', times: spinTimes }
                : { duration: .12 }
            }
          ><span>☾</span><small>NIGHT</small></motion.div>
        </motion.div>
        <p>{coinFlip.isPending ? 'Сервер определяет результат…' : isAnimating ? 'Монета вращается…' : 'Выберите сторону'}</p>
      </section>

      <div className="side-selector" role="radiogroup" aria-label="Сторона монеты">
        <motion.button type="button" role="radio" aria-checked={side === 'HEADS'} disabled={busy} className={side === 'HEADS' ? 'side-option side-option--selected' : 'side-option'} onClick={() => selectSide('HEADS')} whileTap={reducedMotion ? {} : { scale: .95 }}><TelegramStar /><strong>Свет</strong><small>Сторона света</small></motion.button>
        <motion.button type="button" role="radio" aria-checked={side === 'TAILS'} disabled={busy} className={side === 'TAILS' ? 'side-option side-option--selected' : 'side-option'} onClick={() => selectSide('TAILS')} whileTap={reducedMotion ? {} : { scale: .95 }}><span>☾</span><strong>Ночь</strong><small>Сторона ☾</small></motion.button>
      </div>

      <section className="coinflip-controls">
        <div className="coinflip-controls__label"><span>Ставка</span><strong>Баланс <CurrencyAmount amount={balance} /></strong></div>
        {errorMessage ? <p className="game-error" role="alert">{errorMessage}</p> : null}
        <motion.button className="coinflip-start" type="button" disabled={busy || insufficient || (!motionPreview && me.isPending)} onClick={() => void play()} whileTap={reducedMotion ? {} : { scale: .98 }}>
          {busy ? <><i className="game-card__spinner" /> Определяем результат</> : insufficient ? 'Недостаточно звёзд' : 'Старт'}
        </motion.button>
        <BetSelector options={betOptions} selected={betAmount} disabled={busy} onChange={setBetAmount} />
        <p className="coinflip-disclaimer">Результат создаётся сервером. Выигрыш — x2 от ставки.</p>
        {commitment.data ? <FairnessHash hash={commitment.data.serverSeedHash} label="Hash" /> : null}
      </section>

      <GameResultModal result={result} onClose={() => { setResult(null); coinFlip.reset(); }} onVerify={(roundId) => { void navigate(`/fairness/${roundId}`); }} />
    </div>
  );
}
