# DEELA subscription activation emails

Approval updates the subscription first, then records an activation email in `deela_subscription_email_outbox`. A delivery failure never reverses a paid or manually approved subscription.

## Transactional email provider

The DEELA Edge Function uses [Resend](https://resend.com/docs/send-with-deno) for email transport. Configure these **Edge Function secrets** in your Supabase dashboard before approving subscribers:

- `RESEND_API_KEY`: server-side API key from Resend; **never** add this to Android source or GitHub.
- `DEELA_EMAIL_FROM`: verified sender in Resend, for example `تطبيقات ديلا <notifications@YOUR_VERIFIED_DOMAIN>`.
- `DEELA_SUPPORT_EMAIL` (optional): support address shown in email body.

You must verify ownership of the sending domain with Resend. The Supabase Auth default email sender is designed for authentication emails; it does **not** automatically send arbitrary purchase or subscription confirmations.

## How it behaves

1. Owner approves a pending subscription request in the DEELA app.
2. Edge Function activates the subscription and writes a unique email record.
3. If mail is configured, Resend receives the email via HTTPS with an idempotency key.
4. The owner's **الرسائل** tab shows whether the provider accepted the message, whether delivery failed, or whether the sender is not configured. The retry button is available after setup and does not recreate the subscription.
5. Message includes duration, activation date, expiry date in Asia/Riyadh, account email and the request reference. No passwords, tokens, or payment claims.
6. A **sent** status means *accepted by provider*, not proof of inbox delivery. For delivery/bounce confirmation use the provider dashboard or signed delivery webhooks.

The first activation notification is not sent retroactively to existing subscribers. No configured provider = no email is sent, and the owner receives an explicit warning.
