import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedStudent, scoreAnswer } from '@/lib/exams/server';

type Params = { params: Promise<{ id: string }> };
type AnswerBody = { questionId?: string; responseText?: string; selectedOption?: string };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { supabase, student } = await getAuthenticatedStudent();
    if (!student) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const { id } = await params;
    const { data: attempt, error } = await supabase.from('exam_attempts').select('id,student_id,paper_id,mode,status,started_at,submitted_at,score_marks,total_marks,percentage').eq('id', id).eq('student_id', student.id).maybeSingle();
    if (error) throw error;
    if (!attempt) return Response.json({ error: 'Attempt not found' }, { status: 404 });
    const { data: answers, error: answersError } = await supabase.from('exam_attempt_answers').select('id,question_id,response_text,selected_option,awarded_marks,is_correct,feedback,answered_at').eq('attempt_id', id).order('answered_at');
    if (answersError) throw answersError;
    return Response.json({ attempt, answers: answers || [] });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Unable to load attempt' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { supabase, student } = await getAuthenticatedStudent();
    if (!student) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const { id } = await params;
    const body = (await request.json()) as AnswerBody;
    const response = (body.responseText ?? body.selectedOption ?? '').trim();
    if (!body.questionId || !response) return Response.json({ error: 'questionId and an answer are required' }, { status: 400 });

    const { data: attempt, error: attemptError } = await supabase.from('exam_attempts').select('id,paper_id,mode,status').eq('id', id).eq('student_id', student.id).maybeSingle();
    if (attemptError) throw attemptError;
    if (!attempt) return Response.json({ error: 'Attempt not found' }, { status: 404 });
    if (attempt.status !== 'in_progress') return Response.json({ error: 'Attempt is already submitted' }, { status: 409 });

    const { data: question, error: questionError } = await supabase.from('questions').select('id,source_paper_id,marks').eq('id', body.questionId).eq('source_paper_id', attempt.paper_id).maybeSingle();
    if (questionError) throw questionError;
    if (!question) return Response.json({ error: 'Question is not part of this paper' }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data: memoAnswer, error: memoError } = await admin.from('question_answers').select('correct_answer,explanation,steps').eq('question_id', body.questionId).maybeSingle();
    if (memoError) throw memoError;
    const marked = memoAnswer?.correct_answer ? scoreAnswer(response, memoAnswer.correct_answer, Number(question.marks || 1)) : null;
    const reveal = attempt.mode !== 'take';
    const payload = {
      attempt_id: id,
      question_id: body.questionId,
      response_text: body.responseText ?? null,
      selected_option: body.selectedOption ?? null,
      awarded_marks: marked?.awardedMarks ?? null,
      is_correct: marked?.isCorrect ?? null,
      feedback: reveal ? (marked ? (marked.isCorrect ? (memoAnswer?.explanation || 'Correct according to the marking reference.') : 'Not matched to the marking reference.') : 'Awaiting marking.') : null,
    };
    const { data: answer, error } = await admin.from('exam_attempt_answers').upsert(payload, { onConflict: 'attempt_id,question_id' }).select('id,question_id,response_text,selected_option,awarded_marks,is_correct,feedback').single();
    if (error) throw error;
    return Response.json({ answer, ...(reveal ? { memo: memoAnswer || null } : {}) });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Unable to save answer' }, { status: 500 });
  }
}
