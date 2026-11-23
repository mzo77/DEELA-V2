-- Correct production owner approval /api/owner/requests/review HTTP 500.
-- The Edge Function's service_role could SELECT subscriptions but could not
-- INSERT or UPDATE, causing "permission denied for table subscriptions".
-- Only the server-side service_role may perform subscription activation.
grant insert,update on table public.subscriptions to service_role;
revoke insert,update,delete on table public.subscriptions from anon,authenticated;
