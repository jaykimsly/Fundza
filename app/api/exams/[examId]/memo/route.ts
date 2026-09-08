import { getAuthenticatedStudent, getEnrolledCatalogSubjects } from '@/lib/exams/server';

type Params = { params: Promise<{ examId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { supabase, student } = await getAuthenticatedStudent();
    if (!student) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const { examId } = await params;
    const subjects = await getEnrolledCatalogSubjects(supabase, student.id);

    const { data: memos, error } = await supabase
      .from('paper_memos')
      .select('id, paper_id, language, memo_url, storage_path, extracted_text, verification_status, source_name, created_at, updated_at, papers!inner(id,catalog_subject_id)')
      .eq('paper_id', examId)
      .in('papers.catalog_subject_id', subjects.map((subject: any) => subject.id))
      .eq('papers.visibility', 'fundza')
      .eq('papers.sharing_status', 'approved')
      .eq('papers.review_status', 'verified');
    if (error) throw error;

    return Response.json({ memos: memos || [] });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Unable to load memo' }, { status: 500 });
  }
}
