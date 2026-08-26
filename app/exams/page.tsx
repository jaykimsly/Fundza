'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ExamCountdown from '@/components/ExamCountdown';
import StatusScreen from '@/components/StatusScreen';
import { PageSkeleton } from '@/components/Skeleton';
import { supabase } from '@/lib/supabase';

type Exam = { id: string; exam_date: string; exam_time: string | null; subject_name: string; paper?: string; session?: string; duration_minutes?: number; grade_number?: number };

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [grade, setGrade] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      if (!navigator.onLine) throw new Error('No internet connection. Connect to Wi-Fi or mobile data and try again.');
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
      if (!session) throw new Error('Your session has expired. Please sign in again.');
      const studentId = localStorage.getItem('fundza_student_id');
      if (!studentId) throw new Error('Complete your learner profile before viewing exams.');

      const { data: student, error: studentError } = await supabase.from('students').select('grade').eq('id', studentId).single();
      if (studentError) throw studentError;
      const learnerGrade = student?.grade || null;
      setGrade(learnerGrade);
      const { data: subjectData, error: subjectError } = await supabase.from('student_subjects').select('subjects_catalog(name)').eq('student_id', studentId);
      if (subjectError) throw subjectError;
      const names = (subjectData || []).map((s: any) => s.subjects_catalog?.name).filter(Boolean);
      setSubjects(names);

      let query = supabase.from('exam_timetable').select('id, exam_date, start_time, subject_name, paper, session, duration_minutes, grade_number').order('exam_date').order('start_time');
      if (learnerGrade) query = query.eq('grade_number', learnerGrade);
      const { data: timetable, error: examError } = await query;
      if (examError) throw examError;
      setExams(((timetable || []) as any[]).map(e => ({ ...e, exam_time: e.start_time })) as Exam[]);
    } catch (err: any) {
      console.error('Exams load error:', err);
      setError(err?.message || 'We could not load your exam timetable.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageSkeleton />;
  if (error) return <StatusScreen kind="error" message={error} onRetry={load} />;

  const learnerExams = exams.filter(e => subjects.length === 0 || subjects.some(s => e.subject_name.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(e.subject_name.toLowerCase())));
  const displayExams = learnerExams.length ? learnerExams : exams;

  return (
    <main className="container">
      <h1>Exams</h1>
      <p style={{ color:'#64748b', marginBottom:'1rem' }}>{grade ? `Grade ${grade}` : 'Learner timetable'} • Live timetable from Fundza.</p>
      <ExamCountdown />
      <div className="card" style={{ marginTop:'1.5rem' }}>
        <h2>{subjects.length ? 'Your Exam Timetable' : 'Exam Timetable'}</h2>
        {displayExams.length === 0 ? <div className="empty-state"><h2>No exams published</h2><p>There are currently no timetable entries for your grade. Check again later.</p><button className="btn" onClick={load}>Refresh Timetable</button></div> : <div style={{ marginTop:'1rem' }}>{displayExams.map((exam, i) => <div key={exam.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'1rem', padding:'.875rem', borderBottom:i < displayExams.length - 1 ? '1px solid #e2e8f0' : 'none', background:i % 2 === 0 ? '#f8fafc' : 'white', borderRadius:6, marginBottom:'.5rem' }}><div><div style={{fontWeight:600,fontSize:'.95rem'}}>{exam.subject_name}</div><div style={{fontSize:'.8rem',color:'#64748b'}}>{new Date(`${exam.exam_date}T00:00:00`).toLocaleDateString('en-ZA',{day:'2-digit',month:'short',year:'numeric'})} • {exam.paper || 'Paper'}{exam.session ? ` • ${exam.session}` : ''}</div></div><div style={{textAlign:'right',fontSize:'.8rem',color:'#475569',fontWeight:600}}><div>{exam.exam_time || 'Time TBA'}</div>{exam.duration_minutes ? <div className="data-meta">{exam.duration_minutes} min</div> : null}</div></div>)}</div>}
      </div>
      <div className="card" style={{background:'#eff6ff',border:'1px solid #bfdbfe'}}><h2 style={{color:'#1e40af'}}>Countdowns follow your subjects</h2><p style={{color:'#334155'}}>The next step is to make the countdown component filter to these same live timetable entries, so learners only see exams that matter to them.</p></div>
      <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap'}}><button className="btn btn-secondary" onClick={load}>Refresh</button><Link href="/study" className="btn">Study</Link></div>
    </main>
  );
}
