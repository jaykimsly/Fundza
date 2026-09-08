import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedStudent, scoreAnswer } from '@/lib/exams/server';

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { supabase, student } = await getAuthenticatedStudent();
    if (!student) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const { id } = await params;
    const { data: attempt, error: attemptError } = await supabase.from('exam_attempts').select('id,paper_id,mode,status,started_at').eq('id', id).eq('student_id', student.id).maybeSingle();
    if (attemptError) throw attemptError;
    if (!attempt) return Response.json({ error: 'Attempt not found' }, { status: 404 });
    if (attempt.status === 'submitted') return Response.json({ error: 'Attempt already submitted' }, { status: 409 });

    const admin = getSupabaseAdmin();
    const [{ data: questions, error: qError }, { data: existingAnswers, error: aError }] = await Promise.all([
      admin.from('questions').select('id,marks').eq('source_paper_id', attempt.paper_id),
      admin.from('exam_attempt_answers').select('id,question_id,response_text,selected_option').eq('attempt_id', id),
    ]);
    if (qError) throw qError;
    if (aError) throw aError;

    const questionIds = (questions || []).map((question: any) => question.id);
    const { data: memoAnswers, error: memoError } = questionIds.length
      ? await admin.from('question_answers').select('question_id,correct_answer,explanation').in('question_id', questionIds)
      : { data: [], error: null };
    if (memoError) throw memoError;
    const answerKey = new Map((memoAnswers || []).map((answer: any) => [answer.question_id, answer]));
    const answerRows = existingAnswers || [];
    let scoreMarks = 0;

    for (const question of questions || []) {
      const stored = answerRows.find((answer: any) => answer.question_id === question.id);
      const memo = answerKey.get(question.id);
      if (!stored || !memo?.correct_answer) continue;
      const response = stored.response_text ?? stored.selected_option ?? '';
      const marked = scoreAnswer(response, memo.correct_answer, Number(question.marks || 0));
      scoreMarks += marked.awardedMarks;
      const { error: updateAnswerError } = await admin.from('exam_attempt_answers').update({ awarded_marks: marked.awardedMarks, is_correct: marked.isCorrect, feedback: attempt.mode === 'take' ? null : (marked.isCorrect ? (memo.explanation || 'Correct according to the marking reference.') : 'Not matched to the marking reference.') }).eq('id', stored.id).eq('attempt_id', id);
      if (updateAnswerError) throw updateAnswerError;
    }

    const totalMarks = (questions || []).reduce((sum, question: any) => sum + Number(question.marks || 0), 0);
    const percentage = totalMarks > 0 ? Number(((scoreMarks / totalMarks) * 100).toFixed(2)) : 0;
    const { data: updated, error } = await admin.from('exam_attempts').update({ status: 'submitted', submitted_at: new Date().toISOString(), score_marks: scoreMarks, total_marks: totalMarks, percentage, updated_at: new Date().toISOString() }).eq('id', id).eq('student_id', student.id).select('id,paper_id,mode,status,started_at,submitted_at,score_marks,total_marks,percentage').single();
    if (error) throw error;

    return Response.json({ attempt: updated, answeredQuestions: answerRows.length, totalQuestions: questions?.length || 0 });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Unable to submit exam' }, { status: 500 });
  }
}
