import { NextRequest, NextResponse } from 'next/server';
import { generateJson, isGeminiConfigured, quizSchema } from '@/lib/ai';
import { retrieveKnowledge } from '@/lib/knowledge';

function apiError(message: string, code: string, status: number) {
  return NextResponse.json({ success: false, error: message, code }, { status });
}

export async function POST(request: NextRequest) {
  try {
    if (!isGeminiConfigured()) return apiError('The AI tutor is not configured yet.', 'NO_API_KEY', 503);

    let body: any;
    try { body = await request.json(); } catch { return apiError('The request could not be read.', 'INVALID_REQUEST', 400); }
    const { topic, subject, studentLevel, grade } = body || {};
    if (!topic || !subject) return apiError('A subject and topic are required.', 'INVALID_REQUEST', 400);

    const context = await retrieveKnowledge({ query: `${subject} ${topic} Grade ${grade || 12}`, matchCount: 6, grade: grade || null });
    const sourceContext = context.map((row: any, index: number) => `[SOURCE ${index + 1}] ${row.title} | ${row.source_type} | ${row.subject_name || row.subject_code || ''} | Grade ${row.grade || ''}\n${row.content}`).join('\n\n');
    const prompt = `You are Fundza, a South African school study assistant. Generate exactly 5 multiple-choice questions for ${subject}, topic "${topic}". The learner's current mastery is ${studentLevel || 50}%. Target Grade ${grade || 12}.\n\nUse the supplied Fundza knowledge when relevant. If it is insufficient, use general subject knowledge but do not pretend it came from a source. Never invent DBE paper provenance. Questions must be educationally valid, have one unambiguously correct answer, and include explanations.\n\nKnowledge context:\n${sourceContext || 'No matching Fundza knowledge was retrieved.'}`;

    const result = await generateJson<{ questions: unknown[] }>(prompt, quizSchema);
    return NextResponse.json({ success: true, questions: result.questions, sources: context.map((x: any) => ({ title: x.title, source_type: x.source_type, similarity: x.similarity })) });
  } catch (err: any) {
    console.error('Quiz generation error:', err);
    const raw = String(err?.message || '').toLowerCase();
    const code = raw.includes('timeout') || raw.includes('timed out') ? 'AI_TIMEOUT' : raw.includes('quota') || raw.includes('rate') ? 'AI_RATE_LIMIT' : raw.includes('api key') || raw.includes('unauthorized') ? 'AI_AUTH_ERROR' : 'MODEL_ERROR';
    const message = code === 'AI_TIMEOUT' ? 'The AI tutor took too long to respond.' : code === 'AI_RATE_LIMIT' ? 'The AI tutor is busy right now. Please try again shortly.' : code === 'AI_AUTH_ERROR' ? 'The AI tutor could not authenticate with its service.' : 'The AI tutor could not create a reliable quiz this time.';
    return apiError(message, code, code === 'AI_RATE_LIMIT' || code === 'AI_TIMEOUT' ? 503 : 500);
  }
}
