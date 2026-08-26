'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProgressBar from '@/components/ProgressBar';
import AppLoader from '@/components/AppLoader';
import { calculateAps, getCurrentStudent, getLevel, StudentSubjectWithCatalog } from '@/lib/student-data';

export default function ProgressPage() {
  const router = useRouter();
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

  if (loading) return <AppLoader message="Loading your progress..." />;

  const currentAps = calculateAps(subjects);
  const average = subjects.length ? Math.round(subjects.reduce((sum, s) => sum + Number(s.current_percentage || 0), 0) / subjects.length) : 0;

  return (
    <main className="container">
      <h1>Progress</h1>
      <p style={{ color: '#64748b' }}>This page uses the same saved subjects and marks as your Dashboard and Profile.</p>

      <div className="card" style={{ background: '#0f172a', color: 'white' }}>
        <h2 style={{ color: '#fbbf24' }}>APS Tracker</h2>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <div><p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Current APS</p><p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{currentAps}</p></div>
          <div><p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Subjects</p><p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{subjects.length}</p></div>
          <div><p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Average</p><p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{average}%</p></div>
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
        <h2>Revision</h2>
        <p style={{ color: '#64748b' }}>Study and quiz recommendations will be based on these same subjects and their current performance.</p>
        <Link href="/study" className="btn">Study My Subjects</Link>
      </div>

      <nav className="nav">
        <Link href="/">Dashboard</Link><Link href="/profile">Profile</Link><Link href="/study">Study</Link><Link href="/quiz">Quiz</Link><Link href="/exams">Exams</Link>
      </nav>
    </main>
  );
}
