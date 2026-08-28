import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { generateJson, generateUploadedFileJson, isGeminiConfigured, reportExtractionSchema } from '@/lib/ai';
import { resolveSubject } from '@/lib/knowledge';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const REPORT_BUCKET = 'report-documents';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ATTEMPTS = 3;
const RETRYABLE_CODES = new Set(['AI_TIMEOUT','AI_RATE_LIMIT','AI_UNAVAILABLE']);

function classifyError(err: any) {
  const raw = String(err?.message || '').toLowerCase();
  if (raw.includes('timeout') || raw.includes('deadline')) return 'AI_TIMEOUT';
  if (raw.includes('quota') || raw.includes('rate') || raw.includes('429')) return 'AI_RATE_LIMIT';
  if (raw.includes('401') || raw.includes('403') || raw.includes('api key') || raw.includes('unauthorized')) return 'AI_AUTH_ERROR';
  if (raw.includes('503') || raw.includes('unavailable') || raw.includes('high demand') || raw.includes('overloaded')) return 'AI_UNAVAILABLE';
  if (raw.includes('invalid json') || raw.includes('unexpected token') || raw.includes('empty response')) return 'AI_INVALID_RESPONSE';
  return err?.code || 'MODEL_ERROR';
}

function publicError(code: string) {
  switch (code) {
    case 'AI_TIMEOUT': return 'The AI report reader took too long to read the document.';
    case 'AI_RATE_LIMIT': return 'The AI service is busy. Your report is being retried automatically.';
    case 'AI_UNAVAILABLE': return 'The AI service is temporarily unavailable. Your report is being retried automatically.';
    case 'AI_AUTH_ERROR': return 'The AI report reader could not connect to its AI service.';
    case 'DOCUMENT_CONTENT_MISSING': return 'No readable report content was found.';
    case 'NO_SUBJECT_MARKS': return 'The report was received, but no subject marks could be reliably extracted.';
    case 'STORAGE_DOWNLOAD_FAILED': return 'The uploaded report could not be retrieved. Please upload it again.';
    default: return 'The report could not be reliably read. Please upload a clearer report image or PDF.';
  }
}

function backoffMs(attempt: number) { return Math.min(60_000, 5_000 * Math.pow(2, Math.max(0, attempt - 1))); }
async function setJob(jobId: string, patch: Record<string, unknown>) { await getSupabaseAdmin().from('analysis_jobs').update({ ...patch, heartbeat_at: new Date().toISOString() }).eq('id', jobId); }

async function claimJob(jobId: string) {
  const supabase = getSupabaseAdmin();
  const stale = new Date(Date.now() - 2 * 60_000).toISOString();
  const { data } = await supabase.from('analysis_jobs').update({ status:'processing', started_at:new Date().toISOString(), heartbeat_at:new Date().toISOString(), error_message:null, error_code:null })
    .eq('id',jobId).in('status',['queued','retrying']).or(`heartbeat_at.is.null,heartbeat_at.lt.${stale}`)
    .select('id,student_id,user_id,storage_path,mime_type,mode,source_text,file_name,term,attempt_count,max_attempts,document_id').maybeSingle();
  return data;
}

function validateResults(input: any) {
  const rows = Array.isArray(input?.results) ? input.results : [];
  return rows.map((row: any) => ({
    subject_original: String(row?.subject_original || '').trim(),
    mark: typeof row?.mark === 'number' && Number.isFinite(row.mark) ? row.mark : null,
    mark_type: row?.mark_type || 'unknown',
    mark_denominator: typeof row?.mark_denominator === 'number' ? row.mark_denominator : null,
    level: row?.level ? String(row.level) : null,
    source_text: row?.source_text ? String(row.source_text) : null,
    confidence: Math.max(0, Math.min(1, Number(row?.confidence) || 0)),
  })).filter((row: any) => row.subject_original.length > 0 && (row.mark === null || (row.mark >= 0 && row.mark <= Math.max(100, row.mark_denominator || 100))));
}

function percentageFor(row: any): number | null {
  if (row.mark === null) return null;
  if (row.mark_type === 'percentage' || row.mark_type === 'mark_out_of_100') return row.mark;
  if (row.mark_type === 'mark_out_of_other' && row.mark_denominator && row.mark_denominator > 0) return Number(((row.mark / row.mark_denominator) * 100).toFixed(2));
  return null;
}

export async function processAnalysisJob(jobId: string) {
  if (!isGeminiConfigured()) { await setJob(jobId,{status:'failed',error_code:'NO_API_KEY',error_message:'The AI report reader is not configured.',completed_at:new Date().toISOString()}); return; }
  const job = await claimJob(jobId); if (!job) return;
  const supabase = getSupabaseAdmin();
  const attempt = Number(job.attempt_count || 0) + 1;
  await setJob(jobId,{attempt_count:attempt,status:'extracting',started_at:new Date().toISOString()});
  let tempFile: string | null = null;

  try {
    const prompt = `You are Fundza's school report OCR/extraction engine. Your ONLY primary task is to extract the learner's subject results from this report. Do not summarise it. Do not give recommendations. Do not invent values.\n\nIMPORTANT RULES:\n1. Find the table/list containing subjects and marks, percentages, levels or assessment results.\n2. Extract EVERY subject row you can read.\n3. Keep subject_original exactly as printed, except for obvious OCR whitespace cleanup.\n4. Put the numeric result in mark. If it is a percentage, mark_type must be percentage. If it is a mark out of another denominator, preserve that denominator.\n5. Never convert an unknown mark into a guessed percentage.\n6. If a row says Absent or Not Assessed, mark must be null and use the appropriate mark_type.\n7. confidence is your confidence that the subject and mark belong together, from 0 to 1.\n8. source_text should contain the short visible row text that supports the extraction when possible.\n9. Ignore class positions, totals, attendance, fees, conduct and unrelated numbers unless they are part of a subject result.\n10. If the report contains multiple assessment columns, use the final/overall/term result where clearly identified and record the column context in source_text.\n11. If the report is difficult to read, return the rows you can actually verify and add a warning. Never manufacture missing marks.\n${job.term ? `The uploader selected ${job.term}. Use the document's own term when it explicitly states one.` : ''}`;

    let extracted: any;
    if (job.mode === 'text') {
      const content = String(job.source_text || '').trim();
      if (!content) throw Object.assign(new Error('Report text is missing'),{code:'DOCUMENT_CONTENT_MISSING'});
      extracted = await generateJson(`${prompt}\n\nREPORT TEXT:\n${content}`, reportExtractionSchema);
    } else {
      if (!job.storage_path || !job.mime_type) throw Object.assign(new Error('Report storage reference is missing'),{code:'INVALID_FILE'});
      const { data: blob, error } = await supabase.storage.from(REPORT_BUCKET).download(job.storage_path);
      if (error || !blob) throw Object.assign(new Error('Storage download failed'),{code:'STORAGE_DOWNLOAD_FAILED'});
      if (blob.size > MAX_FILE_SIZE) throw Object.assign(new Error('Report is too large'),{code:'FILE_TOO_LARGE'});
      tempFile = path.join('/tmp',`fundza-report-${crypto.randomUUID()}`);
      await fs.writeFile(tempFile,Buffer.from(await blob.arrayBuffer()));
      extracted = await generateUploadedFileJson(prompt,tempFile,job.mime_type,reportExtractionSchema);
    }

    const results = validateResults(extracted);
    if (!results.length) throw Object.assign(new Error('No subject marks found'),{code:'NO_SUBJECT_MARKS'});
    await setJob(jobId,{status:'validating'});

    const matchedResults = [];
    for (const result of results) {
      let match: any = null;
      try { match = await resolveSubject(result.subject_original); } catch (e) { console.warn('Subject matching failed',result.subject_original,e); }
      const percentage = percentageFor(result);
      matchedResults.push({
        name: result.subject_original,
        subject_original: result.subject_original,
        percentage,
        mark: result.mark,
        mark_type: result.mark_type,
        mark_denominator: result.mark_denominator,
        level: result.level,
        comment: null,
        source_text: result.source_text,
        confidence: result.confidence,
        subject_id: match?.id ?? null,
        subject_code: match?.code ?? null,
        normalized_subject_name: match?.name ?? null,
        subject_match_confidence: match?.confidence ?? 0,
        weak_topics: [],
        strong_topics: [],
      });
    }

    const numericPercentages = matchedResults.map((r: any) => r.percentage).filter((v: any): v is number => typeof v === 'number' && v >= 0 && v <= 100);
    const overallAverage = numericPercentages.length ? Number((numericPercentages.reduce((a:number,b:number)=>a+b,0) / numericPercentages.length).toFixed(2)) : null;
    const finalResult = {
      learner_name: extracted.learner_name ?? null,
      student_name: extracted.learner_name ?? null,
      school_name: extracted.school_name ?? null,
      grade: extracted.grade ?? null,
      term: extracted.term ?? job.term ?? null,
      subjects: matchedResults,
      results: matchedResults,
      overall_average: overallAverage,
      subjects_passed: null,
      subjects_failed: null,
      overall_summary: null,
      teacher_comments: [],
      overall_recommendations: [],
      extraction_warnings: Array.isArray(extracted.extraction_warnings) ? extracted.extraction_warnings : [],
      extracted_at: new Date().toISOString(),
    };

    await setJob(jobId,{status:'completed',result:finalResult,error_message:null,error_code:null,completed_at:new Date().toISOString()});
  } catch (err:any) {
    const code = classifyError(err);
    const retryable = RETRYABLE_CODES.has(code) && attempt < Math.min(Number(job.max_attempts || MAX_ATTEMPTS),MAX_ATTEMPTS);
    if (retryable) { await setJob(jobId,{status:'retrying',error_code:code,error_message:publicError(code),next_retry_at:new Date(Date.now()+backoffMs(attempt)).toISOString()}); return; }
    await setJob(jobId,{status:'failed',error_code:code,error_message:publicError(code),completed_at:new Date().toISOString()});
  } finally { if (tempFile) { try { await fs.unlink(tempFile); } catch {} } }
}
