alter function public.set_analysis_jobs_updated_at()
set search_path = public;

create index if not exists analysis_jobs_recovery_heartbeat_idx
  on public.analysis_jobs(status, heartbeat_at, created_at)
  where status in ('queued','retrying','processing','extracting','validating');
