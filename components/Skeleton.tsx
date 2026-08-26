import Link from 'next/link';

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

export function BootLoader({ message = 'Preparing your study space...' }: { message?: string }) {
  return (
    <main className="app-loading boot-loader" aria-busy="true" aria-live="polite">
      <div className="boot-loader-glow" aria-hidden="true" />
      <div className="loading-card boot-loader-card">
        <div className="fundza-loader-mark" aria-hidden="true">
          <span className="fundza-loader-book">
            <span className="fundza-loader-page" />
            <span className="fundza-loader-page" />
          </span>
          <span className="fundza-loader-spark">✦</span>
        </div>
        <div className="boot-loader-brand">Fundza</div>
        <p className="boot-loader-kicker">Learn smarter. Prepare better.</p>
        <div className="boot-loader-status" role="status">
          <span className="boot-loader-status-dot" aria-hidden="true" />
          <span>{message}</span>
        </div>
        <div className="boot-loader-progress" aria-hidden="true"><span /></div>
        <p className="boot-loader-note">Loading your learning experience. This should only take a moment.</p>
      </div>
    </main>
  );
}

export function PageSkeleton({ variant = 'dashboard' }: { variant?: 'dashboard' | 'auth' | 'form' | 'list' | 'study' | 'quiz' | 'legal' | 'profile' }) {
  const cards = variant === 'quiz' ? 1 : variant === 'legal' ? 2 : variant === 'profile' ? 2 : 3;

  return (
    <main className={`container page-skeleton page-skeleton-${variant}`} aria-busy="true" aria-label="Loading content">
      <div className="skeleton-context" aria-live="polite">
        <div className="skeleton-context-mark" aria-hidden="true">F</div>
        <div>
          <strong>Fundza is getting things ready</strong>
          <span>Loading the next part of your learning experience...</span>
        </div>
        <div className="skeleton-context-pulse" aria-hidden="true" />
      </div>

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

      <div className="loading-actions">
        {variant === 'auth' ? (
          <Link href="/login" className="btn btn-secondary">Return to sign in</Link>
        ) : (
          <>
            <Link href="/" className="btn btn-secondary">Home</Link>
            <Link href="/exams" className="btn">View exams</Link>
          </>
        )}
      </div>
    </main>
  );
}
