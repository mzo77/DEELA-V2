# DEELA password recovery: secure link and email deliverability

## Current Android → Supabase flow

Android requests `POST /api/v1/auth/recover`. The `deela-control` Edge Function calls Supabase Auth `resetPasswordForEmail` and now directs verified recovery sessions to

`https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-control/recover`

This avoids dependency on GitHub Pages publishing. The reset page retains the one-time proof until **the server successfully updates the password** and never removes the form on a timer. It supports both the implicit `#access_token=…&type=recovery` callback and a `?token_hash=…&type=recovery` callback.

**Important:** This page does NOT and cannot extend an expired Auth token. The user must open a still-valid link. Older emails may still redirect to GitHub Pages.

## Prevent email scanners from consuming the one-time code

The default `{{ .ConfirmationURL }}` mail link opens Supabase Auth's verification endpoint on the first GET. Some mail clients and security scanners prefetch links and consume them before the user taps them. Supabase supports a custom email template with `{{ .TokenHash }}` for a **deferred, POST-only verification**.

In **Supabase Dashboard → Authentication → Email Templates → Reset Password**, set the reset email template to use a URL like:

```html
<div dir="rtl" lang="ar" style="font-family:Tahoma,Arial,sans-serif">
  <h2>تطبيقات ديلا ❤️</h2>
  <p>وصلنا طلب لتعيين كلمة مرور جديدة لحسابك.</p>
  <p><a href="https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-control/recover?token_hash={{ .TokenHash }}&amp;type=recovery">
    تعيين كلمة مرور جديدة
  </a></p>
  <p>افتح الرابط مرة واحدة، وتأكد أنك تستخدم أحدث رسالة. إذا لم تطلب الاستعادة، تجاهل هذه الرسالة.</p>
</div>
```

The hosted recovery page does not verify the hash on GET. It only submits the hash with the new password when the user presses **حفظ كلمة المرور**, so background email-link scans don't consume the code.

Set **Authentication → URL Configuration → Redirect URLs** to include:
- `https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-control/recover`

Use **Authentication → Providers → Email → Email OTP Expiration** to confirm a reasonable validity window (for example, 1800 seconds = 30 minutes). A longer period is configured in Auth settings, not a JavaScript timer. These settings require a Supabase project administrator. Do not set more time than needed.

## Prevent password recovery mail from landing in Spam

This is a **Supabase Auth email**. Setting `RESEND_API_KEY` for DEELA's subscription activation messages is *not* the same as configuring Supabase Auth email transport.

1. Verify an email-sending domain with a reputable mail provider (e.g., Resend), following their exact DNS instructions. Configure SPF, DKIM and DMARC correctly.
2. In **Supabase Dashboard → Authentication → SMTP Settings**, enable custom SMTP and enter your verified SMTP host, port, username, password and an appropriate `From` address. Do not place SMTP credentials in GitHub or Android sources.
3. Use a recognizable sender display name such as **تطبيقات ديلا** and a plain, single-action Arabic recovery email. Avoid URL shorteners and unverified domains.
4. Check your sending provider's delivery and bounce logs. A successful Supabase Auth API response only confirms submission, not receipt in Inbox.

## Verification without changing real passwords

- GET `/recover` returns an Arabic form and does not verify any token.
- POST `/api/v1/auth/reset` with a missing token returns 400.
- Opening and reloading a valid recovery page no longer removes the credential fragment; it is erased only after a successful password change.
- Check a real user's test via **the latest** recovery email and only with that user's consent. Never test by resetting another subscriber's password.
