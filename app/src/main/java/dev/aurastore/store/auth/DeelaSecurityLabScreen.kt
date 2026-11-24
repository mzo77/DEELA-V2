package dev.aurastore.store.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Owner-only safe security lab.
 * Never connects to Snapchat or tries usernames/passwords on real accounts.
 * All demo results are synthetic and explicitly labeled.
 */
private object DeelaSecurityHubApi {
    private val client = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .callTimeout(30, TimeUnit.SECONDS).build()

    private val base get() = BuildConfig.DEELA_API_BASE_URL.trimEnd('/')
        .replace("/deela-control", "/deela-security-hub")

    suspend fun call(token: String, path: String, requestJson: JSONObject? = null): JSONObject =
        withContext(Dispatchers.IO) {
            val builder = Request.Builder()
                .url(base + path)
                .header("Authorization", "Bearer " + token)
                .header("Accept", "application/json")
                .apply {
                    if (requestJson == null) get()
                    else post(requestJson.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
                }
            client.newCall(builder.build()).execute().use { response ->
                val result = runCatching { JSONObject(response.body?.string().orEmpty()) }
                    .getOrElse { JSONObject().put("error", "رد غير مفهوم من الخدمة") }
                if (!response.isSuccessful) {
                    error(result.optString("error").ifBlank { "فشل طلب المختبر: " + response.code })
                }
                result
            }
        }
}

@Composable
private fun DeelaSecurityFlag(
    title: String,
    enabled: Boolean,
    onChecked: (Boolean) -> Unit
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Checkbox(checked = enabled, onCheckedChange = onChecked)
        Text(title, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
fun DeelaSecurityLabScreen(token: String, openAiCenter: () -> Unit) {
    val scope = rememberCoroutineScope()
    var catalog by remember { mutableStateOf("جارٍ فحص اتصال محركات الأمان...") }
    var refreshBusy by remember { mutableStateOf(false) }
    var platform by remember { mutableStateOf("deela-demo") }
    var username by remember { mutableStateOf("test_deela") }
    var mfa by remember { mutableStateOf(false) }
    var throttle by remember { mutableStateOf(false) }
    var lockout by remember { mutableStateOf(false) }
    var result by remember { mutableStateOf("المختبر جاهز لمحاكاة حماية تسجيل الدخول فقط.") }
    var running by remember { mutableStateOf(false) }

    suspend fun fetchCatalog() {
        refreshBusy = true
        runCatching { DeelaSecurityHubApi.call(token, "/engines") }
            .onSuccess { response ->
                val list = response.optJSONArray("engines")
                catalog = if (list == null || list.length() == 0) "تعذر قراءة قائمة المحركات."
                else (0 until list.length()).joinToString("\n") { i ->
                    val entry = list.getJSONObject(i)
                    "● " + entry.optString("name") + " — " +
                        if (entry.optString("runtime") == "not_deployed") "غير متصل؛ يحتاج خادم تشغيل" else entry.optString("runtime")
                }
            }
            .onFailure { catalog = "تعذر فحص حالة المحركات: " + (it.message ?: "خطأ اتصال") }
        refreshBusy = false
    }

    LaunchedEffect(token) { fetchCatalog() }

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("🛡️ DEELA — مختبر الأمان", style = MaterialTheme.typography.titleLarge)
        Text("مركز واحد لثلاثة مشاريع مفتوحة المصدر ومختبر محاكاة تسجيل الدخول. لا تُنفذ محاولات اختراق فعلية ضد Snapchat أو خدمات خارجية.",
            style = MaterialTheme.typography.bodyMedium)
        ElevatedCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("حالة المحركات", style = MaterialTheme.typography.titleMedium)
                Text(catalog, style = MaterialTheme.typography.bodyMedium)
                Text("Pentest Swarm AI • HexStrike AI • PentestGPT: ملفات المشاريع متاحة، لكن عملياتها ليست مستضافة أو متصلة بعد.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(enabled = !refreshBusy, onClick = { scope.launch { fetchCatalog() } }) {
                        Text("↻ تحديث")
                    }
                    OutlinedButton(onClick = openAiCenter) { Text("🤖 مركز PentAGI") }
                }
            }
        }
        ElevatedCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("محاكاة مقاومة التخمين والتحقق بخطوتين", style = MaterialTheme.typography.titleMedium)
                Text("تقييم افتراضي يعتمد على الإعدادات التي تختارها. لا ترسل كلمات مرور أو رموز 2FA.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = platform == "deela-demo", onClick = { platform = "deela-demo" },
                        label = { Text("DEELA — Test") })
                    FilterChip(selected = platform == "snapchat-demo", onClick = { platform = "snapchat-demo" },
                        label = { Text("Snapchat — Demo") })
                }
                OutlinedTextField(
                    modifier = Modifier.fillMaxWidth(),
                    value = username,
                    onValueChange = { if (it.length <= 37) username = it },
                    singleLine = true,
                    label = { Text("Test Username") },
                    placeholder = { Text("test_deela") }
                )
                DeelaSecurityFlag("Two-factor authentication (2FA) enabled", mfa) { mfa = it }
                DeelaSecurityFlag("Rate limiting enabled", throttle) { throttle = it }
                DeelaSecurityFlag("Temporary account lockout enabled", lockout) { lockout = it }
                Button(
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !running && Regex("^test_[A-Za-z0-9_]{3,32}$").matches(username),
                    onClick = {
                        running = true
                        result = "جارٍ تنفيذ المحاكاة المحلية..."
                        scope.launch {
                            runCatching {
                                DeelaSecurityHubApi.call(token, "/lab/simulate",
                                    JSONObject().put("platform", platform)
                                        .put("test_username", username)
                                        .put("mfa_enabled", mfa)
                                        .put("rate_limit_enabled", throttle)
                                        .put("lockout_enabled", lockout))
                            }.onSuccess { data ->
                                val events = data.optJSONArray("events")
                                val hints = data.optJSONArray("recommendations")
                                result = buildString {
                                    appendLine("✅ اكتملت المحاكاة الافتراضية. طلبات حقيقية: 0")
                                    appendLine("محاولات افتراضية: " + data.optInt("attempts_simulated"))
                                    appendLine("حالة حماية الدخول: " +
                                        data.optJSONObject("checks")?.optString("password_guessing_protection"))
                                    appendLine("حالة 2FA: " + data.optJSONObject("checks")?.optString("two_factor"))
                                    if (events != null) {
                                        appendLine("\nسيناريو المحاكاة:")
                                        for (i in 0 until events.length()) appendLine("• " + events.optString(i))
                                    }
                                    if (hints != null) {
                                        appendLine("\nالتوصيات:")
                                        for (i in 0 until hints.length()) appendLine("• " + hints.optString(i))
                                    }
                                    appendLine("\n" + data.optString("notice"))
                                }
                            }.onFailure {
                                result = "فشلت المحاكاة: " + (it.message ?: "خطأ اتصال")
                            }
                            running = false
                        }
                    }
                ) { Text(if (running) "جارٍ الاختبار..." else "▶ Start Demo Assessment") }
                if (!Regex("^test_[A-Za-z0-9_]{3,32}$").matches(username))
                    Text("استخدم اسمًا تجريبيًا يبدأ بـ test_ ثم 3 إلى 32 حرفًا أو رقمًا فقط.",
                        style = MaterialTheme.typography.bodySmall)
                Text(result, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}
