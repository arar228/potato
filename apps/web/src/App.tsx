import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './app/AppShell';
import { SectionPlaceholder } from './components/SectionPlaceholder';
import { ProfilePage } from './features/profile/ProfilePage';
import { GameComingSoonPage } from './features/games/GameComingSoonPage';
import { SoloPage } from './features/games/SoloPage';
import { CoinFlipPage } from './features/games/CoinFlipPage';
import { DailyFreebiePage } from './features/games/DailyFreebiePage';
import { PocketPoolPage } from './features/games/PocketPoolPage';
import { PvpPage } from './features/pvp/PvpPage';
import { FairnessPage } from './features/fairness/FairnessPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate replace to="/profile" />} />
        <Route
          path="/store"
          element={
            <SectionPlaceholder
              accent="amber"
              eyebrow="REWARD DISTRICT"
              icon="store"
              title="Магазин готовится"
              description="Здесь появятся бесплатные награды, косметика и достижения — без покупки реальных денег."
            />
          }
        />
        <Route path="/solo" element={<SoloPage />} />
        <Route path="/solo/daily-freebie" element={<DailyFreebiePage />} />
        <Route path="/solo/pocket-pool" element={<PocketPoolPage />} />
        <Route path="/solo/coin-flip" element={<CoinFlipPage />} />
        <Route path="/solo/:gameSlug" element={<GameComingSoonPage />} />
        <Route path="/pvp" element={<PvpPage />} />
        <Route path="/fairness/:roundId" element={<FairnessPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate replace to="/profile" />} />
      </Route>
    </Routes>
  );
}
