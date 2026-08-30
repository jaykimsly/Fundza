-- Phase 6: exam preparation metadata and safe timetable indexing.
-- The authoritative Grade 12 timetable remains the source of dates/times.
alter table public.exam_timetable
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists source_version text,
  add column if not exists verified_at timestamptz,
  add column if not exists timezone text not null default 'Africa/Johannesburg';

create index if not exists idx_exam_timetable_grade_date
  on public.exam_timetable(grade_number, exam_date, start_time);

create index if not exists idx_exam_timetable_subject_date
  on public.exam_timetable(subject_name, exam_date);
