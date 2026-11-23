package dev.aurastore.store.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.aurastore.store.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject

@Composable
fun DeelaOwnerScreen(session: DeelaSession, onLogout: () -> Unit) {
    var summary by remember { mutableStateOf("جاري تحميل بيانات لوحة المالك...") }
    LaunchedEffect(session.token) {
        summary = withContext(Dispatchers.IO) {
            runCatching {
                val url = BuildConfig.DEELA_API_BASE_URL.trimEnd('/') + "/api/owner/dashboard"
                val request = Request.Builder().url(url)
                    .header("Authorization", "Bearer " + session.token).get().build()
                OkHttpClient().newCall(request).execute().use { response ->
                    if (!response.isSuccessful) error("تعذر تحميل لوحة التحكم: " + response.code)
                    val data = JSONObject(response.body.string())
                    val keys = data.keys().asSequence().toList()
                    "اتصال لوحة المالك ناجح\\n" + keys.joinToString(" • ")
                }
            }.getOrElse { "تعذر تحميل لوحة المالك: " + (it.message ?: "خطأ غير معروف") }
        }
    }
    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Spacer(Modifier.height(30.dp))
            Text("تطبيقات ديلا ❤️", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
            Text("لوحة تحكم المالك 👑", style = MaterialTheme.typography.headlineSmall)
            Text(summary, style = MaterialTheme.typography.bodyMedium)
            HorizontalDivider()
            Text("إدارة المشتركين والاشتراكات", style = MaterialTheme.typography.titleMedium)
            Text("لوحة الإدارة داخل تطبيق ديلا، محمية بصلاحية المالك من الخادم.")
            Text("قوة غاشمة ⚡", style = MaterialTheme.typography.titleMedium)
            Text("الأدوات المتقدمة قيد الربط. لن تظهر واجهة المشتركين لحساب المالك.")
            OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth()) { Text("تسجيل الخروج") }
        }
    }
}
