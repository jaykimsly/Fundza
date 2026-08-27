import { NextRequest, NextResponse } from 'next/server';
import { processAnalysisJob } from '@/lib/report-analysis-worker';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const secret = process.env.ANALYSIS_WORKER_SECRET || process.env.CRON_SECRET;
  const supplied = request.headers.get('x-analysis-worker-secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!secret || supplied !== secret) return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const jobId = body?.jobId as string | undefined;

  if (jobId) {
    await processAnalysisJob(jobId);
    return NextResponse.json({ success: true, processed: jobId });
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data: jobs } = await supabase
    .from('analysis_jobs')
    .select('id')
    .in('status', ['queued', 'retrying'])
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .order('created_at', { ascending: true })
    .limit(5);

  for (const job of jobs || []) await processAnalysisJob(job.id);
  return NextResponse.json({ success: true, processed: (jobs || []).map(j => j.id) });
}
