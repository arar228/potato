import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameCard } from '../../components/GameCard';
import { CoinIllustration, DailyMachineIllustration, PoolIllustration } from './SoloIllustrations';

const games = [
  {
    slug: 'daily-freebie',
    badge: '',
    theme: 'purple' as const,
    title: 'Daily Freebie',
    description: 'Ежедневный бесплатный кейс. Заходи каждый день и выполняй задания',
    illustration: <DailyMachineIllustration />,
  },
  {
    slug: 'pocket-pool',
    badge: 'x100',
    theme: 'green' as const,
    title: 'Billibird',
    description: 'Забейте все шары в лунки, чтобы получить джекпот 500 звёзд',
    illustration: <PoolIllustration />,
  },
  {
    slug: 'coin-flip',
    badge: 'x3',
    theme: 'blue' as const,
    title: 'Flippy Bird',
    description: 'Угадайте сторону монеты',
    illustration: <CoinIllustration />,
  },
] as const;

export function SoloPage() {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  const openGame = (slug: string) => {
    if (loadingSlug !== null) return;
    setLoadingSlug(slug);
    window.setTimeout(() => navigate(`/solo/${slug}`), reducedMotion ? 0 : 360);
  };

  return (
    <div className="solo-page">
      <motion.div className="game-grid" initial={reducedMotion ? false : 'hidden'} animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}>
        {games.map((game) => (
          <motion.div key={game.slug} variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
            <GameCard badge={game.badge} description={game.description} isLoading={loadingSlug === game.slug} onSelect={() => openGame(game.slug)} theme={game.theme} title={game.title}>{game.illustration}</GameCard>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
