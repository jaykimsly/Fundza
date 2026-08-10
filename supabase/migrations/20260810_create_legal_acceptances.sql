-- Fundza legal acceptance records
-- Version 1.0
--
-- Stores an auditable record whenever an authenticated user
-- accepts a Fundza legal document.

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  document_type text not null
    check (
      document_type in (
        'terms',
        'privacy',
        'copyright'
      )
    ),

  document_version text not null,

  accepted_at timestamptz not null
    default timezone('utc', now()),

  acceptance_method text not null
    default 'web'
    check (
      acceptance_method in (
        'web',
        'google',
        'email_otp'
      )
    ),

  user_agent text,

  created_at timestamptz not null
    default timezone('utc', now()),

  unique (
    user_id,
    document_type,
    document_version
  )
);

comment on table public.legal_acceptances is
'Records user acceptance of Fundza legal documents and their versions.';

comment on column public.legal_acceptances.document_type is
'Legal document accepted: terms, privacy, or copyright.';

comment on column public.legal_acceptances.document_version is
'Version of the legal document accepted by the user.';

comment on column public.legal_acceptances.accepted_at is
'UTC timestamp at which the user accepted the document.';

comment on column public.legal_acceptances.acceptance_method is
'Authentication/acceptance channel used by the user.';

alter table public.legal_acceptances enable row level security;

drop policy if exists "Users can view their own legal acceptances"
on public.legal_acceptances;

create policy "Users can view their own legal acceptances"
on public.legal_acceptances
for select
to authenticated
using (
  auth.uid() = user_id
);

drop policy if exists "Users can create their own legal acceptances"
on public.legal_acceptances;

create policy "Users can create their own legal acceptances"
on public.legal_acceptances
for insert
to authenticated
with check (
  auth.uid() = user_id
);

drop policy if exists "Users cannot update legal acceptances"
on public.legal_acceptances;

create policy "Users cannot update legal acceptances"
on public.legal_acceptances
for update
to authenticated
using (false)
with check (false);

drop policy if exists "Users cannot delete legal acceptances"
on public.legal_acceptances;

create policy "Users cannot delete legal acceptances"
on public.legal_acceptances
for delete
to authenticated
using (false);

create index if not exists idx_legal_acceptances_user_id
on public.legal_acceptances(user_id);

create index if not exists idx_legal_acceptances_document
on public.legal_acceptances(document_type, document_version);

create index if not exists idx_legal_acceptances_accepted_at
on public.legal_acceptances(accepted_at);
