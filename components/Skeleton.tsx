export default function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function SkeletonText({ width = '100%', className = '' }: { width?: string; className?: string }) {
  return <Skeleton className={`skeleton-line ${className}`} style={{ width }} />;
}

export function SkeletonCard({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`card skeleton-card ${className}`} aria-hidden="true">
      <Skeleton className="skeleton-heading" />
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={`skeleton-line ${index === lines - 1 ? 'short' : ''}`} />
      ))}
    </div>
  );
}

export function PageSkeleton({ variant = 'dashboard' }: { variant?: 'dashboard' | 'auth' | 'form' | 'list' | 'study' | 'quiz' | 'legal' | 'profile' }) {
  const cards = variant === 'quiz' ? 1 : variant === 'legal' ? 2 : variant === 'profile' ? 2 : 3;

  return (
    <main className={`container page-skeleton page-skeleton-${variant}`} aria-busy="true" aria-label="Loading">
      <div className="skeleton-header">
        <Skeleton className="skeleton-title" />
        <Skeleton className="skeleton-line medium" />
      </div>

      {variant === 'auth' && (
        <div className="skeleton-auth-card">
          <Skeleton className="skeleton-logo" />
          <Skeleton className="skeleton-heading" />
          <Skeleton className="skeleton-line" />
          <Skeleton className="skeleton-input" />
          <Skeleton className="skeleton-input" />
          <Skeleton className="skeleton-button" />
        </div>
      )}

      {variant === 'form' && <SkeletonCard lines={5} />}

      {(variant === 'dashboard' || variant === 'list' || variant === 'study' || variant === 'profile') && (
        <>
          <div className="skeleton-feature-card">
            <Skeleton className="skeleton-line medium" />
            <Skeleton className="skeleton-title" />
            <Skeleton className="skeleton-line wide" />
            <Skeleton className="skeleton-block" />
          </div>
          <div className="grid grid-2">
            {Array.from({ length: cards }).map((_, index) => <SkeletonCard key={index} lines={variant === 'study' ? 4 : 3} />)}
          </div>
        </>
      )}

      {variant === 'quiz' && (
        <div className="skeleton-quiz">
          <Skeleton className="skeleton-line medium" />
          <Skeleton className="skeleton-heading large" />
          <Skeleton className="skeleton-block" />
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="skeleton-option" />)}
        </div>
      )}

      {variant === 'legal' && (
        <div className="skeleton-legal">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={6} />
        </div>
      )}
    </main>
  );
}
