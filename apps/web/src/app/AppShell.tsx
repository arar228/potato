import { backButton } from '@tma.js/sdk-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNavigation } from '../components/BottomNavigation';
import { TelegramHeader } from '../components/TelegramHeader';
import { ParticleBackground } from '../components/ParticleBackground';

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    document.querySelector<HTMLElement>('.app-scroll-region')?.scrollTo({ top: 0 });
    const isInnerScreen = location.pathname.startsWith('/solo/') || location.pathname.startsWith('/fairness/') || location.pathname === '/pvp';
    try {
      if (!backButton.isMounted()) return undefined;
      if (isInnerScreen) backButton.show();
      else backButton.hide();
      return backButton.onClick(() => { void navigate('/solo'); });
    } catch {
      return undefined;
    }
  }, [location.pathname, navigate]);

  return (
    <div className="app-shell">
      <ParticleBackground />
      <TelegramHeader />
      <div className="app-scroll-region">
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={location.pathname}
            className="page-content"
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? {} : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>
      <BottomNavigation />
    </div>
  );
}
