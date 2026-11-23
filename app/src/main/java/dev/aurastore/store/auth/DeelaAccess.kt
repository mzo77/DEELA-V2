package dev.aurastore.store.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.FilterChip
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.TextButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalAutofillManager
import androidx.compose.ui.autofill.ContentType
import androidx.compose.ui.semantics.contentType
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
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
import java.net.UnknownHostException
import java.net.SocketTimeoutException
import java.net.ConnectException
import javax.net.ssl.SSLException
import java.io.IOException
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
data class DeelaSession(
    val token: String,
    val expiresAtEpochMs: Long,
    val role: String = "subscriber",
    val subscriptionActive: Boolean = true,
    val refreshToken: String = "",
)

sealed interface DeelaSessionCheck {
    data class Verified(val session: DeelaSession) : DeelaSessionCheck
    data object Invalid : DeelaSessionCheck
    data object Unavailable : DeelaSessionCheck
}

/**
 * Translate transport failures without exposing backend hostnames or treating a DNS error
 * as a wrong password, invalid membership, or expired recovery link.
 */
private fun deelaErrorForUser(failure: Throwable): String {
    var problem: Throwable? = failure
    repeat(8) {
        when (problem) {
            is UnknownHostException -> return "تعذر العثور على خادم ديلا عبر DNS. جرّب شبكة Wi-Fi أو بيانات الهاتف، وأوقف DNS الخاص أو VPN مؤقتًا إن كنت تستخدمهما. لم تتغير بيانات حسابك."
            is SocketTimeoutException -> return "انتهت مهلة الاتصال بخادم ديلا. تأكد من استقرار الإنترنت وحاول مرة أخرى."
            is ConnectException -> return "تعذر الاتصال بخادم ديلا حاليًا. جرّب شبكة أخرى ثم أعد المحاولة."
            is SSLException -> return "تعذر إنشاء اتصال آمن بخادم ديلا. تحقق من ضبط التاريخ والوقت واتصال الشبكة."
        }
        problem = problem?.cause
    }
    if (failure is IOException) return "تعذر الاتصال بالإنترنت أو خادم ديلا. تحقق من الشبكة ثم أعد المحاولة."
    return failure.message?.takeIf { it.isNotBlank() } ?: "حدث خطأ غير متوقع. حاول مجددًا."
}

object DeelaAuthApi {
    private val endpoint: String get() = BuildConfig.DEELA_API_BASE_URL.trim().trimEnd('/')
    private val client = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .callTimeout(20, TimeUnit.SECONDS)
        .build()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    /** Public health endpoint only; never sends credentials or changes account state. */
    suspend fun testServerConnection(): Result<String> = withContext(Dispatchers.IO) {
        runCatching {
            require(endpoint.startsWith("https://")) { "عنوان الخادم غير مضبوط في هذا الإصدار." }
            val request = Request.Builder().url("$endpoint/health").get().build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) error("الخادم يستجيب ولكن فحص الخدمة أعاد الرمز ${response.code}.")
                val body = JSONObject(response.body.string())
                require(body.optBoolean("ok", false)) { "الخادم يستجيب ولكن فحص الخدمة لم ينجح." }
                "الاتصال بخادم ديلا يعمل بنجاح ✅"
            }
        }
    }

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
                val loginResult = client.newCall(request).execute().use { response ->
                    val body = response.body.string()
                    if (!response.isSuccessful) {
                        val reason = runCatching { JSONObject(body).optString("error") }.getOrNull()
                        error(reason?.takeIf { it.isNotBlank() } ?: "تعذر تسجيل الدخول أو الاشتراك غير فعال.")
                    }
                    JSONObject(body)
                }
                val token = loginResult.optString("access_token")
                val refreshToken = loginResult.optString("refresh_token")
                require(token.isNotBlank() && refreshToken.isNotBlank()) { "لم يتم استلام جلسة دخول صالحة." }
                val access = entitlement(token)
                if (access == null && !loginResult.optBoolean("subscription_active", true)) {
                    DeelaSession(token, 0L, loginResult.optString("role", "subscriber"), false, refreshToken)
                } else {
                    require(access != null) { "تعذر التحقق من صلاحية الاشتراك." }
                    access.copy(role = loginResult.optString("role", "subscriber"), subscriptionActive = true, refreshToken = refreshToken)
                }
            }
        }

    suspend fun register(email: String, password: String, displayName: String, months: Int): Result<String> = withContext(Dispatchers.IO) {
        runCatching {
            require(email.contains("@") && password.length >= 8) { "أدخل بريدًا صحيحًا وكلمة مرور من 8 رموز على الأقل." }
            val payload = JSONObject().put("email", email.trim()).put("password", password).put("display_name", displayName.trim()).put("months", months)
            val request = Request.Builder().url("$endpoint/api/v1/auth/register")
                .post(payload.toString().toRequestBody(jsonType)).build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    val body = response.body.string()
                    val message = runCatching { JSONObject(body).optString("error") }.getOrDefault("")
                    error(message.ifBlank { "تعذر إنشاء الحساب (رمز ${response.code}). حاول لاحقًا." })
                }
            }
            "تم طلب إنشاء الحساب. افتح بريدك لتأكيده ثم سجل الدخول لطلب الاشتراك."
        }
    }

    suspend fun submitSubscription(token: String, months: Int): Result<String> = withContext(Dispatchers.IO) {
        runCatching {
            val payload = JSONObject().put("months", months).put("platform", "android")
            val request = Request.Builder().url("$endpoint/api/v1/requests")
                .header("Authorization", "Bearer $token")
                .post(payload.toString().toRequestBody(jsonType)).build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) error("يوجد طلب سابق قيد المراجعة أو تعذر إرسال الطلب.")
            }
            "تم إرسال طلبك إلى لوحة المالك. انتظر الموافقة."
        }
    }

    suspend fun requestSubscription(email: String, password: String, months: Int): Result<String> = withContext(Dispatchers.IO) {
        runCatching {
            val loginPayload = JSONObject().put("email", email.trim()).put("password", password).put("platform", "android")
            val loginRequest = Request.Builder().url("$endpoint/api/v1/auth/login")
                .post(loginPayload.toString().toRequestBody(jsonType)).build()
            val token = client.newCall(loginRequest).execute().use { response ->
                if (response.isSuccessful) JSONObject(response.body.string()).optString("access_token")
                else ""
            }
            require(token.isNotBlank()) { "طلب الاشتراك يحتاج جلسة حساب. سنربط تسجيل الدخول للحساب غير النشط في التحديث القادم." }
            val payload = JSONObject().put("months", months).put("platform", "android")
            val request = Request.Builder().url("$endpoint/api/v1/requests")
                .header("Authorization", "Bearer $token")
                .post(payload.toString().toRequestBody(jsonType)).build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) error("تعذر إرسال طلب الاشتراك.")
            }
            "تم إرسال طلب الاشتراك إلى المالك."
        }
    }

    suspend fun requestPasswordRecovery(email: String): Result<String> = withContext(Dispatchers.IO) {
        runCatching {
            require(email.trim().contains("@")) { "أدخل البريد الإلكتروني المسجل في ديلا." }
            val request = Request.Builder().url("$endpoint/api/v1/auth/recover")
                .post(JSONObject().put("email", email.trim()).toString().toRequestBody(jsonType)).build()
            client.newCall(request).execute().use { response ->
                if (response.code == 429) error("طلبات استعادة كلمة المرور كثيرة حاليًا. انتظر قليلًا قبل طلب رابط جديد.")
                if (!response.isSuccessful) error("تعذر إرسال رابط الاستعادة. حاول لاحقًا.")
            }
            "إذا كان البريد مسجلًا فستصلك رسالة الاستعادة. افتح أحدث رسالة، وتحقق من البريد غير المرغوب فيه. لا تطلب روابط متعددة؛ استخدم أحدث رابط فقط."
        }
    }

    suspend fun check(token: String): Boolean = withContext(Dispatchers.IO) {
        runCatching { entitlement(token) != null }.getOrDefault(false)
    }

    /** A failed network call must never be mistaken for a revoked subscription. */
    suspend fun checkSession(session: DeelaSession): DeelaSessionCheck = withContext(Dispatchers.IO) {
        try {
            val base = endpoint
            if (!base.startsWith("https://")) return@withContext DeelaSessionCheck.Unavailable
            val request = Request.Builder().url("$base/api/v1/entitlements/me")
                .header("Authorization", "Bearer ${session.token}").get().build()
            client.newCall(request).execute().use { response ->
                if (response.code == 401 || response.code == 403) {
                    return@withContext refreshSession(session.refreshToken)
                }
                if (!response.isSuccessful) return@withContext DeelaSessionCheck.Unavailable
                val body = JSONObject(response.body.string())
                val expiry = if (body.optBoolean("active", false)) {
                    body.optLong("expires_at_epoch", 0L) * 1000L
                } else 0L
                val active = body.optBoolean("active", false) && expiry > System.currentTimeMillis()
                DeelaSessionCheck.Verified(session.copy(expiresAtEpochMs = expiry, subscriptionActive = active))
            }
        } catch (_: Exception) {
            DeelaSessionCheck.Unavailable
        }
    }

    /** Refreshes an expiring Supabase JWT without ever keeping the user's password. */
    suspend fun restore(refreshToken: String): DeelaSessionCheck = withContext(Dispatchers.IO) {
        try { refreshSession(refreshToken) } catch (_: Exception) { DeelaSessionCheck.Unavailable }
    }

    private fun refreshSession(refreshToken: String): DeelaSessionCheck {
        if (refreshToken.isBlank()) return DeelaSessionCheck.Invalid
        val base = endpoint
        if (!base.startsWith("https://")) return DeelaSessionCheck.Unavailable
        val payload = JSONObject().put("refresh_token", refreshToken).put("platform", "android")
        val request = Request.Builder().url("$base/api/v1/auth/refresh")
            .post(payload.toString().toRequestBody(jsonType)).build()
        return client.newCall(request).execute().use { response ->
            if (response.code == 400 || response.code == 401 || response.code == 403) {
                return@use DeelaSessionCheck.Invalid
            }
            if (!response.isSuccessful) return@use DeelaSessionCheck.Unavailable
            val result = JSONObject(response.body.string())
            val newToken = result.optString("access_token")
            val newRefreshToken = result.optString("refresh_token")
            if (newToken.isBlank() || newRefreshToken.isBlank()) return@use DeelaSessionCheck.Unavailable
            val expiry = result.optLong("expires_at_epoch", 0L) * 1000L
            val active = result.optBoolean("subscription_active", false) && expiry > System.currentTimeMillis()
            DeelaSessionCheck.Verified(
                DeelaSession(newToken, expiry, result.optString("role", "subscriber"), active, newRefreshToken)
            )
        }
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
    val autofillManager = LocalAutofillManager.current
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var recoveryMode by remember { mutableStateOf(false) }
    var registerMode by remember { mutableStateOf(false) }
    var displayName by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var selectedMonths by remember { mutableIntStateOf(1) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var connectionStatus by remember { mutableStateOf<String?>(null) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 28.dp, vertical = 36.dp),
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
                label = { Text("اسم المستخدم أو البريد الإلكتروني") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                modifier = Modifier.fillMaxWidth().semantics { contentType = ContentType.Username + ContentType.EmailAddress },
                shape = RoundedCornerShape(16.dp),
            )
            if (registerMode) {
                Spacer(Modifier.height(14.dp))
                OutlinedTextField(value = displayName, onValueChange = { displayName = it }, label = { Text("الاسم الظاهر") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            }
            Spacer(Modifier.height(14.dp))
            if (!recoveryMode) OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("كلمة المرور") },
                singleLine = true,
                visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                trailingIcon = {
                    TextButton(onClick = { showPassword = !showPassword }) {
                        Text(if (showPassword) "إخفاء" else "👁")
                    }
                },
                modifier = Modifier.fillMaxWidth().semantics { contentType = ContentType.Password },
                shape = RoundedCornerShape(16.dp),
            )
            if (registerMode) {
                Spacer(Modifier.height(14.dp))
                OutlinedTextField(value = confirmPassword, onValueChange = { confirmPassword = it }, label = { Text("تأكيد كلمة المرور") }, singleLine = true, visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
            }
            if (registerMode) {
                Spacer(Modifier.height(14.dp))
                Text("مدة الاشتراك المطلوبة", style = MaterialTheme.typography.titleMedium)
                Row(modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())) {
                    listOf(1, 2, 3, 6, 12).forEach { m ->
                        FilterChip(
                            selected = selectedMonths == m,
                            onClick = { selectedMonths = m },
                            label = { Text(if (m == 12) "سنة" else "$m شهر") },
                            modifier = Modifier.padding(end = 8.dp)
                        )
                    }
                }
                Text("يُرسل طلب المدة بعد تأكيد البريد وتسجيل الدخول، ولا يُفعّل إلا بموافقة المالك.", style = MaterialTheme.typography.bodySmall)
            }
            Spacer(Modifier.height(22.dp))
            Button(
                enabled = !busy && email.isNotBlank() && (recoveryMode || password.isNotBlank()) && (!registerMode || (displayName.isNotBlank() && password.length >= 8 && confirmPassword == password)),
                onClick = {
                    busy = true
                    error = null
                    scope.launch {
                        if (registerMode) {
                            val result = DeelaAuthApi.register(email, password, displayName, selectedMonths)
                            busy = false
                            result.fold(onSuccess = { error = it }, onFailure = { error = deelaErrorForUser(it) })
                        } else if (recoveryMode) {
                            val result = DeelaAuthApi.requestPasswordRecovery(email)
                            busy = false
                            result.fold(onSuccess = { error = it }, onFailure = {
                                error = deelaErrorForUser(it)
                            })
                        } else {
                            val result = DeelaAuthApi.login(email, password)
                            busy = false
                            result.fold(onSuccess = { session ->
                                autofillManager?.commit()
                                onAuthenticated(session)
                            }, onFailure = {
                                error = deelaErrorForUser(it)
                            })
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
            ) {
                if (busy) CircularProgressIndicator()
                else Text(if (registerMode) "إنشاء حساب جديد" else if (recoveryMode) "إرسال رابط استعادة كلمة المرور" else "تسجيل الدخول")
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
            TextButton(
                enabled = !busy,
                onClick = {
                    busy = true
                    connectionStatus = null
                    scope.launch {
                        val result = DeelaAuthApi.testServerConnection()
                        busy = false
                        connectionStatus = result.fold(
                            onSuccess = { it },
                            onFailure = { deelaErrorForUser(it) }
                        )
                    }
                }
            ) { Text("فحص الاتصال بخادم ديلا") }
            connectionStatus?.let { status ->
                Text(
                    status,
                    color = MaterialTheme.colorScheme.onSurface,
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            TextButton(onClick = { recoveryMode = !recoveryMode; registerMode = false; error = null }) {
                Text(if (recoveryMode) "العودة إلى تسجيل الدخول" else "نسيت كلمة المرور؟")
            }
            TextButton(onClick = { registerMode = !registerMode; recoveryMode = false; error = null }) {
                Text(if (registerMode) "العودة لتسجيل الدخول" else "إنشاء حساب جديد")
            }
            Spacer(Modifier.height(26.dp))
            Text(
                "يمكنك حفظ كلمة المرور تلقائيًا عبر مدير كلمات المرور في الهاتف. تجربة 24 ساعة يمنحها مالك ديلا.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
