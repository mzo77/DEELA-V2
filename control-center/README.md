# DEELA CONTROL CENTER — Owner panel (urgent release)

The initial owner dashboard is deployed on the existing Supabase backend and does not need Filament installed to work.

**Owner page:** https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-control

First login with the owner's existing **Supabase account email and password**, then select a username and change the password on the **الحساب والأمان** tab. Do not put passwords in code, GitHub, or chat. Browser autofill relies on native password managers and HTML autocomplete attributes; the page does NOT store passwords in localStorage.

## Owner functionality (v1)
- Secure owner-only role checks for sensitive endpoints via Supabase Auth.
- Subscriber list, 24-hour trial, 30-day renewal, pause, resume, revoke.
- Invite via email (depends on Supabase Auth email delivery).
- Owner username customization, password change with current password verification.
- Audit of administrative actions in a protected table.
- Private «قوة غاشمة» area with links to the original DEELA-APPS command center, developer tools, games files lab, and security center; these linked tools are **not** remote command executors.

## Android API
Set DEELA_API_BASE_URL to the public non-secret origin
https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-control

- POST /api/v1/auth/login — email or chosen username + password; active subscribers/owner only.
- GET /api/v1/entitlements/me — current verified member entitlement.

**Still to do:** Filament + Shield admin roles, reseller/operator workflows, plans/payments, stronger server-side download entitlements, device-binding policies, broader audit and test coverage, production hosting. This is a Supabase-hosted bridge, not the complete final Laravel control center.

The username and audit tables have RLS enabled and no direct access grants for anon/authenticated database roles. The Edge Function is public at gateway so it can serve the sign-in page, but every privileged request separately checks the user token and owner role.
