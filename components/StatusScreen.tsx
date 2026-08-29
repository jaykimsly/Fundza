'use client';

import Link from 'next/link';

export type StatusKind = 'loading' | 'error' | 'offline' | '404' | '503' | 'ai';

const content: Record<StatusKind, { title: string; description: string; detail: string }> = {
  loading: {
    title: 'We are getting Fundza ready',
    description: 'Your study space is loading. This can take a few seconds.',
    detail: 'Please keep this page open while we fetch your subjects and study data.',
  },
  error: {
    title: 'Something went wrong',
    description: 'Fundza could not finish that action.',
    detail: 'Your work is not necessarily lost. Try again, and if the problem continues, come back later.',
  },
  offline: {
    title: 'You are offline',
    description: 'Your device is not connected to the internet.',
    detail: 'Check Wi-Fi or mobile data. Fundza needs a connection for live lessons, login and saved progress.',
  },
  '404': {
    title: 'We cannot find that page',
    description: 'The page may have moved, or the link may be wrong.',
    detail: 'Nothing is broken on your side. Go back to your dashboard and continue studying.',
  },
  '503': {
    title: 'Fundza is taking a short break',
    description: 'The service is temporarily unavailable.',
    detail: 'This usually means one of our services is busy or being updated. Try again in a little while.',
  },
  ai: {
    title: 'Study Support could not help this time',
    description: 'Study Support could not complete that request right now.',
    detail: 'This can happen when the support service is busy, your connection drops, or the request needs another attempt.',
  },
};

export default function StatusScreen({ kind, code, message, onRetry }: { kind: StatusKind; code?: string; message?: string; onRetry?: () => void }) {
  const item = content[kind];
  return (
    <main className="status-page" role={kind === 'error' || kind === 'ai' ? 'alert' : 'main'}>
      <div className="status-card">
        <div className="status-icon" aria-hidden="true">{kind === 'loading' ? '◌' : kind === 'offline' ? '⌁' : kind === '404' ? '404' : kind === '503' ? '503' : kind === 'ai' ? '?' : '!'}</div>
        {code && <p className="status-code">{code}</p>}
        <h1>{item.title}</h1>
        <p className="status-description">{item.description}</p>
        <p className="status-detail">{message || item.detail}</p>
        {kind === 'ai' && <div className="status-tip"><strong>What you can do:</strong><br />Check your connection, simplify the request, then try again. Fundza will not pretend support worked when it did not.</div>}
        <div className="status-actions">
          {onRetry ? <button className="btn" onClick={onRetry}>Try again</button> : <button className="btn" onClick={() => window.location.reload()}>Try again</button>}
          <Link className="btn btn-secondary" href="/">Back to Dashboard</Link>
        </div>
      </div>
    </main>
  );
}
