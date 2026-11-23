package dev.aurastore.store.data

import dev.aurastore.store.version.AppVersion
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * One APK asset of a release: which signature it carries, where its bytes are, and what they hash to.
 *
 * Official releases carry a permanently signed APK. Older preview releases may contain a
 * separate debug build. [debug] is read from the asset's name; [sha256] prefers GitHub's
 * digest and falls back to the sibling `.sha256` asset.
 */
data class AppBuild(
    val name: String,
    val url: String,
    val size: Long,
    val sha256: String?,
    val debug: Boolean,
    /** The `.sha256` asset beside this APK, when the release carries one. */
    val checksumUrl: String? = null,
)

/**
 * One published build of this app, as GitHub's release API describes it.
 *
 * [builds] contains all published builds, with the signed one first. [installed] prefers
 * the matching build class; old debug installs may be offered a stable signed APK for
 * announcement purposes. Android update compatibility is verified against the *actual*
 * signing certificates after download. Incompatible APKs are saved, not handed to the installer.
 *
 * [sha256] is the hash the download must match before it reaches the installer; null means the
 * release published none, and [dev.aurastore.store.update.AppUpdater] refuses to install that.
 */
data class AppRelease(
    val version: AppVersion,
    val tag: String,
    val notes: String,
    /** Every APK asset in the release, the signed build first. */
    val builds: List<AppBuild>,
    /** The build this installation may replace itself with. */
    val installed: AppBuild,
) {
    val apkUrl: String get() = installed.url
    val apkName: String get() = installed.name
    val apkSize: Long get() = installed.size
    val sha256: String? get() = installed.sha256
    val checksumUrl: String? get() = installed.checksumUrl

    /** True when the release carries a build of this signature. */
    fun has(debug: Boolean): Boolean = builds.any { it.debug == debug }

    /**
     * The build [prefer] names, or null when the release does not carry it.
     *
     * Null rather than a fallback: a user who asked for the debug build must not silently receive the
     * signed one. [installed] is the answer for [UpdateBuild.AUTO].
     */
    fun build(prefer: UpdateBuild): AppBuild? = when (prefer) {
        UpdateBuild.AUTO -> installed
        UpdateBuild.RELEASE -> builds.firstOrNull { !it.debug }
        UpdateBuild.DEBUG -> builds.firstOrNull { it.debug }
    }
}

/**
 * The project's own official releases, read from GitHub.
 *
 * The repository is fixed, only the newest non-draft stable release is considered, and
 * the artifact must have a verifiable SHA-256 before installation. UI checks are rate
 * limited per running process to reduce API traffic.
 */
object AppReleases {

    const val REPO = "mzo77/DEELA-V2"
    private const val LATEST = "https://api.github.com/repos/$REPO/releases/latest"
    private const val ACCEPT = "application/vnd.github+json"
    private const val UA = "AuraStore/$REPO"

    private val client: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .followRedirects(true)
            .addNetworkInterceptor(SecureTransport.HttpsOnly)
            .build()
    }

    /**
     * The API client, bounded end to end.
     *
     * A phone whose DNS is unreachable does not refuse the lookup, it leaves it hanging; the socket
     * timeouts below never fire because there is no socket yet. The call timeout is the only bound
     * that covers the whole exchange, so the Settings row can say GitHub did not answer instead of
     * sitting on "Checking" until the app is killed.
     */
    private val apiClient: OkHttpClient by lazy {
        client.newBuilder().callTimeout(25, TimeUnit.SECONDS).build()
    }

    /** The newest stable release, including a save-only official build for old debug installs. */
    suspend fun latest(debuggable: Boolean): AppRelease? = withContext(Dispatchers.IO) {
        val parsed = payload(get(LATEST)) ?: return@withContext null
        // Prefer an in-place compatible build. For users of old debug previews, a newly
        // published, stable signed APK must still appear as an announcement; it cannot be
        // installed over their debug key, so the UI offers a verified file to save instead.
        // Future release-signed updates continue to use the exact same certificate.
        val installed = parsed.builds.firstOrNull { it.debug == debuggable }
            ?: parsed.builds.firstOrNull { !it.debug }
            ?: return@withContext null
        val builds = parsed.builds.map { build ->
            if (build.sha256 != null) {
                build
            } else {
                // Older releases carry the hash only in the sibling file.
                build.copy(sha256 = build.checksumUrl?.let { url -> runCatching { checksum(get(url)) }.getOrNull() })
            }
        }
        AppRelease(
            version = parsed.version,
            tag = parsed.tag,
            notes = parsed.notes,
            builds = builds,
            installed = builds.first { it.debug == debuggable },
        )
    }

    /**
     * Pure: one release object into the build matching [debuggable], or null when it published none.
     *
     * The release is skipped rather than guessed at when it is a draft, a pre-release, carries no
     * version tag, or has no APK with this build's signature. Returning null is "nothing to offer",
     * which is the same answer as being current.
     */
    fun parse(json: String, debuggable: Boolean): AppRelease? {
        val parsed = payload(json) ?: return null
        val installed = parsed.builds.firstOrNull { it.debug == debuggable }
            ?: parsed.builds.firstOrNull { !it.debug }
            ?: return null
        return AppRelease(
            version = parsed.version,
            tag = parsed.tag,
            notes = parsed.notes,
            builds = parsed.builds,
            installed = installed,
        )
    }

    /** One release's metadata and every APK it published, before a signature is chosen. */
    private data class Payload(
        val version: AppVersion,
        val tag: String,
        val notes: String,
        val builds: List<AppBuild>,
    )

    private fun payload(json: String): Payload? {
        val root = runCatching { JSONObject(json) }.getOrNull() ?: return null
        if (root.optBoolean("draft") || root.optBoolean("prerelease")) return null
        val tag = root.optString("tag_name").trim().takeIf { it.isNotEmpty() } ?: return null
        val version = AppVersion.parse(tag) ?: return null
        val assets = root.optJSONArray("assets") ?: JSONArray()
        val files = (0 until assets.length()).mapNotNull { assets.optJSONObject(it) }
        val builds = files
            .filter { asset ->
                val name = asset.optString("name")
                name.endsWith(".apk", ignoreCase = true) && !name.endsWith(".sha256", ignoreCase = true)
            }
            .mapNotNull { asset ->
                val apkName = asset.optString("name")
                val apkUrl = asset.optString("browser_download_url").trim().takeIf { it.isNotEmpty() }
                    ?: return@mapNotNull null
                val checksumUrl = files
                    .firstOrNull { it.optString("name") == "$apkName.sha256" }
                    ?.optString("browser_download_url")
                    ?.takeIf { it.isNotBlank() }
                AppBuild(
                    name = apkName,
                    url = apkUrl,
                    size = asset.optLong("size", 0L),
                    sha256 = sha256Of(asset.optString("digest")),
                    debug = isDebugAsset(apkName),
                    checksumUrl = checksumUrl,
                )
            }
            // Signed build first, so anything that reads the list without choosing sees the ordinary
            // release before the test one.
            .sortedBy { it.debug }
        if (builds.isEmpty()) return null
        return Payload(
            version = version,
            tag = tag,
            notes = root.optString("body").trim(),
            builds = builds,
        )
    }

    /** Pure: the hex digest out of GitHub's `sha256:<hex>` asset digest, or null. */
    fun sha256Of(digest: String?): String? {
        val text = digest?.trim().orEmpty()
        val hex = when {
            text.contains(':') -> {
                val (algorithm, value) = text.split(':', limit = 2)
                if (!algorithm.equals("sha256", ignoreCase = true)) return null
                value
            }
            // A digest without its prefix is still a digest; anything else is not.
            else -> text
        }
        return hex
            .takeIf { it.length == 64 && it.all { char -> char.isDigit() || char in 'a'..'f' || char in 'A'..'F' } }
            ?.lowercase()
    }

    /** Pure: `Aura-Store-v1.1.0-debug.apk` is the debug-signed build. */
    fun isDebugAsset(name: String): Boolean = name.contains("-debug", ignoreCase = true)

    /** Pure: the first 64-hex token of a `sha256sum`-shaped file. */
    fun checksum(text: String): String? = Regex("[0-9a-fA-F]{64}").find(text)?.value?.lowercase()

    /** A response whose body the caller must close. Used by the downloader to stream. */
    internal fun open(url: String): Response {
        val request = Request.Builder()
            .url(url)
            .header("User-Agent", UA)
            .build()
        val response = client.newCall(request).execute()
        if (!response.isSuccessful) {
            response.close()
            throw IOException("HTTP ${response.code} on ${request.url.host}")
        }
        return response
    }

    private fun get(url: String): String {
        val request = Request.Builder()
            .url(url)
            .header("User-Agent", UA)
            .header("Accept", ACCEPT)
            .build()
        val response = apiClient.newCall(request).execute()
        if (!response.isSuccessful) {
            response.close()
            throw IOException("HTTP ${response.code} on ${request.url.host}")
        }
        return response.use { it.body.string() }
    }
}
