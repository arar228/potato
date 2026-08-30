import type { HTMLAttributes, ReactNode } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLElement> { children: ReactNode; }

export function GlassCard({ children, className = '', ...props }: GlassCardProps) {
  return <section className={`glass-card ${className}`.trim()} {...props}>{children}</section>;
}
