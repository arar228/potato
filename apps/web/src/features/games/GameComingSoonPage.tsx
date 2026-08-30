import { useNavigate, useParams } from 'react-router-dom';
import { GlassCard } from '../../components/GlassCard';
import { ChevronRightIcon, SparkIcon } from '../../components/icons';

const names: Record<string, string> = {
  'daily-freebie': 'Daily Freebie',
  'pocket-pool': 'Pocket Pool',
  'coin-flip': 'Coin Flip',
};

export function GameComingSoonPage() {
  const { gameSlug = '' } = useParams();
  const navigate = useNavigate();
  const name = names[gameSlug] ?? 'Игра';
  return (
    <div className="game-coming-soon">
      <GlassCard className="game-coming-soon__card">
        <span className="game-coming-soon__icon"><SparkIcon /></span>
        <p className="section-eyebrow">NEXT GAME STAGE</p>
        <h1>{name}</h1>
        <p>Карточка готова. Игровая механика будет подключена на своём следующем этапе.</p>
        <button className="secondary-button" type="button" onClick={() => { void navigate('/solo'); }}>Вернуться в Solo <ChevronRightIcon /></button>
      </GlassCard>
    </div>
  );
}
