alter table public.deela_books_sellers
  add column if not exists seller_package text not null default 'free'
    check (seller_package in ('free','plus','pro')),
  add column if not exists seller_package_rank smallint not null default 0
    check (seller_package_rank between 0 and 2),
  add column if not exists seller_package_expires_at timestamptz;

alter table public.deela_books_listings
  add column if not exists promotion_rank smallint not null default 0
    check (promotion_rank between 0 and 3),
  add column if not exists promotion_ends_at timestamptz;

create table if not exists public.deela_books_seller_subscription_requests (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.deela_books_sellers(id) on delete cascade,
  tier_key text not null check (tier_key in ('plus','pro')),
  term_key text not null check (term_key in ('month','quarter','half_year','year')),
  price_sar numeric(10,2) not null check (price_sar between 0 and 10000),
  status text not null default 'pending'
    check (status in ('pending','active','rejected','cancelled','expired')),
  payment_status text not null default 'awaiting_confirmation'
    check (payment_status in ('awaiting_confirmation','confirmed','not_required')),
  requested_at timestamptz not null default now(),
  starts_at timestamptz,
  ends_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deela_books_promotion_requests (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.deela_books_sellers(id) on delete cascade,
  listing_id uuid not null references public.deela_books_listings(id) on delete cascade,
  plan_key text not null check (plan_key in ('day','week','month')),
  price_sar numeric(10,2) not null check (price_sar between 0 and 10000),
  status text not null default 'pending'
    check (status in ('pending','active','rejected','cancelled','expired')),
  payment_status text not null default 'awaiting_confirmation'
    check (payment_status in ('awaiting_confirmation','confirmed','not_required')),
  requested_at timestamptz not null default now(),
  starts_at timestamptz,
  ends_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  promotion_id uuid references public.deela_books_promotions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.deela_books_seller_subscription_requests enable row level security;
alter table public.deela_books_promotion_requests enable row level security;
revoke all on public.deela_books_seller_subscription_requests from anon, authenticated;
revoke all on public.deela_books_promotion_requests from anon, authenticated;
grant all on public.deela_books_seller_subscription_requests to service_role;
grant all on public.deela_books_promotion_requests to service_role;

create index if not exists deela_books_seller_package_rank_idx
  on public.deela_books_sellers (seller_package_rank desc, created_at desc);
create index if not exists deela_books_listing_promotion_rank_idx
  on public.deela_books_listings (promotion_rank desc, created_at desc);
create index if not exists deela_books_seller_subscription_requests_status_idx
  on public.deela_books_seller_subscription_requests (status, requested_at desc);
create index if not exists deela_books_promotion_requests_status_idx
  on public.deela_books_promotion_requests (status, requested_at desc);

create or replace function public.deela_activate_seller_package(p_request_id uuid, p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to 'public' as $function$
declare
  r public.deela_books_seller_subscription_requests%rowtype;
  months integer;
  started timestamptz := now();
  ends timestamptz;
  package_rank smallint;
begin
  select * into r from public.deela_books_seller_subscription_requests
    where id=p_request_id for update;
  if not found or r.status <> 'pending' then raise exception 'طلب الاشتراك غير موجود أو تمت معالجته'; end if;
  if exists (select 1 from public.deela_books_seller_subscription_requests s
    where s.seller_id=r.seller_id and s.status='active' and s.ends_at>started)
    then raise exception 'لدى المتجر باقة مدفوعة فعالة بالفعل'; end if;
  months := case r.term_key when 'month' then 1 when 'quarter' then 3 when 'half_year' then 6 else 12 end;
  ends := started + make_interval(months => months);
  package_rank := case r.tier_key when 'pro' then 2 else 1 end;
  update public.deela_books_seller_subscription_requests set status='active',payment_status='confirmed',
    starts_at=started,ends_at=ends,reviewed_at=started,reviewed_by=p_owner_id,updated_at=started where id=r.id;
  update public.deela_books_sellers set seller_package=r.tier_key,seller_package_rank=package_rank,
    seller_package_expires_at=ends,updated_at=started where id=r.seller_id;
  return jsonb_build_object('id',r.id,'seller_id',r.seller_id,'tier_key',r.tier_key,'starts_at',started,'ends_at',ends);
end;
$function$;

create or replace function public.deela_activate_book_promotion(p_request_id uuid, p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to 'public' as $function$
declare
  r public.deela_books_promotion_requests%rowtype;
  days integer;
  rank_value smallint;
  started timestamptz := now();
  ends timestamptz;
  promotion uuid;
  book_title text;
begin
  select * into r from public.deela_books_promotion_requests where id=p_request_id for update;
  if not found or r.status <> 'pending' then raise exception 'طلب الترويج غير موجود أو تمت معالجته'; end if;
  if not exists (select 1 from public.deela_books_listings l join public.deela_books_sellers s on s.id=l.seller_id
    where l.id=r.listing_id and l.seller_id=r.seller_id and l.status='published' and s.status='approved')
    then raise exception 'الكتاب غير منشور أو المتجر غير معتمد'; end if;
  if exists (select 1 from public.deela_books_promotions p where p.listing_id=r.listing_id and p.kind='boost'
    and p.status='active' and p.is_test=false and p.ends_at>started)
    then raise exception 'لهذا الكتاب ترويج فعال بالفعل'; end if;
  days := case r.plan_key when 'day' then 1 when 'week' then 7 else 30 end;
  rank_value := case r.plan_key when 'day' then 1 when 'week' then 2 else 3 end;
  ends := started + make_interval(days => days);
  insert into public.deela_books_promotions (seller_id,listing_id,kind,plan_key,status,is_test,starts_at,ends_at)
    values (r.seller_id,r.listing_id,'boost',r.plan_key,'active',false,started,ends) returning id into promotion;
  select title into book_title from public.deela_books_listings where id=r.listing_id;
  update public.deela_books_listings set promotion_rank=rank_value,promotion_ends_at=ends,updated_at=started where id=r.listing_id;
  update public.deela_books_promotion_requests set status='active',payment_status='confirmed',starts_at=started,
    ends_at=ends,reviewed_at=started,reviewed_by=p_owner_id,promotion_id=promotion,updated_at=started where id=r.id;
  return jsonb_build_object('id',r.id,'seller_id',r.seller_id,'listing_id',r.listing_id,'plan_key',r.plan_key,
    'starts_at',started,'ends_at',ends,'promotion_id',promotion,'book_title',book_title);
end;
$function$;

revoke all on function public.deela_activate_seller_package(uuid,uuid) from public, anon, authenticated;
revoke all on function public.deela_activate_book_promotion(uuid,uuid) from public, anon, authenticated;
grant execute on function public.deela_activate_seller_package(uuid,uuid) to service_role;
grant execute on function public.deela_activate_book_promotion(uuid,uuid) to service_role;
