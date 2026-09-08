'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Subject = { id: string; name: string; code: string; category: string | null };
type Paper = { id: string; year: number; exam_type: string; language: string | null; session: string | null; paper_number: number | null; subjects_catalog: { id: string; name: string; code: string } | null; paper_memos?: Array<{ id: string; language: string | null; memo_url: string; verification_status: string }> };

export default function ExamsBrowser() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/exams', { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Unable to load exams');
        return data;
      })
      .then((data) => {
        setSubjects(data.subjects || []);
        setPapers(data.papers || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const visiblePapers = useMemo(() => {
    if (!selected) return papers;
    return papers.filter((paper) => paper.subjects_catalog?.id === selected);
  }, [papers, selected]);

  if (loading) return <div className="card">Loading your subjects and past papers…</div>;
  if (error) return <div className="card" role="alert">{error}</div>;

  return (
    <section aria-label="Past exam papers">
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <button className="button" type="button" onClick={() => setSelected('')} aria-pressed={!selected}>All subjects</button>
          {subjects.map((subject) => (
            <button key={subject.id} className="button" type="button" onClick={() => setSelected(subject.id)} aria-pressed={selected === subject.id}>
              {subject.name}
            </button>
          ))}
        </div>
        <p style={{ color: '#64748b', margin: 0 }}>Only subjects attached to your student profile appear here.</p>
      </div>

      {visiblePapers.length === 0 ? (
        <div className="card"><strong>No papers yet.</strong><p style={{ color: '#64748b' }}>Your subject is enrolled, but no verified historical papers have been ingested for it yet.</p></div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {visiblePapers.map((paper) => (
            <article className="card" key={paper.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ marginBottom: '0.35rem' }}>{paper.subjects_catalog?.name || 'Subject'} · {paper.year}</h2>
                  <p style={{ color: '#64748b', margin: 0 }}>{paper.exam_type}{paper.session ? ` · ${paper.session}` : ''}{paper.paper_number ? ` · Paper ${paper.paper_number}` : ''}{paper.language ? ` · ${paper.language}` : ''}</p>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#166534', background: '#dcfce7', padding: '0.35rem 0.55rem', borderRadius: '999px' }}>Verified source</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '0.6rem', marginTop: '1rem' }}>
                <Link className="button" href={`/exams/${paper.id}?mode=take`}>Take exam</Link>
                <Link className="button" href={`/exams/${paper.id}?mode=prep`}>Prep</Link>
                <Link className="button" href={`/exams/${paper.id}?mode=practice`}>Practice</Link>
                <Link className="button" href={`/exams/${paper.id}?mode=review`}>Review</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
