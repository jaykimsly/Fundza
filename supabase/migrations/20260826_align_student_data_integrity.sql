-- Keep one student profile per authenticated user.
-- Keep one subject assignment per student/subject pair.

-- Remove duplicate student subject rows before adding the unique constraint.
delete from public.student_subjects a
using public.student_subjects b
where a.id > b.id
  and a.student_id = b.student_id
  and a.subject_id = b.subject_id;

-- If duplicate student profiles exist for the same auth user, keep the oldest row.
delete from public.students a
using public.students b
where a.id > b.id
  and a.auth_user_id is not null
  and a.auth_user_id = b.auth_user_id;

create unique index if not exists students_auth_user_id_unique_idx
  on public.students (auth_user_id)
  where auth_user_id is not null;

create unique index if not exists student_subjects_student_subject_unique_idx
  on public.student_subjects (student_id, subject_id);

create index if not exists student_subjects_student_id_idx
  on public.student_subjects (student_id);

create index if not exists student_subjects_subject_id_idx
  on public.student_subjects (subject_id);
