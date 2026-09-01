'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Quiz from '@/components/Quiz';
import AppLoader from '@/components/AppLoader';
import { getCurrentStudent, StudentSubjectWithCatalog } from '@/lib/student-data';

function PracticeHub({ subjects }: { subjects: StudentSubjectWithCatalog[] }) {
  const [selectedMode, setSelectedMode] = useState<'subject' | 'mixed' | 'quick'>('subject');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const effectiveSubject = selectedSubjectId
    ? subjects.find((subject) => subject.id === selectedSubjectId) ?? null
    : null;

  const startPractice = () => {
    if (selectedMode === 'mixed') {
      window.location.assign('/quiz?mode=mixed');
      return;
    }

    if (!effectiveSubject?.subjects_catalog?.code) return;
    const mode = selectedMode === 'quick' ? '&mode=quick' : '';
    window.location.assign(`/quiz?subject=${encodeURIComponent(effectiveSubject.subjects_catalog.code)}${mode}`);
  };

  return (
    <section aria-labelledby="practice-heading">
      <header className="card" style={{ marginBottom: '1rem' }}>
        <p style={{ color: '#64748b', fontSize: '.75rem', textTransform: 'uppercase', marginBottom: '.25rem' }}>Practice</p>
        <h1 id="practice-heading" style={{ marginBottom: '.5rem' }}>What do you want to practise?</h1>
        <p style={{ color: '#64748b', margin: 0 }}>
          Choose a practice mode and, where needed, a subject. Fundza will never silently choose the first subject in your profile.
        </p>
      </header>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginBottom: '.75rem' }}>Practice mode</h2>
        <div style={{ display: 'grid', gap: '.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }} role="group" aria-label="Practice mode">
          {[
            ['subject', 'Subject Practice', 'Focus on one subject and its question bank.'],
            ['mixed', 'Mixed Practice', 'Practise across all subjects saved to your profile.'],
            ['quick', 'Quick Practice', 'A short session for fast revision.'],
          ].map(([mode, title, description]) => {
            const active = selectedMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setSelectedMode(mode as 'subject' | 'mixed' | 'quick')}
                className={active ? 'btn' : 'btn btn-secondary'}
                aria-pressed={active}
                style={{ textAlign: 'left', minHeight: '7rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}
              >
                <strong>{title}</strong>
                <span style={{ display: 'block', marginTop: '.35rem', fontSize: '.8rem', fontWeight: 400, opacity: .85 }}>{description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedMode !== 'mixed' ? (
        <div className="card" id="subjects">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ marginBottom: '.25rem' }}>Choose a subject</h2>
              <p style={{ color: '#64748b', margin: 0, fontSize: '.875rem' }}>You have {subjects.length} subjects available for practice.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', marginTop: '1rem' }} role="list" aria-label="Your practice subjects">
            {subjects.map((subject) => {
              const name = subject.subjects_catalog?.name || 'Subject';
              const gap = Number(subject.target_percentage || 0) - Number(subject.current_percentage || 0);
              const active = selectedSubjectId === subject.id;
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => setSelectedSubjectId(subject.id)}
                  className={active ? 'btn' : 'btn btn-secondary'}
                  aria-pressed={active}
                  style={{ textAlign: 'left', minHeight: '8rem', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'space-between' }}
                >
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', alignItems: 'flex-start' }}>
                    <strong>{name}</strong>
                    <span style={{ fontSize: '.72rem', textTransform: 'capitalize' }}>{subject.priority}</span>
                  </span>
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginTop: '.75rem', fontSize: '.78rem', fontWeight: 400 }}>
                    <span>{subject.current_percentage}% current</span>
                    <span>{subject.target_percentage}% target</span>
                    <span>{gap > 0 ? `${gap} point gap` : 'Target met'}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: '.85rem' }}>
              {effectiveSubject ? `Ready to practise ${effectiveSubject.subjects_catalog?.name || 'this subject'}.` : 'Select a subject to continue.'}
            </p>
            <button type="button" className="btn" onClick={startPractice} disabled={!effectiveSubject}>
              {selectedMode === 'quick' ? 'Start Quick Practice' : 'Start Subject Practice'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <h2>Mixed Practice</h2>
          <p style={{ color: '#64748b' }}>
            Questions can come from any of your {subjects.length} saved subjects. Nothing is locked to a single subject.
          </p>
          <button type="button" className="btn" onClick={startPractice}>Start Mixed Practice</button>
        </div>
      )}
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
  const subjectName = selected?.subjects_catalog?.name || (mixed ? 'Mixed Practice' : 'Practice');
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

      <Quiz topicId={requestedTopic} subjectCode={selectedCode} subjectName={subjectName} />
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
