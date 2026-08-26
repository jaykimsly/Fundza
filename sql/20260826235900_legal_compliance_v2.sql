create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  document_type text not null check (document_type = any (array['terms'::text,'privacy'::text,'copyright'::text,'legal'::text])),
  version text not null,
  title text not null,
  summary text,
  content text not null,
  required boolean not null default true,
  effective_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (document_type, version)
);

alter table public.legal_acceptances drop constraint if exists legal_acceptances_document_type_check;
alter table public.legal_acceptances add constraint legal_acceptances_document_type_check
  check (document_type = any (array['terms'::text,'privacy'::text,'copyright'::text,'legal'::text]));

alter table public.legal_acceptances
  add column if not exists signature_statement text,
  add column if not exists confirmation_email_sent_at timestamptz,
  add column if not exists confirmation_email_message_id text;

create unique index if not exists legal_acceptances_user_document_version_uidx
  on public.legal_acceptances(user_id, document_type, document_version);

alter table public.legal_documents enable row level security;
drop policy if exists "Legal documents are publicly readable" on public.legal_documents;
create policy "Legal documents are publicly readable"
  on public.legal_documents for select to anon, authenticated using (required = true);
grant select on public.legal_documents to anon, authenticated;

insert into public.legal_documents (document_type, version, title, summary, content)
values
('terms','2026.08.26','Terms of Use','Rules for using Fundza and its study features.','Fundza provides educational study tools, planning features, exam information and AI-assisted learning support. You agree to use the service lawfully, provide accurate profile information, protect your account credentials, and not misuse, disrupt, scrape, reverse engineer, or attempt to gain unauthorized access to Fundza or another user’s information. Educational information is provided for study support and does not guarantee admission, examination results, marks, employment, or any other outcome. Fundza may update features, suspend abusive accounts, and revise these terms when necessary. The version shown on the acceptance screen is the version you accept.'),
('privacy','2026.08.26','Privacy Policy','How Fundza handles information needed to provide the service.','Fundza collects information you provide for your profile, school, grade, subjects, study activity, uploaded learning material, and account authentication. We use this information to operate, secure, personalize, improve, and support the service. Access to personal information is restricted by application permissions and database security policies. You may request correction or deletion of personal information where applicable. This notice describes the current Fundza product behaviour and may be updated when the service changes.'),
('copyright','2026.08.26','Copyright Notice','Rules covering Fundza content and user-provided material.','Fundza branding, software, interface design, original content, databases, and other Fundza-owned materials are protected by applicable intellectual-property laws. You may use Fundza for its intended educational purpose but may not reproduce, redistribute, sell, or commercially exploit Fundza-owned material without permission. You remain responsible for having the rights needed to upload material to Fundza and for respecting the copyright and licensing terms attached to third-party material.'),
('legal','2026.08.26','Legal Notice','Important legal and educational-use information.','Fundza is an educational support platform. Information, calculations, recommendations, AI responses, exam schedules, and other materials should be checked against official sources where a high-stakes decision depends on them. Fundza does not replace an official school, examination authority, university, professional adviser, or legal adviser. To the extent permitted by law, Fundza is not responsible for losses arising from reliance on inaccurate, incomplete, delayed, or unavailable information. Nothing in Fundza is intended to unlawfully exclude rights that cannot legally be excluded.')
on conflict (document_type, version) do update set title = excluded.title, summary = excluded.summary, content = excluded.content, required = excluded.required, effective_at = excluded.effective_at;
