import { getAuthenticatedStudent, getEnrolledCatalogSubjects } from '@/lib/exams/server';

type Params = { params: Promise<{ examId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { supabase, student } = await getAuthenticatedStudent();
    if (!student) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const { examId } = await params;
    const subjects = await getEnrolledCatalogSubjects(supabase, student.id);
    const { data: paper, error } = await supabase
      .from('papers')
      .select('id, year, exam_type, province, file_url, paper_url, source_name, source_page_url, extraction_status, verification_status, language, session, paper_number, catalog_subject_id, grade_id, duration_minutes, subjects_catalog:catalog_subject_id(id,name,code), paper_memos(id,language,memo_url,verification_status)')
      .eq('id', examId)
      .in('catalog_subject_id', subjects.map((subject: any) => subject.id))
      .eq('visibility', 'fundza')
      .eq('sharing_status', 'approved')
      .eq('review_status', 'verified')
      .maybeSingle();
    if (error) throw error;
    if (!paper) return Response.json({ error: 'Exam paper not found' }, { status: 404 });
    const { data: attempts, error: attemptsError } = await supabase
      .from('exam_attempts')
      .select('id, mode, status, started_at, submitted_at, score_marks, total_marks, percentage')
      .eq('student_id', student.id).eq('paper_id', examId).order('created_at', { ascending: false }).limit(10);
    if (attemptsError) throw attemptsError;
    return Response.json({ paper, attempts: attempts || [] });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Unable to load exam' }, { status: 500 });
  }
}
