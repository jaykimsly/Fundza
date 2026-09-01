'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Quiz from '@/components/Quiz';
import AppLoader from '@/components/AppLoader';
import { getCurrentStudent, StudentSubjectWithCatalog } from '@/lib/student-data';

type PracticeMode = 'subject' | 'mixed' | 'quick';

const modeCards: Array<{ id: PracticeMode; eyebrow: string; title: string; description: string; action: string }> = [
  {
    id: 'subject',
    eyebrow: 'FOCUSED',
    title: 'Subject Practice',
    description: 'Work on one subject and target the topics that need the most attention.',
    action: 'Choose a subject',
  },
  {
    id: 'mixed',
    eyebrow: 'ADAPTIVE',
    title: 'Mixed Practice',
    description: 'Practise across your enrolled subjects without being locked to one subject.',
    action: 'Start mixed practice',
  },
  {
    id: 'quick',
    eyebrow: '5 QUESTIONS',
    title: 'Quick Practice',
    description: 'A short revision session for when you have a few minutes to spare.',
    action: 'Choose a subject',
  },
];

function PracticeHub({ subjects }: { subjects: StudentSubjectWithCatalog[] }) {
  const [selectedMode, setSelectedMode] = useState<PracticeMode>('subject');
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
      <style>{`
        .practice-hero { background:linear-gradient(135deg,#24104f 0%,#4c1d95 58%,#6d28d9 100%); color:#fff; border-radius:28px; padding:clamp(1.35rem,4vw,2.2rem); position:relative; overflow:hidden; box-shadow:0 18px 45px rgba(76,29,149,.22); }
        .practice-hero:after { content:""; position:absolute; width:220px; height:220px; border-radius:50%; right:-80px; top:-100px; background:rgba(255,255,255,.09); }
        .practice-kicker { display:inline-flex; align-items:center; gap:.45rem; font-size:.72rem; font-weight:800; letter-spacing:.1em; opacity:.78; }
        .practice-hero h1 { margin:.45rem 0 .55rem; font-size:clamp(1.7rem,5vw,2.5rem); line-height:1.08; letter-spacing:-.045em; }
        .practice-hero p { max-width:650px; margin:0; color:rgba(255,255,255,.8); font-size:.95rem; }
        .practice-stat-row { display:flex; flex-wrap:wrap; gap:.6rem; margin-top:1.25rem; }
        .practice-stat { background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.13); border-radius:12px; padding:.55rem .75rem; font-size:.78rem; }
        .practice-stat strong { display:block; font-size:1rem; color:#fff; }
        .practice-section { margin-top:1.15rem; }
        .practice-section-heading { display:flex; align-items:end; justify-content:space-between; gap:1rem; margin-bottom:.7rem; }
        .practice-section-heading h2 { margin:0; font-size:1.05rem; letter-spacing:-.02em; }
        .practice-section-heading p { margin:.15rem 0 0; color:#64748b; font-size:.8rem; }
        .practice-mode-grid { display:grid; grid-template-columns:1fr; gap:.8rem; }
        .practice-mode { position:relative; width:100%; min-height:158px; padding:1.1rem; border-radius:20px; border:1px solid #e8e1f5; background:#fff; color:#0f172a; text-align:left; cursor:pointer; box-shadow:0 5px 20px rgba(15,23,42,.04); transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease; }
        .practice-mode:hover { transform:translateY(-2px); box-shadow:0 10px 26px rgba(76,29,149,.1); }
        .practice-mode.active { border:2px solid #6d28d9; background:linear-gradient(145deg,#faf7ff,#fff); box-shadow:0 10px 28px rgba(109,40,217,.12); }
        .practice-mode-badge { display:inline-flex; padding:.3rem .5rem; border-radius:999px; background:#f3e8ff; color:#6d28d9; font-size:.62rem; font-weight:850; letter-spacing:.07em; }
        .practice-mode h3 { margin:.75rem 0 .35rem; font-size:1rem; }
        .practice-mode p { margin:0; color:#64748b; font-size:.79rem; line-height:1.45; max-width:320px; }
        .practice-mode-action { position:absolute; left:1.1rem; bottom:1rem; color:#6d28d9; font-size:.75rem; font-weight:800; }
        .practice-subject-card { display:flex; flex-direction:column; justify-content:space-between; min-height:132px; padding:1rem; border:1px solid #e8eaf0; border-radius:18px; background:#fff; color:#0f172a; text-align:left; cursor:pointer; box-shadow:0 4px 16px rgba(15,23,42,.035); transition:.18s ease; }
        .practice-subject-card:hover { transform:translateY(-1px); border-color:#c4b5fd; }
        .practice-subject-card.active { border:2px solid #6d28d9; background:#faf7ff; }
        .practice-subject-name { font-weight:800; font-size:.92rem; line-height:1.25; }
        .practice-subject-meta { display:flex; justify-content:space-between; gap:.5rem; color:#64748b; font-size:.72rem; margin-top:.7rem; }
        .practice-progress { height:6px; margin-top:.5rem; border-radius:999px; overflow:hidden; background:#eeeaf5; }
        .practice-progress span { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#6d28d9,#a855f7); }
        .practice-footer { display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; margin-top:1rem; padding:1rem; border-radius:18px; background:#f8f7fb; border:1px solid #ebe8f2; }
        .practice-footer p { margin:0; color:#64748b; font-size:.8rem; }
        .practice-primary { border:0; border-radius:12px; padding:.75rem 1rem; min-height:46px; background:#6d28d9; color:#fff; font-weight:800; cursor:pointer; box-shadow:0 6px 16px rgba(109,40,217,.2); }
        .practice-primary:disabled { opacity:.45; cursor:not-allowed; box-shadow:none; }
        .practice-mixed { padding:1.2rem; border-radius:20px; background:#fff; border:1px solid #e8e1f5; box-shadow:0 5px 20px rgba(15,23,42,.04); }
        .practice-mixed strong { color:#6d28d9; }
        .practice-context { display:flex; align-items:center; gap:.7rem; margin-bottom:1rem; padding:.7rem .8rem; border-radius:14px; background:#faf7ff; border:1px solid #eee7fa; color:#475569; font-size:.78rem; }
        @media (min-width:760px) { .practice-mode-grid { grid-template-columns:repeat(3,1fr); } .practice-subject-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:.75rem; } }
        @media (min-width:1060px) { .practice-subject-grid { grid-template-columns:repeat(3,1fr); } }
        @media (max-width:639px) { .practice-hero { border-radius:22px; } .practice-mode { min-height:145px; } .practice-footer { align-items:stretch; } .practice-primary { width:100%; } }
      `}</style>

      <header className="practice-hero">
        <span className="practice-kicker">FUNDA V2 · PRACTICE</span>
        <h1 id="practice-heading">Practise with purpose.</h1>
        <p>Choose how you want to practise. Your subjects come directly from your learner profile, so Practice no longer inherits a random subject from Study.</p>
        <div className="practice-stat-row" aria-label="Practice summary">
          <div className="practice-stat"><strong>{subjects.length}</strong> subjects</div>
          <div className="practice-stat"><strong>3</strong> practice modes</div>
          <div className="practice-stat"><strong>5</strong> quick questions</div>
        </div>
      </header>

      <div className="practice-section">
        <div className="practice-section-heading">
          <div>
            <h2>Choose a practice mode</h2>
            <p>Start broad, focus on one subject, or fit in a quick revision session.</p>
          </div>
        </div>

        <div className="practice-mode-grid" role="group" aria-label="Practice mode">
          {modeCards.map((mode) => {
            const active = selectedMode === mode.id;
            return (
              <button key={mode.id} type="button" onClick={() => setSelectedMode(mode.id)} className={`practice-mode${active ? ' active' : ''}`} aria-pressed={active}>
                <span className="practice-mode-badge">{mode.eyebrow}</span>
                <h3>{mode.title}</h3>
                <p>{mode.description}</p>
                <span className="practice-mode-action">{mode.action} →</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedMode !== 'mixed' ? (
        <div className="practice-section" id="subjects">
          <div className="practice-context" role="status">
            <strong>{selectedMode === 'quick' ? 'Quick Practice' : 'Subject Practice'}</strong>
            <span>{subjects.length} enrolled subjects available</span>
          </div>
          <div className="practice-section-heading">
            <div>
              <h2>Choose a subject</h2>
              <p>Select exactly where you want your practice session to focus.</p>
            </div>
          </div>

          <div className="practice-subject-grid" role="list" aria-label="Your practice subjects">
            {subjects.map((subject) => {
              const name = subject.subjects_catalog?.name || 'Subject';
              const current = Number(subject.current_percentage || 0);
              const target = Number(subject.target_percentage || 0);
              const gap = Math.max(0, target - current);
              const active = selectedSubjectId === subject.id;
              return (
                <button key={subject.id} type="button" onClick={() => setSelectedSubjectId(subject.id)} className={`practice-subject-card${active ? ' active' : ''}`} aria-pressed={active}>
                  <span className="practice-subject-name">{name}</span>
                  <span>
                    <span className="practice-subject-meta"><span>{current}% current</span><span>{target}% target</span></span>
                    <span className="practice-progress" aria-hidden="true"><span style={{ width: `${Math.min(100, current)}%` }} /></span>
                    <span className="practice-subject-meta"><span>{gap ? `${gap} point gap` : 'Target met'}</span><span style={{ textTransform:'capitalize' }}>{subject.priority || 'normal'}</span></span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="practice-footer">
            <p>{effectiveSubject ? `Ready to practise ${effectiveSubject.subjects_catalog?.name || 'this subject'}.` : 'Select a subject to continue.'}</p>
            <button type="button" className="practice-primary" onClick={startPractice} disabled={!effectiveSubject}>
              {selectedMode === 'quick' ? 'Start Quick Practice' : 'Start Subject Practice'}
            </button>
          </div>
        </div>
      ) : (
        <div className="practice-section practice-mixed">
          <div className="practice-context"><strong>Mixed Practice</strong><span>Across all {subjects.length} enrolled subjects</span></div>
          <h2 style={{ marginBottom:'.35rem' }}>Keep your recall flexible.</h2>
          <p style={{ color:'#64748b', fontSize:'.86rem', marginBottom:'1rem' }}>Mixed Practice deliberately removes the single-subject constraint. Use it for revision across the subjects in your learner profile.</p>
          <button type="button" className="practice-primary" onClick={startPractice}>Start Mixed Practice</button>
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
