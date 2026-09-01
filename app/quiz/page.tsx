'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Quiz from '@/components/Quiz';
import AppLoader from '@/components/AppLoader';
import { getCurrentStudent, StudentSubjectWithCatalog } from '@/lib/student-data';

function PracticeHub({ subjects }: { subjects: StudentSubjectWithCatalog[] }) {
  return (
    <section aria-labelledby="practice-heading">
      <header className="card" style={{ marginBottom: '1rem' }}>
        <p style={{ color: '#64748b', fontSize: '.75rem', textTransform: 'uppercase', marginBottom: '.25rem' }}>Practice</p>
        <h1 id="practice-heading" style={{ marginBottom: '.5rem' }}>Choose how you want to practise</h1>
        <p style={{ color: '#64748b', margin: 0 }}>
          Pick a mode first, then choose from any subject saved in your Fundza profile. Your subjects are no longer silently reduced to the first one.
        </p>
      </header>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginBottom: '.75rem' }}>Practice modes</h2>
        <div style={{ display: 'grid', gap: '.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <Link href="/quiz?mode=mixed" className="card" style={{ textDecoration: 'none', border: '1px solid #e2e8f0', margin: 0 }}>
            <strong>Mixed Practice</strong>
            <span style={{ display: 'block', color: '#64748b', marginTop: '.35rem', fontSize: '.875rem' }}>Practise across your available subjects.</span>
          </Link>
          <Link href="#subjects" className="card" style={{ textDecoration: 'none', border: '1px solid #e2e8f0', margin: 0 }}>
            <strong>Subject Practice</strong>
            <span style={{ display: 'block', color: '#64748b', marginTop: '.35rem', fontSize: '.875rem' }}>Focus your questions on one subject.</span>
          </Link>
          <Link href="#subjects" className="card" style={{ textDecoration: 'none', border: '1px solid #e2e8f0', margin: 0 }}>
            <strong>Quick Practice</strong>
            <span style={{ display: 'block', color: '#64748b', marginTop: '.35rem', fontSize: '.875rem' }}>Jump into a short subject session.</span>
          </Link>
        </div>
      </div>

      <div className="card" id="subjects">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ marginBottom: '.25rem' }}>Your subjects</h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: '.875rem' }}>Choose any subject. Each card keeps your current and target mark visible.</p>
          </div>
          <span style={{ color: '#64748b', fontSize: '.8rem' }}>{subjects.length} subject{subjects.length === 1 ? '' : 's'}</span>
        </div>

        <div style={{ display: 'grid', gap: '.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', marginTop: '1rem' }}>
          {subjects.map((subject) => {
            const name = subject.subjects_catalog?.name || 'Subject';
            const code = subject.subjects_catalog?.code || '';
            const gap = Number(subject.target_percentage || 0) - Number(subject.current_percentage || 0);
            return (
              <Link key={subject.id} href={`/quiz?subject=${encodeURIComponent(code)}`} className="card" style={{ textDecoration: 'none', border: '1px solid #e2e8f0', margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', alignItems: 'flex-start' }}>
                  <strong>{name}</strong>
                  <span style={{ fontSize: '.75rem', color: '#64748b' }}>{subject.priority}</span>
                </div>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.75rem', fontSize: '.8rem' }}>
                  <span>Current {subject.current_percentage}%</span>
                  <span>Target {subject.target_percentage}%</span>
                  <span>{gap > 0 ? `${gap} point gap` : 'Target met'}</span>
                </div>
                <span className="btn" style={{ display: 'inline-block', marginTop: '1rem' }}>Practise {name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function QuizWrapper() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSubject = searchParams.get('subject');
  const requestedTopic = searchParams.get('topic');
  const mode = searchParams.get('mode');
  const [subjects, setSubjects] = useState<StudentSubjectWithCatalog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentStudent().then(({ session, student, subjects: savedSubjects }) => {
      if (!session) { router.push('/login'); return; }
      if (!student) { router.push('/setup'); return; }
      setSubjects(savedSubjects);
      setLoading(false);
    }).catch(error => {
      console.error(error);
      setLoading(false);
    });
  }, [router]);

  const selected = useMemo(
    () => requestedSubject ? subjects.find((subject) => subject.subjects_catalog?.code === requestedSubject) ?? null : null,
    [requestedSubject, subjects],
  );

  if (loading) return <AppLoader message="Loading your practice subjects..." />;
  if (!subjects.length) return <div className="card"><h2>No subjects saved</h2><p>Add your school subjects before starting practice.</p><Link href="/profile/edit" className="btn">Set Up Profile</Link></div>;

  const showHub = !requestedSubject && !requestedTopic && mode !== 'mixed';

  if (showHub) return <PracticeHub subjects={subjects} />;

  const mixed = mode === 'mixed' && !requestedSubject && !requestedTopic;
  const subjectName = selected?.subjects_catalog?.name || (mixed ? 'Mixed Practice' : 'Subject');
  const selectedCode = selected?.subjects_catalog?.code || undefined;

  if (requestedSubject && !selected) {
    return (
      <div className="card" role="alert">
        <h2>Subject not found</h2>
        <p>That subject is not currently saved in your learner profile.</p>
        <Link href="/quiz" className="btn">Back to Practice</Link>
      </div>
    );
  }

  return (
    <>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: '#64748b', fontSize: '.75rem', textTransform: 'uppercase', marginBottom: '.25rem' }}>Practice session</p>
            <h1 style={{ margin: 0 }}>{subjectName}</h1>
          </div>
          <Link href="/quiz" className="btn btn-secondary">Change practice</Link>
        </div>

        {!mixed && selected && (
          <div style={{ display: 'flex', gap: '.5rem', overflowX: 'auto', marginTop: '1rem', paddingBottom: '.25rem' }} aria-label="Switch practice subject">
            {subjects.map((subject) => {
              const active = subject.id === selected.id;
              return (
                <Link
                  key={subject.id}
                  href={`/quiz?subject=${encodeURIComponent(subject.subjects_catalog?.code || '')}`}
                  className={active ? 'btn' : 'btn btn-secondary'}
                  aria-current={active ? 'page' : undefined}
                  style={{ flex: '0 0 auto' }}
                >
                  {subject.subjects_catalog?.name}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Quiz
        topicId={requestedTopic}
        subjectCode={selectedCode}
        subjectName={subjectName}
      />
    </>
  );
}

export default function QuizPage() {
  return (
    <main className="container">
      <Suspense fallback={<div className="card">Loading practice...</div>}>
        <QuizWrapper />
      </Suspense>
    </main>
  );
}
