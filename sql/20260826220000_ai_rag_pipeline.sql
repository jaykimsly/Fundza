create extension if not exists vector;
create extension if not exists pg_trgm;

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text not null check (source_type in ('school_report','exam_paper','curriculum','exam_timetable','other')),
  subject_code text,
  subject_name text,
  grade integer,
  paper text,
  exam_year integer,
  exam_session text,
  source_name text,
  content_hash text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_count integer,
  embedding vector(768),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);

create index if not exists knowledge_chunks_document_idx on public.knowledge_chunks(document_id);
create index if not exists knowledge_chunks_embedding_hnsw_idx
  on public.knowledge_chunks using hnsw (embedding vector_cosine_ops)
  where embedding is not null;
create index if not exists knowledge_documents_subject_grade_idx
  on public.knowledge_documents(subject_code, grade);

create table if not exists public.subject_aliases (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects_catalog(id) on delete cascade,
  alias text not null,
  normalized_alias text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists subject_aliases_trgm_idx
  on public.subject_aliases using gin (normalized_alias gin_trgm_ops);

alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.subject_aliases enable row level security;

drop policy if exists "Authenticated users can read knowledge documents" on public.knowledge_documents;
create policy "Authenticated users can read knowledge documents"
  on public.knowledge_documents for select to authenticated using (true);

drop policy if exists "Authenticated users can read knowledge chunks" on public.knowledge_chunks;
create policy "Authenticated users can read knowledge chunks"
  on public.knowledge_chunks for select to authenticated using (true);

drop policy if exists "Authenticated users can read subject aliases" on public.subject_aliases;
create policy "Authenticated users can read subject aliases"
  on public.subject_aliases for select to authenticated using (true);

create or replace function public.match_knowledge_chunks(
  query_embedding vector(768),
  match_count integer default 8,
  filter_subject_code text default null,
  filter_grade integer default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity real,
  title text,
  source_type text,
  subject_code text,
  subject_name text,
  grade integer,
  paper text,
  exam_year integer,
  source_name text
)
language sql
stable
set search_path = public
as $$
  select
    kc.id,
    kc.document_id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) as similarity,
    kd.title,
    kd.source_type,
    kd.subject_code,
    kd.subject_name,
    kd.grade,
    kd.paper,
    kd.exam_year,
    kd.source_name
  from public.knowledge_chunks kc
  join public.knowledge_documents kd on kd.id = kc.document_id
  where kc.embedding is not null
    and (filter_subject_code is null or kd.subject_code = filter_subject_code)
    and (filter_grade is null or kd.grade = filter_grade)
  order by kc.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_knowledge_chunks(vector(768), integer, text, integer) to authenticated;

do $$
declare
  english_fal uuid;
  english_hl uuid;
  maths uuid;
  math_lit uuid;
  life_ori uuid;
  phys_sci uuid;
  life_sci uuid;
  accounting uuid;
  business uuid;
  geography uuid;
  history uuid;
  cat uuid;
  it uuid;
begin
  select id into english_fal from public.subjects_catalog where code='ENG_FAL' limit 1;
  select id into english_hl from public.subjects_catalog where code='ENG_HL' limit 1;
  select id into maths from public.subjects_catalog where code='MATH' limit 1;
  select id into math_lit from public.subjects_catalog where code='MATH_LIT' limit 1;
  select id into life_ori from public.subjects_catalog where code='LIFE_ORI' limit 1;
  select id into phys_sci from public.subjects_catalog where code='PHYS_SCI' limit 1;
  select id into life_sci from public.subjects_catalog where code='LIFE_SCI' limit 1;
  select id into accounting from public.subjects_catalog where code='ACCOUNT' limit 1;
  select id into business from public.subjects_catalog where code='BUS' limit 1;
  select id into geography from public.subjects_catalog where code='GEO' limit 1;
  select id into history from public.subjects_catalog where code='HIST' limit 1;
  select id into cat from public.subjects_catalog where code='CAT' limit 1;
  select id into it from public.subjects_catalog where code='IT' limit 1;

  if english_fal is not null then
    insert into public.subject_aliases(subject_id,alias,normalized_alias) values
      (english_fal,'English FAL','english fal'),
      (english_fal,'English First Additional Language','english first additional language'),
      (english_fal,'English 1st Additional Language','english 1st additional language')
    on conflict (normalized_alias) do nothing;
  end if;
  if english_hl is not null then
    insert into public.subject_aliases(subject_id,alias,normalized_alias) values
      (english_hl,'English HL','english hl'),
      (english_hl,'English Home Language','english home language')
    on conflict (normalized_alias) do nothing;
  end if;
  if maths is not null then
    insert into public.subject_aliases(subject_id,alias,normalized_alias) values
      (maths,'Maths','maths'),(maths,'Math','math'),(maths,'Mathematics','mathematics')
    on conflict (normalized_alias) do nothing;
  end if;
  if math_lit is not null then
    insert into public.subject_aliases(subject_id,alias,normalized_alias) values
      (math_lit,'Maths Literacy','maths literacy'),(math_lit,'Math Literacy','math literacy'),(math_lit,'Mathematical Literacy','mathematical literacy')
    on conflict (normalized_alias) do nothing;
  end if;
  if life_ori is not null then
    insert into public.subject_aliases(subject_id,alias,normalized_alias) values
      (life_ori,'Life Orientation','life orientation'),(life_ori,'LO','lo')
    on conflict (normalized_alias) do nothing;
  end if;
  if phys_sci is not null then
    insert into public.subject_aliases(subject_id,alias,normalized_alias) values
      (phys_sci,'Physical Sciences','physical sciences'),(phys_sci,'Physical Science','physical science')
    on conflict (normalized_alias) do nothing;
  end if;
  if life_sci is not null then
    insert into public.subject_aliases(subject_id,alias,normalized_alias) values
      (life_sci,'Life Sciences','life sciences'),(life_sci,'Life Science','life science')
    on conflict (normalized_alias) do nothing;
  end if;
  if accounting is not null then
    insert into public.subject_aliases(subject_id,alias,normalized_alias) values
      (accounting,'Accounting','accounting') on conflict (normalized_alias) do nothing;
  end if;
  if business is not null then
    insert into public.subject_aliases(subject_id,alias,normalized_alias) values
      (business,'Business Studies','business studies'),(business,'Business','business') on conflict (normalized_alias) do nothing;
  end if;
  if geography is not null then
    insert into public.subject_aliases(subject_id,alias,normalized_alias) values
      (geography,'Geography','geography') on conflict (normalized_alias) do nothing;
  end if;
  if history is not null then
    insert into public.subject_aliases(subject_id,alias,normalized_alias) values
      (history,'History','history') on conflict (normalized_alias) do nothing;
  end if;
  if cat is not null then
    insert into public.subject_aliases(subject_id,alias,normalized_alias) values
      (cat,'Computer Applications Technology','computer applications technology'),(cat,'CAT','cat') on conflict (normalized_alias) do nothing;
  end if;
  if it is not null then
    insert into public.subject_aliases(subject_id,alias,normalized_alias) values
      (it,'Information Technology','information technology'),(it,'IT','it') on conflict (normalized_alias) do nothing;
  end if;
end $$;
