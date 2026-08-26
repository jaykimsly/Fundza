'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AiQuizGenerator from '@/components/AiQuizGenerator';
import StatusScreen from '@/components/StatusScreen';
import { supabase } from '@/lib/supabase';
import { PageSkeleton } from '@/components/Skeleton';

type Subject = { id: string; subject_id: string | null; current_percentage: number | null; target_percentage: number | null; priority: string | null; subjects_catalog?: { name: string; code: string } | null };
type Topic = { id: string; name: string; description: string | null; paper: string | null; term: number | null; subject_id: string | null };

export default function StudyPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [studentLevel, setStudentLevel] = useState(40);
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
      if (!studentId) throw new Error('Complete your learner profile before studying.');

      const { data: subjectData, error: subjectError } = await supabase.from('student_subjects').select('id, subject_id, current_percentage, target_percentage, priority, subjects_catalog(name, code)').eq('student_id', studentId).order('priority');
      if (subjectError) throw subjectError;
      const liveSubjects = (subjectData || []) as Subject[];
      setSubjects(liveSubjects);
      const first = liveSubjects[0]?.subject_id || '';
      setSelectedSubject((current) => current || first);
      const average = liveSubjects.length ? Math.round(liveSubjects.reduce((sum, s) => sum + (s.current_percentage || 0), 0) / liveSubjects.length) : 0;
      setStudentLevel(average);

      if (first) {
        const { data: topicData, error: topicError } = await supabase.from('topics').select('id, name, description, paper, term, subject_id').eq('subject_id', first).order('term').order('name');
        if (topicError) throw topicError;
        setTopics((topicData || []) as Topic[]);
      }
    } catch (err: any) {
      console.error('Study load error:', err);
      setError(err?.message || 'We could not load your study subjects.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const changeSubject = async (subjectId: string) => {
    setSelectedSubject(subjectId); setSelectedTopic(null);
    setTopics([]);
    const { data, error: topicError } = await supabase.from('topics').select('id, name, description, paper, term, subject_id').eq('subject_id', subjectId).order('term').order('name');
    if (topicError) { setError(topicError.message); return; }
    setTopics((data || []) as Topic[]);
  };

  if (loading) return <PageSkeleton />;
  if (error) return <StatusScreen kind="error" message={error} onRetry={load} />;

  const selected = subjects.find(s => s.subject_id === selectedSubject);
  const weak = [...subjects].sort((a,b) => (a.current_percentage || 0) - (b.current_percentage || 0)).slice(0, 3);

  return (
    <main className="container">
      <h1>Study Hub</h1>
      <p style={{ color:'#64748b', marginBottom:'1.5rem' }}>Your subjects and revision topics come from your Fundza profile, so the study plan follows the learner instead of a hard-coded demo.</p>

      {subjects.length === 0 ? (
        <div className="card empty-state"><h2>No subjects yet</h2><p>Choose your subjects in your learner profile before starting revision.</p><Link href="/setup" className="btn">Complete Profile</Link></div>
      ) : (
        <>
          <div className="card">
            <h2>Your Subjects</h2>
            <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap', marginTop:'.75rem' }}>
              {subjects.map(s => <button key={s.subject_id || s.id} onClick={() => changeSubject(s.subject_id || '')} className={selectedSubject === s.subject_id ? 'btn' : 'btn btn-secondary'}>{s.subjects_catalog?.name || 'Subject'}</button>)}
            </div>
            {selected && <p className="data-meta">Current {selected.current_percentage ?? 0}% • Target {selected.target_percentage ?? 0}% • Priority {selected.priority || 'normal'}</p>}
          </div>

          <div className="card">
            <h2>Revision Topics</h2>
            {topics.length === 0 ? <div className="empty-state"><h2>No topics yet</h2><p>There are no published topics for this subject yet. You can still use the general quiz.</p><Link href="/quiz" className="btn btn-secondary">General Quiz</Link></div> : (
              <div className="grid grid-2">
                {topics.map(topic => <button key={topic.id} onClick={() => setSelectedTopic(topic.name)} className="card" style={{ textAlign:'left', cursor:'pointer', border:'1px solid #e2e8f0' }}><strong>{topic.name}</strong><span className="data-meta">{topic.paper || 'Revision'}{topic.term ? ` • Term ${topic.term}` : ''}</span>{topic.description && <span style={{ display:'block', color:'#64748b', fontSize:'.82rem', marginTop:'.25rem' }}>{topic.description}</span>}</button>)}
              </div>
            )}
          </div>

          {selectedTopic && selected && <div className="card"><h2>AI Practice: {selectedTopic}</h2><AiQuizGenerator topic={selectedTopic} subject={selected.subjects_catalog?.name || 'Subject'} studentLevel={studentLevel} /></div>}

          <div className="card" style={{ background:'#f8fafc' }}>
            <h2>Recommended Focus</h2>
            <p style={{ color:'#64748b', marginBottom:'.75rem' }}>Start with the subjects furthest from their targets.</p>
            {weak.map(s => <div key={s.id} style={{ display:'flex', justifyContent:'space-between', padding:'.6rem 0', borderBottom:'1px solid #e2e8f0' }}><span>{s.subjects_catalog?.name}</span><strong>{s.current_percentage ?? 0}% → {s.target_percentage ?? 0}%</strong></div>)}
          </div>

          <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap' }}><Link href="/quiz" className="btn">Start General Quiz</Link><Link href="/upload" className="btn btn-secondary">Analyze Report</Link></div>
        </>
      )}
    </main>
  );
}
