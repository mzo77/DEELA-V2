package dev.aurastore.store.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
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
import java.time.Instant
import java.time.OffsetDateTime
import java.util.concurrent.TimeUnit

/**
 * This is a real fail-closed UI gate, NOT a substitute for subscription authorization
 * on DEELA's API/download services. No offline/demo bypass and no bundled credentials.
 *
 * Expected HTTPS contract:
 * POST /api/v1/auth/login {email,password,platform:"android"} -> {access_token}
 * GET /api/v1/entitlements/me Authorization: Bearer token -> {active,expires_at}
 *
 * Trial memberships are activated/revoked by the administrator on the backend.
 */
data class DeelaSession(val token: String, val expiresAtEpochMs: Long)

object DeelaAuthApi {
    private val endpoint: String get() = BuildConfig.DEELA_API_BASE_URL.trim().trimEnd('/')
    private val client = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .callTimeout(20, TimeUnit.SECONDS)
        .build()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    suspend fun login(email: String, password: String): Result<DeelaSession> =
        withContext(Dispatchers.IO) {
            runCatching {
                val base = endpoint
                require(base.startsWith("https://") && base.length > 10) {
                    "خدمة الاشتراكات لم تُربط بعد. تواصل مع إدارة ديلا."
                }
                val input = JSONObject().put("email", email.trim())
                    .put("password", password).put("platform", "android")
                val request = Request.Builder().url("$base/api/v1/auth/login")
                    .post(input.toString().toRequestBody(jsonType)).build()
                val token = client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) error("بيانات الدخول غير صحيحة أو الحساب غير مفعل.")
                    JSONObject(response.body.string()).optString("access_token")
                }
                require(token.isNotBlank()) { "لم يتم استلام رمز دخول صالح." }
                val access = entitlement(token)
                require(access != null) { "الاشتراك غير مفعل أو انتهت مدته." }
                access
            }
        }

    suspend fun check(token: String): Boolean = withContext(Dispatchers.IO) {
        runCatching { entitlement(token) != null }.getOrDefault(false)
    }

    private fun entitlement(token: String): DeelaSession? {
        val base = endpoint
        if (!base.startsWith("https://")) return null
        val request = Request.Builder().url("$base/api/v1/entitlements/me")
            .header("Authorization", "Bearer $token").get().build()
        return client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return@use null
            val body = JSONObject(response.body.string())
            if (!body.optBoolean("active", false)) return@use null
            val expiry = if (body.has("expires_at_epoch")) {
                body.optLong("expires_at_epoch") * 1000L
            } else {
                runCatching { Instant.parse(body.optString("expires_at")).toEpochMilli() }
                    .recoverCatching { OffsetDateTime.parse(body.optString("expires_at")).toInstant().toEpochMilli() }
                    .getOrDefault(0L)
            }
            if (expiry <= System.currentTimeMillis()) null else DeelaSession(token, expiry)
        }
    }
}

/** Displayed immediately after the original animated DEELA star, before any store route. */
@Composable
fun DeelaAccessScreen(onAuthenticated: (DeelaSession) -> Unit) {
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(horizontal = 28.dp, vertical = 36.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                "تطبيقات ديلا",
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.height(10.dp))
            Text("مرحبًا بكم في متجر ديلا ❤️", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(12.dp))
            Text(
                "سجّل دخولك باشتراك فعّال، أو اطلب من الإدارة تفعيل تجربة مجانية لمدة 24 ساعة.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium,
            )
            Spacer(Modifier.height(30.dp))
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("البريد الإلكتروني") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
            )
            Spacer(Modifier.height(14.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("كلمة المرور") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
            )
            Spacer(Modifier.height(22.dp))
            Button(
                enabled = !busy && email.isNotBlank() && password.isNotBlank(),
                onClick = {
                    busy = true
                    error = null
                    scope.launch {
                        val result = DeelaAuthApi.login(email, password)
                        busy = false
                        result.fold(onSuccess = onAuthenticated, onFailure = {
                            error = it.message ?: "تعذر التحقق من الاشتراك."
                        })
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
            ) {
                if (busy) CircularProgressIndicator()
                else Text("تسجيل الدخول")
            }
            if (error != null) {
                Spacer(Modifier.height(14.dp))
                Text(
                    error.orEmpty(),
                    color = MaterialTheme.colorScheme.error,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            Spacer(Modifier.height(26.dp))
            Text(
                "التجربة المجانية يمنحها مالك المتجر. لا يمكن فتح المتجر بدون صلاحية مؤكدة من الخادم.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
