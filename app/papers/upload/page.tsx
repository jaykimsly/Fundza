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
  const [visibility, setVisibility] = useState<'private' | 'fundza'>('private');
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
      form.append('visibility', visibility);
      const response = await fetch('/api/papers/submit', { method: 'POST', body: form });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success === false) {
        setError(payload?.error || 'The question paper could not be uploaded.');
        return;
      }
      if (payload?.duplicate) {
        setStatus('This paper is already in Fundza, so we did not create a duplicate.');
      } else {
        setStatus(visibility === 'fundza' ? 'Paper submitted for review. It stays unavailable to other learners until verified.' : 'Paper stored privately in your recent uploads.');
        setFile(null);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container" style={{ paddingBottom: '6rem' }}>
      <header style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
          <Link href="/upload" style={{ fontSize: '.9rem' }}>← Review</Link>
          <Link href="/papers" style={{ fontSize: '.9rem' }}>My uploads</Link>
        </div>
        <h1 style={{ marginTop: '.75rem' }}>Upload a past paper</h1>
        <p style={{ color: '#64748b' }}>Your upload is private by default. You can submit it to Fundza for review and sharing with other learners.</p>
      </header>
      <form onSubmit={submit} className="card" style={{ display: 'grid', gap: '1rem' }}>
        <label>Grade<select value={grade} onChange={e => setGrade(e.target.value)} disabled={submitting}><option value="10">10</option><option value="11">11</option><option value="12">12</option></select></label>
        <label>Subject<select value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={submitting}><option value="">Choose subject</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
        <label>Year<input type="number" min="2000" max={new Date().getFullYear() + 1} value={year} onChange={e => setYear(e.target.value)} disabled={submitting} /></label>
        <label>Exam type<select value={examType} onChange={e => setExamType(e.target.value)} disabled={submitting}><option>NSC</option><option>June</option><option>Trial</option><option>Preparatory</option><option>School</option><option>Other</option></select></label>
        <label>Province (optional)<input value={province} onChange={e => setProvince(e.target.value)} placeholder="e.g. Mpumalanga" disabled={submitting} /></label>
        <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '.85rem' }}>
          <legend style={{ padding: '0 .35rem', fontWeight: 600 }}>Sharing</legend>
          <div style={{ display: 'grid', gap: '.6rem' }}>
            <label style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start' }}><input type="radio" name="visibility" value="private" checked={visibility === 'private'} onChange={() => setVisibility('private')} disabled={submitting} /> <span><strong>Private</strong><br /><small>Only you can access this upload.</small></span></label>
            <label style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start' }}><input type="radio" name="visibility" value="fundza" checked={visibility === 'fundza'} onChange={() => setVisibility('fundza')} disabled={submitting} /> <span><strong>Share with Fundza</strong><br /><small>Send it for review. It is shared only after verification.</small></span></label>
          </div>
        </fieldset>
        <label>Question paper<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] || null)} disabled={submitting} /></label>
        {file && <p style={{ fontSize: '.9rem', color: '#475569', overflowWrap: 'anywhere' }}>{file.name}</p>}
        <button className="btn" type="submit" disabled={submitting}>{submitting ? 'Uploading…' : visibility === 'fundza' ? 'Submit for review' : 'Save privately'}</button>
        {status && <p role="status" style={{ color: '#166534' }}>{status}</p>}
        {error && <p role="alert" style={{ color: '#991b1b' }}>{error}</p>}
      </form>
    </main>
  );
}
