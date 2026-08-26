'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentStudent, StudentSubjectWithCatalog } from '@/lib/student-data';
import AppLoader from '@/components/AppLoader';

export default function ProfilePage() {
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [subjects, setSubjects] = useState<StudentSubjectWithCatalog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentStudent()
      .then(({ session, student: currentStudent, subjects: currentSubjects }) => {
        if (!session) { router.push('/login'); return; }
        if (!currentStudent) { router.push('/setup'); return; }
        setStudent(currentStudent);
        setSubjects(currentSubjects);
        setLoading(false);
      })
      .catch(error => {
        console.error(error);
        setLoading(false);
      });
  }, [router]);

  if (loading) return <AppLoader message="Loading your profile..." />;
  if (!student) return null;

  return (
    <main className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1>My Profile</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Your saved Fundza profile. Nothing is editable on this page.</p>
        </div>
        <Link href="/profile/edit" className="btn">Edit Profile</Link>
      </div>

      <div className="card">
        <h2>Personal Details</h2>
        <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
          <div><strong>Full name</strong><div>{student.full_name || 'Not set'}</div></div>
          <div><strong>Email</strong><div>{student.email || 'Not set'}</div></div>
          <div><strong>School</strong><div>{student.schools?.name || 'Not set'}</div></div>
          <div><strong>Grade</strong><div>{student.grades?.grade_number ? `Grade ${student.grades.grade_number}` : 'Not set'}</div></div>
          <div><strong>Career pathway</strong><div>{student.career_pathway || 'Not set'}</div></div>
          <div><strong>Target degree/course</strong><div>{student.target_degree || 'Not set'}</div></div>
          <div><strong>Target institution</strong><div>{student.target_university || 'Not set'}</div></div>
        </div>
      </div>

      <div className="card">
        <h2>Selected Subjects</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>These are the subjects used across Dashboard, Study, Quiz, Exams and Progress.</p>
        <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem' }}>
          {subjects.map(subject => (
            <div key={subject.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
              <span>{subject.subjects_catalog?.name}</span>
              <span style={{ color: '#64748b' }}>{subject.current_percentage}% current • {subject.target_percentage}% target</span>
            </div>
          ))}
        </div>
      </div>

      <nav className="nav">
        <Link href="/">Dashboard</Link>
        <Link href="/study">Study</Link>
        <Link href="/quiz">Quiz</Link>
        <Link href="/exams">Exams</Link>
        <Link href="/progress">Progress</Link>
      </nav>
    </main>
  );
}
