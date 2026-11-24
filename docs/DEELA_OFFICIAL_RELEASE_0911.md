# DEELA 0.9.11 — Official Signed Android Update

## Source and build provenance

- Official Android application ID: `com.deela.apps`
- Official version: `0.9.11`, derived versionCode `911`
- GitHub canonical source release commit: `869c0b3db93dda6a5402ca39282b37a436e2db9f`
- Stable signing certificate SHA-256: `83698bc6e21ddabb83eaf45d3386170d676dcf96270081c163f8b2e107fdef3c`
- Only GitHub Actions official release workflow with **original permanent signing secrets** is allowed to publish stable updates.
- The release workflow refuses incorrect signing certificates, mismatched APK package/version, duplicate tags, and failed builds.
- Published release, if checks complete: https://github.com/mzo77/DEELA-V2/releases/tag/v0.9.11
- Current public update channel: https://github.com/mzo77/DEELA-V2/releases/latest

## Feature set

The DEELA 0.9.11 owner's app includes:
- All subscription and member management from the current original owner source
- Latest **التطبيقات** catalog controls (Android and iOS listing, per-item hide etc.) preserved
- Original owner `القوة الغاشمة` toolkit preserved, not overwritten
- Owner-only **مركز الذكاء 🤖** PentAGI console (requires the owner's own configured PentAGI host)
- Owner-only **مختبر الأمان 🛡️** tab with three open-source engine registry entries
- A **synthetic authentication lab** demonstrating hypothetical rate-limiting, temporary lockout, and two-factor authentication behavior for `test_*` usernames — zero real Snapchat requests
- Source audit status from GitHub Actions Semgrep and Deno tests

## Runtime facts / limitations

- Pentest Swarm AI, HexStrike AI, PentestGPT and PentAGI upstream engines **are not deployed** on a compute host. Their UI displays "غير متصل"; they require separate legitimate test infrastructure, permissions and model provider.
- The authentication demo **does not** guess or retrieve real passwords, check external accounts, or circumvent real MFA.
- Supabase owner role and JWT are validated by Edge Functions before accepting owner actions.
- The website security lab has been published independently; a positive authenticated end-to-end live UI test would require logging in as the owner.
- This is a standard APK update, not a separate debug package.
- Existing compatible officially signed DEELA users can update in-place if the signer matches. Different debug certificates cannot be updated over directly.
- A new public GitHub Release automatically appears in the official in-app updater only after the release job succeeds.

## Verification references

- Official release workflow: https://github.com/mzo77/DEELA-V2/actions/workflows/deela-official-release.yml
- Original-certificate private signing validation: https://github.com/mzo77/DEELA-V2/actions/runs/45318330287
- Passed Android debug compile for same source tree: https://github.com/mzo77/DEELA-V2/actions/runs/45318171509
- Passed security audit / 2FA tests: https://github.com/mzo77/DEELA-V2/actions/runs/45318171104
- Canonical merged owner source PR: https://github.com/mzo77/DEELA-V2/pull/7

Do not share private signing keys, access tokens, account passwords, or recovery codes.
