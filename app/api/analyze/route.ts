import { NextRequest, NextResponse } from 'next/server';
import { generateJson, generateMultimodalJson, isGeminiConfigured, reportSchema } from '@/lib/ai';
import { resolveSubject } from '@/lib/knowledge';
import { getSupabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 300;
function fail(error: string, code: string, status: number) { return NextResponse.json({ success: false, error, code }, { status }); }

export async function POST(request: NextRequest) {
  try {
    if (!isGeminiConfigured()) return fail('The AI report reader is not configured yet.', 'NO_API_KEY', 503);
    let body: any;
    try { body = await request.json(); } catch { return fail('The report request could not be read.', 'INVALID_REQUEST', 400); }
    const { fileData, mimeType, content, term, mode, studentId, fileName } = body || {};
    if (!studentId) return fail('Your learner profile could not be identified.', 'INVALID_REQUEST', 400);
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail('Please sign in before analysing a report.', 'AUTH_REQUIRED', 401);
    const { data: student } = await supabase.from('students').select('id,auth_user_id,grade').eq('id', studentId).maybeSingle();
    if (!student || student.auth_user_id !== user.id) return fail('This report does not belong to the signed-in learner.', 'ACCESS_DENIED', 403);
    const prompt = `You are Fundza's South African school-report extraction engine. Extract only facts explicitly present in the supplied report. Do not invent, infer or autocomplete subject names, percentages, comments, school names, learner names, grades or terms. If a field is not present, return null. Preserve the report's subject wording exactly in the name field. ${term ? `The uploader says this is ${term}, but prefer the document if it states a different term.` : ''}\n\nExtract the learner name, school, grade, term, overall performance and every subject with its percentage/comment. Weak and strong topics must only be included if explicitly supported by the report; otherwise return empty arrays.`;
    let analysis: any;
    if (mode === 'vision' && fileData) analysis = await generateMultimodalJson(prompt, fileData, mimeType || 'application/pdf', reportSchema);
    else { const safeContent = String(content || '').slice(0, 100000); if (!safeContent) return fail('The report did not contain readable text.', 'DOCUMENT_CONTENT_MISSING', 400); analysis = await generateJson(`${prompt}\n\nREPORT CONTENT:\n${safeContent}`, reportSchema); }
    const resolvedSubjects = [];
    for (const subject of analysis.subjects || []) { const match = await resolveSubject(subject.name); resolvedSubjects.push({ ...subject, subject_id: match?.id ?? null, subject_code: match?.code ?? null, normalized_subject_name: match?.name ?? null, subject_match_confidence: match?.confidence ?? 0 }); }
    analysis.subjects = resolvedSubjects;
    const { data: document, error: documentError } = await supabase.from('documents').insert({ student_id: studentId, file_name: fileName || 'uploaded-report', file_url: 'ai-analysis-input', file_type: 'report', document_date: new Date().toISOString().slice(0, 10) }).select('id').maybeSingle();
    if (documentError) throw documentError;
    if (document?.id) { const { error: analysisError } = await supabase.from('document_analyses').insert({ document_id: document.id, student_id: studentId, overall_summary: analysis.overall_summary, subject_analyses: analysis.subjects, recommendations: analysis.overall_recommendations }); if (analysisError) throw analysisError; }
    return NextResponse.json({ success: true, analysis });
  } catch (err: any) {
    console.error('Analyze error:', err);
    const raw = String(err?.message || '').toLowerCase();
    const code = raw.includes('timeout') ? 'AI_TIMEOUT' : raw.includes('quota') || raw.includes('rate') ? 'AI_RATE_LIMIT' : raw.includes('api key') || raw.includes('unauthorized') ? 'AI_AUTH_ERROR' : 'MODEL_ERROR';
    const message = code === 'AI_TIMEOUT' ? 'The AI report reader took too long to read the document.' : code === 'AI_RATE_LIMIT' ? 'The AI report reader is busy right now.' : code === 'AI_AUTH_ERROR' ? 'The AI report reader could not connect to its AI service.' : 'The AI report reader could not reliably understand this report.';
    return fail(message, code, code === 'AI_TIMEOUT' || code === 'AI_RATE_LIMIT' ? 503 : 500);
  }
}
