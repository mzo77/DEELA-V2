-- Transactional confirmation emails are queued only after the owner approves a subscription.
-- There is one email event per request, and the provider idempotency key uses that request ID.
create table if not exists public.deela_subscription_email_outbox (
  request_id uuid primary key references public.deela_subscription_requests(id) on delete restrict,
  user_id uuid not null,
  months integer not null check (months in (1,2,3,6,12)),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending','sent','unconfigured','failed')),
  provider_message_id text,
  last_error_code text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint deela_subscription_email_date_check check (ends_at > starts_at)
);
create index if not exists deela_subscription_email_outbox_status
  on public.deela_subscription_email_outbox (delivery_status,updated_at);
alter table public.deela_subscription_email_outbox enable row level security;
revoke all on table public.deela_subscription_email_outbox from anon,authenticated;
grant select,insert,update on table public.deela_subscription_email_outbox to service_role;
