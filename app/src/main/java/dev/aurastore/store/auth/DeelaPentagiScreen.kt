package dev.aurastore.store.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ElevatedCard
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

/** Owner-only PentAGI adapter. All credentials are held in Supabase, never in the APK. */
private object DeelaPentagiApi {
    private val client = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS).readTimeout(35, TimeUnit.SECONDS)
        .callTimeout(45, TimeUnit.SECONDS).build()
    private val base get() = BuildConfig.DEELA_API_BASE_URL
        .trimEnd('/').replace("/deela-control", "/deela-owner-agent")

    suspend fun call(token: String, path: String, payload: JSONObject? = null): JSONObject =
        withContext(Dispatchers.IO) {
            val request = Request.Builder().url(base + path)
                .header("Authorization", "Bearer " + token)
                .header("Accept", "application/json")
                .apply {
                    if (payload == null) get()
                    else post(payload.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
                }.build()
            client.newCall(request).execute().use { response ->
                val json = runCatching { JSONObject(response.body?.string().orEmpty()) }
                    .getOrElse { JSONObject().put("error", "رد الخادم غير مفهوم") }
                if (!response.isSuccessful) {
                    error(json.optString("error").ifBlank { "فشل الطلب: " + response.code })
                }
                json
            }
        }
}

/**
 * One natural-language command box across the DEELA owner toolkit.
 * PentAGI runs ONLY on a separately hosted authorized environment; this screen never
 * claims that server-side files or device folders are automatically accessible.
 */
@Composable
fun DeelaPentagiScreen(token: String, openOriginalToolkit: () -> Unit) {
    val scope = rememberCoroutineScope()
    var prompt by remember { mutableStateOf("") }
    var folder by remember { mutableStateOf("") }
    var confirmed by remember { mutableStateOf(false) }
    var ready by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(true) }
    var working by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf("جارٍ التحقق من اتصال PentAGI...") }
    var results by remember { mutableStateOf("") }
    var lastFlow by remember { mutableStateOf("") }

    fun refresh() {
        scope.launch {
            loading = true
            runCatching { DeelaPentagiApi.call(token, "/pentagi/status") }
                .onSuccess { body ->
                    ready = body.optBoolean("ready")
                    status = if (ready) {
                        "متصل بخادم PentAGI. نطاق الاختبار المصرح: " + body.optString("scope")
                    } else {
                        "لم يكتمل تشغيل خادم PentAGI المجاني بعد. فعّل خادمك الخاص واضبط DEELA_PENTAGI_URL وDEELA_PENTAGI_TOKEN وDEELA_PENTAGI_SCOPE_URL في Supabase. ما زالت أدوات القوة الغاشمة المحلية ووكيل البرمجة متاحة."
                    }
                }
                .onFailure {
                    ready = false
                    status = "تعذر فحص اتصال PentAGI: " + (it.message ?: "تحقق من الشبكة")
                }
            loading = false
        }
    }
    LaunchedEffect(token) {
        loading = true
        runCatching { DeelaPentagiApi.call(token, "/pentagi/status") }
            .onSuccess { body ->
                ready = body.optBoolean("ready")
                status = if (ready) {
                    "متصل بخادم PentAGI. نطاق الاختبار المصرح: " + body.optString("scope")
                } else {
                    "لم يُربط خادم PentAGI بعد. تشغيله يتطلب استضافة Docker وOllama على جهازك أو خادمك، ثم ضبط أسراره في Supabase."
                }
            }
            .onFailure {
                ready = false
                status = "تعذر التحقق من PentAGI: " + (it.message ?: "خطأ اتصال")
            }
        loading = false
    }

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("🤖 مركز الذكاء الاصطناعي — DEELA", style = MaterialTheme.typography.titleLarge)
        Text(
            "مربع الأوامر الموحد لمهام أمن مشاريعك. يعمل PentAGI على خادمك ويتعامل مع المواقع والمجلدات التي أُتيحت له بصلاحيات واضحة. وكيل البرمجة العربي موجود أصلًا داخل قسم القوة الغاشمة.",
            style = MaterialTheme.typography.bodyMedium
        )
        ElevatedCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                Text("حالة الربط", style = MaterialTheme.typography.titleMedium)
                Text(status, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedButton(onClick = { refresh() }, enabled = !loading) { Text("↻ فحص الاتصال") }
                    OutlinedButton(onClick = openOriginalToolkit) { Text("⚡ أدوات القوة الغاشمة") }
                }
            }
        }
        ElevatedCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("اكتب أمرك بالعربي", style = MaterialTheme.typography.titleMedium)
                OutlinedTextField(
                    value = prompt,
                    onValueChange = { if (it.length <= 4000) prompt = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("وش تبي الذكاء ينفذ أو يحلل؟") },
                    placeholder = { Text("افحص مشروعي التجريبي، حلل إعدادات الأمان، وارجع لي بتقرير واضح ونتائج قابلة للتحقق") },
                    minLines = 5,
                    maxLines = 12
                )
                OutlinedTextField(
                    value = folder,
                    onValueChange = { if (it.length <= 200) folder = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("اسم المجلد المرجعي (اختياري)") },
                    placeholder = { Text("مثال: security-reports") },
                    singleLine = true
                )
                Text(
                    "كتابة اسم المجلد لا تمنح الوصول إلى ملفاته. ارفع ملفاتك من أدوات التحليل المحلية أو وفّر المجلد للخادم صراحةً.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = confirmed, onCheckedChange = { confirmed = it })
                    Text("أؤكد أن المشروع والهدف ضمن ملكيتي أو لدي إذن صريح لفحصهما.",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.weight(1f))
                }
                Button(
                    modifier = Modifier.fillMaxWidth(),
                    enabled = ready && confirmed && !working && prompt.trim().length >= 10,
                    onClick = {
                        working = true
                        results = "جارٍ طلب المهمة من خادم PentAGI..."
                        scope.launch {
                            runCatching {
                                DeelaPentagiApi.call(token, "/pentagi/execute",
                                    JSONObject().put("prompt", prompt.trim())
                                        .put("folder", folder.trim())
                                        .put("confirm_scope", true))
                            }.onSuccess { response ->
                                lastFlow = response.optString("flow_id")
                                results = if (response.optBoolean("queued")) {
                                    "تم إنشاء مهمة في PentAGI. رقم المتابعة: " + lastFlow +
                                    ". النتائج ليست مكتملة بعد؛ راجع قائمة المهام لمتابعة التنفيذ."
                                } else {
                                    response.optString("error", "لم يُؤكَّد بدء المهمة")
                                }
                            }.onFailure {
                                results = "لم يبدأ التنفيذ: " + (it.message ?: "خطأ غير معروف")
                            }
                            working = false
                        }
                    }
                ) { Text(if (working) "جارٍ الإرسال..." else "🚀 نفّذ وحلّل عبر PentAGI") }
                if (!ready) {
                    Text("زر التنفيذ غير مفعل حتى يصبح خادم PentAGI متصلًا. لا توجد أي عمليات أمنية بدأت تلقائيًا.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall)
                }
                if (results.isNotBlank()) Text(results)
            }
        }
        ElevatedCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("النتائج وسجل المهام", style = MaterialTheme.typography.titleMedium)
                Button(
                    enabled = ready && !working,
                    onClick = {
                        working = true
                        scope.launch {
                            runCatching { DeelaPentagiApi.call(token, "/pentagi/flows") }
                                .onSuccess { data -> results = data.opt("flows")?.toString()?.take(3500) ?: "لا توجد مهام" }
                                .onFailure { results = "تعذر قراءة المهام: " + (it.message ?: "خطأ") }
                            working = false
                        }
                    }
                ) { Text("تحديث نتائج PentAGI") }
                if (lastFlow.isNotBlank()) Text("آخر مهمة: " + lastFlow)
                Text(results.ifBlank { "لم تصل نتائج بعد." }, style = MaterialTheme.typography.bodySmall)
            }
        }
        Spacer(Modifier.height(18.dp))
    }
}
