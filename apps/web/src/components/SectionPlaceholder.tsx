import { motion, useReducedMotion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { LockIcon, PvpIcon, SoloIcon, StoreIcon } from './icons';

const iconMap = { store: StoreIcon, solo: SoloIcon, pvp: PvpIcon } as const;

interface SectionPlaceholderProps {
  accent: 'amber' | 'violet' | 'cyan';
  eyebrow: string;
  icon: keyof typeof iconMap;
  title: string;
  description: string;
}

export function SectionPlaceholder({ accent, eyebrow, icon, title, description }: SectionPlaceholderProps) {
  const Icon = iconMap[icon];
  const reducedMotion = useReducedMotion();
  return (
    <div className={`section-placeholder section-placeholder--${accent}`}>
      <GlassCard className="section-placeholder__card">
        <motion.div className="section-placeholder__orb" animate={reducedMotion ? {} : { y: [0, -8, 0], rotate: [0, 3, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}><Icon /></motion.div>
        <p className="section-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="section-placeholder__status"><LockIcon /><span>Следующий этап разработки</span></div>
      </GlassCard>
    </div>
  );
}
