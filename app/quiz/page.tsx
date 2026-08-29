'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Quiz from '@/components/Quiz';
import AppLoader from '@/components/AppLoader';
import { getCurrentStudent, StudentSubjectWithCatalog } from '@/lib/student-data';

function QuizWrapper() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSubject = searchParams.get('subject');
  const requestedTopic = searchParams.get('topic');
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

  if (loading) return <AppLoader message="Loading your practice subjects..." />;
  if (!subjects.length) return <div className="card"><h2>No subjects saved</h2><Link href="/profile/edit" className="btn">Set Up Profile</Link></div>;

  const selected = subjects.find(s => s.subjects_catalog?.code === requestedSubject) || subjects[0];
  const selectedCode = selected.subjects_catalog?.code || '';

  return (
    <>
      <div className="card">
        <h2>Choose a Subject</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Only subjects saved in your Fundza profile appear here.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
          {subjects.map(subject => (
            <Link key={subject.id} href={`/quiz?subject=${encodeURIComponent(subject.subjects_catalog?.code || '')}`} className={selected.id === subject.id && !requestedTopic ? 'btn' : 'btn btn-secondary'}>
              {subject.subjects_catalog?.name}
            </Link>
          ))}
        </div>
      </div>

      <Quiz
        topicId={requestedTopic}
        subjectCode={requestedTopic ? undefined : selectedCode}
        subjectName={selected.subjects_catalog?.name || 'Subject'}
      />
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
