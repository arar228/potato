interface LoadingSkeletonProps { height?: number; className?: string; }

export function LoadingSkeleton({ height = 96, className = '' }: LoadingSkeletonProps) {
  return <div className={`loading-skeleton ${className}`.trim()} style={{ height }} aria-label="Загрузка" role="status" />;
}
