import { NextRequest } from 'next/server';
import { getAuthenticatedStudent, getEnrolledCatalogSubjects } from '@/lib/exams/server';

export async function GET(request: NextRequest) {
  try {
    const { supabase, student } = await getAuthenticatedStudent();
    if (!student) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const subjects = await getEnrolledCatalogSubjects(supabase, student.id);
    const subjectIds = subjects.map((subject: any) => subject.id);
    if (!subjectIds.length) return Response.json({ subjects: [], papers: [] });

    const subjectId = request.nextUrl.searchParams.get('subject_id');
    const allowedSubjectIds = subjectId && subjectIds.includes(subjectId) ? [subjectId] : subjectIds;

    const { data: papers, error } = await supabase
      .from('papers')
      .select('id, year, exam_type, province, file_url, paper_url, source_name, source_page_url, extraction_status, verification_status, visibility, sharing_status, review_status, language, session, paper_number, catalog_subject_id, grade_id, subjects_catalog:catalog_subject_id(id, name, code), paper_memos(id, language, memo_url, verification_status)')
      .in('catalog_subject_id', allowedSubjectIds)
      .eq('visibility', 'fundza')
      .eq('sharing_status', 'approved')
      .eq('review_status', 'verified')
      .order('year', { ascending: false })
      .order('paper_number', { ascending: true, nullsFirst: false });

    if (error) throw error;

    return Response.json({
      subjects,
      papers: papers || [],
      source: { name: 'Department of Basic Education', url: 'https://www.education.gov.za/Examinations/NSCPastExaminationpapers/tabid/593/Default.aspx' },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Unable to load exams' }, { status: 500 });
  }
}
