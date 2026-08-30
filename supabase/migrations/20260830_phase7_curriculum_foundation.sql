-- Phase 7: CAPS curriculum hierarchy and provenance.
alter table public.topics
  add column if not exists sub_topic text,
  add column if not exists learning_objective text,
  add column if not exists material text,
  add column if not exists material_type text,
  add column if not exists curriculum_source text,
  add column if not exists curriculum_source_url text,
  add column if not exists curriculum_year integer,
  add column if not exists curriculum_version text,
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists provenance_type text not null default 'curriculum';

create index if not exists idx_topics_grade_term_subject
  on public.topics(grade_number, term_number, subject_id);

create index if not exists idx_topics_verification_status
  on public.topics(verification_status);

alter table public.topics
  drop constraint if exists topics_verification_status_check;

alter table public.topics
  add constraint topics_verification_status_check
  check (verification_status in ('unverified', 'verified', 'needs_review'));
