import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSessionStore } from '../../app/session.store';
import { BalancePill } from '../../components/BalancePill';
import { GlassCard } from '../../components/GlassCard';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { ChevronRightIcon, GiftIcon, SettingsIcon, SparkIcon, TicketIcon } from '../../components/icons';
import { ApiClientError } from '../../lib/api-client';
import { useMe } from '../auth/use-me';
import { useLedger } from '../wallet/use-ledger';

function initials(firstName: string, lastName: string | null): string {
  return `${firstName.at(0) ?? ''}${lastName?.at(0) ?? ''}`.toUpperCase();
}

export function ProfilePage() {
  const me = useMe();
  const ledger = useLedger();
  const initData = useSessionStore((state) => state.initData);
  const sdkAvailable = useSessionStore((state) => state.sdkAvailable);
  const reducedMotion = useReducedMotion();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (notice === null) return;
    const timeout = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  if (initData === null) {
    return (
      <GlassCard className="auth-state">
        <div className="auth-state__icon"><SparkIcon /></div>
        <p className="section-eyebrow">TELEGRAM SESSION</p>
        <h1>{sdkAvailable ? 'Нет данных запуска' : 'Откройте в Telegram'}</h1>
        <p>Профиль доступен внутри настроенного Telegram Mini App.</p>
      </GlassCard>
    );
  }

  if (me.isPending) {
    return <div className="profile-page" aria-label="Загрузка профиля"><LoadingSkeleton height={108} /><LoadingSkeleton height={72} /><LoadingSkeleton height={216} /><LoadingSkeleton height={184} /></div>;
  }

  if (me.isError || me.data === undefined) {
    const sessionRejected = me.error instanceof ApiClientError && me.error.status === 401;
    return (
      <GlassCard className="auth-state auth-state--error">
        <div className="auth-state__pulse" />
        <p className="section-eyebrow">{sessionRejected ? 'SESSION ERROR' : 'SERVER ERROR'}</p>
        <h1>{sessionRejected ? 'Не удалось войти' : 'Сервис временно недоступен'}</h1>
        <p>{sessionRejected
          ? 'Закройте Mini App и откройте снова, чтобы обновить Telegram initData.'
          : 'Сервер не смог загрузить профиль. Попробуйте ещё раз через несколько секунд.'}</p>
        <button className="secondary-button" type="button" onClick={() => void me.refetch()}>Повторить</button>
      </GlassCard>
    );
  }

  const user = me.data;
  const username = user.username ? `@${user.username}` : 'Telegram player';

  return (
    <div className="profile-page">
      <section className="profile-identity">
        <div className="profile-avatar" aria-label={`Аватар ${user.firstName}`}>
          {user.photoUrl ? <img src={user.photoUrl} alt="" /> : initials(user.firstName, user.lastName)}
          <span className="profile-avatar__status" aria-label="Онлайн" />
        </div>
        <div className="profile-identity__copy"><p className="section-eyebrow">PLAYER PROFILE</p><h1>{user.firstName}</h1><p>{username}</p></div>
        <motion.button className="icon-button" type="button" aria-label="Настройки" whileTap={reducedMotion ? {} : { scale: 0.9 }} onClick={() => setNotice('Настройки профиля появятся в следующем обновлении')}><SettingsIcon /></motion.button>
      </section>

      <motion.button className="bonus-banner" type="button" whileTap={reducedMotion ? {} : { scale: 0.985 }} onClick={() => setNotice('Бонус применится к первой игровой награде')}>
        <span className="bonus-banner__spark"><SparkIcon /></span>
        <span><small>WELCOME BOOST</small><strong>Бонус x2 на первую игровую награду</strong></span>
        <ChevronRightIcon />
      </motion.button>

      <motion.button className="gift-row" type="button" whileTap={reducedMotion ? {} : { scale: 0.985 }} onClick={() => setNotice('Подарки появятся вместе с достижениями')}>
        <span className="gift-row__icon"><GiftIcon /></span><span><strong>Подарки</strong><small>У вас нет подарков</small></span><ChevronRightIcon />
      </motion.button>

      <GlassCard className="wallet-card">
        <div className="card-heading"><div><p className="section-eyebrow">PLAY BALANCE</p><h2>Игровые звёзды</h2></div><span className="verified-badge">LEDGER</span></div>
        <div className="wallet-card__balance"><BalancePill balance={user.wallet.balance} /><p>Не имеют денежной стоимости</p></div>
        <motion.button className="primary-button" type="button" whileTap={reducedMotion ? {} : { scale: 0.98 }} onClick={() => setNotice('Центр наград будет подключён на этапе Missions')}>Получить игровые звёзды<ChevronRightIcon /></motion.button>
      </GlassCard>

      <GlassCard className="tickets-card">
        <div className="tickets-card__top"><span className="tickets-card__icon"><TicketIcon /></span><div><p className="section-eyebrow">TICKETS</p><h2>Билеты</h2></div><strong className="tickets-card__count">0</strong></div>
        <div className="progress-label"><span>Прогресс заданий</span><strong>0/3</strong></div>
        <div className="progress-track" aria-label="Прогресс заданий: 0 из 3"><span /></div>
        <p>Выполняйте задания и получайте Tickets для косметических наград.</p>
      </GlassCard>

      <div className="profile-footnote"><span>{ledger.data?.items.length ?? 0} записей</span><i /><span>Баланс защищён ledger</span></div>
      {notice ? <motion.div className="toast" role="status" initial={reducedMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>{notice}</motion.div> : null}
    </div>
  );
}
