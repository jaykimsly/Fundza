set search_path = public, extensions;
create extension if not exists vector;
create extension if not exists pg_trgm;

alter table public.knowledge_documents add column if not exists subject_code text;
alter table public.knowledge_documents add column if not exists subject_name text;
alter table public.knowledge_documents add column if not exists grade integer;
alter table public.knowledge_documents add column if not exists paper text;
alter table public.knowledge_documents add column if not exists exam_year integer;
alter table public.knowledge_documents add column if not exists exam_session text;
alter table public.knowledge_documents add column if not exists content_hash text;
create unique index if not exists knowledge_documents_content_hash_uidx on public.knowledge_documents(content_hash) where content_hash is not null;

alter table public.knowledge_chunks drop column if exists embedding;
alter table public.knowledge_chunks add column embedding extensions.vector(768);
alter table public.knowledge_chunks add column if not exists token_count integer;
create index if not exists knowledge_chunks_document_idx on public.knowledge_chunks(document_id);
create index if not exists knowledge_chunks_embedding_hnsw_idx on public.knowledge_chunks using hnsw (embedding extensions.vector_cosine_ops) where embedding is not null;
create index if not exists knowledge_documents_subject_grade_idx on public.knowledge_documents(subject_code,grade);

create table if not exists public.subject_aliases (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects_catalog(id) on delete cascade,
  alias text not null,
  normalized_alias text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists subject_aliases_trgm_idx on public.subject_aliases using gin(normalized_alias gin_trgm_ops);

alter table public.subject_aliases enable row level security;
drop policy if exists "Authenticated users can read subject aliases" on public.subject_aliases;
create policy "Authenticated users can read subject aliases" on public.subject_aliases for select to authenticated using(true);
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
drop policy if exists "Authenticated users can read knowledge documents" on public.knowledge_documents;
create policy "Authenticated users can read knowledge documents" on public.knowledge_documents for select to authenticated using(true);
drop policy if exists "Authenticated users can read knowledge chunks" on public.knowledge_chunks;
create policy "Authenticated users can read knowledge chunks" on public.knowledge_chunks for select to authenticated using(true);

drop function if exists public.match_knowledge_chunks(extensions.vector,integer,uuid,uuid,uuid,text);
create or replace function public.match_knowledge_chunks(query_embedding extensions.vector(768),match_count integer default 8,filter_subject_code text default null,filter_grade integer default null)
returns table(id uuid,document_id uuid,content text,metadata jsonb,similarity real,title text,source_type text,subject_code text,subject_name text,grade integer,paper text,exam_year integer,source_name text)
language sql stable set search_path=public,extensions as $$
select kc.id,kc.document_id,kc.content,kc.metadata,(1-(kc.embedding <=> query_embedding))::real,kd.title,kd.source_type,kd.subject_code,kd.subject_name,kd.grade,kd.paper,kd.exam_year,kd.source_name
from public.knowledge_chunks kc join public.knowledge_documents kd on kd.id=kc.document_id
where kc.embedding is not null and coalesce(kc.embedding_status,'ready')='ready' and coalesce(kd.status,'ready')='ready'
 and (filter_subject_code is null or kd.subject_code=filter_subject_code) and (filter_grade is null or kd.grade=filter_grade)
order by kc.embedding <=> query_embedding limit greatest(1,least(match_count,50));
$$;
grant execute on function public.match_knowledge_chunks(extensions.vector(768),integer,text,integer) to authenticated;

do $$
declare r record; n text;
begin
  for r in select sc.id,sc.name from public.subjects_catalog sc group by sc.id,sc.name loop
    n=lower(regexp_replace(r.name,'[^a-zA-Z0-9]+',' ','g'));
    insert into public.subject_aliases(subject_id,alias,normalized_alias) values(r.id,r.name,n) on conflict(normalized_alias) do nothing;
  end loop;
  insert into public.subject_aliases(subject_id,alias,normalized_alias) select sc.id,'English FAL','english fal' from public.subjects_catalog sc where sc.code='ENG_FAL' limit 1 on conflict(normalized_alias) do nothing;
  insert into public.subject_aliases(subject_id,alias,normalized_alias) select sc.id,'English HL','english hl' from public.subjects_catalog sc where sc.code='ENG_HL' limit 1 on conflict(normalized_alias) do nothing;
  insert into public.subject_aliases(subject_id,alias,normalized_alias) select sc.id,'Maths','maths' from public.subjects_catalog sc where sc.code='MATH' limit 1 on conflict(normalized_alias) do nothing;
  insert into public.subject_aliases(subject_id,alias,normalized_alias) select sc.id,'Maths Literacy','maths literacy' from public.subjects_catalog sc where sc.code='MATH_LIT' limit 1 on conflict(normalized_alias) do nothing;
  insert into public.subject_aliases(subject_id,alias,normalized_alias) select sc.id,'LO','lo' from public.subjects_catalog sc where sc.code='LIFE_ORI' limit 1 on conflict(normalized_alias) do nothing;
end $$;
