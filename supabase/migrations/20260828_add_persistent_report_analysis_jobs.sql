alter table public.analysis_jobs
  add column if not exists user_id uuid,
  add column if not exists storage_path text,
  add column if not exists mime_type text,
  add column if not exists mode text,
  add column if not exists document_id uuid,
  add column if not exists source_text text,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 3,
  add column if not exists started_at timestamptz,
  add column if not exists heartbeat_at timestamptz,
  add column if not exists next_retry_at timestamptz,
  add column if not exists error_code text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists idempotency_key text;

create index if not exists analysis_jobs_student_created_idx on public.analysis_jobs(student_id, created_at desc);
create index if not exists analysis_jobs_status_retry_idx on public.analysis_jobs(status, next_retry_at);
create unique index if not exists analysis_jobs_idempotency_key_idx on public.analysis_jobs(idempotency_key) where idempotency_key is not null;

alter table public.analysis_jobs enable row level security;

drop policy if exists "Students can read their analysis jobs" on public.analysis_jobs;
create policy "Students can read their analysis jobs" on public.analysis_jobs for select to authenticated using (exists (select 1 from public.students s where s.id = analysis_jobs.student_id and s.auth_user_id = (select auth.uid())));

drop policy if exists "Students can create their analysis jobs" on public.analysis_jobs;
create policy "Students can create their analysis jobs" on public.analysis_jobs for insert to authenticated with check (exists (select 1 from public.students s where s.id = analysis_jobs.student_id and s.auth_user_id = (select auth.uid())));

drop policy if exists "Students can update their analysis jobs" on public.analysis_jobs;
create policy "Students can update their analysis jobs" on public.analysis_jobs for update to authenticated using (exists (select 1 from public.students s where s.id = analysis_jobs.student_id and s.auth_user_id = (select auth.uid()))) with check (exists (select 1 from public.students s where s.id = analysis_jobs.student_id and s.auth_user_id = (select auth.uid())));

create or replace function public.set_analysis_jobs_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists analysis_jobs_updated_at on public.analysis_jobs;
create trigger analysis_jobs_updated_at before update on public.analysis_jobs for each row execute function public.set_analysis_jobs_updated_at();

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'analysis_jobs') then
    alter publication supabase_realtime add table public.analysis_jobs;
  end if;
end $$;
