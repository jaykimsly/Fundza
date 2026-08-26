'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { School, Grade, SubjectCatalog } from '@/types';

export default function SetupPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schoolSearchOpen, setSchoolSearchOpen] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [careerPathway, setCareerPathway] = useState('university');
  const [targetDegree, setTargetDegree] = useState('');
  const [targetUni, setTargetUni] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState<SubjectCatalog[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setAuthUser(session.user);
      const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
      if (fullName) setName(fullName);
      const [{ data: schoolsData }, { data: gradesData }] = await Promise.all([
        supabase.from('schools').select('*').order('name'),
        supabase.from('grades').select('*').order('grade_number'),
      ]);
      setSchools(schoolsData || []);
      setGrades(gradesData || []);
      setLoading(false);
    };
    init();
  }, [router]);

  useEffect(() => {
    if (!selectedGrade) return;
    const loadSubjects = async () => {
      const { data } = await supabase.from('subjects_catalog').select('*').eq('grade_id', selectedGrade).eq('curriculum', 'CAPS').order('is_compulsory', { ascending: false }).order('name');
      if (data) setStudentSubjects(data.map((s: SubjectCatalog) => ({ subject_id: s.id, name: s.name, code: s.code, category: s.category, is_compulsory: s.is_compulsory, current: s.is_compulsory ? 50 : 0, target: s.is_compulsory ? 60 : 50, selected: s.is_compulsory })));
      setAvailableSubjects(data || []);
    };
    loadSubjects();
  }, [selectedGrade]);

  const filteredSchools = useMemo(() => {
    const query = schoolSearch.trim().toLowerCase();
    if (!query) return schools.slice(0, 25);
    return schools.filter((s: any) => [s.name, s.emis_number, s.district, s.municipality, s.area].filter(Boolean).join(' ').toLowerCase().includes(query)).slice(0, 25);
  }, [schools, schoolSearch]);

  const selectedSchoolRecord = schools.find(s => s.id === selectedSchool);
  const toggleSubject = (idx: number) => setStudentSubjects(prev => prev.map((s, i) => i === idx ? { ...s, selected: !s.selected } : s));
  const updateMark = (idx: number, field: 'current' | 'target', value: number) => setStudentSubjects(prev => prev.map((s, i) => i === idx ? { ...s, [field]: Math.min(100, Math.max(0, value)) } : s));
  const calculateAps = () => studentSubjects.filter(s => s.selected && s.code !== 'LIFE_ORI').reduce((sum, s) => { const p = s.current; let level = 1; if (p >= 80) level = 7; else if (p >= 70) level = 6; else if (p >= 60) level = 5; else if (p >= 50) level = 4; else if (p >= 40) level = 3; else if (p >= 30) level = 2; return sum + level; }, 0);

  const handleSave = async () => {
    if (!name.trim() || !selectedSchool || !selectedGrade || !careerPathway) { alert('Please complete all required fields, including your school.'); return; }
    const selectedCount = studentSubjects.filter(s => s.selected).length;
    if (selectedCount < 6) { alert(`You must select at least 6 subjects. Currently selected: ${selectedCount}`); return; }
    setSaving(true);
    try {
      const { data: student, error: studentErr } = await supabase.from('students').upsert({ auth_user_id: authUser.id, full_name: name.trim(), email: authUser.email, school_id: selectedSchool, grade_id: selectedGrade, career_pathway: careerPathway, target_degree: targetDegree || null, target_university: targetUni || null }, { onConflict: 'auth_user_id' }).select().single();
      if (studentErr || !student) throw studentErr || new Error('Failed to save profile');
      const subjectsToInsert = studentSubjects.filter(s => s.selected).map(s => ({ student_id: student.id, subject_id: s.subject_id, current_percentage: s.current, target_percentage: s.target, priority: s.current < 50 ? 'critical' : s.current < 60 ? 'high' : 'medium' }));
      const { error: subjectErr } = await supabase.from('student_subjects').insert(subjectsToInsert);
      if (subjectErr) throw subjectErr;
      localStorage.setItem('fundza_student', JSON.stringify({ id: student.id, name, email: authUser.email, school_id: selectedSchool, grade_id: selectedGrade, career_pathway: careerPathway, target_degree: targetDegree, target_university: targetUni }));
      localStorage.setItem('fundza_student_id', student.id);
      router.push('/');
    } catch (err: any) { alert('Error: ' + err.message); } finally { setSaving(false); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); localStorage.clear(); router.push('/login'); };
  if (loading) return <main className="container"><p>Loading...</p></main>;
  const selectedGradeNum = grades.find(g => g.id === selectedGrade)?.grade_number;
  const aps = calculateAps();

  return (
    <main className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h1>Create Your Profile</h1><button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer' }}>Logout</button></div>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Logged in as {authUser?.email}</p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>{[1, 2, 3].map(s => <div key={s} style={{ width: '32px', height: '6px', borderRadius: '3px', background: s === step ? '#2563eb' : '#e2e8f0' }} />)}</div>

      {step === 1 && <div className="card">
        <h2>Step 1: About You</h2>
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div><label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>Full Name *</label><input type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }} /></div>
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>School *</label>
            <input type="search" value={selectedSchoolRecord ? `${selectedSchoolRecord.name}${(selectedSchoolRecord as any).emis_number ? ` (EMIS ${(selectedSchoolRecord as any).emis_number})` : ''}` : schoolSearch} onChange={e => { setSelectedSchool(''); setSchoolSearch(e.target.value); setSchoolSearchOpen(true); }} onFocus={() => setSchoolSearchOpen(true)} placeholder="Search school name or EMIS number..." autoComplete="off" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }} />
            {schoolSearchOpen && <>
              <div onClick={() => setSchoolSearchOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
              <div style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, marginTop: '0.25rem', maxHeight: '320px', overflowY: 'auto', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 10px 30px rgba(15,23,42,.12)' }}>
                {filteredSchools.length > 0 ? filteredSchools.map((s: any) => <button type="button" key={s.id} onClick={() => { setSelectedSchool(s.id); setSchoolSearch(s.name); setSchoolSearchOpen(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', border: 0, borderBottom: '1px solid #f1f5f9', background: 'white', cursor: 'pointer' }}><strong style={{ display: 'block' }}>{s.name}</strong><span style={{ color: '#64748b', fontSize: '0.8rem' }}>{[s.district, s.municipality, s.area].filter(Boolean).join(' • ')}{s.emis_number ? ` • EMIS ${s.emis_number}` : ''}</span></button>) : <div style={{ padding: '1rem', color: '#64748b' }}>No verified school found. Check the school name or EMIS number.</div>}
              </div>
            </>}
            <p style={{ margin: '0.4rem 0 0', color: '#64748b', fontSize: '0.78rem' }}>Select a school from the verified Fundza catalogue. Schools cannot be added from this page.</p>
          </div>
          <div><label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>Current Grade *</label><select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem', background: 'white' }}><option value="">-- Select grade --</option>{grades.map(g => <option key={g.id} value={g.id}>Grade {g.grade_number}</option>)}</select></div>
          <div><label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>What are you aiming for? *</label><select value={careerPathway} onChange={e => setCareerPathway(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem', background: 'white' }}><option value="university">University (Bachelor's degree)</option><option value="college">College / TVET (Diploma/Certificate)</option><option value="both">Keep both options open</option>{selectedGradeNum && selectedGradeNum < 12 && <option value="next_grade">Just pass to next grade</option>}</select></div>
          {careerPathway !== 'next_grade' && <div style={{ display: 'grid', gap: '1rem' }}><div><label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>Target Degree (optional)</label><input type="text" value={targetDegree} onChange={e => setTargetDegree(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }} /></div><div><label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>Target University (optional)</label><input type="text" value={targetUni} onChange={e => setTargetUni(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }} /></div></div>}
          <button onClick={() => { if (!name.trim() || !selectedSchool || !selectedGrade) { alert('Please complete your name, school, and grade.'); return; } setStep(2); }} style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: 0, background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Continue</button>
        </div>
      </div>}

      {step === 2 && <div className="card"><h2>Step 2: Your Subjects</h2><p style={{ color: '#64748b' }}>Select at least 6 subjects. Compulsory subjects are pre-selected.</p><div style={{ display: 'grid', gap: '0.75rem' }}>{studentSubjects.map((s, i) => <div key={s.subject_id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.75rem', alignItems: 'center', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}><label><input type="checkbox" checked={s.selected} onChange={() => toggleSubject(i)} /> <strong>{s.name}</strong>{s.is_compulsory && <small> (Compulsory)</small>}</label><input aria-label={`${s.name} current mark`} type="number" min="0" max="100" value={s.current} onChange={e => updateMark(i, 'current', Number(e.target.value))} style={{ width: '80px', padding: '0.5rem' }} /><input aria-label={`${s.name} target mark`} type="number" min="0" max="100" value={s.target} onChange={e => updateMark(i, 'target', Number(e.target.value))} style={{ width: '80px', padding: '0.5rem' }} /></div>)}</div><p style={{ marginTop: '1rem', fontWeight: 600 }}>Current APS: {aps}</p><div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}><button onClick={() => setStep(1)} style={{ padding: '0.75rem 1rem' }}>Back</button><button onClick={() => { if (studentSubjects.filter(s => s.selected).length < 6) { alert('Select at least 6 subjects.'); return; } setStep(3); }} style={{ padding: '0.75rem 1rem', border: 0, borderRadius: '8px', background: '#2563eb', color: 'white', fontWeight: 600 }}>Continue</button></div></div>}

      {step === 3 && <div className="card"><h2>Step 3: Review</h2><p><strong>Name:</strong> {name}</p><p><strong>School:</strong> {selectedSchoolRecord?.name}</p><p><strong>Grade:</strong> {selectedGradeNum}</p><p><strong>Pathway:</strong> {careerPathway}</p><p><strong>Subjects:</strong> {studentSubjects.filter(s => s.selected).length}</p><p><strong>APS:</strong> {aps}</p><div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}><button onClick={() => setStep(2)} style={{ padding: '0.75rem 1rem' }}>Back</button><button onClick={handleSave} disabled={saving} style={{ padding: '0.75rem 1rem', border: 0, borderRadius: '8px', background: '#2563eb', color: 'white', fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>{saving ? 'Saving...' : 'Create Profile'}</button></div></div>}
    </main>
  );
}
