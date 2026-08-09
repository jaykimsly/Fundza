'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { School, Grade, SubjectCatalog } from '@/types';

export default function SetupPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  
  // Profile fields
  const [name, setName] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('');
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [careerPathway, setCareerPathway] = useState('university');
  const [targetDegree, setTargetDegree] = useState('');
  const [targetUni, setTargetUni] = useState('');
  
  // Subjects
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

      // Load schools and grades
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

  // Load subjects when grade changes
  useEffect(() => {
    if (!selectedGrade) return;
    const loadSubjects = async () => {
      const { data } = await supabase
        .from('subjects_catalog')
        .select('*')
        .eq('grade_id', selectedGrade)
        .eq('curriculum', 'CAPS')
        .order('is_compulsory', { ascending: false })
        .order('name');
      
      if (data) {
        setAvailableSubjects(data);
        // Pre-select compulsory + common subjects with default marks
        setStudentSubjects(data.map((s: SubjectCatalog) => ({
          subject_id: s.id,
          name: s.name,
          code: s.code,
          category: s.category,
          is_compulsory: s.is_compulsory,
          current: s.is_compulsory ? 50 : 0,
          target: s.is_compulsory ? 60 : 50,
          selected: s.is_compulsory, // compulsory auto-selected
        })));
      }
    };
    loadSubjects();
  }, [selectedGrade]);

  const toggleSubject = (idx: number) => {
    setStudentSubjects(prev => prev.map((s, i) => i === idx ? { ...s, selected: !s.selected } : s));
  };

  const updateMark = (idx: number, field: 'current' | 'target', value: number) => {
    setStudentSubjects(prev => prev.map((s, i) => i === idx ? { ...s, [field]: Math.min(100, Math.max(0, value)) } : s));
  };

  const calculateAps = () => {
    return studentSubjects
      .filter(s => s.selected && s.code !== 'LIFE_ORI')
      .reduce((sum, s) => {
        const p = s.current;
        let level = 1;
        if (p >= 80) level = 7;
        else if (p >= 70) level = 6;
        else if (p >= 60) level = 5;
        else if (p >= 50) level = 4;
        else if (p >= 40) level = 3;
        else if (p >= 30) level = 2;
        return sum + level;
      }, 0);
  };

  const handleSave = async () => {
    if (!name.trim() || !selectedGrade || !careerPathway) {
      alert('Please complete all required fields');
      return;
    }
    const selectedCount = studentSubjects.filter(s => s.selected).length;
    if (selectedCount < 6) {
      alert(`You must select at least 6 subjects. Currently selected: ${selectedCount}`);
      return;
    }

    setSaving(true);

    try {
      // 1. Create school if new
      let schoolId = selectedSchool;
      if (selectedSchool === 'new' && newSchoolName.trim()) {
        const { data: newSchool } = await supabase
          .from('schools')
          .insert({ name: newSchoolName.trim(), province: 'Unknown', curriculum: 'CAPS' })
          .select()
          .single();
        if (newSchool) schoolId = newSchool.id;
      }

      // 2. Save student profile
      const { data: student, error: studentErr } = await supabase
        .from('students')
        .upsert({
          auth_user_id: authUser.id,
          full_name: name.trim(),
          email: authUser.email,
          school_id: schoolId || null,
          grade_id: selectedGrade,
          career_pathway: careerPathway,
          target_degree: targetDegree || null,
          target_university: targetUni || null,
        })
        .select()
        .single();

      if (studentErr || !student) throw studentErr || new Error('Failed to save profile');

      // 3. Save student subjects
      const subjectsToInsert = studentSubjects
        .filter(s => s.selected)
        .map(s => ({
          student_id: student.id,
          subject_id: s.subject_id,
          current_percentage: s.current,
          target_percentage: s.target,
          priority: s.current < 50 ? 'critical' : s.current < 60 ? 'high' : 'medium',
        }));

      await supabase.from('student_subjects').insert(subjectsToInsert);

      // 4. Cache locally
      localStorage.setItem('fundza_student', JSON.stringify({
        id: student.id,
        name,
        email: authUser.email,
        school_id: schoolId,
        grade_id: selectedGrade,
        career_pathway: careerPathway,
        target_degree: targetDegree,
        target_university: targetUni,
      }));
      localStorage.setItem('fundza_student_id', student.id);

      router.push('/');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    router.push('/login');
  };

  if (loading) return <main className="container"><p>Loading...</p></main>;

  const selectedGradeNum = grades.find(g => g.id === selectedGrade)?.grade_number;
  const aps = calculateAps();

  return (
    <main className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Create Your Profile</h1>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer' }}>Logout</button>
      </div>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Logged in as {authUser?.email}</p>

      {/* Progress */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ width: '32px', height: '6px', borderRadius: '3px', background: s === step ? '#2563eb' : '#e2e8f0' }} />
        ))}
      </div>

      {/* STEP 1: Personal Info */}
      {step === 1 && (
        <div className="card">
          <h2>Step 1: About You</h2>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>Full Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>School *</label>
              <select value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem', background: 'white', marginBottom: '0.5rem' }}>
                <option value="">-- Select your school --</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name} ({s.province})</option>)}
                <option value="new">+ Add my school (not listed)</option>
              </select>
              {selectedSchool === 'new' && (
                <input type="text" value={newSchoolName} onChange={e => setNewSchoolName(e.target.value)}
                  placeholder="Enter school name"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }} />
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>Current Grade *</label>
              <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem', background: 'white' }}>
                <option value="">-- Select grade --</option>
                {grades.map(g => <option key={g.id} value={g.id}>Grade {g.grade_number}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>What are you aiming for? *</label>
              <select value={careerPathway} onChange={e => setCareerPathway(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem', background: 'white' }}>
                <option value="university">University (Bachelor's degree)</option>
                <option value="college">College / TVET (Diploma/Certificate)</option>
                <option value="both">Keep both options open</option>
                {selectedGradeNum && selectedGradeNum < 12 && (
                  <option value="next_grade">Just pass to next grade</option>
                )}
              </select>
            </div>

            {careerPathway !== 'next_grade' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>Target Degree/Course (optional)</label>
                  <input type="text" value={targetDegree} onChange={e => setTargetDegree(e.target.value)}
                    placeholder="e.g. Bachelor of Arts, Nursing, Engineering"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>Target Institution (optional)</label>
                  <input type="text" value={targetUni} onChange={e => setTargetUni(e.target.value)}
                    placeholder="e.g. University of Johannesburg"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }} />
                </div>
              </>
            )}
          </div>
          <button onClick={() => {
            if (!name.trim() || !selectedGrade) { alert('Name and grade are required'); return; }
            setStep(2);
          }} className="btn" style={{ marginTop: '1.5rem', width: '100%' }}>Next: Select Subjects</button>
        </div>
      )}

      {/* STEP 2: Subjects */}
      {step === 2 && (
        <div>
          <div className="card">
            <h2>Step 2: Your Subjects & Marks</h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Select your subjects and enter latest marks. Compulsory subjects are pre-selected.
            </p>
          </div>

          {studentSubjects.map((s, idx) => (
            <div key={s.subject_id} className="card" style={{ 
              borderLeft: `4px solid ${s.is_compulsory ? '#dc2626' : s.selected ? '#2563eb' : '#e2e8f0'}`,
              opacity: s.selected ? 1 : 0.7
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={s.selected}
                  onChange={() => toggleSubject(idx)}
                  disabled={s.is_compulsory}
                  style={{ width: '20px', height: '20px' }}
                />
                <h3 style={{ fontSize: '1rem', flex: 1 }}>{s.name}</h3>
                {s.is_compulsory && <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600 }}>COMPULSORY</span>}
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'capitalize' }}>{s.category}</span>
              </div>

              {s.selected && (
                <div style={{ display: 'flex', gap: '1rem', marginLeft: '2rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Current %</label>
                    <input type="number" min={0} max={100} value={s.current}
                      onChange={e => updateMark(idx, 'current', parseInt(e.target.value) || 0)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '1rem', marginTop: '0.25rem' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Target %</label>
                    <input type="number" min={0} max={100} value={s.target}
                      onChange={e => updateMark(idx, 'target', parseInt(e.target.value) || 0)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '1rem', marginTop: '0.25rem' }} />
                  </div>
                </div>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button onClick={() => setStep(1)} className="btn btn-secondary" style={{ flex: 1 }}>Back</button>
            <button onClick={() => setStep(3)} className="btn" style={{ flex: 1 }}>Review</button>
          </div>
        </div>
      )}

      {/* STEP 3: Review */}
      {step === 3 && (
        <div>
          <div className="card" style={{ background: '#0f172a', color: 'white' }}>
            <h2 style={{ color: '#fbbf24' }}>Step 3: Review</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
              {name} • Grade {selectedGradeNum} • {careerPathway === 'university' ? 'University' : careerPathway === 'college' ? 'College' : careerPathway === 'both' ? 'University + College' : 'Next Grade'}
            </p>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Subjects</p>
                <p style={{ fontSize: '2rem', fontWeight: 700 }}>{studentSubjects.filter(s => s.selected).length}</p>
              </div>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Current APS</p>
                <p style={{ fontSize: '2rem', fontWeight: 700 }}>{aps}</p>
              </div>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</p>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: aps >= 23 ? '#059669' : '#ca8a04' }}>
                  {aps >= 23 ? '✓ Bachelor pass track' : aps >= 19 ? '⚠ Diploma pass track' : '✗ Need to improve'}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Selected Subjects</h3>
            {studentSubjects.filter(s => s.selected).map(s => (
              <div key={s.subject_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span>{s.name}</span>
                <span style={{ fontWeight: 600 }}>
                  <span style={{ color: s.current < 50 ? '#dc2626' : '#0f172a' }}>{s.current}%</span>
                  <span style={{ color: '#64748b', marginLeft: '0.5rem' }}>→ {s.target}%</span>
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button onClick={() => setStep(2)} className="btn btn-secondary" style={{ flex: 1 }}>Back</button>
            <button onClick={handleSave} className="btn btn-success" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Saving...' : 'Save & Start Studying'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
