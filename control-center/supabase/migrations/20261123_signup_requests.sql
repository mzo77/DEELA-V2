-- Users who request a subscription at signup must appear in the owner's queue
-- even before confirming their email or logging in for the first time.
create schema if not exists deela_internal;
revoke all on schema deela_internal from public;

create or replace function deela_internal.queue_signup_subscription_request()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare months_text text;
declare platform_text text;
begin
  months_text := new.raw_user_meta_data ->> 'requested_months';
  if months_text is null or months_text !~ '^(1|2|3|6|12)$' then return new; end if;
  platform_text := coalesce(new.raw_user_meta_data ->> 'requested_platform','android');
  if platform_text not in ('android','ios') then platform_text := 'android'; end if;
  insert into public.deela_subscription_requests (user_id,months,platform,status,created_at)
    select new.id,months_text::integer,platform_text,'pending',now()
    where not exists (select 1 from public.deela_subscription_requests r
                      where r.user_id=new.id and r.status='pending');
  return new;
end;
$$;
revoke all on function deela_internal.queue_signup_subscription_request() from public;
drop trigger if exists deela_queue_signup_subscription_request on auth.users;
create trigger deela_queue_signup_subscription_request after insert on auth.users
  for each row execute function deela_internal.queue_signup_subscription_request();

-- Backfill users registered before the trigger was installed.
insert into public.deela_subscription_requests(user_id,months,platform,status,created_at)
select u.id,(u.raw_user_meta_data->>'requested_months')::integer,
  case when u.raw_user_meta_data->>'requested_platform' in ('android','ios')
    then u.raw_user_meta_data->>'requested_platform' else 'android' end,
  'pending',u.created_at
from auth.users u
where (u.raw_user_meta_data->>'requested_months') ~ '^(1|2|3|6|12)$'
and not exists (select 1 from public.deela_subscription_requests r where r.user_id=u.id)
and not exists (select 1 from public.subscriptions s
  where s.user_id=u.id and not s.suspended and s.ends_at>now());
