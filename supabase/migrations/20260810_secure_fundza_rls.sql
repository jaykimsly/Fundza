-- ============================================================
-- FUNDZA SECURITY / RLS
-- Based on the CURRENT live database schema.
-- ============================================================

-- ============================================================
-- HELPER FUNCTION
-- ============================================================

create or replace function public.current_student_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.students
  where auth_user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_student_id() from public;
grant execute on function public.current_student_id() to authenticated;

-- ============================================================
-- STUDENTS
-- ============================================================

alter table public.students enable row level security;

drop policy if exists "Users own their student profile"
on public.students;

create policy "Users own their student profile"
on public.students
for all
to authenticated
using (
  auth_user_id = auth.uid()
)
with check (
  auth_user_id = auth.uid()
);

-- ============================================================
-- STUDENT SUBJECTS
-- ============================================================

alter table public.student_subjects enable row level security;

drop policy if exists "Users own their subjects"
on public.student_subjects;

create policy "Users own their subjects"
on public.student_subjects
for all
to authenticated
using (
  student_id = public.current_student_id()
)
with check (
  student_id = public.current_student_id()
);

-- ============================================================
-- DOCUMENTS
-- ============================================================

alter table public.documents enable row level security;

drop policy if exists "Users own their documents"
on public.documents;

create policy "Users own their documents"
on public.documents
for all
to authenticated
using (
  student_id = public.current_student_id()
)
with check (
  student_id = public.current_student_id()
);

-- ============================================================
-- DOCUMENT ANALYSES
-- ============================================================

alter table public.document_analyses enable row level security;

drop policy if exists "Users own their document analyses"
on public.document_analyses;

create policy "Users own their document analyses"
on public.document_analyses
for all
to authenticated
using (
  student_id = public.current_student_id()
)
with check (
  student_id = public.current_student_id()
);

-- ============================================================
-- ANALYSIS JOBS
-- ============================================================

alter table public.analysis_jobs enable row level security;

drop policy if exists "Users own their jobs"
on public.analysis_jobs;

create policy "Users own their jobs"
on public.analysis_jobs
for all
to authenticated
using (
  student_id = public.current_student_id()
)
with check (
  student_id = public.current_student_id()
);

-- ============================================================
-- EXAMS
-- ============================================================

alter table public.exams enable row level security;

drop policy if exists "Users own their exams"
on public.exams;

create policy "Users own their exams"
on public.exams
for all
to authenticated
using (
  student_id = public.current_student_id()
)
with check (
  student_id = public.current_student_id()
);

-- ============================================================
-- STUDY SESSIONS
-- ============================================================

alter table public.study_sessions enable row level security;

drop policy if exists "Users own their study sessions"
on public.study_sessions;

create policy "Users own their study sessions"
on public.study_sessions
for all
to authenticated
using (
  student_id = public.current_student_id()
)
with check (
  student_id = public.current_student_id()
);

-- ============================================================
-- QUIZ ATTEMPTS
-- ============================================================

alter table public.quiz_attempts enable row level security;

drop policy if exists "Users own their quiz attempts"
on public.quiz_attempts;

create policy "Users own their quiz attempts"
on public.quiz_attempts
for all
to authenticated
using (
  student_id = public.current_student_id()
)
with check (
  student_id = public.current_student_id()
);

-- ============================================================
-- QUIZ ANSWERS
-- ============================================================

alter table public.quiz_answers enable row level security;

drop policy if exists "Users own their quiz answers"
on public.quiz_answers;

create policy "Users own their quiz answers"
on public.quiz_answers
for all
to authenticated
using (
  attempt_id in (
    select qa.id
    from public.quiz_attempts qa
    where qa.student_id = public.current_student_id()
  )
)
with check (
  attempt_id in (
    select qa.id
    from public.quiz_attempts qa
    where qa.student_id = public.current_student_id()
  )
);

-- ============================================================
-- STUDENT PROGRESS
-- ============================================================

alter table public.student_progress enable row level security;

drop policy if exists "Users own their progress"
on public.student_progress;

create policy "Users own their progress"
on public.student_progress
for all
to authenticated
using (
  student_id = public.current_student_id()
)
with check (
  student_id = public.current_student_id()
);

-- ============================================================
-- REFERENCE DATA
-- ============================================================

-- Grades are shared educational reference data.

alter table public.grades enable row level security;

drop policy if exists "Public read grades"
on public.grades;

create policy "Authenticated users can read grades"
on public.grades
for select
to authenticated
using (true);

-- Schools are shared reference data.

alter table public.schools enable row level security;

drop policy if exists "Public read schools"
on public.schools;

create policy "Authenticated users can read schools"
on public.schools
for select
to authenticated
using (true);

-- Subject catalogue is shared reference data.

alter table public.subjects_catalog enable row level security;

drop policy if exists "Public read subjects_catalog"
on public.subjects_catalog;

create policy "Authenticated users can read subjects_catalog"
on public.subjects_catalog
for select
to authenticated
using (true);

-- ============================================================
-- QUESTIONS
-- ============================================================

alter table public.questions enable row level security;

drop policy if exists "Public read questions"
on public.questions;

create policy "Authenticated users can read questions"
on public.questions
for select
to authenticated
using (true);

-- ============================================================
-- QUESTION OPTIONS
-- ============================================================

alter table public.question_options enable row level security;

-- Remove the dangerous development policy.

drop policy if exists "Users can CRUD question options (DEV)"
on public.question_options;

create policy "Authenticated users can read question options"
on public.question_options
for select
to authenticated
using (true);

-- ============================================================
-- TOPICS
-- ============================================================

alter table public.topics enable row level security;

drop policy if exists "Public read topics"
on public.topics;

create policy "Authenticated users can read topics"
on public.topics
for select
to authenticated
using (true);

-- ============================================================
-- AI KNOWLEDGE
-- ============================================================

alter table public.ai_knowledge_base enable row level security;

drop policy if exists "Public read ai_knowledge"
on public.ai_knowledge_base;

create policy "Authenticated users can read ai knowledge"
on public.ai_knowledge_base
for select
to authenticated
using (true);

-- ============================================================
-- IMPORTANT
-- ============================================================
-- No INSERT / UPDATE / DELETE policies exist for:
--
-- schools
-- grades
-- subjects_catalog
-- questions
-- question_options
-- topics
-- ai_knowledge_base
--
-- Normal authenticated users therefore cannot modify
-- shared educational content.
--
-- Service-role/admin processes can still manage these tables.
-- ============================================================
