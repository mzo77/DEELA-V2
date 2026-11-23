-- Only the owner-facing Edge Function with the service role can access these tables.
-- A first scan seeds the baseline; later higher versions become unpublished candidates.
create table if not exists public.deela_source_inventory (
  source text not null, app_key text not null, title text not null,
  version text not null, page_url text, icon_url text,
  pending_version text, last_published_version text,
  scanned_at timestamptz not null default now(),
  primary key(source,app_key)
);
create index if not exists deela_source_inventory_pending_idx
  on public.deela_source_inventory (scanned_at desc) where pending_version is not null;
create table if not exists public.deela_published_source_updates (
  source text not null, app_key text not null, title text not null,
  version text not null, page_url text, icon_url text,
  published_at timestamptz not null default now(),
  primary key(source,app_key)
);
create index if not exists deela_published_source_updates_when_idx
  on public.deela_published_source_updates (published_at desc);
alter table public.deela_source_inventory enable row level security;
alter table public.deela_published_source_updates enable row level security;
revoke all on public.deela_source_inventory from anon,authenticated;
revoke all on public.deela_published_source_updates from anon,authenticated;
grant select,insert,update,delete on public.deela_source_inventory to service_role;
grant select,insert,update,delete on public.deela_published_source_updates to service_role;
