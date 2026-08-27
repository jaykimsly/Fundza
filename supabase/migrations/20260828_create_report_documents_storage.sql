insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-documents',
  'report-documents',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif','text/plain']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Students can upload their report documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'report-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Students can read their report documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'report-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Students can delete their report documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'report-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
