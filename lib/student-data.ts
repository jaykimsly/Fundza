import { supabase } from '@/lib/supabase';

export type StudentSubjectWithCatalog = {
  id: string;
  student_id: string;
  subject_id: string;
  current_percentage: number;
  target_percentage: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  subjects_catalog: {
    id: string;
    name: string;
    code: string;
    category: string;
    is_compulsory: boolean;
  } | null;
};

export async function getCurrentStudent() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { session: null, student: null, subjects: [] as StudentSubjectWithCatalog[] };

  const { data: student, error } = await supabase
    .from('students')
    .select('*, schools(id, name, province, district, municipality, area), grades(id, grade_number, description)')
    .eq('auth_user_id', session.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!student) return { session, student: null, subjects: [] as StudentSubjectWithCatalog[] };

  const { data: subjects, error: subjectsError } = await supabase
    .from('student_subjects')
    .select('id, student_id, subject_id, current_percentage, target_percentage, priority, subjects_catalog(id, name, code, category, is_compulsory)')
    .eq('student_id', student.id)
    .order('subject_id');

  if (subjectsError) throw subjectsError;

  return {
    session,
    student,
    subjects: (subjects || []) as unknown as StudentSubjectWithCatalog[],
  };
}

export function getLevel(percentage: number) {
  if (percentage >= 80) return 7;
  if (percentage >= 70) return 6;
  if (percentage >= 60) return 5;
  if (percentage >= 50) return 4;
  if (percentage >= 40) return 3;
  if (percentage >= 30) return 2;
  return 1;
}

export function calculateAps(subjects: StudentSubjectWithCatalog[]) {
  return subjects
    .filter(s => s.subjects_catalog?.code !== 'LIFE_ORI')
    .reduce((sum, s) => sum + getLevel(Number(s.current_percentage || 0)), 0);
}
