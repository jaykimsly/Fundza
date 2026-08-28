import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { processAnalysisJob } from '@/lib/report-analysis-worker';

export const runtime = 'nodejs';
export const maxDuration = 300;

const REPORT_BUCKET = 'report-documents';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif']);

function fail(error: string, code: string, status: number) { return NextResponse.json({ success: false, error, code }, { status }); }

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail('Please sign in before analysing a report.', 'AUTH_REQUIRED', 401);
    let body: any;
    try { body = await request.json(); } catch { return fail('The report request could not be read.', 'INVALID_REQUEST', 400); }
    const { storagePath, mimeType, content, term, mode, studentId, fileName } = body || {};
    if (!studentId) return fail('Your learner profile could not be identified.', 'INVALID_REQUEST', 400);
    const { data: student } = await supabase.from('students').select('id,auth_user_id,grade').eq('id', studentId).maybeSingle();
    if (!student || student.auth_user_id !== user.id) return fail('This report does not belong to the signed-in learner.', 'ACCESS_DENIED', 403);
    if (mode === 'text') {
      const safeContent = String(content || '').trim();
      if (!safeContent) return fail('The report did not contain readable text.', 'DOCUMENT_CONTENT_MISSING', 400);
      if (safeContent.length > 100000) return fail('The pasted report is too long.', 'DOCUMENT_TOO_LARGE', 413);
    } else {
      if (!storagePath || !ALLOWED_MIME_TYPES.has(String(mimeType || ''))) return fail('The uploaded report is missing or has an unsupported file type.', 'INVALID_FILE', 400);
      if (!String(storagePath).startsWith(`${user.id}/`)) return fail('The uploaded report could not be verified for this learner.', 'ACCESS_DENIED', 403);
      const { data: blob, error } = await supabase.storage.from(REPORT_BUCKET).download(storagePath);
      if (error || !blob) return fail('The uploaded report could not be retrieved. Please upload it again.', 'STORAGE_DOWNLOAD_FAILED', 502);
      if (blob.size > MAX_FILE_SIZE) return fail('The report is too large. The maximum supported size is 10MB.', 'FILE_TOO_LARGE', 413);
    }
    const id = crypto.randomUUID();
    const idempotencyKey = `${user.id}:${studentId}:${storagePath || `text:${crypto.createHash('sha256').update(String(content || '').trim()).digest('hex')}`}`;
    const { data: existing } = await supabase.from('analysis_jobs').select('id,status,result,error_code,error_message,file_name,term,created_at,updated_at').eq('idempotency_key', idempotencyKey).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (existing) {
      if (['queued','processing','extracting','validating','retrying','completed'].includes(existing.status)) {
        return NextResponse.json({ success: true, queued: false, job: existing });
      }
      if (existing.status === 'failed') {
        const { data: retried, error: retryError } = await supabase.from('analysis_jobs')
          .update({ status:'queued', result:null, error_code:null, error_message:null, attempt_count:0, next_retry_at:null, started_at:null, heartbeat_at:null, completed_at:null, file_name:fileName || existing.file_name || 'uploaded-report', term:term || existing.term || null })
          .eq('id', existing.id)
          .eq('status', 'failed')
          .select('id,status,result,error_code,error_message,file_name,term,created_at,updated_at')
          .maybeSingle();
        if (retryError || !retried) return fail('The failed report could not be queued for retry.', 'JOB_RETRY_FAILED', 500);
        after(async () => { try { await processAnalysisJob(retried.id); } catch (error) { console.error('Background report retry failed:', error); } });
        return NextResponse.json({ success:true, queued:true, retried:true, job:retried }, { status:202 });
      }
    }
    const { data: job, error: insertError } = await supabase.from('analysis_jobs').insert({ id, student_id: studentId, user_id: user.id, status:'queued', file_name:fileName || 'uploaded-report', term:term || null, storage_path:storagePath || null, mime_type:mimeType || null, mode:mode || 'file', source_text:mode === 'text' ? String(content || '') : null, attempt_count:0, max_attempts:3, idempotency_key:idempotencyKey }).select('id,status,file_name,term,created_at,updated_at').single();
    if (insertError || !job) { console.error('Analysis job creation failed:', insertError); return fail('The report could not be queued for analysis.', 'JOB_CREATE_FAILED', 500); }
    after(async () => { try { await processAnalysisJob(job.id); } catch (error) { console.error('Background report analysis failed:', error); } });
    return NextResponse.json({ success:true, queued:true, job }, { status:202 });
  } catch (err) { console.error('Analyze queue error:', err); return fail('The report could not be queued for analysis. Please try again.', 'QUEUE_ERROR', 500); }
}
