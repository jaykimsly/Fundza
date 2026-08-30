-- Phase 8: knowledge/document provenance and review state.
alter table public.knowledge_documents
  add column if not exists source_url text,
  add column if not exists source_published_at timestamptz,
  add column if not exists curriculum_year integer,
  add column if not exists curriculum_version text,
  add column if not exists provenance_type text not null default 'other',
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by text;

alter table public.knowledge_chunks
  add column if not exists provenance_type text not null default 'other',
  add column if not exists verification_status text not null default 'unverified';

alter table public.ai_knowledge_base
  add column if not exists provenance_type text not null default 'other',
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists source_url text,
  add column if not exists curriculum_version text;

create index if not exists idx_knowledge_documents_grade_subject
  on public.knowledge_documents(grade, subject_code);

create index if not exists idx_knowledge_documents_verification
  on public.knowledge_documents(verification_status);

create index if not exists idx_knowledge_chunks_verification
  on public.knowledge_chunks(verification_status);
