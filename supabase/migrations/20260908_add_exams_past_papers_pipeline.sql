alter table public.papers
  add column if not exists catalog_subject_id uuid references public.subjects_catalog(id),
  add column if not exists paper_number integer,
  add column if not exists language text,
  add column if not exists session text,
  add column if not exists paper_url text,
  add column if not exists source_page_url text,
  add column if not exists duration_minutes integer,
  add column if not exists source_key text;

create unique index if not exists papers_exam_source_key_unique on public.papers(source_key) where source_key is not null;
create index if not exists papers_exam_catalog_subject_idx on public.papers(catalog_subject_id, grade_id, year desc);

create table if not exists public.paper_memos (
  id uuid default gen_random_uuid() primary key,
  paper_id uuid not null references public.papers(id) on delete cascade,
  language text not null default '',
  memo_url text not null,
  storage_path text,
  extracted_text text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','verified','rejected')),
  source_name text not null default 'DBE',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (paper_id, language)
);

alter table public.question_answers add column if not exists paper_memo_id uuid references public.paper_memos(id) on delete set null;
create unique index if not exists question_answers_question_unique on public.question_answers(question_id);
alter table public.questions add column if not exists question_order integer;
create index if not exists questions_source_paper_order_idx on public.questions(source_paper_id, question_order);

create table if not exists public.exam_attempts (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  paper_id uuid not null references public.papers(id) on delete cascade,
  mode text not null check (mode in ('take','prep','practice','review')),
  status text not null default 'in_progress' check (status in ('in_progress','submitted','abandoned')),
  started_at timestamptz not null default timezone('utc'::text, now()),
  submitted_at timestamptz,
  score_marks numeric(8,2), total_marks numeric(8,2), percentage numeric(5,2),
  created_at timestamptz not null default timezone('utc'::text, now()), updated_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists exam_attempts_student_idx on public.exam_attempts(student_id, created_at desc);
create index if not exists exam_attempts_paper_idx on public.exam_attempts(paper_id, created_at desc);

create table if not exists public.exam_attempt_answers (
  id uuid default gen_random_uuid() primary key,
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  response_text text, selected_option text, awarded_marks numeric(8,2), is_correct boolean, feedback text,
  answered_at timestamptz not null default timezone('utc'::text, now()),
  unique(attempt_id, question_id)
);
create index if not exists exam_attempt_answers_attempt_idx on public.exam_attempt_answers(attempt_id);

alter table public.paper_memos enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_attempt_answers enable row level security;
alter table public.question_answers enable row level security;

create policy "Authenticated users can read approved paper memos" on public.paper_memos for select to authenticated using (
  exists (select 1 from public.papers p where p.id = paper_memos.paper_id and p.visibility = 'fundza' and p.sharing_status = 'approved' and p.review_status = 'verified')
);
create policy "Students can read own exam attempts" on public.exam_attempts for select to authenticated using (student_id = current_student_id());
create policy "Students can read own exam attempt answers" on public.exam_attempt_answers for select to authenticated using (
  exists (select 1 from public.exam_attempts a where a.id = exam_attempt_answers.attempt_id and a.student_id = current_student_id())
);
