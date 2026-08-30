-- Phase 7: CAPS curriculum hierarchy and provenance.
-- Include the earlier topic expansion here as a guard for databases that
-- have not yet applied the older expand_topics_for_caps migration.
alter table public.topics
  add column if not exists grade_number integer,
  add column if not exists term_number integer,
  add column if not exists topic_number integer,
  add column if not exists content text,
  add column if not exists source_document text,
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
