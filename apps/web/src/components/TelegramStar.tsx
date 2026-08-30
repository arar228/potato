interface TelegramStarProps { className?: string; }

export function TelegramStar({ className = '' }: TelegramStarProps) {
  return <span className={`telegram-star ${className}`.trim()} aria-hidden="true" />;
}
