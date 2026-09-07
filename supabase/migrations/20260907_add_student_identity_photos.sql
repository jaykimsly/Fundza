create table if not exists public.student_identity_photos (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  photo_one_path text not null,
  photo_two_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_identity_photos_student_unique unique (student_id),
  constraint student_identity_photos_paths_distinct check (photo_one_path <> photo_two_path)
);

alter table public.student_identity_photos enable row level security;

drop policy if exists "Students can view their identity photos" on public.student_identity_photos;
drop policy if exists "Students can create their identity photos" on public.student_identity_photos;
drop policy if exists "Students can update their identity photos" on public.student_identity_photos;

create policy "Students can view their identity photos"
on public.student_identity_photos for select to authenticated
using (exists (select 1 from public.students s where s.id = student_identity_photos.student_id and s.auth_user_id = (select auth.uid())));

create policy "Students can create their identity photos"
on public.student_identity_photos for insert to authenticated
with check (exists (select 1 from public.students s where s.id = student_identity_photos.student_id and s.auth_user_id = (select auth.uid())));

create policy "Students can update their identity photos"
on public.student_identity_photos for update to authenticated
using (exists (select 1 from public.students s where s.id = student_identity_photos.student_id and s.auth_user_id = (select auth.uid())))
with check (exists (select 1 from public.students s where s.id = student_identity_photos.student_id and s.auth_user_id = (select auth.uid())));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-identity', 'student-identity', false, 10485760, array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Students can read their identity photos" on storage.objects;
drop policy if exists "Students can upload their identity photos" on storage.objects;
drop policy if exists "Students can replace their identity photos" on storage.objects;
drop policy if exists "Students can delete their identity photos" on storage.objects;

create policy "Students can read their identity photos"
on storage.objects for select to authenticated
using (bucket_id = 'student-identity' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Students can upload their identity photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'student-identity' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Students can replace their identity photos"
on storage.objects for update to authenticated
using (bucket_id = 'student-identity' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'student-identity' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Students can delete their identity photos"
on storage.objects for delete to authenticated
using (bucket_id = 'student-identity' and (storage.foldername(name))[1] = (select auth.uid())::text);
