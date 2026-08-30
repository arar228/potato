import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { CurrencyAmount } from '../../components/CurrencyAmount';
import { TelegramStar } from '../../components/TelegramStar';
import { ApiClientError } from '../../lib/api-client';
import { useClaimDailyReward, useDailyReward } from './use-daily-reward';

const delay = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
const rewardOptions = [5, 10, 20, 50, 100] as const;
const idleReels = [5, 20, 100] as const;

function resetDailyScroll(behavior: ScrollBehavior = 'auto') {
  const reset = () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    document.querySelector<HTMLElement>('.app-scroll-region')?.scrollTo({ top: 0, behavior });
  };
  window.requestAnimationFrame(reset);
  window.setTimeout(reset, 120);
}

function SlotReel({ index, reward, spinId, reducedMotion }: {
  index: number;
  reward: number;
  spinId: number;
  reducedMotion: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const sequence = spinId === 0
    ? [reward]
    : [
        ...Array.from({ length: 18 + index * 3 }, (_, itemIndex) =>
          rewardOptions[(itemIndex + index * 2) % rewardOptions.length] ?? 5),
        reward,
      ];

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const itemHeight = track.parentElement?.clientHeight ?? 64;
    track.style.setProperty('--daily-reel-height', `${itemHeight}px`);
    const targetY = spinId === 0 ? 0 : -(sequence.length - 1) * itemHeight;
    if (spinId === 0) {
      track.style.transform = 'translate3d(0, 0, 0)';
      track.style.filter = 'none';
      return undefined;
    }

    const duration = reducedMotion ? 720 + index * 100 : 2_150 + index * 340;
    const startedAt = performance.now();
    let animationFrame = 0;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - ((1 - progress) ** 4);
      const y = targetY * eased;
      const blur = progress < .08 || progress > .9 ? 0 : Math.min(2.5, (1 - progress) * 3.2);
      track.style.transform = `translate3d(0, ${y}px, 0)`;
      track.style.filter = `blur(${blur}px)`;
      if (progress < 1) animationFrame = window.requestAnimationFrame(animate);
    };
    track.style.transform = 'translate3d(0, 0, 0)';
    track.style.filter = 'none';
    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [index, reducedMotion, reward, sequence.length, spinId]);

  return (
    <div className="daily-reel">
      <div
        ref={trackRef}
        key={`${spinId}-${reward}`}
        className="daily-reel__track"
      >
        {sequence.map((amount, itemIndex) => <span key={`${spinId}-${itemIndex}`}><TelegramStar /><b>{amount}</b></span>)}
      </div>
    </div>
  );
}

export function DailyFreebiePage() {
  const reducedMotion = useReducedMotion();
  const dailyReward = useDailyReward();
  const claim = useClaimDailyReward();
  const motionPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('motionPreview');
  const effectiveReducedMotion = motionPreview ? false : reducedMotion ?? false;
  const [isOpening, setIsOpening] = useState(false);
  const [revealedReward, setRevealedReward] = useState<number | null>(null);
  const [reelReward, setReelReward] = useState<number | null>(null);
  const [spinId, setSpinId] = useState(0);
  const [isReplayReveal, setIsReplayReveal] = useState(false);
  const status = motionPreview ? 'CLAIMED' : dailyReward.data?.status ?? 'LOCKED';
  const claimedReward = motionPreview ? 20 : dailyReward.data?.claimedReward;
  const requirements = motionPreview
    ? [
        { id: 'OPEN_APP', title: 'Открыть Night Arcade', completed: true },
        { id: 'DAILY_TASK', title: 'Забрать ежедневный ключ', completed: true },
      ]
    : dailyReward.data?.requirements ?? [];
  const errorMessage = claim.error instanceof ApiClientError
    ? claim.error.message
    : claim.isError
      ? 'Не удалось открыть ежедневный кейс'
      : null;

  const openCase = async () => {
    if (status !== 'AVAILABLE' || isOpening) return;
    resetDailyScroll();
    claim.reset();
    setRevealedReward(null);
    setIsReplayReveal(false);
    setIsOpening(true);
    try {
      const result = await claim.mutateAsync(crypto.randomUUID());
      setReelReward(result.claimedReward);
      setSpinId((current) => current + 1);
      await delay(effectiveReducedMotion ? 1_100 : 3_100);
      resetDailyScroll('auto');
      setRevealedReward(result.claimedReward);
    } catch {
      // The typed mutation error is rendered below the machine.
    } finally {
      setIsOpening(false);
    }
  };

  const replayReels = async () => {
    if (status !== 'CLAIMED' || claimedReward === null || claimedReward === undefined || isOpening) return;
    resetDailyScroll();
    setRevealedReward(null);
    setIsReplayReveal(true);
    setReelReward(claimedReward);
    setSpinId((current) => current + 1);
    setIsOpening(true);
    await delay(effectiveReducedMotion ? 1_100 : 3_100);
    resetDailyScroll('auto');
    setIsOpening(false);
    setRevealedReward(claimedReward);
  };

  const buttonLabel = isOpening
    ? 'Открываем…'
    : status === 'AVAILABLE'
      ? 'Открыть бесплатно'
      : status === 'CLAIMED'
        ? `Повторить барабаны · +${claimedReward ?? 0}`
        : 'Закрыто';
  const displayedReward = reelReward ?? claimedReward;

  return (
    <div className="daily-page">
      <section className="daily-hero">
        <p className="section-eyebrow">Один ключ · каждый день</p>
        <h1>Daily Freebie</h1>
        <p>Ежедневный игровой подарок без покупок</p>
      </section>

      <motion.section
        className={`daily-machine-large${isOpening ? ' daily-machine-large--opening' : ''}${status === 'LOCKED' ? ' daily-machine-large--locked' : ''}`}
        initial={reducedMotion ? false : { opacity: 0, y: 24, scale: .96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: .55, ease: [0.22, 1, 0.36, 1] }}
        aria-label="Автомат ежедневной награды"
      >
        <img className="daily-machine-large__art" src="/assets/daily-freebie-machine-v2.png" alt="" />
        <div className="daily-machine-large__label">{status === 'LOCKED' ? 'Требуется ключ' : 'FREE PLAY'}</div>
        <div className="daily-machine-large__screen">
          {status === 'LOCKED' ? <div className="daily-machine-large__padlock" aria-label="Автомат закрыт"><i /><b /></div> : <div className="daily-machine-large__reels">
            {idleReels.map((idleReward, index) => (
              <SlotReel
                key={index}
                index={index}
                reward={displayedReward ?? idleReward}
                spinId={spinId}
                reducedMotion={effectiveReducedMotion}
              />
            ))}
          </div>}
          <div className="daily-machine-large__glass" />
        </div>
      </motion.section>

      <motion.button
        type="button"
        className="daily-open-button"
        disabled={status === 'LOCKED' || isOpening || (!motionPreview && dailyReward.isPending)}
        onClick={() => { void (status === 'CLAIMED' ? replayReels() : openCase()); }}
        whileTap={reducedMotion ? {} : { scale: .98 }}
      >
        {buttonLabel}
      </motion.button>
      {errorMessage ? <p className="game-error" role="alert">{errorMessage}</p> : null}

      <section className="daily-key-card">
        <div className="daily-key-card__heading"><span><TelegramStar /></span><div><small>Ежедневный ключ</small><h2>{status === 'CLAIMED' ? 'Награда получена' : 'Получите ежедневный ключ'}</h2></div></div>
        <div className="daily-requirements">
          {requirements.map((requirement) => (
            <div key={requirement.id} className={requirement.completed ? 'daily-requirement daily-requirement--done' : 'daily-requirement'}>
              <span>{requirement.completed ? '✓' : '○'}</span>
              <p>{requirement.title}</p>
              <small>{requirement.completed ? 'ГОТОВО' : 'НЕ ВЫПОЛНЕНО'}</small>
            </div>
          ))}
        </div>
        <p className="daily-key-card__note">Состояние ключа и награда определяются сервером. Следующий ключ — после 00:00 UTC.</p>
      </section>

      <AnimatePresence>
        {revealedReward !== null ? (
          <motion.div className="daily-reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={reducedMotion ? false : { scale: .45, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
              <span>{isReplayReveal ? 'Сегодня выпало' : 'Ваш подарок'}</span><strong>+<CurrencyAmount amount={revealedReward} /></strong><p>{isReplayReveal ? 'награда уже начислена' : 'игровых звёзд'}</p>
              <button type="button" onClick={() => { setRevealedReward(null); resetDailyScroll('auto'); }}>{isReplayReveal ? 'Закрыть' : 'Забрать'}</button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
