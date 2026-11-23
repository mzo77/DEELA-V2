-- A previously missing table grant caused owner/dashboard to silently return
-- requests: [] even when pending requests existed in the database.
-- Keep all request mutations behind DEELA Control's verified service_role.
grant select, insert, update, delete
  on table public.deela_subscription_requests to service_role;
revoke all on table public.deela_subscription_requests from anon, authenticated;
