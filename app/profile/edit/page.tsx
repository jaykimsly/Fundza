'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { School, Grade, SubjectCatalog } from '@/types';
import AppLoader from '@/components/AppLoader';

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [name, setName] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [careerPathway, setCareerPathway] = useState('university');
  const [targetDegree, setTargetDegree] = useState('');
  const [targetUni, setTargetUni] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState<SubjectCatalog[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<any[]>([]);

  const loadSubjects = async (gradeId: string, studentId?: string) => {
    const [{ data: catalog }, { data: saved }] = await Promise.all([
      supabase.from('subjects_catalog').select('*').eq('grade_id', gradeId).eq('curriculum', 'CAPS').order('is_compulsory', { ascending: false }).order('name'),
      studentId
        ? supabase.from('student_subjects').select('subject_id, current_percentage, target_percentage, priority').eq('student_id', studentId)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const savedMap = new Map((saved || []).map((s: any) => [s.subject_id, s]));
    setAvailableSubjects(catalog || []);
    setStudentSubjects((catalog || []).map((subject: SubjectCatalog) => {
      const existing = savedMap.get(subject.id);
      return {
        subject_id: subject.id,
        name: subject.name,
        code: subject.code,
        category: subject.category,
        is_compulsory: subject.is_compulsory,
        current: existing?.current_percentage ?? (subject.is_compulsory ? 50 : 50),
        target: existing?.target_percentage ?? 60,
        selected: Boolean(existing),
      };
    }));
  };

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setAuthUser(session.user);

      const [{ data: currentStudent, error: studentError }, { data: schoolsData }, { data: gradesData }] = await Promise.all([
        supabase.from('students').select('*').eq('auth_user_id', session.user.id).maybeSingle(),
        supabase.from('schools').select('*').order('name'),
        supabase.from('grades').select('*').order('grade_number'),
      ]);

      if (studentError) throw studentError;
      if (!currentStudent) { router.push('/setup'); return; }

      setStudent(currentStudent);
      setName(currentStudent.full_name || '');
      setSelectedSchool(currentStudent.school_id || '');
      setSelectedGrade(currentStudent.grade_id || '');
      setCareerPathway(currentStudent.career_pathway || 'university');
      setTargetDegree(currentStudent.target_degree || '');
      setTargetUni(currentStudent.target_university || '');
      setSchools(schoolsData || []);
      setGrades(gradesData || []);

      if (currentStudent.grade_id) {
        await loadSubjects(currentStudent.grade_id, currentStudent.id);
      }

      setLoading(false);
    };

    load().catch(error => {
      console.error(error);
      alert('Unable to load your profile.');
      setLoading(false);
    });
  }, [router]);

  const changeGrade = async (gradeId: string) => {
    setSelectedGrade(gradeId);
    await loadSubjects(gradeId, student?.id);
  };

  const toggleSubject = (idx: number) => {
    setStudentSubjects(prev => prev.map((s, i) => i === idx ? { ...s, selected: !s.selected } : s));
  };

  const updateMark = (idx: number, field: 'current' | 'target', value: number) => {
    setStudentSubjects(prev => prev.map((s, i) => i === idx ? { ...s, [field]: Math.min(100, Math.max(0, value)) } : s));
  };

  const handleSave = async () => {
    const selected = studentSubjects.filter(s => s.selected);
    if (!name.trim() || !selectedGrade || selected.length < 6) {
      alert(`Please provide your name and grade, and select at least 6 subjects. Currently selected: ${selected.length}`);
      return;
    }

    setSaving(true);
    try {
      const { data: updatedStudent, error: studentError } = await supabase
        .from('students')
        .update({
          full_name: name.trim(),
          school_id: selectedSchool || null,
          grade_id: selectedGrade,
          career_pathway: careerPathway,
          target_degree: targetDegree || null,
          target_university: targetUni || null,
          profile_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', student.id)
        .eq('auth_user_id', authUser.id)
        .select()
        .single();

      if (studentError || !updatedStudent) throw studentError || new Error('Failed to save profile');

      const { error: deleteError } = await supabase.from('student_subjects').delete().eq('student_id', student.id);
      if (deleteError) throw deleteError;

      const { error: subjectError } = await supabase.from('student_subjects').insert(selected.map(s => ({
        student_id: student.id,
        subject_id: s.subject_id,
        current_percentage: s.current,
        target_percentage: s.target,
        priority: s.current < 50 ? 'critical' : s.current < 60 ? 'high' : 'medium',
      })));
      if (subjectError) throw subjectError;

      localStorage.setItem('fundza_student', JSON.stringify(updatedStudent));
      localStorage.setItem('fundza_student_id', updatedStudent.id);
      router.push('/profile');
    } catch (error: any) {
      console.error(error);
      alert('Could not save profile: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AppLoader message="Loading profile editor..." />;

  return (
    <main className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1>Edit Profile</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Changes are saved only when you press Save Profile.</p>
        </div>
        <Link href="/profile" className="btn btn-secondary">Cancel</Link>
      </div>

      <div className="card">
        <h2>Personal Details</h2>
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          <label>Full Name<input value={name} onChange={e => setName(e.target.value)} /></label>
          <label>School<select value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}><option value="">Not selected</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label>Grade<select value={selectedGrade} onChange={e => changeGrade(e.target.value)}>{grades.map(g => <option key={g.id} value={g.id}>Grade {g.grade_number}</option>)}</select></label>
          <label>Career Pathway<select value={careerPathway} onChange={e => setCareerPathway(e.target.value)}><option value="university">University</option><option value="college">College / TVET</option><option value="both">Both</option><option value="next_grade">Next grade</option></select></label>
          <label>Target Degree / Course<input value={targetDegree} onChange={e => setTargetDegree(e.target.value)} /></label>
          <label>Target Institution<input value={targetUni} onChange={e => setTargetUni(e.target.value)} /></label>
        </div>
      </div>

      <div className="card">
        <h2>Subjects</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>These selections drive the Dashboard, Study, Quiz, Exams and Progress sections.</p>
        <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
          {studentSubjects.map((s, idx) => (
            <div key={s.subject_id} style={{ padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', opacity: s.selected ? 1 : 0.65 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={s.selected} disabled={s.is_compulsory} onChange={() => toggleSubject(idx)} />
                <strong>{s.name}</strong>{s.is_compulsory && <span style={{ color: '#dc2626', fontSize: '0.7rem' }}>COMPULSORY</span>}
              </label>
              {s.selected && <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <label style={{ flex: 1 }}>Current %<input type="number" min="0" max="100" value={s.current} onChange={e => updateMark(idx, 'current', Number(e.target.value))} /></label>
                <label style={{ flex: 1 }}>Target %<input type="number" min="0" max="100" value={s.target} onChange={e => updateMark(idx, 'target', Number(e.target.value))} /></label>
              </div>}
            </div>
          ))}
        </div>
      </div>

      <button className="btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</button>
    </main>
  );
}
