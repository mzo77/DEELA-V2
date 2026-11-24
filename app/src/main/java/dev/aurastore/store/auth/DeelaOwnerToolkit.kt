package dev.aurastore.store.auth

import android.annotation.SuppressLint
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.speech.RecognizerIntent
import android.app.Activity
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.Keep
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import dev.aurastore.store.BuildConfig
import kotlinx.coroutines.CoroutineScope
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
 * The complete DEELA 3.7 command center is a bundled app asset. Original file analysis
 * runs locally inside a restricted WebView. The bridge exists ONLY for owner accounts;
 * no bearer token or provider API secret is inserted into the JavaScript page.
 */
@Composable
@SuppressLint("SetJavaScriptEnabled")
fun DeelaOwnerToolkit(token: String) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val web = remember { WebView(context) }
    var filePicker by remember { mutableStateOf<ValueCallback<Array<Uri>>?>(null) }
    var pendingText by remember { mutableStateOf("") }

    val fileLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        filePicker?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data))
        filePicker = null
    }
    val speechLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val recognized = if (result.resultCode == Activity.RESULT_OK)
            result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull() else null
        val callback = if (recognized.isNullOrBlank()) "deelaVoiceError" else "deelaVoiceText"
        val safe = recognized?.take(1400) ?: "لم يتم التعرف على الكلام؛ تأكد من تفعيل خدمات الإملاء في جهازك."
        web.evaluateJavascript("window.$callback(${JSONObject.quote(safe)})", null)
    }
    val saveLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/plain")) { uri ->
        if (uri != null) {
            val saved = pendingText
            scope.launch(Dispatchers.IO) {
                runCatching {
                    context.contentResolver.openOutputStream(uri)?.use { out ->
                        out.write(saved.toByteArray(Charsets.UTF_8))
                    } ?: error("تعذر فتح ملف التقرير")
                }.onFailure { failure ->
                    withContext(Dispatchers.Main) {
                        Toast.makeText(context, failure.message ?: "تعذر حفظ التقرير", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }
        pendingText = ""
    }
    DisposableEffect(web) {
        onDispose {
            filePicker?.onReceiveValue(null)
            filePicker = null
            web.stopLoading()
            web.removeJavascriptInterface("DeelaToolsNative")
            web.destroy()
        }
    }
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = {
            web.settings.javaScriptEnabled = true
            web.settings.domStorageEnabled = false
            web.settings.allowFileAccess = false
            web.settings.allowContentAccess = false
            web.settings.setSupportMultipleWindows(false)
            web.settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            web.settings.javaScriptCanOpenWindowsAutomatically = false
            web.addJavascriptInterface(
                OwnerToolBridge(context, web, scope, token, onSpeech = {
                    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                        putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ar-SA")
                        putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "ar-SA")
                        putExtra(RecognizerIntent.EXTRA_PROMPT, "تكلم بالعربي، قل وش تبي ديلا يسوي")
                        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                    }
                    runCatching { speechLauncher.launch(intent) }
                        .onFailure {
                            web.evaluateJavascript(
                                "window.deelaVoiceError(${JSONObject.quote("لا توجد خدمة تعرف على الكلام في الجهاز. تقدر تكتب الأمر أو تفعّل إملاء Google.")})",
                                null,
                            )
                        }
                }, onSave = { filename, content ->
                    pendingText = content
                    val safeName = filename.take(70).map { ch ->
                        if (ch.isLetterOrDigit() || ch == '.' || ch == '-' || ch == '_') ch else '_'
                    }.joinToString("").ifBlank { "deela-report.txt" }
                    saveLauncher.launch(safeName)
                }),
                "DeelaToolsNative",
            )
            web.webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    webView: WebView?, filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    if (filePathCallback == null) return false
                    filePicker?.onReceiveValue(null)
                    filePicker = filePathCallback
                    val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                        type = "*/*"
                        addCategory(Intent.CATEGORY_OPENABLE)
                        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                    }
                    fileLauncher.launch(Intent.createChooser(intent, "اختيار الملفات لفحصها محليًا"))
                    return true
                }
            }
            web.webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val uri = request?.url ?: return true
                    if (uri.scheme == "https" && uri.host == "github.com") {
                        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, uri)) }
                    }
                    // Never navigate the trusted JS bridge to an external website.
                    return true
                }
                override fun onPageFinished(view: WebView?, url: String?) {
                    web.evaluateJavascript("window.DeelaToolsNative?.checkAI?.()", null)
                    web.evaluateJavascript("window.DeelaToolsNative?.checkAgent?.()", null)
                    web.evaluateJavascript("window.DeelaToolsNative?.checkEngines?.()", null)
                }
            }
            val html = context.assets.open("deela_owner_toolkit.html").bufferedReader().use { it.readText() }
            web.loadDataWithBaseURL(
                "https://appassets.androidplatform.net/deela-owner/",
                html, "text/html", "UTF-8", null,
            )
            web
        },
    )
}

@Keep
private class OwnerToolBridge(
    private val context: Context,
    private val web: WebView,
    private val scope: CoroutineScope,
    private val token: String,
    private val onSpeech: () -> Unit,
    private val onSave: (String, String) -> Unit,
) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(65, TimeUnit.SECONDS)
        .callTimeout(72, TimeUnit.SECONDS)
        .build()
    private val api = BuildConfig.DEELA_API_BASE_URL.replace("/deela-control", "/deela-owner-ai")
    private val agentApi = BuildConfig.DEELA_API_BASE_URL.replace("/deela-control", "/deela-owner-agent")
    private val securityHubApi = BuildConfig.DEELA_API_BASE_URL.replace("/deela-control", "/deela-security-hub")

    private fun deliver(callback: String, result: JSONObject) {
        web.post { web.evaluateJavascript("window.$callback(${JSONObject.quote(result.toString())})", null) }
    }

    @JavascriptInterface
    fun checkAI() {
        scope.launch(Dispatchers.IO) {
            val response = runCatching {
                val request = Request.Builder().url(api + "/status")
                    .header("Authorization", "Bearer " + token).get().build()
                client.newCall(request).execute().use { res ->
                    if (!res.isSuccessful) error("تعذر فحص الخدمة: " + res.code)
                    JSONObject(res.body.string())
                }
            }.getOrElse { JSONObject().put("ready", false).put("error", "تعذر الاتصال بخادم ديلا") }
            deliver("deelaOwnerAIStatus", response)
        }
    }

    @JavascriptInterface
    fun runAI(prompt: String, language: String, mode: String) {
        if (prompt.length !in 3..5000) {
            deliver("deelaOwnerAIResult", JSONObject().put("error", "اكتب طلبًا بين 3 و5000 حرف"))
            return
        }
        scope.launch(Dispatchers.IO) {
            val response = runCatching {
                val payload = JSONObject()
                    .put("prompt", prompt)
                    .put("language", language.take(45))
                    .put("mode", mode.take(50))
                val request = Request.Builder().url(api + "/generate")
                    .header("Authorization", "Bearer " + token)
                    .post(payload.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
                    .build()
                client.newCall(request).execute().use { res ->
                    val json = JSONObject(res.body.string())
                    if (!res.isSuccessful) JSONObject().put("error", json.optString("error", "تعذر إكمال الطلب"))
                    else json
                }
            }.getOrElse { JSONObject().put("error", it.message ?: "تعذر الاتصال بخادم الذكاء الاصطناعي") }
            deliver("deelaOwnerAIResult", response)
        }
    }

    @JavascriptInterface
    fun requestSpeech() {
        web.post { onSpeech() }
    }

    @JavascriptInterface
    fun checkEngines() {
        // Owner token stays on the native side and is never exposed to WebView JS.
        // No remote scanning or account requests occur here: one authenticated health read.
        scope.launch(Dispatchers.IO) {
            val payload = runCatching {
                val req = Request.Builder().url(securityHubApi + "/integrations")
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/json")
                    .header("Cache-Control", "no-store")
                    .get().build()
                client.newCall(req).execute().use { res ->
                    val content = runCatching { JSONObject(res.body?.string().orEmpty()) }
                        .getOrElse { JSONObject().put("error", "رد الخادم غير صالح") }
                    if (!res.isSuccessful) error(content.optString("error", "تعذر فحص اتصال المحركات"))
                    content
                }
            }.getOrElse {
                JSONObject().put("ok", false)
                    .put("error", it.message ?: "تعذر فحص المحركات الفعلية")
            }
            deliver("deelaOwnerFourEnginesStatus", payload)
        }
    }

    @JavascriptInterface
    fun checkAgent() {
        scope.launch(Dispatchers.IO) {
            val status = runCatching {
                val req = Request.Builder().url(agentApi)
                    .header("Authorization", "Bearer " + token).get().build()
                client.newCall(req).execute().use { res -> JSONObject(res.body.string()) }
            }.getOrElse {
                JSONObject().put("ready", false).put("error", "تحقق من اتصال الإنترنت؛ يمكنك التشغيل اليدوي")
            }
            deliver("deelaAgentStatusResult", status)
        }
    }

    @JavascriptInterface
    fun openAgentIssue(prompt: String) {
        val task = prompt.trim()
        if (task.length !in 10..1400) {
            deliver("deelaAgentDispatchResult", JSONObject().put("error", "اكتب مهمة من 10 إلى 1400 حرف"))
            return
        }
        scope.launch(Dispatchers.IO) {
            val result = runCatching {
                val payload = JSONObject().put("task", task)
                val req = Request.Builder().url(agentApi)
                    .header("Authorization", "Bearer " + token)
                    .post(payload.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
                    .build()
                client.newCall(req).execute().use { res ->
                    JSONObject(res.body.string())
                }
            }.getOrElse {
                JSONObject().put("error", "فشل الاتصال بوكيل ديلا. يمكنك التشغيل اليدوي.")
                    .put("code", "manual_mode")
            }
            if (result.optString("code") == "manual_mode" ||
                result.optString("code") == "github_auth" ||
                result.optString("code") == "github_missing"
            ) {
                // Free fallback: clipboard + owner-authorized GitHub workflow dispatch.
                val uri = Uri.parse(
                    "https://github.com/mzo77/DEELA-V2/actions/workflows/deela-arabic-coding-agent.yml",
                )
                web.post {
                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    clipboard.setPrimaryClip(ClipData.newPlainText("مهمة وكيل ديلا العربي", task))
                    Toast.makeText(
                        context, "تم نسخ أمرك. افتح Run workflow والصقه في task ثم اضغط التشغيل.",
                        Toast.LENGTH_LONG,
                    ).show()
                    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, uri)) }
                }
                result.put("manual", true)
            }
            deliver("deelaAgentDispatchResult", result)
        }
    }

    @JavascriptInterface
    fun copyText(value: String) {
        if (value.length > 200_000) return
        web.post {
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            clipboard.setPrimaryClip(ClipData.newPlainText("DEELA", value))
            Toast.makeText(context, "تم النسخ", Toast.LENGTH_SHORT).show()
        }
    }

    @JavascriptInterface
    fun saveTextReport(filename: String, content: String) {
        if (content.length > 500_000) return
        web.post { onSave(filename, content) }
    }

    @JavascriptInterface
    fun openGithub(url: String) {
        val uri = runCatching { Uri.parse(url) }.getOrNull() ?: return
        if (uri.scheme != "https" || uri.host != "github.com") return
        web.post { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, uri)) } }
    }
}
