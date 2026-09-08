import { getSupabaseServer } from '@/lib/supabase-server';

export async function getAuthenticatedStudent() {
  const supabase = await getSupabaseServer();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { supabase, user: null, student: null };

  const { data: student, error } = await supabase
    .from('students')
    .select('id, auth_user_id, full_name, grade, grades(id, grade_number)')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return { supabase, user, student };
}

export async function getEnrolledCatalogSubjects(supabase: Awaited<ReturnType<typeof getSupabaseServer>>, studentId: string) {
  const { data, error } = await supabase
    .from('student_subjects')
    .select('subject_id, subjects_catalog(id, name, code, grade_id, category)')
    .eq('student_id', studentId)
    .order('subject_id');

  if (error) throw error;
  return (data || []).map((row: any) => row.subjects_catalog).filter(Boolean);
}

export function normaliseAnswer(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/g, '')
    .trim();
}

export function scoreAnswer(response: string, expected: string, marks: number) {
  const isCorrect = normaliseAnswer(response) === normaliseAnswer(expected);
  return { isCorrect, awardedMarks: isCorrect ? marks : 0 };
}
