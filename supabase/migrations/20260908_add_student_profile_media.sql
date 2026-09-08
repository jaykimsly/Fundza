create table if not exists public.student_profile_media (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  avatar_path text,
  background_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_profile_media_student_unique unique (student_id),
  constraint student_profile_media_has_media check (avatar_path is not null or background_path is not null)
);

alter table public.student_profile_media enable row level security;

drop policy if exists "Students can view their profile media" on public.student_profile_media;
drop policy if exists "Students can create their profile media" on public.student_profile_media;
drop policy if exists "Students can update their profile media" on public.student_profile_media;
drop policy if exists "Students can delete their profile media" on public.student_profile_media;

create policy "Students can view their profile media"
on public.student_profile_media for select to authenticated
using (
  exists (
    select 1 from public.students s
    where s.id = student_profile_media.student_id
      and s.auth_user_id = (select auth.uid())
  )
);

create policy "Students can create their profile media"
on public.student_profile_media for insert to authenticated
with check (
  exists (
    select 1 from public.students s
    where s.id = student_profile_media.student_id
      and s.auth_user_id = (select auth.uid())
  )
);

create policy "Students can update their profile media"
on public.student_profile_media for update to authenticated
using (
  exists (
    select 1 from public.students s
    where s.id = student_profile_media.student_id
      and s.auth_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.students s
    where s.id = student_profile_media.student_id
      and s.auth_user_id = (select auth.uid())
  )
);

create policy "Students can delete their profile media"
on public.student_profile_media for delete to authenticated
using (
  exists (
    select 1 from public.students s
    where s.id = student_profile_media.student_id
      and s.auth_user_id = (select auth.uid())
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-identity',
  'student-identity',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set file_size_limit = greatest(storage.buckets.file_size_limit, excluded.file_size_limit),
    allowed_mime_types = excluded.allowed_mime_types,
    public = false;

drop policy if exists "Students can read their profile media" on storage.objects;
drop policy if exists "Students can upload their profile media" on storage.objects;
drop policy if exists "Students can replace their profile media" on storage.objects;
drop policy if exists "Students can delete their profile media" on storage.objects;

create policy "Students can read their profile media"
on storage.objects for select to authenticated
using (
  bucket_id = 'student-identity'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'profile'
);

create policy "Students can upload their profile media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'student-identity'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'profile'
);

create policy "Students can replace their profile media"
on storage.objects for update to authenticated
using (
  bucket_id = 'student-identity'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'profile'
)
with check (
  bucket_id = 'student-identity'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'profile'
);

create policy "Students can delete their profile media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'student-identity'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'profile'
);
