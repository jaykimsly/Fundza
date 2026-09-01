'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ExamCountdown from '@/components/ExamCountdown';
import ProgressBar from '@/components/ProgressBar';
import AppIcon from '@/components/AppIcon';
import AppLoader from '@/components/AppLoader';
import {
  FundzaBadge,
  FundzaButton,
  FundzaCard,
  Metric,
  ProgressRing,
} from '@/components/Phase14Primitives';

function getLevel(percentage: number) {
  if (percentage >= 80) return 7;
  if (percentage >= 70) return 6;
  if (percentage >= 60) return 5;
  if (percentage >= 50) return 4;
  if (percentage >= 40) return 3;
  if (percentage >= 30) return 2;
  return 1;
}

function getPriorityTone(priority: string) {
  if (priority === 'critical' || priority === 'high') return 'danger' as const;
  if (priority === 'medium') return 'warning' as const;
  return 'success' as const;
}

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*, schools(name), grades(grade_number, description)')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      if (studentError) {
        console.error('Failed to load student profile:', studentError);
        setLoading(false);
        return;
      }
      if (!student) {
        router.push('/setup');
        return;
      }

      localStorage.setItem('fundza_student_id', student.id);
      localStorage.setItem('fundza_student', JSON.stringify(student));
      setProfile(student);

      const { data: subjData } = await supabase
        .from('student_subjects')
        .select('*, subjects_catalog(name, code, category, is_compulsory)')
        .eq('student_id', student.id);
      setSubjects(subjData || []);
      setLoading(false);
    };

    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push('/login');
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    router.push('/login');
  };

  const aps = subjects
    .filter((subject) => subject.subjects_catalog?.code !== 'LIFE_ORI')
    .reduce((sum, subject) => sum + getLevel(Number(subject.current_percentage || 0)), 0);

  const sortedSubjects = useMemo(() => [...subjects].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
  }), [subjects]);

  const prioritySubject = sortedSubjects[0];
  const average = subjects.length
    ? Math.round(subjects.reduce((sum, subject) => sum + Number(subject.current_percentage || 0), 0) / subjects.length)
    : 0;
  const grade = profile?.grades?.grade_number;
  const pathway = profile?.career_pathway === 'university' ? 'University track' : profile?.career_pathway === 'college' ? 'College track' : 'Open options';
  const passType = aps >= 23 ? 'Bachelor track' : aps >= 19 ? 'Diploma track' : 'Higher Certificate';
  const focusGap = prioritySubject ? Math.max(0, Number(prioritySubject.target_percentage || 0) - Number(prioritySubject.current_percentage || 0)) : 0;

  if (loading) return <AppLoader message="Loading your study space..." />;

  return (
    <div className="fd-shell-content fd-dashboard">
      <header className="fd-dashboard-head">
        <div>
          <p className="fd-dashboard-kicker">Your learning space</p>
          <h1 className="fd-dashboard-title">Welcome back, {profile?.full_name?.split(' ')?.[0] || 'learner'}.</h1>
          <p className="fd-dashboard-subtitle">Grade {grade} · {profile?.schools?.name} · {pathway}</p>
        </div>
        <div className="fd-dashboard-actions">
          <FundzaButton href="/profile" variant="secondary"><AppIcon name="user" size={16} /> Profile</FundzaButton>
          <FundzaButton variant="ghost" onClick={handleLogout}><AppIcon name="logout" size={16} /> Log out</FundzaButton>
        </div>
      </header>

      <div className="fd-dashboard-grid">
        <div className="fd-dashboard-grid-main">
          <FundzaCard className="fd-dashboard-hero">
            <div className="fd-dashboard-hero-copy">
              <p className="fd-section-label">Today&apos;s focus</p>
              <h2 className="fd-dashboard-hero-title">
                {prioritySubject ? `Start with ${prioritySubject.subjects_catalog?.name}.` : 'Build your study plan.'}
              </h2>
              <p className="fd-dashboard-hero-text">
                {prioritySubject
                  ? `This is currently your highest-priority subject. You have a ${focusGap}-point gap to your target, so it is the clearest place to improve today.`
                  : 'Your learning profile is ready. Add subjects and Fundza will turn your results into a focused study plan.'}
              </p>
              <div className="fd-dashboard-cta-row">
                {prioritySubject ? (
                  <FundzaButton href={`/quiz?subject=${encodeURIComponent(prioritySubject.subjects_catalog?.code || '')}`}>
                    <AppIcon name="quiz" size={16} /> Start practice <AppIcon name="arrow" size={16} />
                  </FundzaButton>
                ) : <FundzaButton href="/profile/edit">Set up subjects</FundzaButton>}
                <FundzaButton href="/study" variant="secondary"><AppIcon name="book" size={16} /> Study a topic</FundzaButton>
              </div>
            </div>

            <div className="fd-dashboard-progress">
              <div className="fd-dashboard-progress-copy">
                <p className="fd-section-label">Overall subject average</p>
                <p className="fd-dashboard-progress-title">Your current performance</p>
                <p className="fd-dashboard-progress-text">Across {subjects.length} selected subject{subjects.length === 1 ? '' : 's'}.</p>
              </div>
              <ProgressRing value={average} label={`Overall subject average ${average}%`} />
            </div>
          </FundzaCard>

          <FundzaCard className="fd-dashboard-section">
            <div className="fd-dashboard-section-head">
              <div>
                <p className="fd-section-label">Study · practise · improve</p>
                <h2 className="fd-section-title">Your quick actions</h2>
              </div>
            </div>
            <div className="fd-quick-actions">
              <Link className="fd-quick-action" href="/study"><AppIcon name="book" size={19} /><span>Study</span><AppIcon name="arrow" size={15} /></Link>
              <Link className="fd-quick-action" href="/quiz"><AppIcon name="quiz" size={19} /><span>Practice</span><AppIcon name="arrow" size={15} /></Link>
              <Link className="fd-quick-action" href="/exams"><AppIcon name="exam" size={19} /><span>Prepare for exams</span><AppIcon name="arrow" size={15} /></Link>
              <Link className="fd-quick-action" href="/progress"><AppIcon name="progress" size={19} /><span>View progress</span><AppIcon name="arrow" size={15} /></Link>
            </div>
          </FundzaCard>

          <FundzaCard className="fd-dashboard-section">
            <div className="fd-dashboard-section-head">
              <div>
                <p className="fd-section-label">Subject performance</p>
                <h2 className="fd-section-title">Where to improve next</h2>
              </div>
              <Link href="/progress" className="fd-button fd-button-ghost">All progress <AppIcon name="arrow" size={15} /></Link>
            </div>

            {sortedSubjects.length ? (
              <div className="fd-subject-list">
                {sortedSubjects.map((subject) => {
                  const current = Number(subject.current_percentage || 0);
                  const target = Number(subject.target_percentage || 0);
                  const gap = Math.max(0, target - current);
                  return (
                    <article key={subject.id} className="fd-subject fd-subject-accent">
                      <div className="fd-subject-top">
                        <div>
                          <h3 className="fd-subject-name">{subject.subjects_catalog?.name}</h3>
                          <div className="fd-subject-values"><span>Current <strong>{current}%</strong></span><span>Target <strong>{target}%</strong></span></div>
                        </div>
                        <FundzaBadge tone={getPriorityTone(subject.priority)}>{subject.priority || 'focus'}</FundzaBadge>
                      </div>
                      <ProgressBar current={current} target={target} color={subject.priority === 'low' ? '#15966b' : undefined} />
                      <div className="fd-subject-meta">
                        <span>Level {getLevel(current)} · {gap} point gap</span>
                        <Link className="fd-button fd-button-secondary" href={`/quiz?subject=${encodeURIComponent(subject.subjects_catalog?.code || '')}`}>Practice</Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="fd-empty">No subjects have been added yet. Your study priorities will appear here once your learning profile is complete.</div>
            )}
          </FundzaCard>

          {profile?.career_pathway === 'university' && (
            <FundzaCard className="fd-dashboard-section fd-pathway">
              <div className="fd-dashboard-section-head">
                <div>
                  <p className="fd-section-label">Your pathway</p>
                  <h2 className="fd-section-title">University admission readiness</h2>
                </div>
                <FundzaBadge tone="brand"><AppIcon name="graduation" size={14} /> {passType}</FundzaBadge>
              </div>
              <p><strong>Bachelor:</strong> APS 23+ · English Level 4 (50%+) · LO Level 3 (40%+).</p>
              <p><strong>UJ BA:</strong> APS 27 · English Level 5 (60%+).</p>
              <p><strong>UP BA:</strong> APS 28 · English Level 5 (60%+).</p>
              <p><strong>Wits BA:</strong> APS 36+ · English Level 5 (60%+).</p>
            </FundzaCard>
          )}
        </div>

        <aside className="fd-dashboard-side">
          <FundzaCard className="fd-dashboard-stat-grid">
            <div className="fd-dashboard-stat"><Metric label="APS" value={aps} detail={passType} /></div>
            <div className="fd-dashboard-stat"><Metric label="Subjects" value={subjects.length} detail="selected" /></div>
            <div className="fd-dashboard-stat"><Metric label="Average" value={`${average}%`} detail="current marks" /></div>
          </FundzaCard>

          <FundzaCard className="fd-dashboard-section fd-dark-panel">
            <div className="fd-dashboard-section-head">
              <div>
                <p className="fd-section-label">Admission snapshot</p>
                <h2 className="fd-section-title" style={{ color: '#fff' }}>APS {aps}</h2>
              </div>
              <AppIcon name="graduation" size={23} />
            </div>
            <p className="fd-dark-muted" style={{ margin: '0 0 1rem', fontSize: '.8rem' }}>
              Your current APS is calculated from the selected subjects using the existing Fundza scoring model.
            </p>
            <div style={{ borderTop: '1px solid #303543', paddingTop: '.9rem' }}>
              <Metric label="Pass type" value={passType} detail={`${subjects.length} subjects included`} />
            </div>
          </FundzaCard>

          <FundzaCard className="fd-dashboard-section">
            <div className="fd-dashboard-section-head">
              <div>
                <p className="fd-section-label">Exam preparation</p>
                <h2 className="fd-section-title">What exam is coming?</h2>
              </div>
              <AppIcon name="exam" size={20} />
            </div>
            <ExamCountdown />
            <FundzaButton href="/exams" variant="secondary" className="" >Open exam centre <AppIcon name="arrow" size={15} /></FundzaButton>
          </FundzaCard>

          <FundzaCard className="fd-dashboard-section">
            <div className="fd-dashboard-section-head">
              <div>
                <p className="fd-section-label">Keep your momentum</p>
                <h2 className="fd-section-title">Your next step</h2>
              </div>
            </div>
            <p style={{ margin: '0 0 1rem', color: 'var(--fd-text-muted)', fontSize: 'var(--fd-text-sm)' }}>
              Learn something, practise it, check your understanding, then improve the areas that still need work.
            </p>
            <div className="fd-dashboard-cta-row" style={{ marginTop: 0 }}>
              <FundzaButton href="/study">Study</FundzaButton>
              <FundzaButton href="/progress" variant="secondary">Review</FundzaButton>
            </div>
          </FundzaCard>
        </aside>
      </div>
    </div>
  );
}
