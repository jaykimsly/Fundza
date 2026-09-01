import { NextRequest, NextResponse } from 'next/server';
import { generateJson, isGeminiConfigured } from '@/lib/ai';
import { retrieveKnowledge } from '@/lib/knowledge';
import { getSupabaseServer } from '@/lib/supabase-server';

const answerSchema = { type: 'object', properties: { answer: { type: 'string' }, confidence: { type: 'string', enum: ['high', 'medium', 'low'] }, sources: { type: 'array', items: { type: 'integer' } } }, required: ['answer', 'confidence', 'sources'] };
const MAX_QUESTION_LENGTH = 4000;
const MAX_HISTORY_ITEMS = 6;
const MAX_HISTORY_ITEM_LENGTH = 2000;

function fail(error: string, code: string, status: number) {
  return NextResponse.json({ success: false, error, code }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail('Please sign in before using the AI tutor.', 'AUTH_REQUIRED', 401);
    if (!isGeminiConfigured()) return fail('The Gemini AI tutor is not configured yet.', 'NO_API_KEY', 503);

    let body: unknown;
    try { body = await request.json(); } catch { return fail('The request could not be read.', 'INVALID_REQUEST', 400); }
    if (!body || typeof body !== 'object') return fail('The request body is invalid.', 'INVALID_REQUEST', 400);
    const input = body as Record<string, unknown>;
    const question = typeof input.question === 'string' ? input.question.trim() : '';
    const subjectCode = typeof input.subjectCode === 'string' ? input.subjectCode.trim().slice(0, 50) : null;
    const requestedGrade = Number(input.grade);
    const history = Array.isArray(input.history) ? input.history : [];
    if (!question) return fail('Please type a question first.', 'INVALID_REQUEST', 400);
    if (question.length > MAX_QUESTION_LENGTH) return fail(`Please keep the question under ${MAX_QUESTION_LENGTH} characters.`, 'REQUEST_TOO_LARGE', 413);

    const { data: student } = await supabase
      .from('students')
      .select('full_name,grade,school_id,student_subjects(subject_id,subjects_catalog:subject_id(name,code))')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    const effectiveGrade = Number.isInteger(requestedGrade) && requestedGrade >= 4 && requestedGrade <= 12 ? requestedGrade : Number(student?.grade) || 12;
    const safeHistory = history.slice(-MAX_HISTORY_ITEMS).map((message: unknown) => {
      if (!message || typeof message !== 'object') return null;
      const item = message as Record<string, unknown>;
      const role = item.role === 'assistant' ? 'assistant' : 'user';
      const content = typeof item.content === 'string' ? item.content.slice(0, MAX_HISTORY_ITEM_LENGTH) : '';
      return content ? `${role}: ${content}` : null;
    }).filter(Boolean).join('\n');

    const context = await retrieveKnowledge({ query: question, matchCount: 8, subjectCode, grade: effectiveGrade });
    const sourceContext = context.map((row: any, index: number) => `[SOURCE ${index + 1}] ${row.title} | ${row.source_type} | ${row.subject_name || row.subject_code || ''} | Grade ${row.grade || ''} | ${row.paper || ''}\n${row.content}`).join('\n\n');
    const prompt = `You are Fundza, a focused South African school tutor. Answer the learner's question for Grade ${effectiveGrade}. Prefer supplied Fundza knowledge. Distinguish clearly between source-supported facts and general explanation. If sources do not support a claim, do not fabricate a citation. Explain at the learner's level, use CAPS terminology where applicable, and show working for calculations.\n\nLearner question:\n${question}\n\nRecent conversation:\n${safeHistory || 'No prior conversation.'}\n\nFundza knowledge:\n${sourceContext || 'No matching source was found.'}\n\nReturn a concise but useful answer. In sources, return the 1-based source numbers that materially support the answer.`;
    const result = await generateJson<{ answer: string; confidence: string; sources: number[] }>(prompt, answerSchema);
    const sources = (Array.isArray(result.sources) ? result.sources : []).filter(n => Number.isInteger(n) && n >= 1 && n <= context.length).map(n => { const row: any = context[n - 1]; return { title: row.title, source_type: row.source_type, similarity: row.similarity }; });
    return NextResponse.json({ success: true, answer: result.answer, confidence: result.confidence, sources }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    console.error('Fundza AI chat error:', err);
    const raw = String(err?.message || '').toLowerCase();
    const code = raw.includes('timeout') || raw.includes('timed out') || raw.includes('deadline') || err?.code === 'AI_TIMEOUT' ? 'AI_TIMEOUT' : raw.includes('quota') || raw.includes('rate') || raw.includes('429') ? 'AI_RATE_LIMIT' : raw.includes('api key') || raw.includes('unauthorized') || raw.includes('401') || raw.includes('403') ? 'AI_AUTH_ERROR' : 'MODEL_ERROR';
    const message = code === 'AI_TIMEOUT' ? 'The AI tutor took too long to respond.' : code === 'AI_RATE_LIMIT' ? 'The AI tutor is busy right now.' : code === 'AI_AUTH_ERROR' ? 'The AI tutor could not connect to Gemini. Check the server Gemini configuration.' : 'The AI tutor could not answer reliably this time.';
    return fail(message, code, code === 'AI_TIMEOUT' || code === 'AI_RATE_LIMIT' ? 503 : 500);
  }
}
