'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentStudent, StudentSubjectWithCatalog } from '@/lib/student-data';
import AppLoader from '@/components/AppLoader';
import { LEGAL_DOCUMENTS } from '@/lib/legal';

export default function ProfilePage() {
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [subjects, setSubjects] = useState<StudentSubjectWithCatalog[]>([]);
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

        const complete = Object.values(LEGAL_DOCUMENTS).every((document) =>
          (acceptances || []).some((item: any) => item.document_type === document.type && item.document_version === document.version)
        );
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

  if (loading) return <AppLoader message="Loading your profile..." />;
  if (!student) return null;

  return (
    <main className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1>My Profile</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Your saved Fundza profile and account controls.</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <Link href="/profile/edit" className="btn">Edit Profile</Link>
          <button onClick={handleLogout} className="btn btn-secondary">Log out</button>
        </div>
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
        <h2>Legal & Account Access</h2>
        <div className={`legal-status ${legalComplete ? 'success' : 'locked'}`}>
          {legalComplete ? 'All current required legal documents are accepted.' : 'App access is locked until you review and accept all current required legal documents.'}
        </div>
        <div className="profile-links">
          <Link href="/legal/accept"><span>{legalComplete ? 'Review signed documents' : 'Review & sign required documents'}</span><span>→</span></Link>
          <Link href="/legal"><span>Terms, Privacy, Copyright & Legal Notice</span><span>→</span></Link>
        </div>
      </div>

      <div className="card">
        <h2>Selected Subjects</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>These are the subjects used across Dashboard, Study, Quiz, Exams and Progress.</p>
        <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem' }}>
          {subjects.map(subject => (
            <div key={subject.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', flexWrap: 'wrap' }}>
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
        <Link href="/legal">Legal</Link>
      </nav>
    </main>
  );
}
