import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedStudent } from '@/lib/exams/server';

const MODES = new Set(['take', 'prep', 'practice', 'review']);

type Body = { paperId?: string; mode?: string };

export async function POST(request: Request) {
  try {
    const { supabase, student } = await getAuthenticatedStudent();
    if (!student) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const body = (await request.json()) as Body;
    if (!body.paperId || !body.mode || !MODES.has(body.mode)) return Response.json({ error: 'paperId and a valid mode are required' }, { status: 400 });

    const { data: paper, error: paperError } = await supabase.from('papers').select('id, catalog_subject_id').eq('id', body.paperId).eq('visibility', 'fundza').eq('sharing_status', 'approved').eq('review_status', 'verified').maybeSingle();
    if (paperError) throw paperError;
    if (!paper) return Response.json({ error: 'Exam paper not found' }, { status: 404 });

    const { data: enrolled, error: enrolledError } = await supabase.from('student_subjects').select('subject_id').eq('student_id', student.id).eq('subject_id', (paper as any).catalog_subject_id).maybeSingle();
    if (enrolledError) throw enrolledError;
    if (!enrolled) return Response.json({ error: 'This paper is not available for your subjects' }, { status: 403 });

    const admin = getSupabaseAdmin();
    const { data: attempt, error } = await admin.from('exam_attempts').insert({ student_id: student.id, paper_id: body.paperId, mode: body.mode }).select('id, paper_id, mode, status, started_at').single();
    if (error) throw error;
    return Response.json({ attempt }, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Unable to start exam' }, { status: 500 });
  }
}
