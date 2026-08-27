import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'AUTH_REQUIRED' }, { status: 401 });

  const { jobId } = await context.params;
  const { data: job, error } = await supabase
    .from('analysis_jobs')
    .select('id,status,file_name,term,result,error_code,error_message,created_at,started_at,heartbeat_at,completed_at,attempt_count,next_retry_at,document_id,updated_at')
    .eq('id', jobId)
    .maybeSingle();

  if (error) return NextResponse.json({ success: false, error: 'STATUS_LOOKUP_FAILED' }, { status: 500 });
  if (!job) return NextResponse.json({ success: false, error: 'JOB_NOT_FOUND' }, { status: 404 });

  const stale = ['processing', 'retrying'].includes(job.status) && job.heartbeat_at
    ? Date.now() - new Date(job.heartbeat_at).getTime() > 3 * 60_000
    : false;

  return NextResponse.json({ success: true, job: { ...job, stale } });
}
