package dev.aurastore.store.auth

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import dev.aurastore.store.BuildConfig
import dev.aurastore.store.data.sources.SourceId
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

private data class PublishedSourceUpdate(
    val key: String,
    val source: String,
    val title: String,
    val version: String,
    val pageUrl: String,
    val publishedAt: String,
)
private object PublishedSourceApi {
    private val client = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(18, TimeUnit.SECONDS)
        .callTimeout(25, TimeUnit.SECONDS).build()

    suspend fun updates(token: String): List<PublishedSourceUpdate> = withContext(Dispatchers.IO) {
        val url = BuildConfig.DEELA_API_BASE_URL.trimEnd('/') + "/api/v1/source/updates"
        val request = Request.Builder().url(url).header("Authorization", "Bearer $token").get().build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IllegalStateException("Failed to load published updates")
            val rows = JSONObject(response.body.string()).optJSONArray("updates") ?: JSONArray()
            (0 until rows.length()).map { index ->
                val item = rows.getJSONObject(index)
                PublishedSourceUpdate(
                    key = item.optString("app_key"),
                    source = item.optString("source"),
                    title = item.optString("title"),
                    version = item.optString("version"),
                    pageUrl = item.optString("page_url"),
                    publishedAt = item.optString("published_at"),
                )
            }
        }
    }
}

/**
 * Published updates are visible in DEELA without an additional app.
 * They are catalogue notices, not claims that an installed package is out of date.
 */
@Composable
fun DeelaPublishedUpdates(token: String) {
    val context = LocalContext.current
    val prefs = remember(context) { context.getSharedPreferences("deela_published_updates", Context.MODE_PRIVATE) }
    var seenMarker by remember { mutableStateOf(prefs.getString("seen_marker", "").orEmpty()) }
    var updates by remember { mutableStateOf<List<PublishedSourceUpdate>>(emptyList()) }
    var dialogOpen by remember { mutableStateOf(false) }

    LaunchedEffect(token) {
        while (true) {
            runCatching { PublishedSourceApi.updates(token) }
                .onSuccess { updates = it }
            delay(5 * 60 * 1000L)
        }
    }
    if (updates.isEmpty()) return

    val newest = updates.first().publishedAt
    val unread = newest.isNotBlank() && newest > seenMarker
    Surface(color = MaterialTheme.colorScheme.secondaryContainer) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 7.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                if (unread) "تحديثات جديدة للتطبيقات: ${updates.size}"
                else "تحديثات البرامج المنشورة: ${updates.size}",
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.bodySmall,
            )
            TextButton(onClick = { dialogOpen = true }) { Text("عرض التحديثات") }
        }
    }

    if (dialogOpen) {
        AlertDialog(
            onDismissRequest = {
                dialogOpen = false
                seenMarker = newest
                prefs.edit().putString("seen_marker", newest).apply()
            },
            title = { Text("آخر تحديثات البرامج") },
            text = {
                LazyColumn(modifier = Modifier.heightIn(max = 420.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(updates, key = { it.source + ":" + it.key }) { item ->
                        Column {
                            Text(item.title, style = MaterialTheme.typography.titleSmall)
                            Text("${SourceId.entries.firstOrNull { it.name == item.source }?.label ?: item.source} · الإصدار ${item.version}",
                                style = MaterialTheme.typography.bodySmall)
                            if (item.pageUrl.startsWith("https://")) {
                                OutlinedButton(onClick = {
                                    runCatching {
                                        context.startActivity(
                                            Intent(Intent.ACTION_VIEW, Uri.parse(item.pageUrl))
                                        )
                                    }
                                }) { Text("صفحة البرنامج في المصدر") }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    dialogOpen = false
                    seenMarker = newest
                    prefs.edit().putString("seen_marker", newest).apply()
                }) { Text("تم") }
            },
        )
    }
}
