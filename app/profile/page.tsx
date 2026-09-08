'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentStudent, StudentSubjectWithCatalog } from '@/lib/student-data';
import AppIcon from '@/components/AppIcon';
import AppLoader from '@/components/AppLoader';
import { FundzaBadge, FundzaButton, FundzaCard, Metric } from '@/components/Phase14Primitives';
import { LEGAL_DOCUMENTS } from '@/lib/legal';

type IdentityPhotos = { photo_one_path: string; photo_two_path: string } | null;

function getLevel(percentage: number) {
  if (percentage >= 80) return 7;
  if (percentage >= 70) return 6;
  if (percentage >= 60) return 5;
  if (percentage >= 50) return 4;
  if (percentage >= 40) return 3;
  if (percentage >= 30) return 2;
  return 1;
}

export default function ProfilePage() {
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [subjects, setSubjects] = useState<StudentSubjectWithCatalog[]>([]);
  const [identityPhotos, setIdentityPhotos] = useState<IdentityPhotos>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [legalComplete, setLegalComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ session, student: currentStudent, subjects: currentSubjects }, { data: acceptances }] = await Promise.all([
          getCurrentStudent(),
          supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) return { data: null } as any;
            return supabase.from('legal_acceptances').select('document_type, document_version').eq('user_id', user.id);
          }),
        ]);

        if (!session) { router.push('/login'); return; }
        if (!currentStudent) { router.push('/setup'); return; }
        setStudent(currentStudent);
        setSubjects(currentSubjects);

        const { data: identity } = await supabase
          .from('student_identity_photos')
          .select('photo_one_path, photo_two_path')
          .eq('student_id', currentStudent.id)
          .maybeSingle();
        if (identity) {
          setIdentityPhotos(identity);
          const signed = await Promise.all(
            [identity.photo_one_path, identity.photo_two_path].map(path =>
              supabase.storage.from('student-identity').createSignedUrl(path, 3600),
            ),
          );
          setPhotoUrls(signed.map(result => result.data?.signedUrl).filter(Boolean) as string[]);
        }

        setLegalComplete(Object.values(LEGAL_DOCUMENTS).every(document =>
          (acceptances || []).some((item: any) =>
            item.document_type === document.type && item.document_version === document.version,
          ),
        ));
      } catch (error) {
        console.error('Profile load error:', error);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [router]);

  const stats = useMemo(() => {
    const current = subjects.map(subject => Number(subject.current_percentage || 0));
    const target = subjects.map(subject => Number(subject.target_percentage || 0));
    const currentAvg = current.length ? Math.round(current.reduce((a, b) => a + b, 0) / current.length) : 0;
    const targetAvg = target.length ? Math.round(target.reduce((a, b) => a + b, 0) / target.length) : 0;
    const mastery = targetAvg ? Math.min(100, Math.round((currentAvg / targetAvg) * 100)) : 0;
    const level = getLevel(currentAvg);
    const xp = Math.min(9999, currentAvg * 40 + subjects.length * 35);
    const nextXp = level * 500;
    return { currentAvg, targetAvg, mastery, level, xp, nextXp };
  }, [subjects]);

  const streak = Math.min(30, Math.max(1, Math.round(stats.mastery / 10)));
  const quests = [
    { label: 'Complete a focus session', xp: 50, href: '/study', done: stats.currentAvg >= 60 },
    { label: 'Solve 10 practice questions', xp: 80, href: '/quiz', done: false },
    { label: 'Review one weak subject', xp: 70, href: '/progress', done: stats.currentAvg >= 50 },
    { label: 'Attempt a past paper', xp: 100, href: '/exams', done: false },
  ];
  const completedQuests = quests.filter(quest => quest.done).length;
  const firstName = (student?.full_name || 'Learner').split(' ')[0];
  const initials = (student?.full_name || 'FL').split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    router.push('/login');
  };

  if (loading) return <AppLoader message="Loading your learner profile..." />;
  if (!student) return null;

  return (
    <main className="fd-shell-content fd-profile-page">
      <section className="fd-profile-header" aria-labelledby="profile-title">
        <div className="fd-profile-avatar">
          {photoUrls[0] ? <img src={photoUrls[0]} alt="Profile" /> : initials}
        </div>
        <div>
          <p className="fd-section-label">Student profile</p>
          <h1 id="profile-title" className="fd-profile-title">{firstName}&apos;s learning profile</h1>
          <p className="fd-profile-subtitle">
            Grade {student.grades?.grade_number || '—'} · {student.schools?.name || 'School not set'} · {student.career_pathway || 'Pathway not set'}
          </p>
          <span className="fd-profile-level">Level {stats.level}</span>
        </div>
        <div className="fd-profile-actions">
          <FundzaButton href="/profile/edit" variant="secondary"><AppIcon name="user" size={16} /> Edit profile</FundzaButton>
          <FundzaButton variant="ghost" onClick={handleLogout}><AppIcon name="logout" size={16} /> Log out</FundzaButton>
        </div>
        <div className="fd-profile-resource"><strong>{stats.xp.toLocaleString()} XP</strong><span>{streak} day streak</span></div>
      </section>

      <section className="fd-profile-stat-grid" aria-label="Profile statistics">
        <article className="fd-profile-stat"><p className="fd-profile-stat-label">Level</p><p className="fd-profile-stat-value">{stats.level}</p><p className="fd-profile-stat-detail">Current learner level</p></article>
        <article className="fd-profile-stat"><p className="fd-profile-stat-label">Average</p><p className="fd-profile-stat-value">{stats.currentAvg}%</p><p className="fd-profile-stat-detail">Across {subjects.length} subjects</p></article>
        <article className="fd-profile-stat"><p className="fd-profile-stat-label">Mastery</p><p className="fd-profile-stat-value">{stats.mastery}%</p><p className="fd-profile-stat-detail">Progress toward targets</p></article>
        <article className="fd-profile-stat"><p className="fd-profile-stat-label">Streak</p><p className="fd-profile-stat-value">{streak}d</p><p className="fd-profile-stat-detail">Study consistency</p></article>
      </section>

      <div className="fd-profile-grid">
        <div>
          <FundzaCard className="fd-profile-card">
            <div className="fd-profile-card-head"><div><p className="fd-section-label">Progression</p><h2>Level {stats.level}</h2></div><strong>{stats.xp} / {stats.nextXp} XP</strong></div>
            <div className="fd-profile-progress"><span style={{ width: `${Math.min(100, Math.round((stats.xp / stats.nextXp) * 100))}%` }} /></div>
            <p className="fd-profile-muted">{Math.max(0, stats.nextXp - stats.xp)} XP until your next level.</p>
          </FundzaCard>

          <FundzaCard className="fd-profile-card">
            <div className="fd-profile-card-head"><div><p className="fd-section-label">Daily actions</p><h2>Study goals</h2></div><FundzaBadge tone="brand">{completedQuests}/{quests.length}</FundzaBadge></div>
            <div className="fd-profile-list">
              {quests.map(quest => (
                <Link key={quest.label} href={quest.href}>
                  <span className="fd-profile-icon">{quest.done ? '✓' : '→'}</span>
                  <span><strong>{quest.label}</strong><small>+{quest.xp} XP</small></span>
                  <span aria-hidden="true">›</span>
                </Link>
              ))}
            </div>
          </FundzaCard>

          <FundzaCard className="fd-profile-card">
            <div className="fd-profile-card-head"><div><p className="fd-section-label">Subjects</p><h2>Your learning subjects</h2></div><Link href="/profile/edit">Manage →</Link></div>
            {subjects.length ? (
              <div className="fd-profile-subjects">
                {subjects.map(subject => {
                  const current = Number(subject.current_percentage || 0);
                  const target = Number(subject.target_percentage || 0);
                  const progress = target ? Math.min(100, Math.round((current / target) * 100)) : 0;
                  return <div className="fd-profile-subject" key={subject.id}><strong>{subject.subjects_catalog?.name || 'Subject'}</strong><span>{current}% current · {target}% target</span><div className="fd-profile-progress"><span style={{ width: `${progress}%` }} /></div></div>;
                })}
              </div>
            ) : <div className="fd-empty">No subjects have been added yet.</div>}
          </FundzaCard>
        </div>

        <aside>
          <FundzaCard className="fd-profile-card fd-profile-goal">
            <div className="fd-profile-card-head"><div><p className="fd-section-label">Academic target</p><h2>{student.target_degree || 'Target not set'}</h2></div><AppIcon name="graduation" size={20} /></div>
            <p className="fd-profile-muted">Target institution: <strong>{student.target_university || 'Not set'}</strong></p>
            <div className="fd-profile-progress"><span style={{ width: `${stats.mastery}%` }} /></div>
            <p className="fd-profile-muted">{stats.mastery}% toward current subject targets.</p>
          </FundzaCard>

          <FundzaCard className="fd-profile-card">
            <div className="fd-profile-card-head"><div><p className="fd-section-label">Identity</p><h2>Your photos</h2></div><Link href="/setup">Manage →</Link></div>
            <div className="fd-profile-photos">{[photoUrls[0], photoUrls[1]].map((url, index) => <div className="fd-profile-photo" key={index}>{url ? <img src={url} alt={`Identity photo ${index + 1}`} /> : <span>{index + 1}</span>}</div>)}</div>
            <p className="fd-profile-muted">{identityPhotos ? 'Two identity photos are connected to your account.' : 'Add your two identity photos to complete your profile.'}</p>
          </FundzaCard>

          <FundzaCard className="fd-profile-card">
            <div className="fd-profile-card-head"><div><p className="fd-section-label">Account</p><h2>Access & legal</h2></div><span className={`fd-profile-status ${legalComplete ? 'ready' : 'action'}`}>{legalComplete ? 'READY' : 'ACTION REQUIRED'}</span></div>
            <div className="fd-profile-list">
              <Link href="/legal/accept"><span className="fd-profile-icon">✓</span><span><strong>{legalComplete ? 'Review signed documents' : 'Review required documents'}</strong><small>Keep your account compliant</small></span><span>›</span></Link>
              <Link href="/legal"><span className="fd-profile-icon">i</span><span><strong>Terms, privacy & legal notice</strong><small>Review Fundza policies</small></span><span>›</span></Link>
            </div>
          </FundzaCard>

          <FundzaCard className="fd-profile-card">
            <div className="fd-profile-card-head"><div><p className="fd-section-label">Quick access</p><h2>Keep learning</h2></div></div>
            <div className="fd-dashboard-cta-row" style={{ marginTop: 0 }}>
              <FundzaButton href="/study">Study</FundzaButton>
              <FundzaButton href="/quiz" variant="secondary">Practice</FundzaButton>
              <FundzaButton href="/exams" variant="secondary">Exams</FundzaButton>
            </div>
          </FundzaCard>
        </aside>
      </div>
    </main>
  );
}
