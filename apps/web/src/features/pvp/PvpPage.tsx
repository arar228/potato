import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { PvpRoomDto } from '@night-arcade/shared';
import { CurrencyAmount } from '../../components/CurrencyAmount';
import { ApiClientError } from '../../lib/api-client';
import { useMe } from '../auth/use-me';
import { usePlayPvpDemo, usePvpRooms } from './use-pvp';

const bets = [25, 50, 100] as const;
const delay = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export function PvpPage() {
  const reducedMotion = useReducedMotion();
  const me = useMe();
  const rooms = usePvpRooms();
  const match = usePlayPvpDemo();
  const [betAmount, setBetAmount] = useState<25 | 50 | 100>(25);
  const [finding, setFinding] = useState(false);
  const [result, setResult] = useState<PvpRoomDto | null>(null);
  const motionPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('motionPreview');
  const balance = motionPreview ? 500 : me.data?.wallet.balance ?? 0;
  const roomItems = motionPreview ? [{ id: '55555555-5555-4555-8555-555555555555', status: 'FINISHED' as const, betAmount: 25, payout: 50, winner: 'USER' as const, opponentName: 'Arcade Bot', resultSeed: 42, createdAt: new Date().toISOString() }] : rooms.data;
  const errorMessage = match.error instanceof ApiClientError ? match.error.message : match.isError ? 'Не удалось начать матч' : null;

  const play = async () => {
    if (finding || match.isPending || balance < betAmount) return;
    match.reset();
    setResult(null);
    setFinding(true);
    try {
      const response = motionPreview ? { id: crypto.randomUUID(), status: 'FINISHED' as const, betAmount, payout: betAmount * 2, winner: 'USER' as const, opponentName: 'Arcade Bot', resultSeed: 42, balance: 500 + betAmount, createdAt: new Date().toISOString() } : await match.mutateAsync({ input: { betAmount }, idempotencyKey: crypto.randomUUID() });
      await delay(reducedMotion ? 250 : 1_350);
      setResult(response);
    } catch {
      // Typed error is rendered below the action.
    } finally {
      setFinding(false);
    }
  };

  return (
    <div className="pvp-page">
      <div className={`pvp-queue${finding ? ' pvp-queue--finding' : ''}`}>
        <span className="pvp-queue__history" aria-hidden="true">↶</span>
        <div className="pvp-queue__status">{finding ? 'Ищем соперника…' : 'Ждём игроков'}</div>
        <span className="pvp-queue__help" aria-hidden="true">?</span>
      </div>

      <section className="pvp-match-card">
        <h1>{finding ? 'Матч начинается!' : 'Будь первым!'}</h1>
        <div className="pvp-player-marker" aria-hidden="true" />
        <motion.div className="pvp-player-slot" animate={finding && !reducedMotion ? { scale: [1, 1.06, 1] } : { scale: 1 }} transition={{ duration: .9, repeat: finding ? Infinity : 0 }}>
          <span>🐦</span>
        </motion.div>
      </section>

      <section className="pvp-controls">
        <div className="pvp-controls__title"><strong><CurrencyAmount amount={betAmount} /></strong><small>🎁</small><span>Ставка звёздами</span></div>
        <div className="pvp-bets" role="radiogroup" aria-label="Ставка PvP">
          {bets.map((bet) => <button key={bet} type="button" role="radio" aria-checked={bet === betAmount} disabled={finding} className={bet === betAmount ? 'pvp-bet pvp-bet--active' : 'pvp-bet'} onClick={() => setBetAmount(bet)}><CurrencyAmount amount={bet} /></button>)}
        </div>
        {errorMessage ? <p className="game-error" role="alert">{errorMessage}</p> : null}
        <button className="pvp-play" type="button" disabled={finding || match.isPending || balance < betAmount} onClick={() => { void play(); }}>{finding ? 'Матч начинается…' : balance < betAmount ? 'Недостаточно звёзд' : 'Сделать ставку'}</button>
      </section>

      <section className="pvp-history">
        <div className="pvp-history__number">ИГРА #{roomItems?.length ? String(roomItems.length + 83) : '84'}</div>
        <h2>{roomItems?.length ? 'Последние ставки' : 'Ставок пока нет'}</h2>
        {roomItems?.length ? roomItems.map((room) => <div className="pvp-history__row" key={room.id}><span className={room.winner === 'USER' ? 'is-win' : 'is-loss'}>{room.winner === 'USER' ? 'Победа' : 'Поражение'}</span><p>{room.opponentName}<small>{new Date(room.createdAt).toLocaleDateString('ru-RU')}</small></p><CurrencyAmount amount={room.winner === 'USER' ? room.payout : room.betAmount} /></div>) : <p className="pvp-history__empty">Здесь появятся результаты ваших матчей.</p>}
        <small className="pvp-history__hash">Hash: 37bd…403b</small>
      </section>

      {createPortal(<AnimatePresence>{result ? <motion.div className="pvp-result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.section initial={reducedMotion ? false : { y: 28, scale: .94 }} animate={{ y: 0, scale: 1 }}><span>{result.winner === 'USER' ? 'Победа' : 'Хорошая игра'}</span><h2>{result.winner === 'USER' ? 'Вы выиграли матч' : 'Победил соперник'}</h2><p>{result.winner === 'USER' ? <>В кошелёк начислено <CurrencyAmount amount={result.payout} /></> : <>Ставка <CurrencyAmount amount={result.betAmount} /> ушла в банк матча</>}</p><button type="button" onClick={() => setResult(null)}>Готово</button></motion.section></motion.div> : null}</AnimatePresence>, document.body)}
    </div>
  );
}
