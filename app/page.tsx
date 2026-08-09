'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ExamCountdown from '@/components/ExamCountdown';
import ProgressBar from '@/components/ProgressBar';

function getLevel(p: number) {
  if (p >= 80) return 7;
  if (p >= 70) return 6;
  if (p >= 60) return 5;
  if (p >= 50) return 4;
  if (p >= 40) return 3;
  if (p >= 30) return 2;
  return 1;
}

function getPriorityColor(priority: string) {
  const colors: Record<string, string> = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#2563eb',
    low: '#059669',
  };
  return colors[priority] || '#64748b';
}

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const studentId = localStorage.getItem('fundza_student_id');
      if (!studentId) { router.push('/setup'); return; }

      // Load profile with school and grade
      const { data: student } = await supabase
        .from('students')
        .select('*, schools(name), grades(grade_number, description)')
        .eq('id', studentId)
        .single();

      if (!student) { router.push('/setup'); return; }
      setProfile(student);

      // Load student subjects with catalog info
      const { data: subjData } = await supabase
        .from('student_subjects')
        .select('*, subjects_catalog(name, code, category, is_compulsory)')
        .eq('student_id', studentId);

      setSubjects(subjData || []);
      setLoading(false);
    };

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push('/login');
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    router.push('/login');
  };

  const aps = subjects
    .filter(s => s.subjects_catalog?.code !== 'LIFE_ORI')
    .reduce((sum, s) => sum + getLevel(s.current_percentage), 0);

  const sortedSubjects = [...subjects].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.priority] || 2) - (order[b.priority] || 2);
  });

  const english = subjects.find(s => s.subjects_catalog?.code?.includes('ENG'));
  const maths = subjects.find(s => s.subjects_catalog?.code?.includes('MATH'));
  const lo = subjects.find(s => s.subjects_catalog?.code === 'LIFE_ORI');

  if (loading) return <main className="container"><p>Loading your profile...</p></main>;

  return (
    <main className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>{profile?.full_name?.toUpperCase()}'S HUB</h1>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer' }}>Logout</button>
      </div>
      <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
        Grade {profile?.grades?.grade_number} • {profile?.schools?.name} • {profile?.career_pathway === 'university' ? 'University track' : profile?.career_pathway === 'college' ? 'College track' : 'Open options'}
      </p>

      <div className="card" style={{ background: '#0f172a', color: 'white' }}>
        <h2 style={{ color: '#fbbf24', marginBottom: '0.75rem' }}>📊 Admission Points Score (APS)</h2>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Current APS</p>
            <p style={{ fontSize: '2.5rem', fontWeight: 700 }}>{aps}</p>
          </div>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Pass Type</p>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: aps >= 23 ? '#059669' : aps >= 19 ? '#ca8a04' : '#dc2626' }}>
              {aps >= 23 ? '✓ Bachelor track' : aps >= 19 ? '⚠ Diploma track' : '✗ Higher Cert'}
            </p>
          </div>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Subjects</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{subjects.length}</p>
          </div>
        </div>
        {english && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #334155' }}>
            <p style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>
              <strong>English:</strong> Level {getLevel(english.current_percentage)} ({english.current_percentage}%)
            </p>
            <ProgressBar current={english.current_percentage} target={english.target_percentage} color="#0891b2" />
          </div>
        )}
        {maths && (
          <div style={{ marginTop: '0.5rem' }}>
            <p style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>
              <strong>Maths:</strong> {maths.subjects_catalog?.name} — Level {getLevel(maths.current_percentage)} ({maths.current_percentage}%)
            </p>
          </div>
        )}
      </div>

      {profile?.career_pathway === 'university' && (
        <div className="card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <h2 style={{ color: '#1e40af', fontSize: '1.1rem' }}>🎓 University Admission Requirements</h2>
          <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#334155', lineHeight: 1.7 }}>
            <p><strong>Bachelor Pass:</strong> APS 23+ • English Level 4 (50%+) • LO Level 3 (40%+)</p>
            <p><strong>UJ BA:</strong> APS 27 • English Level 5 (60%+)</p>
            <p><strong>UP BA:</strong> APS 28 • English Level 5 (60%+)</p>
            <p><strong>Wits BA:</strong> APS 36+ • English Level 5 (60%+)</p>
          </div>
        </div>
      )}

      <ExamCountdown />

      <div className="card">
        <h2>Today's Study Plan</h2>
        <p style={{ color: '#64748b', marginBottom: '1rem' }}>
          Focus on your weakest subjects first. Every mark counts toward your {profile?.grades?.grade_number === 12 ? 'final NSC' : 'promotion'}.
        </p>
        <Link href="/study" className="btn">Start Studying</Link>
        <Link href="/upload" className="btn btn-secondary" style={{ marginLeft: '0.5rem' }}>Analyze Report</Link>
      </div>

      <h2 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Your Subjects</h2>
      <div className="grid grid-2">
        {sortedSubjects.map((s) => (
          <div key={s.id} className="card" style={{ borderLeft: `4px solid ${getPriorityColor(s.priority)}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem' }}>{s.subjects_catalog?.name}</h3>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: getPriorityColor(s.priority), fontWeight: 600 }}>{s.priority}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
              <span>Current: <strong>{s.current_percentage}%</strong></span>
              <span>Target: <strong>{s.target_percentage}%</strong></span>
            </div>
            <ProgressBar current={s.current_percentage} target={s.target_percentage} color={getPriorityColor(s.priority)} />
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
              Gap: {s.target_percentage - s.current_percentage} points • Level {getLevel(s.current_percentage)}
            </div>
          </div>
        ))}
      </div>

      <nav className="nav">
        <Link href="/study">Study</Link>
        <Link href="/quiz">Quiz</Link>
        <Link href="/exams">Exams</Link>
        <Link href="/progress">Progress</Link>
        <Link href="/upload">Analyze</Link>
        <Link href="/upload">📄 Analyze Report</Link>
        <Link href="/setup">Edit Profile</Link>
      </nav>
    </main>
  );
}
