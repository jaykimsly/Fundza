'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLoader from '@/components/AppLoader';
import { FundzaBadge, FundzaButton, FundzaCard } from '@/components/Phase14Primitives';
import ProfileMediaUploader from '@/components/ProfileMediaUploader';
import { supabase } from '@/lib/supabase';
import type { Grade, School, SubjectCatalog } from '@/types';

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
  const [studentSubjects, setStudentSubjects] = useState<any[]>([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState('');

  const loadSubjects = async (gradeId: string, studentId?: string) => {
    const [{ data: catalog }, { data: saved }] = await Promise.all([
      supabase.from('subjects_catalog').select('*').eq('grade_id', gradeId).eq('curriculum', 'CAPS').order('is_compulsory', { ascending: false }).order('name'),
      studentId ? supabase.from('student_subjects').select('subject_id, current_percentage, target_percentage, priority').eq('student_id', studentId) : Promise.resolve({ data: [] as any[] }),
    ]);
    const savedMap = new Map((saved || []).map((s: any) => [s.subject_id, s]));
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

  const loadMedia = async (studentId: string) => {
    const { data: media } = await supabase.from('student_profile_media').select('avatar_path, background_path').eq('student_id', studentId).maybeSingle();
    if (!media) return;
    const paths = [media.avatar_path, media.background_path].filter(Boolean) as string[];
    const signed = await Promise.all(paths.map(path => supabase.storage.from('student-identity').createSignedUrl(path, 3600)));
    const urls = signed.map(result => result.data?.signedUrl || '');
    if (media.avatar_path) setAvatarUrl(urls[paths.indexOf(media.avatar_path)] || '');
    if (media.background_path) setBackgroundUrl(urls[paths.indexOf(media.background_path)] || '');
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
      if (currentStudent.grade_id) await loadSubjects(currentStudent.grade_id, currentStudent.id);
      await loadMedia(currentStudent.id);
      setLoading(false);
    };
    load().catch(error => { console.error(error); setLoading(false); });
  }, [router]);

  const changeGrade = async (gradeId: string) => {
    setSelectedGrade(gradeId);
    await loadSubjects(gradeId, student?.id);
  };

  const toggleSubject = (idx: number) => setStudentSubjects(prev => prev.map((subject, index) => index === idx ? { ...subject, selected: !subject.selected } : subject));
  const updateMark = (idx: number, field: 'current' | 'target', value: number) => setStudentSubjects(prev => prev.map((subject, index) => index === idx ? { ...subject, [field]: Math.min(100, Math.max(0, value)) } : subject));

  const handleSave = async () => {
    const selected = studentSubjects.filter(subject => subject.selected);
    if (!name.trim() || !selectedGrade || selected.length < 6) {
      alert(`Please provide your name and grade, and select at least 6 subjects. Currently selected: ${selected.length}`);
      return;
    }
    setSaving(true);
    try {
      const { data: updatedStudent, error: studentError } = await supabase.from('students').update({ full_name: name.trim(), school_id: selectedSchool || null, grade_id: selectedGrade, career_pathway: careerPathway, target_degree: targetDegree || null, target_university: targetUni || null, profile_completed: true, updated_at: new Date().toISOString() }).eq('id', student.id).eq('auth_user_id', authUser.id).select().single();
      if (studentError || !updatedStudent) throw studentError || new Error('Failed to save profile');
      const { error: deleteError } = await supabase.from('student_subjects').delete().eq('student_id', student.id);
      if (deleteError) throw deleteError;
      const { error: subjectError } = await supabase.from('student_subjects').insert(selected.map(subject => ({ student_id: student.id, subject_id: subject.subject_id, current_percentage: subject.current, target_percentage: subject.target, priority: subject.current < 50 ? 'critical' : subject.current < 60 ? 'high' : 'medium' })));
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
    <main className="fd-learning-page">
      <header className="fd-page-hero"><div className="fd-page-hero-copy"><p className="fd-kicker">PROFILE SETTINGS</p><h1 className="fd-page-title">Make your Fundza space yours.</h1><p className="fd-page-subtitle">Update your learner details, subjects and the imagery used around your profile. Image changes are previewed and cropped before upload.</p></div><FundzaButton href="/profile" variant="secondary">Back to profile</FundzaButton></header>

      <div className="fd-learning-stack">
        <ProfileMediaUploader studentId={student.id} initialAvatarUrl={avatarUrl} initialBackgroundUrl={backgroundUrl} />

        <FundzaCard className="fd-panel">
          <div className="fd-panel-heading"><div><p className="fd-kicker">LEARNER DETAILS</p><h2>Personal details</h2><p>These details drive your Study, Exams and Progress context.</p></div><FundzaBadge tone="brand">Account</FundzaBadge></div>
          <div className="fd-form-grid">
            <label className="fd-form-field"><span>Full name</span><input value={name} onChange={event => setName(event.target.value)} /></label>
            <label className="fd-form-field"><span>School</span><select value={selectedSchool} onChange={event => setSelectedSchool(event.target.value)}><option value="">Not selected</option>{schools.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}</select></label>
            <label className="fd-form-field"><span>Grade</span><select value={selectedGrade} onChange={event => void changeGrade(event.target.value)}>{grades.map(grade => <option key={grade.id} value={grade.id}>Grade {grade.grade_number}</option>)}</select></label>
            <label className="fd-form-field"><span>Career pathway</span><select value={careerPathway} onChange={event => setCareerPathway(event.target.value)}><option value="university">University</option><option value="college">College / TVET</option><option value="both">Both</option><option value="next_grade">Next grade</option></select></label>
            <label className="fd-form-field"><span>Target degree / course</span><input value={targetDegree} onChange={event => setTargetDegree(event.target.value)} /></label>
            <label className="fd-form-field"><span>Target institution</span><input value={targetUni} onChange={event => setTargetUni(event.target.value)} /></label>
          </div>
        </FundzaCard>

        <FundzaCard className="fd-panel">
          <div className="fd-panel-heading"><div><p className="fd-kicker">SUBJECT PROFILE</p><h2>Your subjects</h2><p>Selected subjects feed the academic views throughout Fundza.</p></div><FundzaBadge tone="brand">{studentSubjects.filter(subject => subject.selected).length} selected</FundzaBadge></div>
          <div className="fd-subject-progress-grid">
            {studentSubjects.map((subject, idx) => <article key={subject.subject_id} className="fd-subject-progress" style={{ opacity: subject.selected ? 1 : .62 }}><label style={{ display: 'flex', alignItems: 'center', gap: '.55rem' }}><input type="checkbox" checked={subject.selected} disabled={subject.is_compulsory} onChange={() => toggleSubject(idx)} /><span className="fd-subject-progress-name">{subject.name}</span>{subject.is_compulsory ? <FundzaBadge tone="warning">Compulsory</FundzaBadge> : null}</label>{subject.selected ? <div className="fd-form-grid" style={{ marginTop: '.65rem', gridTemplateColumns: '1fr 1fr' }}><label className="fd-form-field"><span>Current %</span><input type="number" min="0" max="100" value={subject.current} onChange={event => updateMark(idx, 'current', Number(event.target.value))} /></label><label className="fd-form-field"><span>Target %</span><input type="number" min="0" max="100" value={subject.target} onChange={event => updateMark(idx, 'target', Number(event.target.value))} /></label></div> : null}</article>)}
          </div>
        </FundzaCard>

        <div className="fd-action-row"><FundzaButton onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</FundzaButton><Link href="/profile" className="fd-button fd-button-ghost">Cancel</Link></div>
      </div>
    </main>
  );
}
