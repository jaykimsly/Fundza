'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AiQuizGenerator from '@/components/AiQuizGenerator';
import AppLoader from '@/components/AppLoader';
import { getCurrentStudent, StudentSubjectWithCatalog } from '@/lib/student-data';

export default function StudyPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<StudentSubjectWithCatalog[]>([]);
  const [selected, setSelected] = useState<StudentSubjectWithCatalog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentStudent().then(({ session, student, subjects: savedSubjects }) => {
      if (!session) { router.push('/login'); return; }
      if (!student) { router.push('/setup'); return; }
      setSubjects(savedSubjects);
      setSelected(savedSubjects[0] || null);
      setLoading(false);
    }).catch(error => {
      console.error(error);
      setLoading(false);
    });
  }, [router]);

  if (loading) return <AppLoader message="Loading your study space..." />;

  return (
    <main className="container">
      <h1>Study Hub</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        Study from the subjects saved in your Fundza profile. The same subject list is used by Dashboard, Quiz, Exams and Progress.
      </p>

      <div className="card">
        <h2>My Subjects</h2>
        <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem' }}>
          {subjects.map(subject => (
            <button key={subject.id} onClick={() => setSelected(subject)} className="btn btn-secondary" style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
              <span>{subject.subjects_catalog?.name}</span>
              <span>{subject.current_percentage}% → {subject.target_percentage}%</span>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="card">
          <h2>{selected.subjects_catalog?.name}</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Current mark: {selected.current_percentage}% • Target: {selected.target_percentage}% • Priority: {selected.priority}
          </p>
          <AiQuizGenerator
            topic={selected.subjects_catalog?.name || 'General revision'}
            subject={selected.subjects_catalog?.name || 'Subject'}
            studentLevel={Number(selected.current_percentage || 0)}
          />
        </div>
      )}

      {!subjects.length && <div className="card"><p>No subjects are saved yet. Complete your profile first.</p><Link href="/profile/edit" className="btn">Set Up Subjects</Link></div>}

      <div style={{ marginTop: '2rem' }}>
        <Link href="/quiz" className="btn">Go to Quiz</Link>
        <Link href="/upload" className="btn btn-secondary" style={{ marginLeft: '0.5rem' }}>Upload Report</Link>
      </div>

      <nav className="nav">
        <Link href="/">Dashboard</Link><Link href="/profile">Profile</Link><Link href="/quiz">Quiz</Link><Link href="/exams">Exams</Link><Link href="/progress">Progress</Link>
      </nav>
    </main>
  );
}
