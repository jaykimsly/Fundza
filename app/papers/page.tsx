'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Paper = {
  id: string;
  year: number;
  exam_type: string;
  province: string | null;
  source_name: string | null;
  visibility: 'private' | 'fundza';
  sharing_status: string;
  review_status: string;
  verification_status: string;
  created_at: string;
  updated_at: string;
  page_count: number | null;
  is_immutable: boolean;
};

const badge = (paper: Paper) => {
  if (paper.is_immutable || paper.verification_status === 'verified' || paper.review_status === 'verified') return 'Verified · locked';
  if (paper.visibility === 'fundza' && paper.sharing_status === 'submitted') return 'Submitted for review';
  return 'Private · editable';
};

export default function PapersPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/papers/mine', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Could not load uploads.');
      setPapers(data.papers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load uploads.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const task = queueMicrotask(() => { void load(); });
    return () => { void task; };
  }, [load]);

  return (
    <main className="container" style={{ paddingBottom: '6rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <Link href="/papers/upload" style={{ fontSize: '.9rem' }}>← Upload paper</Link>
          <h1 style={{ margin: '.5rem 0 .25rem' }}>My recent uploads</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Uploads from the last 5 days. Verified or published papers cannot be changed.</p>
        </div>
      </header>

      {loading && <p role="status">Loading your uploads…</p>}
      {error && <p role="alert" style={{ color: '#991b1b' }}>{error}</p>}
      {!loading && !error && papers.length === 0 && <div className="card"><p style={{ margin: 0 }}>No papers uploaded in the last 5 days.</p></div>}

      <section aria-label="Recent paper uploads" style={{ display: 'grid', gap: '.75rem' }}>
        {papers.map((paper) => {
          const locked = paper.is_immutable || paper.verification_status === 'verified' || paper.review_status === 'verified';
          return <article key={paper.id} className="card" style={{ display: 'grid', gap: '.5rem' }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: '1rem', margin: 0, overflowWrap: 'anywhere' }}>{paper.source_name || 'Question paper'}</h2>
              <p style={{ color: '#64748b', margin: '.35rem 0 0', fontSize: '.9rem' }}>{paper.year} · {paper.exam_type}{paper.province ? ` · ${paper.province}` : ''}</p>
            </div>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', fontSize: '.8rem' }}>
              <span style={{ padding: '.35rem .55rem', borderRadius: '999px', background: locked ? '#ecfdf5' : '#eff6ff', color: locked ? '#166534' : '#1d4ed8' }}>{badge(paper)}</span>
              {paper.page_count ? <span style={{ padding: '.35rem .55rem', borderRadius: '999px', background: '#f8fafc', color: '#475569' }}>{paper.page_count} pages</span> : null}
            </div>
            {locked ? (
              <p style={{ margin: 0, color: '#475569', fontSize: '.85rem' }}>This paper is locked because it has been verified or published.</p>
            ) : (
              <p style={{ margin: 0, color: '#475569', fontSize: '.85rem' }}>This upload remains editable while it is private and unverified.</p>
            )}
          </article>;
        })}
      </section>
    </main>
  );
}
