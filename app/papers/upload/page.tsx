'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Subject = { id: string; name: string; code: string };

export default function PaperUploadPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [grade, setGrade] = useState('12');
  const [subjectId, setSubjectId] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [examType, setExamType] = useState('NSC');
  const [province, setProvince] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.from('subjects_catalog').select('id,name,code').order('name').then(({ data }) => {
      if (active) setSubjects((data || []) as Subject[]);
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(''); setStatus('');
    if (!file) return setError('Choose the question paper first.');
    if (!subjectId) return setError('Choose the subject.');
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const form = new FormData();
      form.append('file', file);
      form.append('grade', grade);
      form.append('subjectId', subjectId);
      form.append('year', year);
      form.append('examType', examType);
      form.append('province', province);
      const response = await fetch('/api/papers/submit', { method: 'POST', body: form });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success === false) {
        setError(payload?.error || 'The question paper could not be submitted.');
        return;
      }
      if (payload?.duplicate) {
        setStatus('This paper is already in Fundza, so we did not create a duplicate.');
      } else {
        setStatus('Paper submitted for review. It will stay unavailable to other learners until verified.');
        setFile(null);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container">
      <header style={{ marginBottom: '1.25rem' }}>
        <Link href="/upload" style={{ fontSize: '.9rem' }}>← Back to Review</Link>
        <h1 style={{ marginTop: '.75rem' }}>Share a past paper</h1>
        <p style={{ color: '#64748b' }}>Upload an old paper for the Fundza question bank. New contributions are reviewed before other learners can use them.</p>
      </header>
      <form onSubmit={submit} className="card" style={{ display: 'grid', gap: '1rem' }}>
        <label>Grade<select value={grade} onChange={e => setGrade(e.target.value)} disabled={submitting}><option value="10">10</option><option value="11">11</option><option value="12">12</option></select></label>
        <label>Subject<select value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={submitting}><option value="">Choose subject</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
        <label>Year<input type="number" min="2000" max={new Date().getFullYear() + 1} value={year} onChange={e => setYear(e.target.value)} disabled={submitting} /></label>
        <label>Exam type<select value={examType} onChange={e => setExamType(e.target.value)} disabled={submitting}><option>NSC</option><option>June</option><option>Trial</option><option>Preparatory</option><option>School</option><option>Other</option></select></label>
        <label>Province (optional)<input value={province} onChange={e => setProvince(e.target.value)} placeholder="e.g. Mpumalanga" disabled={submitting} /></label>
        <label>Question paper<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] || null)} disabled={submitting} /></label>
        {file && <p style={{ fontSize: '.9rem', color: '#475569', overflowWrap: 'anywhere' }}>{file.name}</p>}
        <div style={{ padding: '.8rem', borderRadius: '10px', background: '#f8fafc', fontSize: '.9rem' }}>
          The upload is private to you until submitted. Fundza sharing starts in review, and only verified contributions are published to other learners.
        </div>
        <button className="btn" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit for review'}</button>
        {status && <p role="status" style={{ color: '#166534' }}>{status}</p>}
        {error && <p role="alert" style={{ color: '#991b1b' }}>{error}</p>}
      </form>
    </main>
  );
}
