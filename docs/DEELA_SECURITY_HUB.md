# DEELA Security Hub — 3 open-source projects

**Source branch:** `feature/deela-owner-official-0911` (review-only, not production signed owner APK).

## Actual state (24 Nov 2026)

- **Live owner control website:** `https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-control` now has a separate **مختبر الأمان 🛡️** tab, in addition to PentAGI.
- **Live Supabase API:** `https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-security-hub`, owner-only (Supabase Auth verified with `getUser`, owner role verified server-side from `profiles`). API body never receives or stores any real passwords, recovery codes or 2FA secrets.
- **Owner APK 0.9.10:** new Kotlin `DeelaSecurityLabScreen.kt` and a new nav tab in `DeelaOwnerScreen.kt`, committed to review branch; **not merged, not rebuilt as an installable signed release**.
- **GitHub source registry:** `config/deela-security-engines.json` describes three **public open-source projects**:
  - [Pentest Swarm AI](https://github.com/Armur-Ai/Pentest-Swarm-AI)
  - [HexStrike AI](https://github.com/0x4m4/hexstrike-ai)
  - [PentestGPT](https://github.com/GreyDGL/PentestGPT)
- These projects are **not installed or operating on the user's host**, therefore their status is `not_deployed`. This is not a real multi-agent scanning engine yet. They do not offer a common out-of-the-box API and each needs its own runtime and compatible AI/model setup.
- **Codespace currently has 2 CPU cores, 8 GB RAM and 19GB free**. An installer for full PentAGI requiring >=25GB disk was safely stopped. This GitHub branch cannot provision a free always-on host or change a Codespace's machine disk quota.

## Safe demonstration (actually works independently)

`GET /engines` returns all 3 engines with honest `runtime=not_deployed` and the readiness of the synthetic authentication lab. `POST /lab/simulate` returns a **local deterministic simulation**, **not** live scanning or password recovery.

Example payload (requires real owner bearer token; do **not** store JWT in GitHub or commit it):

```json
{
  "platform": "snapchat-demo",
  "test_username": "test_deela",
  "mfa_enabled": true,
  "rate_limit_enabled": true,
  "lockout_enabled": true
}
```

Response clearly marks `kind=synthetic_auth_simulation`, `real_requests=0`, `attacks_executed=0`, five *hypothetical* invalid login attempts, assumed lockout/rate-limit and 2FA behavior, recommended controls. No request is made to Snapchat; the outcome does not validate Snapchat security. Input names must match `test_[A-Za-z0-9_]{3,32}`. No real usernames, passwords, SMS codes or OTPs should be submitted.

## Future work to activate the three engines

1. Provision a **trusted resource-sufficient host** with explicit authorization, quota and scope enforcement. This is **not provided by Supabase Edge Functions**.
2. Install the three upstream projects from their official repositories with pinned versions, audit upstream dependencies, configure compatible Ollama or provider within a free tier if available.
3. Build and test individual read-only or authorized **lab-only** adapters with audit logs, restricted targets, hard-coded scope, timeout/resource quotas. HexStrike uses MCP, PentestGPT a CLI, and Pentest Swarm a CLI/dashboard; never pretend they share the same HTTP API.
4. Introduce secrets through Supabase Secrets or equivalent; do not put tokens in the app, GitHub repository, logs or screenshots. Expose no public offensive tool ports.
5. Complete authorized lab-only dry runs and a private, correctly signed owner APK build before turning on live engine actions. Do not affect subscriber builds.

## Safety and change isolation

The current integration is owner-only; all existing subscription, member, site routes, original toolkit, and subscriber APK functionality remain unchanged. No credential guessing on third-party services, account takeover, Snapchat authentication probing, real 2FA bypass, automatic paid resources, or hidden persistent processes are part of this change.

## Related source

- `services/deela-security-hub/index.ts` — live deployed backend source copy
- `app/src/main/java/dev/aurastore/store/auth/DeelaSecurityLabScreen.kt` — Android owner UI
- `docs/DEELA_PENTAGI_ANDROID_ONLY.md` — previous resource review
- `https://github.com/mzo77/DEELA-V2/pull/5` — isolated owner APK draft PR
