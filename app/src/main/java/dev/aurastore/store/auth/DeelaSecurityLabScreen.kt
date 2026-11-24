package dev.aurastore.store.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.aurastore.store.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Owner-only DEELA four-engine LIVE health dashboard.
 *
 * This screen does not run the upstream scanners and does not pretend that their
 * GitHub repositories, local demos, or CI checks are deployed scanner services.
 * All statuses come from the authenticated Supabase /integrations endpoint.
 * Subscriber application accounts have no route to this UI or API.
 */
private object DeelaFourEngineApi {
    private val client = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(34, TimeUnit.SECONDS)
        .callTimeout(42, TimeUnit.SECONDS)
        .build()

    private val base: String
        get() = BuildConfig.DEELA_API_BASE_URL.trimEnd('/')
            .replace("/deela-control", "/deela-security-hub")

    suspend fun get(token: String, path: String): JSONObject = withContext(Dispatchers.IO) {
        val req = Request.Builder()
            .url(base + path)
            .header("Authorization", "Bearer " + token)
            .header("Accept", "application/json")
            .header("Cache-Control", "no-store")
            .get()
            .build()
        client.newCall(req).execute().use { response ->
            val payload = runCatching { JSONObject(response.body?.string().orEmpty()) }
                .getOrElse { JSONObject().put("error", "استجابة الخادم غير صالحة") }
            if (!response.isSuccessful) {
                error(payload.optString("error").ifBlank { "رمز الاستجابة: " + response.code })
            }
            payload
        }
    }
}

private data class DeelaEngineHealth(
    val name: String,
    val status: String,
    val detail: String,
    val isLive: Boolean,
)

@Composable
fun DeelaSecurityLabScreen(token: String, openAiCenter: () -> Unit) {
    val scope = rememberCoroutineScope()
    var loading by remember { mutableStateOf(false) }
    var summary by remember { mutableStateOf("لم يبدأ اختبار الاتصال المباشر بعد.") }
    var engines by remember { mutableStateOf<List<DeelaEngineHealth>>(emptyList()) }
    var checkedAt by remember { mutableStateOf("") }
    var auditBusy by remember { mutableStateOf(false) }
    var auditText by remember { mutableStateOf("لم يتم جلب فحوص المصدر بعد.") }

    suspend fun refreshEngines() {
        loading = true
        summary = "جارٍ سؤال خوادم المحركات الحقيقية..."
        runCatching { DeelaFourEngineApi.get(token, "/integrations") }
            .onSuccess { data ->
                val list = data.optJSONArray("engines")
                if (!data.optBoolean("ok") || list == null || list.length() != 4) {
                    engines = emptyList()
                    summary = "لا يوجد رد مكتمل بأربع حالات حقيقية من خدمة المحركات."
                } else {
                    engines = (0 until list.length()).map { i ->
                        val e = list.getJSONObject(i)
                        val isLive = e.optBoolean("connected") &&
                            e.optString("status") == "online" &&
                            e.optString("runtime") == "live" &&
                            e.optBoolean("model_connected") &&
                            e.optBoolean("tools_ready")
                        val code = e.optString("status")
                        val label = when {
                            isLive -> "متصل — وفق فحص الخدمة المباشر"
                            code == "not_configured" -> "غير مهيأ: لا يوجد خادم ورمز اتصال"
                            code == "offline" -> "غير متصل بالخادم"
                            code == "degraded" -> "الخادم يستجيب، لكن النموذج أو الأدوات غير جاهزة"
                            code == "invalid_configuration" -> "إعداد الخادم غير صالح"
                            code == "unverified" -> "لم تثبت هوية المحرك"
                            else -> "غير جاهز: " + code.take(50)
                        }
                        DeelaEngineHealth(
                            name = e.optString("name", e.optString("id", "محرك غير معروف")),
                            status = label,
                            detail = e.optString("reason", ""),
                            isLive = isLive,
                        )
                    }
                    val live = engines.count { it.isLive }
                    summary = "متصل فعليًا: $live من 4"
                    checkedAt = data.optString("checked_at", "")
                }
            }
            .onFailure {
                engines = emptyList()
                summary = "فشل التحقق المباشر: " + (it.message ?: "تعذر الاتصال")
            }
        loading = false
    }

    suspend fun refreshAudit() {
        auditBusy = true
        runCatching { DeelaFourEngineApi.get(token, "/audit/latest") }
            .onSuccess { data ->
                val runs = data.optJSONArray("runs")
                auditText = if (runs == null || runs.length() == 0) {
                    "لا توجد نتائج تدقيق مصدر متاحة بعد."
                } else {
                    (0 until runs.length()).joinToString("\n") { i ->
                        val run = runs.getJSONObject(i)
                        val label = when {
                            run.optString("status") != "completed" -> "جارٍ الفحص"
                            run.optString("conclusion") == "success" -> "اكتمل بنجاح"
                            run.optString("conclusion") == "failure" -> "فشل"
                            else -> "حالة أخرى"
                        }
                        "GitHub #" + run.optInt("run_number") + ": " + label
                    }
                }
            }.onFailure { auditText = "تعذر استعلام فحوص الكود: " + (it.message ?: "خطأ") }
        auditBusy = false
    }

    LaunchedEffect(token) {
        refreshEngines()
        refreshAudit()
    }

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("🧠 مركز محركات DEELA الموحد", style = MaterialTheme.typography.titleLarge)
        Text(
            "PentAGI + Pentest Swarm AI + HexStrike AI + PentestGPT — حالة الاتصال الفعلية فقط. " +
                "نجاح اختبار GitHub أو وجود اسم المحرك لا يعني تشغيله على خادم دائم.",
            style = MaterialTheme.typography.bodySmall,
        )
        ElevatedCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(summary, style = MaterialTheme.typography.titleMedium)
                if (checkedAt.isNotBlank()) {
                    Text("آخر رد من الخدمة: $checkedAt", style = MaterialTheme.typography.bodySmall)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(enabled = !loading, onClick = { scope.launch { refreshEngines() } }) {
                        Text("↻ فحص الاتصال الحقيقي")
                    }
                    OutlinedButton(onClick = openAiCenter) {
                        Text("مركز PentAGI")
                    }
                }
            }
        }
        engines.forEach { engine ->
            ElevatedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    Text(engine.name, style = MaterialTheme.typography.titleMedium)
                    Text(engine.status, style = MaterialTheme.typography.bodyMedium)
                    if (engine.detail.isNotBlank()) {
                        Text(
                            engine.detail,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }
        }
        ElevatedCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("🔎 نتائج تدقيق كود DEELA", style = MaterialTheme.typography.titleMedium)
                Text("هذه نتائج تدقيق المصدر، وليست نتيجة تشغيل محركات الاختبار الأربعة.",
                    style = MaterialTheme.typography.bodySmall)
                Text(auditText, style = MaterialTheme.typography.bodyMedium)
                OutlinedButton(enabled = !auditBusy, onClick = { scope.launch { refreshAudit() } }) {
                    Text("↻ تحديث تقارير GitHub")
                }
            }
        }
        Text(
            "التنفيذ عبر المحركات غير متاح حتى تتصل الأربعة بخدمات حقيقية موثقة ومصرح بها. " +
                "لا تُرسل كلمات مرور أو رموز تحقق إلى هذه اللوحة.",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall,
        )
    }
}
