-- Phase 5: progress and mastery foundations.
-- Keep the raw quiz history and materialized student_progress record aligned.
alter table public.student_progress
  add column if not exists last_score integer,
  add column if not exists best_percentage integer not null default 0,
  add column if not exists average_percentage numeric(5,2) not null default 0,
  add column if not exists current_streak integer not null default 0,
  add column if not exists confidence numeric(5,2) not null default 0;

create index if not exists idx_student_progress_student_topic
  on public.student_progress(student_id, topic_id);

create index if not exists idx_student_progress_student_last_attempted
  on public.student_progress(student_id, last_attempted desc);

-- Prevent duplicate topic progress rows for the same learner.
create unique index if not exists uq_student_progress_student_topic
  on public.student_progress(student_id, topic_id)
  where topic_id is not null;
