create table if not exists public.deela_books_membership_tiers (
  id integer primary key default 1 check (id = 1),
  tiers jsonb not null default '{"day":["profile_glow","display_name_style"],"week":["profile_glow","display_name_style","profile_avatar","avatar_frame","book_frame"],"month":["profile_glow","display_name_style","profile_avatar","avatar_frame","book_frame","verified_badge","book_shine","custom_banner","advanced_analytics","priority_support"]}'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.deela_books_membership_tiers enable row level security;
insert into public.deela_books_membership_tiers (id) values (1) on conflict (id) do nothing;