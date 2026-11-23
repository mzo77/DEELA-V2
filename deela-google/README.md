# DEELA OWNER — Private Google-hosting site (deployment pending)

**Site identity:** DEELA. Proposed custom domain: `deela.com` only if the owner confirms this was intended and registers it; **`.con` is not a delegated public TLD**. Do not claim ownership or availability of any domain.

**Status:** Owner dashboard source has been prepared in this separate feature branch; it has NOT been deployed to Firebase Hosting. The current DEELA subscriber app, public MZO pages and iOS catalogue are left unchanged.

## Architecture
- `site/`: responsive Arabic RTL dashboard, reduced red palette, owner login, subscription actions, Android and iOS shortcuts, private file upload/download and password updates.
- Firebase Hosting on a Google Firebase project (connection required). Static sign-in assets can be visited by anyone who knows a deployed URL; **private data and files require server-side owner authorization**. `noindex` is not an access-control mechanism.
- Existing DEELA Supabase login `deela-control`, existing subscriber and subscription records, and the new `deela-owner-vault` Edge Function.
- New private Storage bucket `deela-owner-vault` and `deela_owner_assets` database table (RLS enabled, anon/authenticated grants revoked).
- The browser contains only a **publishable** Supabase API key; never put `service_role`, private GitHub tokens, or signing certificates in the site or APK.
- IPA assets can be stored and downloaded by the owner. Installing IPA on iPhones still requires an applicable valid Apple signing/distribution method.

## Google Hosting deployment
1. Connect an authorized Firebase project in Google/Firebase; inspect any billing terms before enabling paid services.
2. From this directory with Firebase CLI authenticated: `firebase use --add` and select the actual project. Do not invent a Firebase project ID.
3. Run `firebase deploy --only hosting`. The console will show the real `web.app` host after deployment.
4. Confirm owner authentication and private file permissions from the deployed origin.
5. Register and verify a real custom domain separately, then attach it via Firebase Hosting > Add custom domain. Do not activate public access without explicit owner approval.

**Owner APK:** separate Android `ownerapp` module included in this branch; build only after the actual Google-hosted URL is set in `DEELA_OWNER_URL`. Debug builds are previews, not production-signed releases. New public app installation does not require modifying the subscriber APK.

**Large IPA:** Browser signed-upload works within the configured Supabase Storage plan limits. Files exceeding those limits need resumable upload or Google Cloud Storage integration, after the Google project is connected. No bypass of Apple signing is offered.
