-- DEELA Books web-push delivery infrastructure.
-- Secret values are provisioned separately in Supabase Vault and are intentionally not stored in Git.
create extension if not exists pg_net with schema public;

create table if not exists public.deela_books_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (length(endpoint) between 1 and 3000),
  p256dh text not null check (length(p256dh) between 16 and 256),
  auth text not null check (length(auth) between 8 and 256),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists deela_books_push_subscriptions_user_idx
  on public.deela_books_push_subscriptions(user_id);
alter table public.deela_books_push_subscriptions enable row level security;
revoke all on public.deela_books_push_subscriptions from anon, authenticated;
grant all on public.deela_books_push_subscriptions to service_role;

create or replace function public.deela_books_get_push_secrets()
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select coalesce(jsonb_object_agg(name, decrypted_secret), '{}'::jsonb)
  from vault.decrypted_secrets
  where name in ('deela_books_vapid', 'deela_books_push_trigger_secret');
$function$;
revoke all on function public.deela_books_get_push_secrets() from public, anon, authenticated;
grant execute on function public.deela_books_get_push_secrets() to service_role;

create or replace function public.deela_books_notify_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  trigger_secret text;
begin
  select decrypted_secret into trigger_secret
  from vault.decrypted_secrets
  where name = 'deela_books_push_trigger_secret'
  limit 1;

  if trigger_secret is not null and length(trigger_secret) >= 32 then
    perform net.http_post(
      url := 'https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-books/push/send',
      body := jsonb_build_object(
        'user_id', new.user_id,
        'title', new.title,
        'body', new.body,
        'event_type', new.event_type,
        'notification_id', new.id
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-deela-push-secret', trigger_secret
      ),
      timeout_milliseconds := 2500
    );
  end if;
  return new;
end;
$function$;
revoke all on function public.deela_books_notify_push() from public, anon, authenticated;
drop trigger if exists deela_books_push_notification_insert on public.deela_books_notifications;
create trigger deela_books_push_notification_insert
  after insert on public.deela_books_notifications
  for each row execute function public.deela_books_notify_push();
