import { NextRequest, NextResponse } from 'next/server';
import { generateJson, isGeminiConfigured } from '@/lib/ai';
import { retrieveKnowledge } from '@/lib/knowledge';
import { getSupabaseServer } from '@/lib/supabase-server';

const answerSchema = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    sources: { type: 'array', items: { type: 'integer' } },
  },
  required: ['answer', 'confidence', 'sources'],
};

export async function POST(request: NextRequest) {
  try {
    if (!isGeminiConfigured()) return NextResponse.json({ error: 'AI not configured' }, { status: 503 });

    const body = await request.json();
    const { question, subjectCode, grade, history = [] } = body;
    if (!question?.trim()) return NextResponse.json({ error: 'Question is required' }, { status: 400 });

    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { data: student } = await supabase
      .from('students')
      .select('full_name,grade,school_id,student_subjects(subject_id,subjects_catalog:subject_id(name,code))')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    const effectiveGrade = grade || student?.grade || 12;
    const context = await retrieveKnowledge({
      query: question,
      matchCount: 8,
      subjectCode: subjectCode || null,
      grade: effectiveGrade,
    });

    const sourceContext = context.map((row: any, index: number) =>
      `[SOURCE ${index + 1}] ${row.title} | ${row.source_type} | ${row.subject_name || row.subject_code || ''} | Grade ${row.grade || ''} | ${row.paper || ''}\n${row.content}`
    ).join('\n\n');

    const historyText = Array.isArray(history) ? history.slice(-6).map((m: any) => `${m.role}: ${m.content}`).join('\n') : '';
    const prompt = `You are Fundza, a focused South African school tutor. Answer the learner's question for Grade ${effectiveGrade}. Prefer the supplied Fundza knowledge. Distinguish clearly between facts supported by the sources and general explanation. If the sources do not support a claim, do not fabricate a citation or source. Explain at the learner's level, use CAPS terminology where applicable, and show working for calculations.

Learner question:\n${question}

Recent conversation:\n${historyText}

Fundza knowledge:\n${sourceContext || 'No matching source was found.'}

Return a concise but useful answer. In sources, return the 1-based source numbers that materially support the answer.`;

    const result = await generateJson<{ answer: string; confidence: string; sources: number[] }>(prompt, answerSchema);
    const sources = (result.sources || []).filter((n) => Number.isInteger(n) && n >= 1 && n <= context.length).map((n) => {
      const row: any = context[n - 1];
      return { title: row.title, source_type: row.source_type, similarity: row.similarity };
    });

    return NextResponse.json({ success: true, ...result, sources });
  } catch (err: any) {
    console.error('Fundza AI chat error:', err);
    return NextResponse.json({ error: err.message || 'AI request failed' }, { status: 500 });
  }
}
