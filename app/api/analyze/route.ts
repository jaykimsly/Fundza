import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { generateJson, generateUploadedFileJson, isGeminiConfigured, reportSchema } from '@/lib/ai';
import { resolveSubject } from '@/lib/knowledge';
import { getSupabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 300;

const REPORT_BUCKET = 'report-documents';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function fail(error: string, code: string, status: number) {
  return NextResponse.json({ success: false, error, code }, { status });
}

function classifyError(err: any) {
  const raw = String(err?.message || '').toLowerCase();
  if (raw.includes('pdf_gateway_unsupported')) return 'PDF_ZERO_COST_UNSUPPORTED';
  if (raw.includes('timeout') || raw.includes('deadline')) return 'AI_TIMEOUT';
  if (raw.includes('quota') || raw.includes('rate') || raw.includes('429')) return 'AI_RATE_LIMIT';
  if (raw.includes('401') || raw.includes('403') || raw.includes('api key') || raw.includes('unauthorized')) return 'AI_AUTH_ERROR';
  if (raw.includes('503') || raw.includes('unavailable') || raw.includes('high demand') || raw.includes('overloaded')) return 'AI_UNAVAILABLE';
  if (raw.includes('invalid json') || raw.includes('unexpected token') || raw.includes('empty response')) return 'AI_INVALID_RESPONSE';
  return 'MODEL_ERROR';
}

function errorMessage(code: string) {
  switch (code) {
    case 'PDF_ZERO_COST_UNSUPPORTED': return 'PDF report analysis is disabled in zero-cost AI mode because the selected free Gateway model does not advertise PDF input. Upload the report as JPG, PNG or WebP for AI analysis.';
    case 'AI_TIMEOUT': return 'The AI report reader took too long to read the document.';
    case 'AI_RATE_LIMIT': return 'The AI report reader is busy right now. Please try again shortly.';
    case 'AI_UNAVAILABLE': return 'The AI report reader is temporarily unavailable. Please try again.';
    case 'AI_AUTH_ERROR': return 'The AI report reader could not connect to its AI service.';
    case 'AI_INVALID_RESPONSE': return 'The AI report reader returned an invalid result. Please try the report again.';
    default: return 'The AI report reader could not reliably understand this report.';
  }
}

export async function POST(request: NextRequest) {
  let tempFile: string | null = null;

  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail('Please sign in before analysing a report.', 'AUTH_REQUIRED', 401);
    if (!isGeminiConfigured()) return fail('The AI report reader is not configured yet.', 'NO_API_KEY', 503);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return fail('The report request could not be read.', 'INVALID_REQUEST', 400);
    }

    const { storagePath, mimeType, content, term, mode, studentId, fileName } = body || {};
    if (!studentId) return fail('Your learner profile could not be identified.', 'INVALID_REQUEST', 400);

    const { data: student } = await supabase
      .from('students')
      .select('id,auth_user_id,grade')
      .eq('id', studentId)
      .maybeSingle();

    if (!student || student.auth_user_id !== user.id) {
      return fail('This report does not belong to the signed-in learner.', 'ACCESS_DENIED', 403);
    }

    const prompt = `You are Fundza's South African school-report extraction engine. Extract only facts explicitly present in the supplied report. Do not invent, infer or autocomplete subject names, percentages, comments, school names, learner names, grades or terms. If a field is not present, return null. Preserve the report's subject wording exactly in the name field. ${term ? `The uploader says this is ${term}, but prefer the document if it states a different term.` : ''}\n\nExtract the learner name, school, grade, term, overall performance and every subject with its percentage/comment. Weak and strong topics must only be included if explicitly supported by the report; otherwise return empty arrays.`;

    let analysis: any;

    if (mode === 'text') {
      const safeContent = String(content || '').trim();
      if (!safeContent) return fail('The report did not contain readable text.', 'DOCUMENT_CONTENT_MISSING', 400);
      if (safeContent.length > 100000) return fail('The pasted report is too long. Please upload the original document instead.', 'DOCUMENT_TOO_LARGE', 413);
      analysis = await generateJson(`${prompt}\n\nREPORT CONTENT:\n${safeContent}`, reportSchema);
    } else {
      if (!storagePath || !ALLOWED_MIME_TYPES.has(String(mimeType || ''))) {
        return fail('The uploaded report is missing or has an unsupported file type.', 'INVALID_FILE', 400);
      }

      const expectedPrefix = `${user.id}/`;
      if (!String(storagePath).startsWith(expectedPrefix)) {
        return fail('The uploaded report could not be verified for this learner.', 'ACCESS_DENIED', 403);
      }

      const { data: blob, error: downloadError } = await supabase.storage
        .from(REPORT_BUCKET)
        .download(storagePath);

      if (downloadError || !blob) {
        console.error('Report storage download failed:', downloadError);
        return fail('The uploaded report could not be retrieved. Please upload it again.', 'STORAGE_DOWNLOAD_FAILED', 502);
      }

      if (blob.size > MAX_FILE_SIZE) {
        return fail('The report is too large. The maximum supported size is 10MB.', 'FILE_TOO_LARGE', 413);
      }

      const bytes = Buffer.from(await blob.arrayBuffer());
      tempFile = path.join('/tmp', `fundza-report-${crypto.randomUUID()}`);
      await fs.writeFile(tempFile, bytes);

      analysis = await generateUploadedFileJson(prompt, tempFile, String(mimeType), reportSchema);
    }

    const resolvedSubjects = [];
    for (const subject of analysis.subjects || []) {
      const match = await resolveSubject(subject.name);
      resolvedSubjects.push({
        ...subject,
        subject_id: match?.id ?? null,
        subject_code: match?.code ?? null,
        normalized_subject_name: match?.name ?? null,
        subject_match_confidence: match?.confidence ?? 0,
      });
    }
    analysis.subjects = resolvedSubjects;

    const { data: document, error: documentError } = await supabase.from('documents').insert({
      student_id: studentId,
      file_name: fileName || 'uploaded-report',
      file_url: storagePath || 'text-input',
      file_type: 'report',
      document_date: new Date().toISOString().slice(0, 10),
    }).select('id').maybeSingle();

    if (documentError) throw documentError;

    if (document?.id) {
      const { error: analysisError } = await supabase.from('document_analyses').insert({
        document_id: document.id,
        student_id: studentId,
        overall_summary: analysis.overall_summary,
        subject_analyses: analysis.subjects,
        recommendations: analysis.overall_recommendations,
        aps_estimate: analysis.aps_estimate ?? null,
      });
      if (analysisError) throw analysisError;
    }

    return NextResponse.json({ success: true, analysis });
  } catch (err: any) {
    console.error('Analyze error:', err);
    const code = classifyError(err);
    const status = ['AI_TIMEOUT', 'AI_RATE_LIMIT', 'AI_UNAVAILABLE', 'PDF_ZERO_COST_UNSUPPORTED'].includes(code) ? 503 : 500;
    return fail(errorMessage(code), code, status);
  } finally {
    if (tempFile) {
      try { await fs.unlink(tempFile); } catch { /* best-effort cleanup */ }
    }
  }
}
