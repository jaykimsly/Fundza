'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentStudent, StudentSubjectWithCatalog } from '@/lib/student-data';
import AppLoader from '@/components/AppLoader';
import ProfileGamifiedStyles from '@/components/ProfileGamifiedStyles';
import { LEGAL_DOCUMENTS } from '@/lib/legal';

type IdentityPhotos = { photo_one_path: string; photo_two_path: string } | null;

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

        const { data: identity } = await supabase.from('student_identity_photos').select('photo_one_path, photo_two_path').eq('student_id', currentStudent.id).maybeSingle();
        if (identity) {
          setIdentityPhotos(identity);
          const signed = await Promise.all([identity.photo_one_path, identity.photo_two_path].map(path => supabase.storage.from('student-identity').createSignedUrl(path, 3600)));
          setPhotoUrls(signed.map(result => result.data?.signedUrl).filter(Boolean) as string[]);
        }

        const complete = Object.values(LEGAL_DOCUMENTS).every((document) => (acceptances || []).some((item: any) => item.document_type === document.type && item.document_version === document.version));
        setLegalComplete(complete);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    router.push('/login');
  };

  const stats = useMemo(() => {
    const current = subjects.map(s => Number(s.current_percentage || 0));
    const target = subjects.map(s => Number(s.target_percentage || 0));
    const currentAvg = current.length ? Math.round(current.reduce((a, b) => a + b, 0) / current.length) : 0;
    const targetAvg = target.length ? Math.round(target.reduce((a, b) => a + b, 0) / target.length) : 0;
    const mastery = targetAvg ? Math.min(100, Math.round((currentAvg / targetAvg) * 100)) : 0;
    const level = Math.max(1, Math.floor(currentAvg / 10) + 1);
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
  const completedQuests = quests.filter(q => q.done).length;
  const firstName = (student?.full_name || 'Learner').split(' ')[0];
  const initials = (student?.full_name || 'FL').split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase();

  if (loading) return <AppLoader message="Loading your learner profile..." />;
  if (!student) return null;

  return (
    <main className="container fd-profile-page">
      <ProfileGamifiedStyles />
      <section className="fd-profile-hero">
        <div className="fd-profile-avatar-wrap">
          {photoUrls[0] ? <img className="fd-profile-avatar-image" src={photoUrls[0]} alt="Your profile" /> : <div className="fd-profile-avatar">{initials}</div>}
          <span className="fd-level-badge">LVL {stats.level}</span>
        </div>
        <div className="fd-profile-intro">
          <span className="fd-eyebrow">FUNDZA • STUDENT PROFILE</span>
          <h1>{firstName}, your next level is waiting.</h1>
          <p>{student.career_pathway || 'University'} pathway • {student.grades?.grade_number ? `Grade ${student.grades.grade_number}` : 'Grade not set'}</p>
          <div className="fd-hero-actions"><Link href="/profile/edit" className="btn">Edit Profile</Link><button onClick={handleLogout} className="btn btn-secondary">Log out</button></div>
        </div>
        <div className="fd-resource-pill"><strong>{stats.xp.toLocaleString()}</strong><span>XP</span><strong>{streak}</strong><span>day streak</span></div>
      </section>

      <section className="fd-stat-grid" aria-label="Learner statistics">
        <article className="fd-stat-card"><span>LEVEL</span><strong>{stats.level}</strong><small>Keep earning XP</small></article>
        <article className="fd-stat-card"><span>AVERAGE</span><strong>{stats.currentAvg}%</strong><small>Current subject average</small></article>
        <article className="fd-stat-card"><span>MASTERY</span><strong>{stats.mastery}%</strong><small>Progress toward targets</small></article>
        <article className="fd-stat-card"><span>STREAK</span><strong>{streak}d</strong><small>Consistency multiplier</small></article>
      </section>

      <section className="fd-xp-panel fd-panel"><div className="fd-panel-heading"><div><span className="fd-eyebrow">LEVEL UP PROGRESSION</span><h2>Level {stats.level}</h2></div><strong>{stats.xp} / {stats.nextXp} XP</strong></div><div className="fd-xp-track"><span style={{ width: `${Math.min(100, Math.round((stats.xp / stats.nextXp) * 100))}%` }} /></div><p>{Math.max(0, stats.nextXp - stats.xp)} XP until your next level.</p></section>

      <div className="fd-dashboard-grid">
        <section className="fd-panel"><div className="fd-panel-heading"><div><span className="fd-eyebrow">DAILY QUESTS</span><h2>Today&apos;s missions</h2></div><span className="fd-quest-count">{completedQuests}/{quests.length}</span></div><div className="fd-quest-list">{quests.map(quest => <Link key={quest.label} href={quest.href} className={`fd-quest ${quest.done ? 'is-done' : ''}`}><span className="fd-quest-icon">{quest.done ? '✓' : '○'}</span><span><strong>{quest.label}</strong><small>+{quest.xp} XP</small></span><span className="fd-quest-arrow">→</span></Link>)}</div></section>
        <section className="fd-panel"><div className="fd-panel-heading"><div><span className="fd-eyebrow">CHARACTER STATS</span><h2>Study attributes</h2></div></div>
          <div className="fd-attribute"><span>INTELLIGENCE</span><strong>{Math.min(99, stats.currentAvg + 18)}</strong><i><b style={{ width: `${Math.min(99, stats.currentAvg + 18)}%` }} /></i></div>
          <div className="fd-attribute"><span>FOCUS</span><strong>{Math.min(99, 45 + streak * 2)}</strong><i><b style={{ width: `${Math.min(99, 45 + streak * 2)}%` }} /></i></div>
          <div className="fd-attribute"><span>DISCIPLINE</span><strong>{Math.min(99, 50 + completedQuests * 10)}</strong><i><b style={{ width: `${Math.min(99, 50 + completedQuests * 10)}%` }} /></i></div>
          <div className="fd-attribute"><span>CONSISTENCY</span><strong>{Math.min(99, 40 + streak * 2)}</strong><i><b style={{ width: `${Math.min(99, 40 + streak * 2)}%` }} /></i></div>
        </section>
      </div>

      <section className="fd-panel fd-subject-panel"><div className="fd-panel-heading"><div><span className="fd-eyebrow">SKILL TREE</span><h2>Your subjects</h2></div><Link href="/profile/edit">Manage →</Link></div><div className="fd-subject-grid">{subjects.map(subject => { const current = Number(subject.current_percentage || 0); const target = Number(subject.target_percentage || 0); const progress = target ? Math.min(100, Math.round((current / target) * 100)) : 0; return <div className="fd-subject-card" key={subject.id}><div><strong>{subject.subjects_catalog?.name || 'Subject'}</strong><span>{current}% → {target}% target</span></div><div className="fd-mini-track"><span style={{ width: `${progress}%` }} /></div></div>; })}</div></section>

      <section className="fd-dashboard-grid">
        <section className="fd-panel fd-goal-card"><div className="fd-panel-heading"><div><span className="fd-eyebrow">MAIN QUEST</span><h2>{student.target_degree || 'Academic target'}</h2></div></div><p>Target institution: <strong>{student.target_university || 'Not set'}</strong></p><div className="fd-goal-meter"><span style={{ width: `${stats.mastery}%` }} /></div><strong>{stats.mastery}% quest completion</strong></section>
        <section className="fd-panel fd-identity-card"><div className="fd-panel-heading"><div><span className="fd-eyebrow">IDENTITY LOADOUT</span><h2>Your photos</h2></div><Link href="/setup">Manage →</Link></div><div className="fd-photo-slots">{[photoUrls[0], photoUrls[1]].map((url, index) => <div className="fd-photo-slot" key={index}>{url ? <img src={url} alt={`Identity photo ${index + 1}`} /> : <span>{index + 1}</span>}</div>)}</div><p>{identityPhotos ? 'Identity photos are connected to your learner account.' : 'Add your two identity photos to complete your profile loadout.'}</p></section>
      </section>

      <section className="fd-panel fd-achievements"><div className="fd-panel-heading"><div><span className="fd-eyebrow">ACHIEVEMENT TROPHIES</span><h2>Milestones</h2></div></div><div className="fd-trophy-grid"><div className={`fd-trophy ${subjects.length >= 6 ? 'unlocked' : ''}`}><span>◆</span><strong>Ready Player</strong><small>6+ subjects selected</small></div><div className={`fd-trophy ${stats.currentAvg >= 60 ? 'unlocked' : ''}`}><span>✦</span><strong>Knowledge Seeker</strong><small>60% average reached</small></div><div className={`fd-trophy ${streak >= 7 ? 'unlocked' : ''}`}><span>◇</span><strong>Consistent</strong><small>7 day streak</small></div><div className={`fd-trophy ${legalComplete ? 'unlocked' : ''}`}><span>⬡</span><strong>Account Ready</strong><small>Legal access complete</small></div></div></section>

      <section className="fd-quick-links"><Link href="/study">Study Arena <span>→</span></Link><Link href="/quiz">Quiz Battles <span>→</span></Link><Link href="/exams">Past Paper Dungeon <span>→</span></Link><Link href="/progress">Progress Map <span>→</span></Link></section>

      <section className="fd-panel fd-legal-panel"><div className="fd-panel-heading"><div><span className="fd-eyebrow">ACCOUNT STATUS</span><h2>Access & legal</h2></div><span className={legalComplete ? 'fd-status-good' : 'fd-status-warn'}>{legalComplete ? 'READY' : 'ACTION REQUIRED'}</span></div><div className="profile-links"><Link href="/legal/accept"><span>{legalComplete ? 'Review signed documents' : 'Review & sign required documents'}</span><span>→</span></Link><Link href="/legal"><span>Terms, Privacy, Copyright & Legal Notice</span><span>→</span></Link></div></section>
    </main>
  );
}
