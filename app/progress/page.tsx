'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProgressBar from '@/components/ProgressBar';
import AppLoader from '@/components/AppLoader';
import AppIcon from '@/components/AppIcon';
import { FundzaBadge, FundzaButton, FundzaCard, Metric } from '@/components/Phase14Primitives';
import { calculateAps, getCurrentStudent, getLevel, StudentSubjectWithCatalog } from '@/lib/student-data';
import { supabase } from '@/lib/supabase';

interface ProgressRow {
  topic_id: string | null;
  attempts: number | null;
  correct_answers: number | null;
  percentage: number | null;
  mastery_level: string | null;
  last_attempted: string | null;
  best_percentage: number | null;
  average_percentage: number | null;
}
interface TopicNameRow { id: string; name: string; }
type Topic = { id: string; subject_id: string };
type Question = { id: string; topic_id: string | null };

const officialPaperLinks = [
  { title: '2025 November NSC papers', description: 'Official DBE Grade 12 question papers and memoranda for the latest November NSC examination.', href: 'https://www.education.gov.za/Curriculum/NationalSeniorCertificate%28NSC%29Examinations/2025NovemberExamPapers.aspx' },
  { title: '2025 May/June NSC & SC papers', description: 'Official DBE May/June question papers and memoranda, including the subjects in your profile.', href: 'https://www.education.gov.za/Curriculum/NationalSeniorCertificate%28NSC%29Examinations/2025MayJuneExamPapers.aspx' },
  { title: 'DBE past-paper archive', description: 'Browse older Grade 12 NSC papers from 2024 back through previous examination years.', href: 'https://www.education.gov.za/Curriculum/NationalSeniorCertificate%28NSC%29Examinations/NSCPastExaminationpapers.aspx' },
];

export default function ProgressPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<StudentSubjectWithCatalog[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [topicNames, setTopicNames] = useState<Record<string, string>>({});
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadProgress() {
      try {
        const { session, student, subjects: savedSubjects } = await getCurrentStudent();
        if (!session) { router.push('/login'); return; }
        if (!student) { router.push('/setup'); return; }
        setSubjects(savedSubjects);
        const [{ data: progressRows }, { data: topics, error: topicsError }, { data: questions, error: questionsError }] = await Promise.all([
          supabase.from('student_progress').select('topic_id, attempts, correct_answers, percentage, mastery_level, last_attempted, best_percentage, average_percentage').eq('student_id', student.id).order('last_attempted', { ascending: false }),
          supabase.from('topics').select('id, subject_id'),
          supabase.from('questions').select('id, topic_id'),
        ]);
        if (topicsError) throw topicsError;
        if (questionsError) throw questionsError;
        if (!active) return;
        const rows = (progressRows ?? []) as ProgressRow[];
        setProgress(rows);
        const topicIds = rows.map(row => row.topic_id).filter((id): id is string => Boolean(id));
        if (topicIds.length) {
          const { data: topicRows } = await supabase.from('topics').select('id, name').in('id', topicIds);
          setTopicNames(Object.fromEntries(((topicRows ?? []) as TopicNameRow[]).map(topic => [topic.id, topic.name])));
        }
        const topicSubject = new Map((topics ?? []).map((topic: Topic) => [topic.id, topic.subject_id]));
        const counts: Record<string, number> = {};
        for (const question of (questions ?? []) as Question[]) {
          const subjectId = question.topic_id ? topicSubject.get(question.topic_id) : undefined;
          if (subjectId) counts[subjectId] = (counts[subjectId] ?? 0) + 1;
        }
        setQuestionCounts(counts);
      } catch (error) {
        console.error('Progress load error:', error);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProgress();
    return () => { active = false; };
  }, [router]);

  const currentAps = calculateAps(subjects);
  const average = subjects.length ? Math.round(subjects.reduce((sum, subject) => sum + Number(subject.current_percentage || 0), 0) / subjects.length) : 0;
  const mastered = progress.filter(row => row.mastery_level === 'mastered' || Number(row.percentage || 0) >= 80).length;
  const needsWork = progress.filter(row => Number(row.percentage || 0) < 60).slice(0, 5);
  const totalPracticeQuestions = useMemo(() => Object.values(questionCounts).reduce((sum, count) => sum + count, 0), [questionCounts]);

  if (loading) return <AppLoader message="Loading your progress..." />;

  return (
    <main className="fd-shell-content fd-dashboard">
      <header className="fd-dashboard-head">
        <div>
          <p className="fd-dashboard-kicker">Measure · understand · improve</p>
          <h1 className="fd-dashboard-title">Progress</h1>
          <p className="fd-dashboard-subtitle">See your subject performance, practice coverage and the topics that need the most attention.</p>
        </div>
        <div className="fd-dashboard-actions">
          <FundzaButton href="/study" variant="secondary"><AppIcon name="book" size={16} /> Study weak areas</FundzaButton>
          <FundzaButton href="/quiz" variant="ghost"><AppIcon name="quiz" size={16} /> Practice</FundzaButton>
        </div>
      </header>

      <FundzaCard className="fd-dashboard-section fd-dark-panel">
        <div className="fd-dashboard-section-head"><div><p className="fd-section-label">Progress & mastery</p><h2 className="fd-section-title" style={{ color: '#fff' }}>Your current position</h2></div><FundzaBadge tone="brand">Live profile data</FundzaBadge></div>
        <div className="fd-dashboard-stat-grid">
          <div className="fd-dashboard-stat"><Metric label="Current APS" value={currentAps} detail="Current profile estimate" /></div>
          <div className="fd-dashboard-stat"><Metric label="Subjects" value={subjects.length} detail="Selected subjects" /></div>
          <div className="fd-dashboard-stat"><Metric label="Average" value={`${average}%`} detail="Current subject average" /></div>
          <div className="fd-dashboard-stat"><Metric label="Mastered" value={mastered} detail="Topics at mastery" /></div>
          <div className="fd-dashboard-stat"><Metric label="Questions" value={totalPracticeQuestions} detail="Available in bank" /></div>
        </div>
      </FundzaCard>

      <div className="fd-dashboard-grid">
        <div className="fd-dashboard-grid-main">
          <FundzaCard className="fd-dashboard-section">
            <div className="fd-dashboard-section-head"><div><p className="fd-section-label">Subject performance</p><h2 className="fd-section-title">Where you stand</h2></div></div>
            {subjects.length ? <div className="fd-subject-list">
              {subjects.map(subject => {
                const current = Number(subject.current_percentage || 0);
                const target = Number(subject.target_percentage || 0);
                return <article key={subject.id} className="fd-subject fd-subject-accent"><div className="fd-subject-top"><div><h3 className="fd-subject-name">{subject.subjects_catalog?.name || 'Subject'}</h3><div className="fd-subject-values"><span>Current <strong>{current}%</strong></span><span>Target <strong>{target}%</strong></span></div></div><FundzaBadge tone={subject.priority === 'low' ? 'success' : subject.priority === 'medium' ? 'warning' : 'danger'}>{subject.priority || 'focus'}</FundzaBadge></div><ProgressBar current={current} target={target} /><div className="fd-subject-meta"><span>Level {getLevel(current)}</span><Link href={`/quiz?subject=${encodeURIComponent(subject.subjects_catalog?.code || '')}`} className="fd-button fd-button-secondary">Practice</Link></div></article>;
              })}
            </div> : <div className="fd-empty">No subjects are saved yet. Complete your profile to start tracking performance.<div className="fd-dashboard-cta-row"><FundzaButton href="/profile/edit">Set up subjects</FundzaButton></div></div>}
          </FundzaCard>

          <FundzaCard className="fd-dashboard-section">
            <div className="fd-dashboard-section-head"><div><p className="fd-section-label">Practice coverage</p><h2 className="fd-section-title">Questions available by subject</h2></div><FundzaBadge tone="brand">{totalPracticeQuestions} total</FundzaBadge></div>
            <div className="fd-quick-actions">{subjects.map(subject => { const code = subject.subjects_catalog?.code || ''; const count = subject.subjects_catalog?.id ? questionCounts[subject.subjects_catalog.id] ?? 0 : 0; return <Link key={subject.id} href={`/quiz?subject=${encodeURIComponent(code)}`} className="fd-quick-action"><AppIcon name="quiz" size={18} /><span>{subject.subjects_catalog?.name}</span><span>{count}</span></Link>; })}</div>
          </FundzaCard>
        </div>

        <aside className="fd-dashboard-side">
          <FundzaCard className="fd-dashboard-section">
            <div className="fd-dashboard-section-head"><div><p className="fd-section-label">Topics needing attention</p><h2 className="fd-section-title">Your next fixes</h2></div></div>
            {needsWork.length ? <div className="fd-profile-list">{needsWork.map(row => <Link key={row.topic_id || `${row.last_attempted}-${row.percentage}`} href={row.topic_id ? `/study?topic=${encodeURIComponent(row.topic_id)}` : '/study'}><span className="fd-profile-icon">!</span><span><strong>{row.topic_id ? topicNames[row.topic_id] || 'Curriculum topic' : 'General practice'}</strong><small>{Number(row.percentage || 0)}% latest result</small></span><span>›</span></Link>)}</div> : <div className="fd-empty">No weak topics have been recorded yet. Complete a few topic quizzes to build mastery evidence.</div>}
          </FundzaCard>
          <FundzaCard className="fd-dashboard-section">
            <div className="fd-dashboard-section-head"><div><p className="fd-section-label">Official resources</p><h2 className="fd-section-title">DBE question papers</h2></div></div>
            <div className="fd-profile-list">{officialPaperLinks.map(paper => <a key={paper.title} href={paper.href} target="_blank" rel="noreferrer"><span className="fd-profile-icon">↗</span><span><strong>{paper.title}</strong><small>{paper.description}</small></span><span>›</span></a>)}</div>
          </FundzaCard>
        </aside>
      </div>
    </main>
  );
}
