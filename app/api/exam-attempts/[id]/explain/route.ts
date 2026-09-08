import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { generateJson } from '@/lib/ai';
import { getAuthenticatedStudent } from '@/lib/exams/server';

type Params = { params: Promise<{ id: string }> };
type Body = { questionId?: string; learnerAnswer?: string };

const explanationSchema = {
  type: 'object', properties: {
    result: { type: 'string' }, explanation: { type: 'string' }, steps: { type: 'array', items: { type: 'string' } }, next_tip: { type: 'string' },
  }, required: ['result', 'explanation', 'steps', 'next_tip'],
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { supabase, student } = await getAuthenticatedStudent();
    if (!student) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const { id } = await params;
    const body = (await request.json()) as Body;
    if (!body.questionId || !body.learnerAnswer) return Response.json({ error: 'questionId and learnerAnswer are required' }, { status: 400 });

    const { data: attempt, error: attemptError } = await supabase.from('exam_attempts').select('id,paper_id').eq('id', id).eq('student_id', student.id).maybeSingle();
    if (attemptError) throw attemptError;
    if (!attempt) return Response.json({ error: 'Attempt not found' }, { status: 404 });

    const admin = getSupabaseAdmin();
    const [{ data: question, error: qError }, { data: memoAnswer, error: aError }] = await Promise.all([
      admin.from('questions').select('id,question_text,marks').eq('id', body.questionId).eq('source_paper_id', attempt.paper_id).maybeSingle(),
      admin.from('question_answers').select('correct_answer,explanation,steps').eq('question_id', body.questionId).maybeSingle(),
    ]);
    if (qError) throw qError;
    if (aError) throw aError;
    if (!question || !memoAnswer) return Response.json({ error: 'Question or marking reference not found' }, { status: 404 });

    const result = await generateJson(
      `Explain this historical exam question using the authoritative marking reference. Do not invent a different correct answer.\nQUESTION (${question.marks || 0} marks): ${question.question_text}\nLEARNER ANSWER: ${body.learnerAnswer}\nAUTHORITATIVE MEMO ANSWER: ${memoAnswer.correct_answer}\nMEMO NOTES: ${memoAnswer.explanation || ''}\nMEMO STEPS: ${JSON.stringify(memoAnswer.steps || [])}`,
      explanationSchema,
    );
    return Response.json({ explanation: result });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Unable to generate explanation' }, { status: 500 });
  }
}
