'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProgressBar from '@/components/ProgressBar';
import AppLoader from '@/components/AppLoader';
import { calculateAps, getCurrentStudent, getLevel, StudentSubjectWithCatalog } from '@/lib/student-data';
import { supabase } from '@/lib/supabase';

type Topic = { id: string; subject_id: string };
type Question = { id: string; topic_id: string | null };

const officialPaperLinks = [
  {
    title: '2025 November NSC papers',
    description: 'Official DBE Grade 12 question papers and memoranda for the latest November NSC examination.',
    href: 'https://www.education.gov.za/Curriculum/NationalSeniorCertificate%28NSC%29Examinations/2025NovemberExamPapers.aspx',
  },
  {
    title: '2025 May/June NSC & SC papers',
    description: 'Official DBE May/June question papers and memoranda, including the subjects in your profile.',
    href: 'https://www.education.gov.za/Curriculum/NationalSeniorCertificate%28NSC%29Examinations/2025MayJuneExamPapers.aspx',
  },
  {
    title: 'DBE past-paper archive',
    description: 'Browse older Grade 12 NSC papers from 2024 back through previous examination years.',
    href: 'https://www.education.gov.za/Curriculum/NationalSeniorCertificate%28NSC%29Examinations/NSCPastExaminationpapers.aspx',
  },
];

export default function ProgressPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<StudentSubjectWithCatalog[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProgress() {
      try {
        const { session, student, subjects: savedSubjects } = await getCurrentStudent();
        if (!session) { router.push('/login'); return; }
        if (!student) { router.push('/setup'); return; }

        const [{ data: topics, error: topicsError }, { data: questions, error: questionsError }] = await Promise.all([
          supabase.from('topics').select('id, subject_id'),
          supabase.from('questions').select('id, topic_id'),
        ]);

        if (topicsError) throw topicsError;
        if (questionsError) throw questionsError;

        if (!active) return;
        setSubjects(savedSubjects);

        const topicSubject = new Map((topics ?? []).map((topic: Topic) => [topic.id, topic.subject_id]));
        const counts: Record<string, number> = {};
        for (const question of (questions ?? []) as Question[]) {
          const subjectId = question.topic_id ? topicSubject.get(question.topic_id) : undefined;
          if (subjectId) counts[subjectId] = (counts[subjectId] ?? 0) + 1;
        }
        setQuestionCounts(counts);
      } catch (error) {
        console.error(error);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProgress();
    return () => { active = false; };
  }, [router]);

  const currentAps = calculateAps(subjects);
  const average = subjects.length ? Math.round(subjects.reduce((sum, s) => sum + Number(s.current_percentage || 0), 0) / subjects.length) : 0;

  const totalPracticeQuestions = useMemo(() => Object.values(questionCounts).reduce((sum, count) => sum + count, 0), [questionCounts]);

  if (loading) return <AppLoader message="Loading your progress..." />;

  return (
    <main className="container">
      <h1>Progress</h1>
      <p style={{ color: '#64748b' }}>Your dashboard combines subject performance with repeated practice evidence so revision can focus on what needs attention.</p>

      <div className="card" style={{ background: '#0f172a', color: 'white' }}>
        <h2 style={{ color: '#fbbf24' }}>Progress &amp; Mastery</h2>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <div><p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Current APS</p><p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{currentAps}</p></div>
          <div><p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Subjects</p><p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{subjects.length}</p></div>
          <div><p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Average</p><p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{average}%</p></div>
          <div><p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Practice Questions</p><p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{totalPracticeQuestions}</p></div>
        </div>
      </div>

      <div className="card">
        <h2>Subject Breakdown</h2>
        <div style={{ marginTop: '0.75rem' }}>
          {subjects.map(s => {
            const current = Number(s.current_percentage || 0);
            const target = Number(s.target_percentage || 0);
            return (
              <div key={s.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <strong>{s.subjects_catalog?.name || 'Subject'}</strong>
                  <span>{current}% → {target}%</span>
                </div>
                <ProgressBar current={current} target={target} color="#2563eb" />
                <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>Level {getLevel(current)} • {s.priority}</div>
              </div>
            );
          })}
        </div>
      </div>

      <section className="card" aria-labelledby="practice-heading">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h2 id="practice-heading">Practice Questions</h2>
            <p style={{ color: '#64748b', marginTop: '0.35rem' }}>Real Fundza question-bank practice, organised around the subjects in your profile.</p>
          </div>
          <Link href="/quiz" className="btn">Practice All</Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
          {subjects.map(subject => {
            const code = subject.subjects_catalog?.code || '';
            const count = subject.subjects_catalog?.id ? questionCounts[subject.subjects_catalog.id] ?? 0 : 0;
            return (
              <div key={subject.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                <strong>{subject.subjects_catalog?.name}</strong>
                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.35rem 0 0.85rem' }}>
                  {count} question{count === 1 ? '' : 's'} available
                </p>
                <Link href={`/quiz?subject=${encodeURIComponent(code)}`} className="btn btn-secondary">Start Practice</Link>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card" aria-labelledby="papers-heading">
        <div>
          <h2 id="papers-heading">Question Papers</h2>
          <p style={{ color: '#64748b', marginTop: '0.35rem' }}>
            Use official Department of Basic Education papers for timed exam practice. Fundza links to the source rather than pretending a PDF fell from the heavens.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
          {officialPaperLinks.map(paper => (
            <a
              key={paper.title}
              href={paper.href}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'block', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', textDecoration: 'none', color: 'inherit' }}
            >
              <strong>{paper.title}</strong>
              <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5, margin: '0.45rem 0 0' }}>{paper.description}</p>
              <span style={{ display: 'inline-block', marginTop: '0.75rem', color: '#2563eb', fontWeight: 600 }}>Open official papers →</span>
            </a>
          ))}
        </div>
      </section>

      <div className="card">
        <h2>Topics That Need Work</h2>
        <p style={{ color: '#64748b' }}>No weak topics have been recorded yet. Complete a few topic quizzes to build mastery evidence.</p>
        <Link href="/study" className="btn">Study Weak Areas</Link>
      </div>

      <nav className="nav">
        <Link href="/">Home</Link><Link href="/study">Study</Link><Link href="/quiz">Practice</Link><Link href="/exams">Exams</Link><Link href="/progress">Progress</Link>
      </nav>
    </main>
  );
}
