-- ============================================================
-- FUNDZA: GRADE 12 2026 PREPARATORY EXAMINATION TIMETABLE
-- Mpumalanga Province / Ehlanzeni
-- Source: 2026 Grade 12 Preparatory Examination Timetable Final
-- ============================================================

create table if not exists public.exam_timetable (
  id uuid primary key default gen_random_uuid(),
  grade_number integer not null,
  exam_type text not null default 'preparatory',
  exam_date date not null,
  start_time time not null,
  duration_minutes integer not null,
  session text not null check (session in ('first', 'second')),
  subject_name text not null,
  paper text not null,
  source_document text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),

  constraint exam_timetable_grade_check
    check (grade_number between 10 and 12),
  constraint exam_timetable_duration_check
    check (duration_minutes > 0),
  constraint exam_timetable_unique_paper
    unique (grade_number, exam_type, exam_date, start_time, subject_name, paper)
);

create index if not exists exam_timetable_grade_date_idx
  on public.exam_timetable (grade_number, exam_date, start_time);

create index if not exists exam_timetable_subject_idx
  on public.exam_timetable (subject_name);

alter table public.exam_timetable enable row level security;

drop policy if exists "Anyone can view exam timetable" on public.exam_timetable;
create policy "Anyone can view exam timetable"
on public.exam_timetable
for select
using (true);

insert into public.exam_timetable
  (grade_number, exam_type, exam_date, start_time, duration_minutes, session, subject_name, paper, source_document)
values
  (12, 'preparatory', '2026-08-24', '08:00', 180, 'first',  'Computer Applications Technology', 'Paper 1 Practical', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-08-24', '12:00', 180, 'second', 'History', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-08-25', '08:00', 180, 'first',  'Information Technology', 'Paper 1 Practical', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-08-25', '12:00', 120, 'second', 'Business Studies', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-08-26', '08:00', 180, 'first',  'Home Language', 'Paper 3', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-08-26', '12:00', 180, 'second', 'Music', 'Paper 1 Theory', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-08-27', '08:00', 150, 'first',  'English First Additional Language', 'Paper 3', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-08-27', '08:00', 180, 'first',  'English Home Language', 'Paper 3', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-08-27', '12:00', 180, 'second', 'Design', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-08-28', '08:00', 180, 'first',  'Mathematics', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-08-28', '08:00', 180, 'first',  'Mathematical Literacy', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-08-28', '08:00', 180, 'first',  'Technical Mathematics', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-08-28', '12:00', 180, 'second', 'Afrikaans Home Language', 'Paper 3', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-08-28', '12:00', 150, 'second', 'Afrikaans First Additional Language', 'Paper 3', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-08-28', '12:00', 150, 'second', 'Afrikaans Second Additional Language', 'Paper 3', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-08-31', '08:00', 180, 'first',  'Mathematics', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-08-31', '08:00', 180, 'first',  'Mathematical Literacy', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-08-31', '08:00', 180, 'first',  'Technical Mathematics', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-08-31', '12:00', 180, 'second', 'Visual Arts', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-01', '09:00', 150, 'first',  'Life Orientation', 'Common Assessment Task', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-01', '12:00', 180, 'second', 'Engineering Graphics and Design', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-02', '08:00', 180, 'first',  'Tourism', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-02', '12:00', 120, 'second', 'Afrikaans Home Language', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-02', '12:00', 120, 'second', 'Afrikaans First Additional Language', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-02', '12:00', 120, 'second', 'Afrikaans Second Additional Language', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-03', '08:00', 120, 'first',  'Home Language', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-03', '12:00', 120, 'second', 'Business Studies', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-04', '08:00', 180, 'first',  'Physical Sciences', 'Physics Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-04', '08:00', 180, 'first',  'Technical Sciences', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-04', '12:00', 120, 'second', 'Religion Studies', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-04', '12:00', 180, 'second', 'Agricultural Management Practices', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-07', '08:00', 180, 'first',  'Physical Sciences', 'Chemistry Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-07', '08:00', 150, 'first',  'Technical Sciences', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-07', '12:00', 180, 'second', 'Dramatic Arts', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-07', '12:00', 90, 'second', 'Music', 'Paper 2 Comprehension', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-08', '08:00', 150, 'first',  'Home Language', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-08', '08:00', 120, 'first',  'First Additional Language', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-08', '12:00', 120, 'second', 'English Home Language', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-08', '12:00', 120, 'second', 'English First Additional Language', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-09', '08:00', 150, 'first',  'Life Sciences', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-09', '08:00', 180, 'first',  'Civil Technology', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-09', '12:00', 120, 'second', 'Economics', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-10', '08:00', 180, 'first',  'Geography', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-10', '12:00', 180, 'second', 'Engineering Graphics and Design', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-11', '08:00', 120, 'first',  'Accounting', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-11', '12:00', 120, 'second', 'Religion Studies', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-11', '12:00', 180, 'second', 'Agricultural Technology', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-14', '08:00', 150, 'first',  'Life Sciences', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-14', '08:00', 180, 'first',  'Electrical Technology', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-14', '12:00', 180, 'second', 'History', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-15', '08:00', 150, 'first',  'English Home Language', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-15', '08:00', 150, 'first',  'English First Additional Language', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-15', '08:00', 120, 'first',  'English Second Additional Language', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-15', '12:00', 180, 'second', 'Mechanical Technology', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-15', '12:00', 180, 'second', 'Geography', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-16', '08:00', 150, 'first',  'Agricultural Sciences', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-16', '12:00', 180, 'second', 'Consumer Studies', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-16', '12:00', 180, 'second', 'Hospitality Studies', 'Paper 1', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-17', '08:00', 120, 'first',  'Accounting', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-17', '12:00', 150, 'second', 'Afrikaans Home Language', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-17', '12:00', 120, 'second', 'Afrikaans First Additional Language', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-17', '12:00', 120, 'second', 'Afrikaans Second Additional Language', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-18', '08:00', 150, 'first',  'Agricultural Sciences', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-18', '12:00', 180, 'second', 'Computer Applications Technology', 'Paper 2 Theory', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-21', '08:00', 180, 'first',  'Information Technology', 'Paper 2 Theory', '2026 Grade 12 Preparatory Examination Timetable Final'),
  (12, 'preparatory', '2026-09-21', '12:00', 120, 'second', 'Economics', 'Paper 2', '2026 Grade 12 Preparatory Examination Timetable Final');

comment on table public.exam_timetable is
  'Grade 12 examination timetable imported from the final 2026 Mpumalanga Preparatory Examination timetable. exam_type is preparatory so official NSC dates can be stored separately later.';
