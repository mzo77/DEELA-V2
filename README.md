<div align="center">

<img src="docs/deela-logo.svg" width="112" height="112" alt="DEELA APPS">

<h1>DEELA APPS | تطبيقات ديلا</h1>

<p><strong>One search across many Android app stores.</strong></p>

<p>
Search them all at once, compare what each one publishes for the same app, and install from the
source you choose, through the same verification pipeline every time.
</p>

<p>
<a href="https://github.com/mzo77/DEELA-V2/releases"><img alt="Latest release" src="https://img.shields.io/github/v/release/mzo77/DEELA-V2?include_prereleases&sort=semver&display_name=tag&label=release&color=912D55&style=flat-square"></a>
<a href="https://github.com/mzo77/DEELA-V2/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/mzo77/DEELA-V2/total?label=downloads&color=4F5BD5&style=flat-square"></a>
<img alt="Android 8.0+" src="https://img.shields.io/badge/Android-8.0%2B-4F5BD5?style=flat-square&logo=android&logoColor=white">
<img alt="Kotlin" src="https://img.shields.io/badge/Kotlin-2.3-4F5BD5?style=flat-square&logo=kotlin&logoColor=white">
<a href="LICENSE"><img alt="License GPL-3.0" src="https://img.shields.io/badge/license-GPL--3.0-4F5BD5?style=flat-square"></a>
<a href="https://github.com/mzo77/DEELA-V2/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/mzo77/DEELA-V2/ci.yml?branch=main&label=CI&style=flat-square"></a>
</p>

<p>
<a href="https://github.com/mzo77/DEELA-V2/releases"><img alt="Download the latest release" src="https://img.shields.io/badge/Download%20the%20latest%20release-4F5BD5?style=for-the-badge&logo=android&logoColor=white"></a>
</p>

</div>

---

## Install

1. Download and install the `.apk` from [DEELA V2 Releases](https://github.com/mzo77/DEELA-V2/releases). The currently available preview builds use debug signing, and may need a clean install between CI runs until a permanent DEELA signing key is configured.
2. Open it. Android asks once whether DEELA APPS may install applications. That is the
   `REQUEST_INSTALL_PACKAGES` permission, which any app that installs other apps needs. If your
   device makes that setting hard to find, DEELA APPS has a shortcut straight to it.
3. That is all. From then on DEELA APPS offers **its own updates** the same way it offers everyone
   else's, from a signed index it verifies before applying.

**Requires Android 8.0 (API 26) or newer.**

### Verify what you downloaded

Release signing will use DEELA's own signing key once configured. Android refuses an update
signed by a different one, so a mismatch is worth stopping for.

```sh
apksigner verify --print-certs deela-<version>.apk
```

```
Signer #1 certificate SHA-256 digest:
<generated from your own DEELA signing key>
```

<div align="center">
<img src="docs/screenshots/home.png" width="260" alt="Home, with the most popular and newest apps from the signed index">
&nbsp;
<img src="docs/screenshots/app-page.png" width="260" alt="An app listing: the same app on three stores, with its screenshots">
&nbsp;
<img src="docs/screenshots/my-apps.png" width="260" alt="My apps: what is installed, what has an update, and what is waiting to be installed">
</div>

## What it does

**One search, many sources.** A query fans out to every enabled store in parallel; results stream in
as each answers and are grouped into one row per app, with every store that has it listed
underneath. Nothing waits for the slowest source, and a store that fails or gets rate-limited is
named next to the results instead of silently vanishing.

**It says which one to trust.** Not every store is the same. Some publish a SHA-256 for each file,
some publish the package name, some redistribute modified builds. The app page reports what
verification was actually able to prove, and "verified" and "not contradicted" are different
sentences. Settings says what to expect from each source.

**It admits when it cannot be sure.** Stores disagree about package names, and some publish none at
all, so "the same app on two stores" often has to be inferred. Below a confidence threshold nothing
is merged silently: the second listing shows up as a *possible* match with the reason, and the
choice is yours.

**Seven checks before anything is installed.** Size, streamed SHA-256, archive read with `apksig`,
package-name match against the listing (a hard, non-bypassable block), signer comparison against the
already-installed certificate including v3 key rotation, anti-downgrade, and a record of what was
installed from where. The file that is verified and the file that is installed are the same bytes:
the hash is computed *while* writing into the install session, not before it.

**Split containers install properly.** XAPK, APKM and APKS bundles are opened, the right ABI and
density splits are chosen for the device, every language split is kept, and base plus splits go into
a single `PackageInstaller` session.

**Updates come from the store the app came from.** Changing publisher mid-life breaks the update at
the OS level, so each installed app remembers its own update channel. You can change it deliberately
and get warned about the signature conflict.

**Three ways to install.** The standard system confirmation always works; Shizuku and root, where
available, install silently. No feature *requires* a privileged channel. Where one is only
available with it, the interface says so.

**Everything stays on the device.** No telemetry, no accounts, no analytics. The diagnostics log is
off by default, lives locally, and is exported by you as a plain-text file you can read before
sending it anywhere.

**Six languages, light and dark.** Arabic (RTL), English, Italian, French, Spanish and German, all complete or
the build fails. Every screen has a screenshot baseline in both themes, and each one is run through
the Accessibility Test Framework.

### What it is not

DEELA APPS does not host, mirror or rehost anything. It reads publicly reachable pages the way a
browser does, on requests a person has just made. It does not solve captchas, forge TLS fingerprints
or rotate addresses to get around a block. Where a download genuinely needs a human tap, you make
it. See [Anti-bot: the line](REFERENCE.md#anti-bot-the-line).

## Stores

The sources DEELA APPS reads today:

- **AN1**
- **APKCombo**
- **APKMirror**
- **APKMODY**
- **F-Droid**
- **LiteAPKs**
- **MODYOLO**
- **PDALIFE**
- **Uptodown**

This list grows as adapters are added, and each one can be switched off individually in Settings.
What each source publishes, how it is reached and the traps it sets are in
[REFERENCE.md](REFERENCE.md#the-stores), all of it measured against the live sites rather than read
off documentation.

## Building

```sh
export JAVA_HOME="/path/to/a/jdk-17-compatible-jdk"   # Android Studio's JBR works
./gradlew :app:installDebug
```

Requirements: JDK 17 bytecode target, Android SDK with `compileSdk 37`. The Gradle wrapper is
included.

| Variant | Command | Purpose |
|---|---|---|
| `debug` | `./gradlew :app:installDebug` | day-to-day development |
| `minified` | `./gradlew :app:installMinified` | release with R8, but installable. **Use this before trusting a library that resolves by name** |
| `release` | `tools/release.sh` | distribution artifact; unsigned unless `.secrets/keystore.properties` exists |

Full checks:

```sh
./gradlew build checkDependencyRules lint verifyRoborazziDebug
```

## Tests and guardrails

A set of executable guardrails enforces the rules the project will not bend on: no hardcoded strings
in any language, translation parity across all five, every settings field reachable from the UI *and*
actually drawn, both themes captured for every screen, no backup escape for private folders, and the
module dependency rules. They run offline in seconds.

A nightly canary runs the parsers against the real sites and opens an issue when a store changes
shape. It is deliberately non-blocking: it is neither offline nor deterministic, so it must not be
able to fail a build.

```sh
./gradlew :guardrails:test               # the guardrails
./gradlew checkDependencyRules           # module boundaries
./gradlew :store:apkmirror:canaryTest    # one adapter against the live site
```

## More detail

[**REFERENCE.md**](REFERENCE.md) covers the architecture, the module graph and its enforced
dependency rules, the verification pipeline step by step, the installer channels, split containers,
version selection, the signed remote-configuration channel, caching, the anti-bot boundary, and the
per-store notes.

## Contributing

Adding a store is a checklist that touches no core module: see
[REFERENCE.md § Adding a store](REFERENCE.md#adding-a-store). If you find yourself needing to change
`:core:*` to make an adapter fit, the contract in `:store:api` is incomplete: fix the contract, not
the caller.

## License

[GPL-3.0](LICENSE).



## Upstream attribution

DEELA APPS is based on [MultiStore by FedeFluork](https://github.com/FedeFluork/multistore), licensed under GPL-3.0. Original copyright and license notices are retained in the source tree. This fork is independently maintained.
