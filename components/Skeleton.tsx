export default function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}

export function PageSkeleton() {
  return (
    <main className="container" aria-busy="true" aria-label="Loading">
      <Skeleton className="skeleton-title" />
      <Skeleton className="skeleton-line" />
      <div className="card"><Skeleton className="skeleton-line wide" /><Skeleton className="skeleton-line" /><Skeleton className="skeleton-block" /></div>
      <div className="grid grid-2"><div className="card"><Skeleton className="skeleton-line" /><Skeleton className="skeleton-block small" /></div><div className="card"><Skeleton className="skeleton-line" /><Skeleton className="skeleton-block small" /></div></div>
    </main>
  );
}
