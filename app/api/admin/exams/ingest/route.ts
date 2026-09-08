import { getSupabaseAdmin } from '@/lib/supabase-admin';

function authorised(request: Request) {
  const configured = process.env.EXAMS_INGEST_KEY;
  const supplied = request.headers.get('x-fundza-ingest-key') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return Boolean(configured && supplied && supplied === configured);
}

type IngestQuestion = {
  questionNumber: string; order?: number; questionText: string; questionType?: string; difficulty?: string; marks?: number; options?: Array<{ label: string; text: string }>;
  memoAnswer?: string; memoExplanation?: string; memoSteps?: string[]; sourcePage?: number;
};
type IngestPaper = {
  subjectCode: string; gradeNumber: number; year: number; examType: string; session?: string; paperNumber?: number; language?: string; province?: string;
  title?: string; paperUrl?: string; memoUrl?: string; sourcePageUrl?: string; durationMinutes?: number; questions?: IngestQuestion[];
};

export async function POST(request: Request) {
  try {
    if (!authorised(request)) return Response.json({ error: 'Not authorised' }, { status: 401 });
    const body = (await request.json()) as { source?: string; papers?: IngestPaper[] };
    if (!body.papers?.length) return Response.json({ error: 'papers is required' }, { status: 400 });

    const admin = getSupabaseAdmin();
    const results = [];
    for (const input of body.papers) {
      const { data: grade, error: gradeError } = await admin.from('grades').select('id').eq('grade_number', input.gradeNumber).maybeSingle();
      if (gradeError) throw gradeError;
      const { data: subject, error: subjectError } = await admin.from('subjects_catalog').select('id,name,code').eq('code', input.subjectCode).eq('grade_id', grade?.id).maybeSingle();
      if (subjectError) throw subjectError;
      if (!grade || !subject) { results.push({ ok: false, subjectCode: input.subjectCode, error: 'Grade or subject catalog entry not found' }); continue; }

      const sourceKey = [input.subjectCode, input.gradeNumber, input.year, input.examType, input.session || '', input.paperNumber ?? '', input.language || ''].join('|').toLowerCase();
      const paperPayload = {
        catalog_subject_id: subject.id, grade_id: grade.id, year: input.year, exam_type: input.examType, province: input.province || null,
        file_url: input.paperUrl || null, paper_url: input.paperUrl || null, source_name: body.source || 'DBE', source_page_url: input.sourcePageUrl || null,
        extraction_status: input.questions?.length ? 'ready' : 'pending', verification_status: 'verified', visibility: 'fundza', sharing_status: 'approved',
        review_status: 'verified', copyright_status: 'unknown', reported: false, is_immutable: true, language: input.language || null, session: input.session || null,
        paper_number: input.paperNumber ?? null, duration_minutes: input.durationMinutes ?? null, source_key: sourceKey, provenance_type: 'official-source',
        metadata: { title: input.title || null, source: body.source || 'DBE' },
      };
      const { data: paper, error: paperError } = await admin.from('papers').upsert(paperPayload, { onConflict: 'source_key' }).select('id').single();
      if (paperError) throw paperError;

      let memoId: string | null = null;
      if (input.memoUrl) {
        const { data: memo, error: memoError } = await admin.from('paper_memos').upsert({ paper_id: paper.id, language: input.language || '', memo_url: input.memoUrl, source_name: body.source || 'DBE', verification_status: 'verified' }, { onConflict: 'paper_id,language' }).select('id').single();
        if (memoError) throw memoError;
        memoId = memo.id;
      }

      const questionCount = input.questions?.length || 0;
      for (const q of input.questions || []) {
        const { data: existing } = await admin.from('questions').select('id').eq('source_paper_id', paper.id).eq('source_question_number', q.questionNumber).maybeSingle();
        let questionId = existing?.id;
        const values = { question_text: q.questionText, question_type: q.questionType || 'constructed_response', difficulty: q.difficulty || 'medium', options: q.options || [], learning_stage: `grade-${input.gradeNumber}`, source_type: 'official-paper', source_title: input.title || `${subject.name} ${input.year}`, source_year: input.year, source_question_number: q.questionNumber, mark_allocation: q.marks || null, marks: q.marks || null, question_order: q.order ?? null, source_paper_id: paper.id, source_page: q.sourcePage || null, content_kind: 'historical_exam', skill_tags: [], status: 'published', origin: 'official-source' };
        if (questionId) {
          const { error: updateError } = await admin.from('questions').update(values).eq('id', questionId);
          if (updateError) throw updateError;
        } else {
          const { data: inserted, error: questionError } = await admin.from('questions').insert(values).select('id').single();
          if (questionError) throw questionError;
          questionId = inserted.id;
        }
        if (q.memoAnswer) {
          const { error: answerError } = await admin.from('question_answers').upsert({ question_id: questionId, paper_memo_id: memoId, correct_answer: q.memoAnswer, explanation: q.memoExplanation || null, steps: q.memoSteps || [] }, { onConflict: 'question_id' });
          if (answerError) throw answerError;
        }
      }
      results.push({ ok: true, paperId: paper.id, subject: subject.name, questionCount });
    }
    return Response.json({ source: body.source || 'DBE', results });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Ingestion failed' }, { status: 500 });
  }
}
