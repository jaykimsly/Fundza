import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { generateJson, generateUploadedFileJson, isGeminiConfigured, reportSchema } from '@/lib/ai';
import { resolveSubject } from '@/lib/knowledge';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const REPORT_BUCKET = 'report-documents';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ATTEMPTS = 3;

const RETRYABLE_CODES = new Set(['AI_TIMEOUT', 'AI_RATE_LIMIT', 'AI_UNAVAILABLE']);

function classifyError(err: any) {
  const raw = String(err?.message || '').toLowerCase();
  if (raw.includes('timeout') || raw.includes('deadline')) return 'AI_TIMEOUT';
  if (raw.includes('quota') || raw.includes('rate') || raw.includes('429')) return 'AI_RATE_LIMIT';
  if (raw.includes('401') || raw.includes('403') || raw.includes('api key') || raw.includes('unauthorized')) return 'AI_AUTH_ERROR';
  if (raw.includes('503') || raw.includes('unavailable') || raw.includes('high demand') || raw.includes('overloaded')) return 'AI_UNAVAILABLE';
  if (raw.includes('invalid json') || raw.includes('unexpected token') || raw.includes('empty response')) return 'AI_INVALID_RESPONSE';
  return 'MODEL_ERROR';
}

function publicError(code: string) {
  switch (code) {
    case 'AI_TIMEOUT': return 'The AI report reader took too long to read the document.';
    case 'AI_RATE_LIMIT': return 'The AI report reader is busy right now. Your report will be retried automatically.';
    case 'AI_UNAVAILABLE': return 'The AI report reader is temporarily busy. Your report will be retried automatically.';
    case 'AI_AUTH_ERROR': return 'The AI report reader could not connect to its AI service.';
    case 'AI_INVALID_RESPONSE': return 'The AI report reader returned an invalid result.';
    default: return 'The AI report reader could not reliably understand this report.';
  }
}

function backoffMs(attempt: number) {
  return Math.min(60_000, 5_000 * Math.pow(2, Math.max(0, attempt - 1)));
}

async function setJob(jobId: string, patch: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  await supabase.from('analysis_jobs').update({ ...patch, heartbeat_at: new Date().toISOString() }).eq('id', jobId);
}

async function claimJob(jobId: string) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const stale = new Date(Date.now() - 2 * 60_000).toISOString();
  const { data } = await supabase
    .from('analysis_jobs')
    .update({ status: 'processing', started_at: now, heartbeat_at: now, error_message: null, error_code: null })
    .eq('id', jobId)
    .in('status', ['queued', 'retrying'])
    .or(`heartbeat_at.is.null,heartbeat_at.lt.${stale}`)
    .select('id,student_id,user_id,storage_path,mime_type,mode,source_text,file_name,term,attempt_count,max_attempts,document_id')
    .maybeSingle();
  return data;
}

export async function processAnalysisJob(jobId: string) {
  if (!isGeminiConfigured()) {
    await setJob(jobId, { status: 'failed', error_code: 'NO_API_KEY', error_message: 'The AI report reader is not configured.', completed_at: new Date().toISOString() });
    return;
  }

  const job = await claimJob(jobId);
  if (!job) return;

  const supabase = getSupabaseAdmin();
  const attempt = Number(job.attempt_count || 0) + 1;
  await setJob(jobId, { attempt_count: attempt, status: 'processing', started_at: new Date().toISOString() });

  let tempFile: string | null = null;
  try {
    const prompt = `You are Fundza's South African school-report extraction engine. Extract only facts explicitly present in the supplied report. Do not invent, infer or autocomplete subject names, percentages, comments, school names, learner names, grades or terms. If a field is not present, return null. Preserve the report's subject wording exactly in the name field. ${job.term ? `The uploader says this is ${job.term}, but prefer the document if it states a different term.` : ''}\n\nExtract the learner name, school, grade, term, overall performance and every subject with its percentage/comment. Weak and strong topics must only be included if explicitly supported by the report; otherwise return empty arrays.`;

    let analysis: any;
    if (job.mode === 'text') {
      const content = String(job.source_text || '').trim();
      if (!content) throw Object.assign(new Error('Report text is missing'), { code: 'DOCUMENT_CONTENT_MISSING' });
      analysis = await generateJson(`${prompt}\n\nREPORT CONTENT:\n${content}`, reportSchema);
    } else {
      if (!job.storage_path || !job.mime_type) throw Object.assign(new Error('Report storage reference is missing'), { code: 'INVALID_FILE' });
      const { data: blob, error } = await supabase.storage.from(REPORT_BUCKET).download(job.storage_path);
      if (error || !blob) throw Object.assign(new Error('The uploaded report could not be retrieved'), { code: 'STORAGE_DOWNLOAD_FAILED' });
      if (blob.size > MAX_FILE_SIZE) throw Object.assign(new Error('The report is too large'), { code: 'FILE_TOO_LARGE' });
      tempFile = path.join('/tmp', `fundza-report-${crypto.randomUUID()}`);
      await fs.writeFile(tempFile, Buffer.from(await blob.arrayBuffer()));
      analysis = await generateUploadedFileJson(prompt, tempFile, job.mime_type, reportSchema);
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

    let documentId = job.document_id;
    if (!documentId) {
      const { data: document, error: documentError } = await supabase.from('documents').insert({
        student_id: job.student_id,
        file_name: job.file_name || 'uploaded-report',
        file_url: job.storage_path || 'text-input',
        file_type: 'report',
        document_date: new Date().toISOString().slice(0, 10),
      }).select('id').single();
      if (documentError) throw documentError;
      documentId = document.id;
    }

    const { error: analysisError } = await supabase.from('document_analyses').insert({
      document_id: documentId,
      student_id: job.student_id,
      overall_summary: analysis.overall_summary,
      subject_analyses: analysis.subjects,
      recommendations: analysis.overall_recommendations,
      aps_estimate: analysis.aps_estimate ?? null,
    });
    if (analysisError) throw analysisError;

    await setJob(jobId, {
      status: 'completed',
      result: analysis,
      document_id: documentId,
      error_message: null,
      error_code: null,
      completed_at: new Date().toISOString(),
    });
  } catch (err: any) {
    const code = err?.code || classifyError(err);
    const retryable = RETRYABLE_CODES.has(code) && attempt < Math.min(Number(job.max_attempts || MAX_ATTEMPTS), MAX_ATTEMPTS);
    const message = publicError(code);
    if (retryable) {
      await setJob(jobId, {
        status: 'retrying',
        error_code: code,
        error_message: message,
        next_retry_at: new Date(Date.now() + backoffMs(attempt)).toISOString(),
      });
      await new Promise(resolve => setTimeout(resolve, backoffMs(attempt)));
      await processAnalysisJob(jobId);
    } else {
      await setJob(jobId, {
        status: 'failed',
        error_code: code,
        error_message: message,
        completed_at: new Date().toISOString(),
      });
    }
  } finally {
    if (tempFile) {
      try { await fs.unlink(tempFile); } catch {}
    }
  }
}
