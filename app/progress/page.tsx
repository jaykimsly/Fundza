'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ProgressBar from '@/components/ProgressBar';
import StatusScreen from '@/components/StatusScreen';
import { PageSkeleton } from '@/components/Skeleton';

function getLevel(p: number) { if (p >= 80) return 7; if (p >= 70) return 6; if (p >= 60) return 5; if (p >= 50) return 4; if (p >= 40) return 3; if (p >= 30) return 2; return 1; }
function apsLevel(p: number) { return getLevel(p); }

type Subject = { id: string; current_percentage: number | null; target_percentage: number | null; priority: string | null; subjects_catalog?: { name: string; code: string } | null };
type Progress = { id: string; topic_id: string | null; attempts: number | null; correct_answers: number | null; percentage: number | null; mastery_level: string | null; last_attempted: string | null; topics?: { name: string; subject_id: string | null } | null };

export default function ProgressPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
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
      if (!studentId) throw new Error('Complete your learner profile before viewing progress.');
      const [{ data: subjectData, error: subjectError }, { data: progressData, error: progressError }] = await Promise.all([
        supabase.from('student_subjects').select('id, current_percentage, target_percentage, priority, subjects_catalog(name, code)').eq('student_id', studentId),
        supabase.from('student_progress').select('id, topic_id, attempts, correct_answers, percentage, mastery_level, last_attempted, topics(name, subject_id)').eq('student_id', studentId).order('percentage', { ascending: true }),
      ]);
      if (subjectError) throw subjectError;
      if (progressError) throw progressError;
      setSubjects((subjectData || []) as Subject[]);
      setProgress((progressData || []) as Progress[]);
    } catch (err: any) {
      console.error('Progress load error:', err);
      setError(err?.message || 'We could not load your progress.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageSkeleton />;
  if (error) return <StatusScreen kind="error" message={error} onRetry={load} />;

  const aps = subjects.filter(s => s.subjects_catalog?.code !== 'LIFE_ORI').reduce((sum, s) => sum + apsLevel(s.current_percentage || 0), 0);
  const weakSubjects = [...subjects].sort((a,b) => (a.current_percentage || 0) - (b.current_percentage || 0)).slice(0, 3);
  const weakTopics = progress.filter(p => (p.percentage ?? 0) < 70).slice(0, 5);

  return (
    <main className="container">
      <h1>Progress</h1>
      <p style={{ color:'#64748b', marginBottom:'1.5rem' }}>Your progress is calculated from the learner record and saved topic attempts, not sample data.</p>

      <div className="card" style={{ background:'#0f172a', color:'white' }}>
        <h2 style={{ color:'#fbbf24' }}>APS Tracker</h2>
        {subjects.length === 0 ? <div className="empty-state" style={{ color:'#cbd5e1' }}><h2 style={{ color:'white' }}>No subject data yet</h2><p>Add subjects in your profile to calculate your APS.</p></div> : <div style={{ display:'flex', gap:'2rem', marginTop:'.75rem', flexWrap:'wrap' }}><div><p style={{color:'#94a3b8',fontSize:'.8rem'}}>Current APS</p><p style={{fontSize:'2rem',fontWeight:700}}>{aps}<span style={{fontSize:'1rem',color:'#94a3b8'}}> / 42</span></p></div><div><p style={{color:'#94a3b8',fontSize:'.8rem'}}>Subjects</p><p style={{fontSize:'1.5rem',fontWeight:700}}>{subjects.length}</p></div><div><p style={{color:'#94a3b8',fontSize:'.8rem'}}>Tracked topics</p><p style={{fontSize:'1.5rem',fontWeight:700}}>{progress.length}</p></div></div>}
      </div>

      <div className="card"><h2>Subject Breakdown</h2>{subjects.length === 0 ? <div className="empty-state"><h2>No subjects</h2><p>Complete setup to start tracking subject performance.</p><Link href="/setup" className="btn">Edit Profile</Link></div> : subjects.map(s => <div key={s.id} style={{padding:'.8rem 0',borderBottom:'1px solid #e2e8f0'}}><div style={{display:'flex',justifyContent:'space-between',gap:'.75rem'}}><strong>{s.subjects_catalog?.name || 'Subject'}</strong><span>{s.current_percentage ?? 0}% → {s.target_percentage ?? 0}%</span></div><ProgressBar current={s.current_percentage} target={s.target_percentage} /></div>)}</div>

      <div className="card"><h2>Topic Mastery</h2>{progress.length === 0 ? <div className="empty-state"><h2>No attempts recorded</h2><p>Complete quizzes and topic practice to build your progress history.</p><Link href="/study" className="btn">Start Studying</Link></div> : progress.map(p => <div key={p.id} style={{padding:'.7rem 0',borderBottom:'1px solid #e2e8f0'}}><div style={{display:'flex',justifyContent:'space-between',gap:'.75rem'}}><span>{p.topics?.name || 'Topic'}</span><strong>{p.percentage ?? 0}%</strong></div><div className="data-meta">{p.attempts ?? 0} attempts • {p.correct_answers ?? 0} correct{p.mastery_level ? ` • ${p.mastery_level}` : ''}</div><ProgressBar current={p.percentage} target={80} /></div>)}</div>

      <div className="card" style={{background:'#fff7ed',border:'1px solid #fdba74'}}><h2 style={{color:'#9a3412'}}>Recommended Revision</h2>{weakTopics.length === 0 && weakSubjects.length === 0 ? <div className="empty-state"><h2>Nothing to recommend yet</h2><p>Complete setup and a few quizzes to unlock recommendations.</p></div> : <><p style={{color:'#c2410c',marginBottom:'.75rem'}}>Start with the areas furthest from target.</p><ol style={{paddingLeft:'1.25rem'}}>{weakTopics.map(p => <li key={p.id} style={{marginBottom:'.5rem',color:'#7c2d12'}}><strong>{p.topics?.name || 'Topic'}</strong> — {p.percentage ?? 0}% mastery</li>)}{weakTopics.length === 0 && weakSubjects.map(s => <li key={s.id} style={{marginBottom:'.5rem',color:'#7c2d12'}}><strong>{s.subjects_catalog?.name}</strong> — {s.current_percentage ?? 0}% current</li>)}</ol><Link href="/study" className="btn" style={{marginTop:'1rem'}}>Start Revision</Link></>}</div>
    </main>
  );
}
