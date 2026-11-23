package dev.aurastore.store.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
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
import org.json.JSONArray

private data class EmailDelivery(
    val requestId: String,
    val userId: String,
    val status: String,
    val failure: String,
    val sentAt: String,
)
private data class EmailDeliveryDashboard(val configured: Boolean, val messages: List<EmailDelivery>)

private object EmailDeliveryApi {
    private val client = OkHttpClient()
    private val base get() = BuildConfig.DEELA_API_BASE_URL.trimEnd('/')
    suspend fun dashboard(token: String): EmailDeliveryDashboard = withContext(Dispatchers.IO) {
        val request = Request.Builder().url(base + "/api/owner/subscription-email/status")
            .header("Authorization", "Bearer $token").get().build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) error("تعذر تحميل سجل البريد: ${response.code}")
            val json = JSONObject(response.body.string())
            val rows = json.optJSONArray("messages") ?: JSONArray()
            EmailDeliveryDashboard(json.optBoolean("ready"), (0 until rows.length()).map { i ->
                val m = rows.getJSONObject(i)
                EmailDelivery(
                    requestId = m.optString("request_id"),
                    userId = m.optString("user_id"),
                    status = m.optString("delivery_status"),
                    failure = m.optString("last_error_code"),
                    sentAt = m.optString("sent_at").takeUnless { it == "null" }.orEmpty(),
                )
            })
        }
    }

    suspend fun retry(token: String, requestId: String): String = withContext(Dispatchers.IO) {
        val body = JSONObject().put("request_id", requestId).toString()
            .toRequestBody("application/json".toMediaType())
        val request = Request.Builder().url(base + "/api/owner/subscription-email/retry")
            .header("Authorization", "Bearer $token").post(body).build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) error("تعذر إعادة إرسال الرسالة: ${response.code}")
            JSONObject(response.body.string()).optString("email_status")
        }
    }
}

private fun mailStatusArabic(status: String): String = when (status) {
    "sent" -> "قبل مزود البريد رسالة التفعيل"
    "unconfigured" -> "خدمة البريد غير مهيأة"
    "pending" -> "بانتظار الإرسال"
    "failed" -> "تعذر الإرسال"
    else -> "حالة غير معروفة"
}

@Composable
fun DeelaOwnerEmailScreen(token: String, emails: Map<String, String>) {
    val scope = rememberCoroutineScope()
    var model by remember { mutableStateOf<EmailDeliveryDashboard?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    var busy by remember { mutableStateOf(false) }
    LaunchedEffect(token, reload) {
        try {
            model = EmailDeliveryApi.dashboard(token)
            error = null
        } catch (e: Exception) {
            error = e.message ?: "تعذر التحقق من خدمة البريد"
        }
    }
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("رسائل تفعيل الاشتراكات", style = MaterialTheme.typography.titleLarge)
        Text(
            if (model?.configured == true) "خدمة البريد مهيأة للإرسال."
            else "خدمة البريد غير مهيأة بعد. فعالية الاشتراكات لا تتوقف، لكن الرسائل لا تُرسل حتى ضبط مزود البريد.",
            style = MaterialTheme.typography.bodySmall,
            color = if (model?.configured == true)
                MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.error,
        )
        Text("عند موافقتك على الطلب، تُحفظ رسالة توضح مدة الاشتراك وتاريخ البداية والنهاية. يمكنك إعادة محاولة الإرسال عند الحاجة.",
            style = MaterialTheme.typography.bodySmall)
        OutlinedButton(enabled = !busy, onClick = { reload++ }) { Text("تحديث حالات الرسائل") }
        if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
        message?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        val rows = model?.messages.orEmpty()
        if (rows.isEmpty()) Text("لم يتم اعتماد أي طلب اشتراك جديد منذ تفعيل سجل الرسائل.")
        LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(rows, key = { it.requestId }) { item ->
                ElevatedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Text(emails[item.userId].orEmpty().ifBlank { "حساب مشترك" },
                            style = MaterialTheme.typography.titleSmall)
                        Text(mailStatusArabic(item.status), style = MaterialTheme.typography.bodyMedium)
                        Text("مرجع الطلب: " + item.requestId.take(8), style = MaterialTheme.typography.bodySmall)
                        if (item.sentAt.isNotBlank()) {
                            Text("تاريخ قبول مزود البريد: " + item.sentAt.take(16).replace('T', ' '),
                                style = MaterialTheme.typography.bodySmall)
                        }
                        if (item.failure.isNotBlank() && item.failure != "null") {
                            Text("سبب آخر تعذر: " + item.failure, style = MaterialTheme.typography.bodySmall)
                        }
                        if (item.status != "sent") {
                            TextButton(enabled = !busy && model?.configured == true, onClick = {
                                busy = true
                                scope.launch {
                                    try {
                                        val status = EmailDeliveryApi.retry(token, item.requestId)
                                        message = mailStatusArabic(status)
                                        reload++
                                    } catch (e: Exception) {
                                        error = e.message ?: "تعذر إعادة إرسال التأكيد"
                                    } finally {
                                        busy = false
                                    }
                                }
                            }) { Text("إعادة إرسال رسالة التفعيل") }
                        }
                    }
                }
            }
        }
    }
}
