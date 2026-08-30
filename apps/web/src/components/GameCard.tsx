import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface GameCardProps {
  badge: string;
  children: ReactNode;
  description: string;
  isLoading: boolean;
  onSelect: () => void;
  theme: 'purple' | 'green' | 'blue';
  title: string;
}

export function GameCard({ badge, children, description, isLoading, onSelect, theme, title }: GameCardProps) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.button
      className={`game-card game-card--${theme}`}
      type="button"
      disabled={isLoading}
      onClick={onSelect}
      whileTap={reducedMotion ? {} : { scale: 0.975 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
    >
      <span className="game-card__light" aria-hidden="true" />
      {badge ? <span className="game-card__badge">{badge}</span> : null}
      <span className="game-card__visual" aria-hidden="true">{children}</span>
      <span className="game-card__copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      {isLoading ? <span className="game-card__action" aria-hidden="true"><i className="game-card__spinner" /></span> : null}
    </motion.button>
  );
}
