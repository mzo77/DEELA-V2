# DEELA APPS / تطبيقات ديلا

Android store rebuilt on the open-source Aura Store Kotlin codebase.

- Android applicationId: com.deela.apps
- Base: https://github.com/venudinesh/Aura-Store
- Pinned source commit: 56423776c368d3b95bae266623f3fbeeca582c5c
- Base license: MIT; see LICENSE. Original documentation: https://github.com/venudinesh/Aura-Store/blob/kotlin/README.md.
- Original MultiStore prototype backed up at backup/multistore-before-aura.
- The DEELA Control Center subscription API is deployed on Supabase. The Android app includes a membership gate; the owner screen manages members and catalog visibility. This APK remains a preview and is not a production or security-certified release.
- Android version 0.9.1 is a preview, not a production or security-certified release.

### Build

Use JDK 17, Android SDK 37 and the included Gradle wrapper.

    ./gradlew :app:assembleDebug --no-daemon

APK: app/build/outputs/apk/debug/app-debug.apk

Third-party download providers operate independently; their current availability, terms, and the trustworthiness of APKs are not guaranteed.

## Membership gate / نظام الاشتراكات

The original animated star is followed by the DEELA login screen. The store remains closed until the backend confirms an **active, unexpired membership**. A 24-hour trial is an entitlement issued by the owner/admin; the client never grants itself trial access. The session remains in memory and is rechecked every minute.

The Android build defaults to the deployed HTTPS endpoint `https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-control`. `DEELA_API_BASE_URL` is an optional build-time override. Sign-in requires an active subscription or an owner-granted trial; the backend, not local APK state, decides access.

- `POST /api/v1/auth/login` with JSON `{email,password,platform:"android"}` returns `{access_token}`.
- `GET /api/v1/entitlements/me` with `Authorization: Bearer <token>` returns `{active:true,expires_at:"ISO-8601 UTC"}` or `{active:true,expires_at_epoch:UNIX_SECONDS}` for a valid paid or owner-granted trial subscription.
- All authorization, trial expiry, downloads/entitlements, device limits and reseller permissions must ultimately be enforced on the server; the client UI alone is not DRM or a substitute for backend protection.

The subscriber interface anonymizes source labels but the source adapters remain available, and third-party owners retain their content rights. The original Aura Store MIT notice is retained in `LICENSE` and bundled in `app/src/main/assets/THIRD_PARTY_NOTICES.txt`.
