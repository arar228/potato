import { motion, useReducedMotion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { ProfileIcon, PvpIcon, SoloIcon, StoreIcon } from './icons';

const items = [
  { to: '/store', label: 'Магазин', icon: StoreIcon },
  { to: '/solo', label: 'Solo', icon: SoloIcon },
  { to: '/pvp', label: 'PvP', icon: PvpIcon },
  { to: '/profile', label: 'Профиль', icon: ProfileIcon },
] as const;

export function BottomNavigation() {
  const reducedMotion = useReducedMotion();
  return (
    <nav className="bottom-navigation" aria-label="Основная навигация">
      <div className="bottom-navigation__inner">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className="bottom-navigation__link">
            {({ isActive }) => (
              <>
                {isActive ? <motion.span layoutId="active-navigation" className="bottom-navigation__active" transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }} /> : null}
                <span className="bottom-navigation__icon"><Icon /></span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
