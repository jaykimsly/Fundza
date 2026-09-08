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
      .select('id, catalog_subject_id, questions:questions!source_paper_id(id, question_text, question_type, difficulty, source_question_number, marks, question_order, options, content_kind)')
      .eq('id', examId)
      .in('catalog_subject_id', subjects.map((subject: any) => subject.id))
      .eq('visibility', 'fundza')
      .eq('sharing_status', 'approved')
      .eq('review_status', 'verified')
      .maybeSingle();
    if (error) throw error;
    if (!paper) return Response.json({ error: 'Exam paper not found' }, { status: 404 });

    const questions = [...((paper as any).questions || [])].sort((a: any, b: any) => (a.question_order ?? 999999) - (b.question_order ?? 999999));
    return Response.json({ questions });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Unable to load questions' }, { status: 500 });
  }
}
