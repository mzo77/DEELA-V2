# DEELA APPS / تطبيقات ديلا

Android store rebuilt on the open-source Aura Store Kotlin codebase.

- Android applicationId: com.deela.apps
- Base: https://github.com/venudinesh/Aura-Store
- Pinned source commit: 56423776c368d3b95bae266623f3fbeeca582c5c
- Base license: MIT; see LICENSE. Original documentation: https://github.com/venudinesh/Aura-Store/blob/kotlin/README.md.
- Original MultiStore prototype backed up at backup/multistore-before-aura.
- Subscription system and DEELA Control Center API are planned but NOT yet implemented.
- Android version 0.9.0 is a preview, not a production or security-certified release.

### Build

Use JDK 17, Android SDK 37 and the included Gradle wrapper.

    ./gradlew :app:assembleDebug --no-daemon

APK: app/build/outputs/apk/debug/app-debug.apk

Third-party download providers operate independently; their current availability, terms, and the trustworthiness of APKs are not guaranteed.
