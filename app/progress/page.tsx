'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLoader from '@/components/AppLoader';
import { FundzaBadge, FundzaButton, FundzaCard, Metric, ProgressRing } from '@/components/Phase14Primitives';
import { calculateAps, getCurrentStudent, getLevel, StudentSubjectWithCatalog } from '@/lib/student-data';
import { supabase } from '@/lib/supabase';

interface ProgressRow { topic_id: string | null; attempts: number | null; correct_answers: number | null; percentage: number | null; mastery_level: string | null; last_attempted: string | null; best_percentage: number | null; average_percentage: number | null; }
type Topic = { id: string; subject_id: string; name: string };
type Question = { id: string; topic_id: string | null };

const officialPaperLinks = [
  { title: '2025 November NSC papers', description: 'Official Grade 12 question papers and memoranda for the November NSC sitting.', href: 'https://www.education.gov.za/Curriculum/NationalSeniorCertificate%28NSC%29Examinations/2025NovemberExamPapers.aspx' },
  { title: '2025 May/June NSC & SC papers', description: 'Official May/June papers and memoranda for the subjects in your profile.', href: 'https://www.education.gov.za/Curriculum/NationalSeniorCertificate%28NSC%29Examinations/2025MayJuneExamPapers.aspx' },
  { title: 'DBE past-paper archive', description: 'Browse older Grade 12 NSC papers and use them for timed practice.', href: 'https://www.education.gov.za/Curriculum/NationalSeniorCertificate%28NSC%29Examinations/NSCPastExaminationpapers.aspx' },
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
          supabase.from('topics').select('id, subject_id, name'),
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
          setTopicNames(Object.fromEntries(((topicRows ?? []) as Pick<Topic, 'id' | 'name'>[]).map(topic => [topic.id, topic.name])));
        }
        const topicSubject = new Map(((topics ?? []) as Topic[]).map(topic => [topic.id, topic.subject_id]));
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
  const targetAverage = subjects.length ? Math.round(subjects.reduce((sum, subject) => sum + Number(subject.target_percentage || 0), 0) / subjects.length) : 0;
  const mastered = progress.filter(row => row.mastery_level === 'mastered' || Number(row.percentage || 0) >= 80).length;
  const needsWork = progress.filter(row => Number(row.percentage || 0) < 60).slice(0, 5);
  const totalPracticeQuestions = useMemo(() => Object.values(questionCounts).reduce((sum, count) => sum + count, 0), [questionCounts]);
  const mastery = targetAverage ? Math.min(100, Math.round((average / targetAverage) * 100)) : average;

  if (loading) return <AppLoader message="Loading your progress..." />;

  return (
    <main className="fd-learning-page">
      <header className="fd-page-hero"><div className="fd-page-hero-copy"><p className="fd-kicker">PROGRESS MAP</p><h1 className="fd-page-title">See what is improving. See what still needs work.</h1><p className="fd-page-subtitle">Fundza turns marks and practice evidence into a revision map, so study time follows the biggest opportunity instead of whichever chapter happened to be open.</p></div><FundzaButton href="/study">Study weak areas</FundzaButton></header>

      <section className="fd-dark-hero"><p className="fd-kicker">CURRENT SNAPSHOT</p><h2>{average >= targetAverage && targetAverage ? 'You are at or above your current target average.' : 'Your next gains are visible.'}</h2><p>Track your APS, subject average, mastery and available practice from one place.</p><div className="fd-metric-grid" style={{ marginTop: '1rem' }}><div className="fd-metric-tile"><Metric label="Current APS" value={currentAps} detail="South African APS level total" /></div><div className="fd-metric-tile"><Metric label="Average" value={`${average}%`} detail={`Target average ${targetAverage}%`} /></div><div className="fd-metric-tile"><Metric label="Mastery" value={`${mastery}%`} detail={`${mastered} strong topics`} /></div><div className="fd-metric-tile"><Metric label="Practice bank" value={totalPracticeQuestions} detail="Questions available" /></div></div></section>

      <FundzaCard className="fd-panel"><div className="fd-panel-heading"><div><p className="fd-kicker">SUBJECT HEALTH</p><h2>How each subject is tracking</h2><p>Current result versus the target stored in your learner profile.</p></div><ProgressRing value={mastery} size={82} stroke={8} label={`${mastery}% target progress`} /></div><div className="fd-subject-progress-grid">{subjects.map(subject => { const current = Number(subject.current_percentage || 0); const target = Number(subject.target_percentage || 0); const targetProgress = target ? Math.min(100, Math.round((current / target) * 100)) : current; return <article className="fd-subject-progress" key={subject.id}><div className="fd-subject-progress-top"><span className="fd-subject-progress-name">{subject.subjects_catalog?.name || 'Subject'}</span><span className="fd-subject-progress-value">{current}% → {target}%</span></div><div className="fd-progress-track"><span style={{ width: `${targetProgress}%` }} /></div><div className="fd-status-row"><span>Level {getLevel(current)} · {subject.priority}</span><span>{questionCounts[subject.subject_id] ?? 0} practice questions</span></div></article>; })}</div>{!subjects.length ? <div className="fd-empty-card" style={{ marginTop: '.8rem' }}><h3>No subjects saved yet</h3><p>Complete your profile so Fundza can build a useful progress map.</p></div> : null}</FundzaCard>

      <section className="fd-topic-layout"><FundzaCard className="fd-panel fd-progress-weak-card"><div className="fd-panel-heading"><div><p className="fd-kicker">REVISION PRIORITY</p><h2>Topics needing attention</h2></div><FundzaBadge tone={needsWork.length ? 'danger' : 'success'}>{needsWork.length ? `${needsWork.length} to review` : 'No weak topics'}</FundzaBadge></div>{needsWork.length ? needsWork.map(row => <Link className="fd-weak-row" key={row.topic_id || `${row.last_attempted}-${row.percentage}`} href={row.topic_id ? `/quiz?topic=${encodeURIComponent(row.topic_id)}` : '/quiz'}><strong>{row.topic_id ? topicNames[row.topic_id] || 'Curriculum topic' : 'General practice'}</strong><span>{Number(row.percentage || 0)}%</span></Link>) : <div className="fd-empty-card"><h3>Nothing urgent yet</h3><p>Complete more quizzes and Fundza will surface the topics that need another pass.</p></div>}<FundzaButton href="/study" variant="secondary">Open Study</FundzaButton></FundzaCard>

        <FundzaCard className="fd-panel fd-soft-panel"><div className="fd-panel-heading"><div><p className="fd-kicker">PRACTICE ENGINE</p><h2>Turn progress into reps</h2><p>Practice by subject, then return here to see whether the numbers move.</p></div></div><div className="fd-status-row"><strong>Practice questions</strong><span>{totalPracticeQuestions}</span></div><div className="fd-status-row"><strong>Mastered topics</strong><span>{mastered}</span></div><div className="fd-status-row"><strong>Topics with evidence</strong><span>{progress.length}</span></div><div style={{ marginTop: '.75rem' }}><FundzaButton href="/quiz">Practice now</FundzaButton></div></FundzaCard>
      </section>

      <FundzaCard className="fd-panel"><div className="fd-panel-heading"><div><p className="fd-kicker">OFFICIAL PAPERS</p><h2>Practise with DBE sources</h2><p>Use official papers for timed exam preparation after building the underlying topic skills.</p></div><FundzaBadge tone="brand">DBE</FundzaBadge></div><div className="fd-paper-grid">{officialPaperLinks.map(paper => <a className="fd-paper-card" key={paper.title} href={paper.href} target="_blank" rel="noreferrer"><div><h3>{paper.title}</h3><p className="fd-paper-meta">{paper.description}</p></div><span className="fd-button fd-button-ghost">Open source ↗</span></a>)}</div></FundzaCard>
    </main>
  );
}
