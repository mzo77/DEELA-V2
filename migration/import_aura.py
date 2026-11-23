#!/usr/bin/env python3
"""Replace MultiStore code with the verified Aura Store snapshot; keep Git history."""
from pathlib import Path
import shutil
import sys
import re

src = Path(sys.argv[1]).resolve()
dst = Path(sys.argv[2]).resolve()
assert src != dst and (src / "app/build.gradle.kts").is_file(), "Aura source missing"
assert (src / "LICENSE").is_file(), "Upstream MIT license missing"
assert (dst / ".git").exists(), "Target is not a Git checkout"
assert (dst / "store").exists(), "Expected old MultiStore checkout; refusing to overwrite unknown project"

# The backup branch was created separately before this destructive source replacement.
for item in dst.iterdir():
    if item.name == ".git":
        continue
    if item.is_dir() and not item.is_symlink():
        shutil.rmtree(item)
    else:
        item.unlink()
for item in src.iterdir():
    if item.name == ".git":
        continue
    target = dst / item.name
    if item.is_dir():
        shutil.copytree(item, target, symlinks=True)
    else:
        shutil.copy2(item, target)

def edit(rel, old, new):
    path = dst / rel
    value = path.read_text(encoding="utf-8")
    assert old in value, f"Expected branding marker not found in {rel}"
    path.write_text(value.replace(old, new), encoding="utf-8")

# Keep Java/Kotlin namespace intact (dev.aurastore.store) to preserve all class imports.
# Only the Android installation ID changes to the intended DEELA identifier.
edit("app/build.gradle.kts", 'applicationId = "dev.aurastore.store"', 'applicationId = "com.deela.apps"')
edit("app/build.gradle.kts", 'val appVersionName = "1.8.2"', 'val appVersionName = "0.9.0"')
edit("settings.gradle.kts", 'rootProject.name = "Aura Store"', 'rootProject.name = "DEELA APPS"')
edit("app/src/main/java/dev/aurastore/store/data/AppReleases.kt",
     'const val REPO = "venudinesh/Aura-Store"', 'const val REPO = "mzo77/DEELA-V2"')

# Replace visible app naming, while leaving identifier/class names untouched.
for sub in ["app/src/main/java", "app/src/main/res"]:
    for path in (dst / sub).rglob("*"):
        if path.is_file() and path.suffix in {".kt", ".xml"}:
            value = path.read_text(encoding="utf-8")
            result = value.replace("AURA STORE", "DEELA APPS").replace("Aura Store", "DEELA APPS")
            if result != value:
                path.write_text(result, encoding="utf-8")

# Install a simple original DEELA D launcher symbol, without relying on raster assets.
icon = dst / "app/src/main/res/drawable/deela_launcher.xml"
icon.parent.mkdir(parents=True, exist_ok=True)
icon.write_text('''<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="96dp" android:height="96dp"
    android:viewportWidth="96" android:viewportHeight="96">
    <path android:fillColor="#651A35" android:pathData="M0,0h96v96h-96z"/>
    <path android:fillColor="#FFFFFF" android:fillType="evenOdd"
        android:pathData="M29,20 L44,20 C64,20 74,30 74,48 C74,66 64,76 44,76 L29,76 Z M40,31 L40,65 L44,65 C56,65 63,58 63,48 C63,38 56,31 44,31 Z"/>
</vector>
''', encoding="utf-8")
edit("app/src/main/AndroidManifest.xml", 'android:icon="@mipmap/ic_launcher"', 'android:icon="@drawable/deela_launcher"')
edit("app/src/main/AndroidManifest.xml", 'android:roundIcon="@mipmap/ic_launcher_round"', 'android:roundIcon="@drawable/deela_launcher"')

# First Arabic foundation. Other strings still use the original default locale until localized.
arb = dst / "app/src/main/res/values-ar/strings.xml"
arb.parent.mkdir(exist_ok=True, parents=True)
arb.write_text('''<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="app_name">تطبيقات ديلا</string>
  <string name="tab_games">الألعاب</string>
  <string name="tab_apps">التطبيقات</string>
  <string name="tab_search">البحث</string>
  <string name="tab_browse">تصفح</string>
  <string name="tab_wishlist">المفضلة</string>
  <string name="tab_you">حسابي</string>
  <string name="a11y_downloads">التنزيلات</string>
  <string name="a11y_account">الحساب</string>
  <string name="a11y_back">رجوع</string>
</resources>
''', encoding="utf-8")

# Use the upstream project as the functional base; keep its MIT license.
upstream = (dst / "README.md").read_text(encoding="utf-8")
(dst / "UPSTREAM_AURA_README.md").write_text(upstream, encoding="utf-8")
(dst / "README.md").write_text('''# DEELA APPS / تطبيقات ديلا

Android store rebuilt on the open-source Aura Store Kotlin codebase.

- Android applicationId: com.deela.apps
- Base: https://github.com/venudinesh/Aura-Store
- Pinned source commit: 56423776c368d3b95bae266623f3fbeeca582c5c
- Base license: MIT; see LICENSE and UPSTREAM_AURA_README.md.
- Original MultiStore prototype backed up at backup/multistore-before-aura.
- Subscription system and DEELA Control Center API are planned but NOT yet implemented.
- Android version 0.9.0 is a preview, not a production or security-certified release.

### Build

Use JDK 17, Android SDK 37 and the included Gradle wrapper.

    ./gradlew :app:assembleDebug --no-daemon

APK: app/build/outputs/apk/debug/app-debug.apk

Third-party download providers operate independently; their current availability, terms, and the trustworthiness of APKs are not guaranteed.
''', encoding="utf-8")

# Replace incompatible upstream workflows with DEELA-specific build workflow.
workflows = dst / ".github/workflows"
if workflows.exists():
    shutil.rmtree(workflows)
workflows.mkdir(parents=True, exist_ok=True)
(workflows / "deela-aura-apk.yml").write_text('''name: DEELA Aura APK
on:
  push:
    branches: [main]
    paths:
      - 'app/**'
      - 'gradle/**'
      - 'gradlew'
      - 'settings.gradle.kts'
      - 'build.gradle.kts'
      - '.github/workflows/deela-aura-apk.yml'
  workflow_dispatch:

permissions:
  contents: read

jobs:
  preview:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
      - name: Install Android SDK 37 using preinstalled SDK tools
        run: |
          SDKMANAGER=$(find "$ANDROID_HOME/cmdline-tools" -name sdkmanager -type f | head -n 1)
          test -x "$SDKMANAGER"
          yes | "$SDKMANAGER" --licenses >/dev/null 2>&1 || true
          "$SDKMANAGER" --channel=3 --install "platforms;android-37.0" "build-tools;36.1.0"
      - uses: gradle/actions/setup-gradle@v4
      - name: Assemble DEELA preview
        run: |
          chmod +x gradlew
          ./gradlew :app:assembleDebug --no-daemon
      - uses: actions/upload-artifact@v4
        with:
          name: DEELA-Aura-debug-APK
          path: app/build/outputs/apk/debug/*.apk
          retention-days: 30
''', encoding="utf-8")
print("IMPORTED AURA STORE BASE + DEELA BRANDING")
