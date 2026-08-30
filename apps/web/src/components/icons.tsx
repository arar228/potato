import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  );
}

export function StoreIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 9.5V21h16V9.5" /><path d="M3 4h18l-1.5 5.5a3 3 0 0 1-4.5.8 3 3 0 0 1-6 0 3 3 0 0 1-4.5-.8L3 4Z" /><path d="M9 21v-6h6v6" /></IconBase>;
}

export function SoloIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 7.5c-4.5 0-7.5 2.7-7.5 6.3S7.5 20 12 20s7.5-2.6 7.5-6.2S16.5 7.5 12 7.5Z" /><path d="m9 3 3 4.5L15 3M9.2 13h.1m5.4 0h.1M10 16c1.4.8 2.6.8 4 0" /></IconBase>;
}

export function PvpIcon(props: IconProps) {
  return <IconBase {...props}><path d="m5 4 14 16M19 4 5 20M7 6 4 3M17 6l3-3M7 18l-3 3M17 18l3 3" /><path d="M9 8 6 11m9-3 3 3M9 16l-3-3m9 3 3-3" /></IconBase>;
}

export function ProfileIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="8" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" /></IconBase>;
}

export function GiftIcon(props: IconProps) {
  return <IconBase {...props}><path d="M3 10h18v11H3zM12 10v11M2 6h20v4H2z" /><path d="M12 6H8.5a2 2 0 1 1 2-2c0 1.4 1.5 2 1.5 2Zm0 0h3.5a2 2 0 1 0-2-2c0 1.4-1.5 2-1.5 2Z" /></IconBase>;
}

export function TicketIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V6Z" /><path d="M9 8v8M15 8v8" strokeDasharray="2 2" /></IconBase>;
}

export function SettingsIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></IconBase>;
}

export function ChevronRightIcon(props: IconProps) {
  return <IconBase {...props}><path d="m9 18 6-6-6-6" /></IconBase>;
}

export function SparkIcon(props: IconProps) {
  return <IconBase {...props}><path d="m12 2 1.5 5.4L19 9l-5.5 1.6L12 16l-1.5-5.4L5 9l5.5-1.6L12 2Z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" /></IconBase>;
}

export function LockIcon(props: IconProps) {
  return <IconBase {...props}><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></IconBase>;
}

export function StarIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M12 2.1c.55 0 1.05.31 1.3.8l2.34 4.73 5.22.76a1.46 1.46 0 0 1 .8 2.49l-3.78 3.68.9 5.2a1.46 1.46 0 0 1-2.12 1.54L12 18.84 7.34 21.3a1.46 1.46 0 0 1-2.12-1.54l.9-5.2-3.78-3.68a1.46 1.46 0 0 1 .8-2.49l5.22-.76L10.7 2.9a1.45 1.45 0 0 1 1.3-.8Z" />
      <path fill="#fff" d="M9.25 7.1c.8-1.57 1.25-2.33 1.66-2.33.22 0 .4.2.58.57L10.6 7.5c-.2.48-.74.72-1.2.5-.38-.17-.5-.5-.15-.9Z" opacity=".68" />
    </svg>
  );
}
