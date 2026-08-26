-- Keep one student profile per authenticated user.
-- Keep one subject assignment per student/subject pair.

-- Remove duplicate subject assignments before adding the unique constraint.
delete from public.student_subjects a
using public.student_subjects b
where a.id > b.id
  and a.student_id = b.student_id
  and a.subject_id = b.subject_id;

-- Duplicate student profiles must be resolved before this migration is applied.
-- The trial database is expected to be clean. Failing here is safer than deleting
-- a student's related records without an explicit migration decision.
do $$
begin
  if exists (
    select 1
    from public.students
    where auth_user_id is not null
    group by auth_user_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate students.auth_user_id values exist. Clean those profiles before applying the Fundza integrity migration.';
  end if;
end $$;

create unique index if not exists students_auth_user_id_unique_idx
  on public.students (auth_user_id)
  where auth_user_id is not null;

create unique index if not exists student_subjects_student_subject_unique_idx
  on public.student_subjects (student_id, subject_id);

create index if not exists student_subjects_student_id_idx
  on public.student_subjects (student_id);

create index if not exists student_subjects_subject_id_idx
  on public.student_subjects (subject_id);
