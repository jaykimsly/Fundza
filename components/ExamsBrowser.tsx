'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FundzaBadge, FundzaButton, FundzaCard } from '@/components/Phase14Primitives';

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
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load exams'))
      .finally(() => setLoading(false));
  }, []);

  const visiblePapers = useMemo(() => selected ? papers.filter((paper) => paper.subjects_catalog?.id === selected) : papers, [papers, selected]);

  if (loading) return <div className="fd-card fd-empty-card" role="status"><h3>Loading your past papers</h3><p>Pulling your enrolled subjects and verified papers together.</p></div>;
  if (error) return <div className="fd-card fd-media-error" role="alert">{error}</div>;

  return (
    <section aria-label="Past exam papers" className="fd-learning-stack">
      <FundzaCard className="fd-panel fd-soft-panel">
        <div className="fd-panel-heading"><div><p className="fd-kicker">PAPER LIBRARY</p><h2>Choose a subject</h2><p>Only subjects attached to your learner profile are shown.</p></div><FundzaBadge tone="brand">{visiblePapers.length} papers</FundzaBadge></div>
        <div className="fd-subject-switcher" role="group" aria-label="Filter exam papers by subject">
          <button className={`fd-subject-pill${!selected ? ' is-active' : ''}`} type="button" onClick={() => setSelected('')} aria-pressed={!selected}>All subjects</button>
          {subjects.map((subject) => <button key={subject.id} className={`fd-subject-pill${selected === subject.id ? ' is-active' : ''}`} type="button" onClick={() => setSelected(subject.id)} aria-pressed={selected === subject.id}>{subject.name}</button>)}
        </div>
      </FundzaCard>

      {visiblePapers.length === 0 ? (
        <FundzaCard className="fd-empty-card"><h3>No papers for this filter yet</h3><p>Your subject is enrolled, but no verified historical paper has been ingested for it yet.</p></FundzaCard>
      ) : (
        <div className="fd-paper-grid">
          {visiblePapers.map((paper) => (
            <FundzaCard className="fd-paper-card" key={paper.id} interactive>
              <div>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}><FundzaBadge tone="brand">{paper.year}</FundzaBadge><FundzaBadge tone="success">Verified source</FundzaBadge></div>
                <h3 style={{ marginTop: '.65rem' }}>{paper.subjects_catalog?.name || 'Subject'}</h3>
                <p className="fd-paper-meta">{paper.exam_type}{paper.session ? ` · ${paper.session}` : ''}{paper.paper_number ? ` · Paper ${paper.paper_number}` : ''}{paper.language ? ` · ${paper.language}` : ''}</p>
              </div>
              <div className="fd-paper-actions">
                <FundzaButton href={`/exams/${paper.id}?mode=take`}>Take exam</FundzaButton>
                <FundzaButton href={`/exams/${paper.id}?mode=prep`} variant="secondary">Prep</FundzaButton>
                <FundzaButton href={`/exams/${paper.id}?mode=practice`} variant="secondary">Practice</FundzaButton>
                <FundzaButton href={`/exams/${paper.id}?mode=review`} variant="ghost">Review</FundzaButton>
              </div>
              <span className="fd-paper-note">Use Prep before a timed attempt when the topic is still developing. Humans do enjoy discovering this after losing marks.</span>
            </FundzaCard>
          ))}
        </div>
      )}
      <div><Link href="https://www.education.gov.za/Examinations/NSCPastExaminationpapers/tabid/593/Default.aspx" className="fd-button fd-button-ghost" target="_blank" rel="noreferrer">Open DBE paper archive ↗</Link></div>
    </section>
  );
}
