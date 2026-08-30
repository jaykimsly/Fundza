'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProgressBar from '@/components/ProgressBar';
import AppLoader from '@/components/AppLoader';
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

interface TopicNameRow {
  id: string;
  name: string;
}

export default function ProgressPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<StudentSubjectWithCatalog[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [topicNames, setTopicNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentStudent().then(async ({ session, student, subjects: savedSubjects }) => {
      if (!session) { router.push('/login'); return; }
      if (!student) { router.push('/setup'); return; }
      setSubjects(savedSubjects);

      const { data } = await supabase
        .from('student_progress')
        .select('topic_id, attempts, correct_answers, percentage, mastery_level, last_attempted, best_percentage, average_percentage')
        .eq('student_id', student.id)
        .order('last_attempted', { ascending: false });

      const rows = (data ?? []) as ProgressRow[];
      setProgress(rows);

      const topicIds = rows.map(row => row.topic_id).filter((id): id is string => Boolean(id));
      if (topicIds.length) {
        const { data: topics } = await supabase.from('topics').select('id, name').in('id', topicIds);
        const names = Object.fromEntries(((topics ?? []) as TopicNameRow[]).map(topic => [topic.id, topic.name]));
        setTopicNames(names);
      }
      setLoading(false);
    }).catch(error => {
      console.error(error);
      setLoading(false);
    });
  }, [router]);

  if (loading) return <AppLoader message="Loading your progress..." />;

  const currentAps = calculateAps(subjects);
  const average = subjects.length ? Math.round(subjects.reduce((sum, s) => sum + Number(s.current_percentage || 0), 0) / subjects.length) : 0;
  const mastered = progress.filter(row => row.mastery_level === 'mastered' || Number(row.percentage || 0) >= 80).length;
  const needsWork = progress.filter(row => Number(row.percentage || 0) < 60).slice(0, 5);

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
          <div><p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Mastered topics</p><p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{mastered}</p></div>
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

      <div className="card">
        <h2>Topics That Need Work</h2>
        {!needsWork.length ? (
          <p style={{ color: '#64748b' }}>No weak topics have been recorded yet. Complete a few topic quizzes to build mastery evidence.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.75rem' }}>
            {needsWork.map(row => (
              <div key={row.topic_id || `${row.last_attempted}-${row.percentage}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.65rem 0', borderBottom: '1px solid #e2e8f0' }}>
                <span>{row.topic_id ? topicNames[row.topic_id] || 'Curriculum topic' : 'General practice'}</span>
                <strong>{Number(row.percentage || 0)}%</strong>
              </div>
            ))}
          </div>
        )}
        <Link href="/study" className="btn" style={{ marginTop: '1rem' }}>Study Weak Areas</Link>
      </div>

      <nav className="nav">
        <Link href="/">Dashboard</Link><Link href="/profile">Profile</Link><Link href="/study">Study</Link><Link href="/quiz">Quiz</Link><Link href="/exams">Exams</Link>
      </nav>
    </main>
  );
}
