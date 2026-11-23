package dev.aurastore.store.auth

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject

/**
 * Owner control runs inside the existing DEELA APK, not a separately signed app.
 * This Activity is not exported. Every privileged API call must independently
 * validate the supplied JWT and the owner's role on the server.
 */
class DeelaEmbeddedOwnerActivity : Activity() {
    private lateinit var web: WebView
    private var pickerCallback: ValueCallback<Array<Uri>>? = null
    private val pickerCode = 4818
    private val jwt: String get() = intent.getStringExtra(EXTRA_OWNER_TOKEN).orEmpty()
    private val loader: WebViewAssetLoader by lazy {
        WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (jwt.isBlank()) {
            Toast.makeText(this, "سجّل الدخول بحساب المالك أولًا", Toast.LENGTH_LONG).show()
            finish()
            return
        }
        window.statusBarColor = Color.rgb(10, 17, 31)
        window.navigationBarColor = Color.rgb(10, 17, 31)
        web = WebView(this)
        setContentView(web)
        WebView.setWebContentsDebuggingEnabled(false)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            // Needed for user-selected document picker URIs.
            allowContentAccess = true
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
            safeBrowsingEnabled = true
        }
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false)
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? = request?.let {
                loader.shouldInterceptRequest(it.url)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                if (view == null || url != OWNER_PAGE) return
                // Inject only into the private Android-local origin, never
                // into an external site or a redirected URL.
                val safeToken = JSONObject.quote(jwt)
                view.evaluateJavascript(
                    "(function(){var k='deela-owner-control-session';" +
                        "var t=" + safeToken + ";" +
                        "if(sessionStorage.getItem(k)!==t){" +
                        "sessionStorage.setItem(k,t);location.reload();" +
                        "}})();",
                    null
                )
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val uri = request?.url ?: return true
                if (uri.toString().startsWith(OWNER_ASSET_ORIGIN)) return false
                launchExternal(uri)
                return true
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                pickerCallback?.onReceiveValue(null)
                pickerCallback = filePathCallback
                return try {
                    val choice = Intent(Intent.ACTION_GET_CONTENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                    }
                    startActivityForResult(
                        Intent.createChooser(choice, "اختر ملف APK أو IPA"),
                        pickerCode
                    )
                    true
                } catch (_: Exception) {
                    pickerCallback?.onReceiveValue(null)
                    pickerCallback = null
                    false
                }
            }
        }
        web.setDownloadListener { address, _, _, _, _ ->
            launchExternal(Uri.parse(address))
        }
        if (savedInstanceState == null) web.loadUrl(OWNER_PAGE)
        else web.restoreState(savedInstanceState)
    }

    private fun launchExternal(url: Uri) {
        if (url.scheme != "https") return
        try { startActivity(Intent(Intent.ACTION_VIEW, url)) }
        catch (_: Exception) {
            Toast.makeText(this, "تعذّر فتح الرابط", Toast.LENGTH_SHORT).show()
        }
    }

    @Deprecated("Compatibility callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != pickerCode) return
        pickerCallback?.onReceiveValue(
            if (resultCode == RESULT_OK) data?.data?.let { arrayOf(it) } else null
        )
        pickerCallback = null
    }

    @Deprecated("Android back button compatibility")
    override fun onBackPressed() {
        if (::web.isInitialized && web.canGoBack()) web.goBack()
        else super.onBackPressed()
    }

    override fun onDestroy() {
        pickerCallback?.onReceiveValue(null)
        pickerCallback = null
        if (::web.isInitialized) web.destroy()
        super.onDestroy()
    }

    companion object {
        const val EXTRA_OWNER_TOKEN = "dev.aurastore.store.owner.jwt"
        private const val OWNER_ASSET_ORIGIN = "https://appassets.androidplatform.net/assets/owner/"
        private const val OWNER_PAGE = "https://appassets.androidplatform.net/assets/owner/index.html"
    }
}
