package dev.aurastore.store.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.aurastore.store.BuildConfig
import dev.aurastore.store.data.sources.Source
import dev.aurastore.store.data.sources.SourceApp
import dev.aurastore.store.data.sources.SourceId
import dev.aurastore.store.data.sources.Sources
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

private data class SourceCandidate(val source: String, val key: String, val title: String, val version: String)
private data class SourceCandidates(val count: Int, val updates: List<SourceCandidate>)
private data class SourceScanResult(val scanned: Int, val pending: Int)
private data class SourceScanStatus(val source: String, val result: String)

private object OwnerSourcesApi {
    private val base get() = BuildConfig.DEELA_API_BASE_URL.trimEnd('/')
    private val client = OkHttpClient.Builder().connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(25, TimeUnit.SECONDS).callTimeout(40, TimeUnit.SECONDS).build()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    private suspend fun call(token: String, path: String, payload: JSONObject? = null): JSONObject =
        withContext(Dispatchers.IO) {
            val request = Request.Builder().url(base + path)
                .header("Authorization", "Bearer $token")
                .apply { if (payload == null) get() else post(payload.toString().toRequestBody(jsonType)) }
                .build()
            client.newCall(request).execute().use { response ->
                val body = JSONObject(response.body.string())
                if (!response.isSuccessful) {
                    error(body.optString("error").ifBlank { "فشل اتصال خادم ديلا: ${response.code}" })
                }
                body
            }
        }

    suspend fun candidates(token: String): SourceCandidates {
        val body = call(token, "/api/owner/source/candidates")
        val list = body.optJSONArray("updates") ?: JSONArray()
        return SourceCandidates(
            body.optInt("pending_count"),
            (0 until list.length()).map { index ->
                val item = list.getJSONObject(index)
                SourceCandidate(item.optString("source"), item.optString("app_key"),
                    item.optString("title"), item.optString("pending_version"))
            },
        )
    }

    suspend fun publish(token: String): Int =
        call(token, "/api/owner/source/publish", JSONObject()).optInt("published")

    /** Scan each of the six sources, with a fixed network limit, not an infinite site crawl. */
    suspend fun latest(source: Source): List<SourceApp> = withContext(Dispatchers.IO) {
        val found = LinkedHashMap<String, SourceApp>()
        for (page in 1..5) {
            val response = runCatching { source.allAppsPage(page) }.getOrNull() ?: break
            response.apps.forEach { app -> if (app.key.isNotBlank()) found[app.key] = app }
            if (!response.hasMore) break
        }
        // Some catalogues (e.g. sitemap/WordPress lists) omit versions from paged rows.
        // The homepage shelves may publish real versions; don't count URL-only entries as updates.
        if (found.values.none { !it.version.isNullOrBlank() }) {
            runCatching { source.shelves() }.getOrDefault(emptyList())
                .flatMap { it.apps }
                .forEach { app ->
                    if (app.key.isNotBlank() && !app.version.isNullOrBlank()) found[app.key] = app
                }
        }
        if (found.values.none { !it.version.isNullOrBlank() }) {
            runCatching { source.latest() }.getOrDefault(emptyList())
                .forEach { app -> if (app.key.isNotBlank()) found[app.key] = app }
        }
        found.values.toList()
    }

    suspend fun scan(token: String, source: Source, apps: List<SourceApp>): SourceScanResult {
        val withVersion = apps.filter { !it.version.isNullOrBlank() }
        if (withVersion.isEmpty()) return SourceScanResult(0, 0)
        var scanned = 0
        var pending = 0
        for (chunk in withVersion.chunked(100)) {
            val rows = JSONArray()
            chunk.forEach { app ->
                rows.put(JSONObject()
                    .put("key", app.key)
                    .put("title", app.title)
                    .put("version", app.version)
                    .put("page_url", app.pageUrl.orEmpty())
                    .put("icon_url", app.iconUrl.orEmpty()))
            }
            val body = call(token, "/api/owner/source/scan",
                JSONObject().put("source", source.id.name).put("apps", rows))
            scanned += body.optInt("scanned")
            pending = body.optInt("pending_count")
        }
        return SourceScanResult(scanned, pending)
    }
}

/** Owner-controlled scan, preview and deliberate publication. Never publishes as a side effect of scanning. */
@Composable
fun DeelaOwnerSources(token: String) {
    val scope = rememberCoroutineScope()
    var candidates by remember { mutableStateOf(SourceCandidates(0, emptyList())) }
    var busy by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf("الفحص الأول يسجل الإصدارات الحالية للمقارنة في المرات القادمة.") }
    var error by remember { mutableStateOf<String?>(null) }
    var sourceResults by remember { mutableStateOf<List<SourceScanStatus>>(emptyList()) }
    LaunchedEffect(token) {
        runCatching { OwnerSourcesApi.candidates(token) }
            .onSuccess { candidates = it }
            .onFailure { error = it.message }
    }

    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("تحديثات جميع المصادر", style = MaterialTheme.typography.titleLarge)
        Text("فحص أحدث 5 صفحات لكل مصدر من المصادر الستة. لا تُنشر النتائج إلا بعد موافقتك.",
            style = MaterialTheme.typography.bodySmall)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(
                enabled = !busy,
                modifier = Modifier.weight(1f).height(68.dp),
                onClick = {
                    busy = true
                    error = null
                    scope.launch {
                        var total = 0
                        val reports = mutableListOf<SourceScanStatus>()
                        try {
                            for ((index, source) in Sources.all.withIndex()) {
                                status = "فحص ${index + 1} من ${Sources.all.size}: ${source.id.label}"
                                val outcome = runCatching {
                                    val apps = OwnerSourcesApi.latest(source)
                                    if (apps.isEmpty()) throw IllegalStateException("لم يصل رد قابل للقراءة من المصدر")
                                    OwnerSourcesApi.scan(token, source, apps)
                                }
                                outcome.onSuccess { scanned ->
                                    total += scanned.scanned
                                    reports += SourceScanStatus(source.id.label,
                                        if (scanned.scanned > 0) "تم تسجيل ${scanned.scanned} إصدار"
                                        else "لا توجد إصدارات قابلة للمقارنة")
                                }.onFailure { problem ->
                                    reports += SourceScanStatus(source.id.label,
                                        "تعذر الفحص: ${problem.message.orEmpty().take(90)}")
                                }
                                sourceResults = reports.toList()
                            }
                            candidates = OwnerSourcesApi.candidates(token)
                            val incomplete = reports.count { !it.result.startsWith("تم تسجيل") }
                            status = "فُحصت $total نسخة معلومة الإصدار. تحديثات جديدة: ${candidates.count}." +
                                if (incomplete == 0) "" else " مصادر بدون نتائج كاملة: $incomplete من ${Sources.all.size}."
                        } catch (e: Exception) {
                            error = e.message ?: "تعذر إكمال فحص المصادر."
                        } finally {
                            busy = false
                        }
                    }
                },
            ) { Text("تحديث جميع المصادر") }
            Surface(
                modifier = Modifier.width(84.dp).height(68.dp),
                shape = MaterialTheme.shapes.medium,
                tonalElevation = 3.dp,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center) {
                    Text("${candidates.count}", style = MaterialTheme.typography.headlineMedium)
                    Text("تحديث", style = MaterialTheme.typography.labelSmall)
                }
            }
        }
        Button(
            enabled = !busy && candidates.count > 0,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            onClick = {
                busy = true
                error = null
                scope.launch {
                    try {
                        val sent = OwnerSourcesApi.publish(token)
                        candidates = OwnerSourcesApi.candidates(token)
                        status = "تم نشر $sent تحديثًا للمشتركين. ستظهر الأسماء والإصدارات في تطبيقهم."
                    } catch (e: Exception) {
                        error = e.message ?: "فشل نشر التحديثات"
                    } finally {
                        busy = false
                    }
                }
            },
        ) { Text("إرسال التحديثات إلى تطبيقات البرامج") }
        if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
        Text(status, style = MaterialTheme.typography.bodySmall)
        if (sourceResults.isNotEmpty()) {
            Text("نتيجة كل مصدر:", style = MaterialTheme.typography.titleSmall)
            Text(sourceResults.joinToString("\n") { "${it.source}: ${it.result}" },
                style = MaterialTheme.typography.bodySmall)
        }
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        OutlinedButton(enabled = !busy, onClick = {
            scope.launch {
                runCatching { OwnerSourcesApi.candidates(token) }
                    .onSuccess { candidates = it; error = null }
                    .onFailure { error = it.message }
            }
        }) { Text("تحديث عداد النتائج") }
        Text("التحديثات المكتشفة — قبل الإرسال", style = MaterialTheme.typography.titleMedium)
        LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(candidates.updates, key = { it.source + ":" + it.key }) { item ->
                ElevatedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(12.dp)) {
                        Text(item.title, style = MaterialTheme.typography.titleSmall)
                        Text("${SourceId.entries.firstOrNull { it.name == item.source }?.label ?: item.source} · الإصدار الجديد ${item.version}",
                            style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}
