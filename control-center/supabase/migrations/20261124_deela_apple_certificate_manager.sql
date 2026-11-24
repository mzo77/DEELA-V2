-- DEELA Apple certificate management (owner-only). Applied to production on 2026-11-24.
-- This file is for reproducibility; do not place P12/P8 secrets or passwords here.
create table if not exists public.deela_apple_signing_groups (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 2 and 100),
  method text not null check (method in ('ad_hoc','licensed_provider')),
  provider_name text not null default 'Apple Developer' check (length(provider_name) between 2 and 100),
  team_id text check (team_id is null or length(team_id) between 2 and 32),
  certificate_serial text check (certificate_serial is null or length(certificate_serial) between 2 and 120),
  certificate_expires_at timestamptz,
  device_limit integer not null default 100 check (device_limit between 1 and 100),
  p12_storage_path text,
  profile_storage_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_hoc_team_required check (method <> 'ad_hoc' or team_id is not null)
);
create table if not exists public.deela_apple_device_enrollments (
  id uuid primary key default gen_random_uuid(),
  signing_group_id uuid not null references public.deela_apple_signing_groups(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  device_name text not null check (length(btrim(device_name)) between 2 and 100),
  udid text not null check (udid ~ '^([A-Fa-f0-9]{40}|[A-Fa-f0-9]{8}-[A-Fa-f0-9]{16})$'),
  state text not null default 'pending' check (state in ('pending','apple_registered','registration_failed')),
  apple_device_id text,
  registered_at timestamptz,
  last_error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(signing_group_id,udid)
);
create index if not exists deela_apple_device_enrollments_user_idx on public.deela_apple_device_enrollments(user_id);
create index if not exists deela_apple_device_enrollments_group_idx on public.deela_apple_device_enrollments(signing_group_id,created_at desc);
alter table public.deela_apple_signing_groups enable row level security;
alter table public.deela_apple_device_enrollments enable row level security;
revoke all on public.deela_apple_signing_groups from anon,authenticated;
revoke all on public.deela_apple_device_enrollments from anon,authenticated;
grant select,insert,update,delete on public.deela_apple_signing_groups to service_role;
grant select,insert,update,delete on public.deela_apple_device_enrollments to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('deela-apple-signing-private','deela-apple-signing-private',false,4194304,array['application/octet-stream','application/x-pkcs12','application/x-apple-aspen-config','application/pkcs7-mime'])
on conflict(id) do nothing;
