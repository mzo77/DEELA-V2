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
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject

/**
 * DEELA Books is bundled inside the original officially signed DEELA app.
 * This activity is not exported. The backend independently verifies JWT & owner role.
 */
class DeelaBooksOwnerActivity : Activity() {
    private lateinit var browser: WebView
    private var chooser: ValueCallback<Array<Uri>>? = null
    private val token: String get() = intent.getStringExtra(EXTRA_TOKEN).orEmpty()
    private val loader: WebViewAssetLoader by lazy {
        WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (token.isBlank()) {
            Toast.makeText(this, "يلزم تسجيل الدخول إلى حساب المالك", Toast.LENGTH_LONG).show()
            finish()
            return
        }
        window.statusBarColor = Color.rgb(12, 21, 36)
        window.navigationBarColor = Color.rgb(12, 21, 36)
        browser = WebView(this)
        setContentView(browser)
        WebView.setWebContentsDebuggingEnabled(false)
        browser.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = true // User-selected cover and book files
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            safeBrowsingEnabled = true
        }
        CookieManager.getInstance().setAcceptThirdPartyCookies(browser, false)
        browser.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? =
                request?.let { loader.shouldInterceptRequest(it.url) }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                if (view == null || url == null || !url.startsWith(LOCAL_ROOT)) return
                val safe = JSONObject.quote(token)
                // Only inject into the first-party local Android asset origin.
                view.evaluateJavascript(
                    "(function(){var k='deela-books-token';var t=" + safe + ";" +
                        "if(sessionStorage.getItem(k)!==t){" +
                        "sessionStorage.setItem(k,t);location.reload();" +
                        "}})();", null
                )
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val link = request?.url ?: return true
                if (link.scheme == "https" &&
                    link.host.equals("appassets.androidplatform.net", ignoreCase = true) &&
                    link.path?.startsWith("/assets/books/") == true) return false
                if (link.scheme == "https") {
                    try { startActivity(Intent(Intent.ACTION_VIEW, link)) }
                    catch (_: Exception) { Toast.makeText(this@DeelaBooksOwnerActivity, "تعذر فتح الرابط", Toast.LENGTH_SHORT).show() }
                }
                return true
            }
        }
        browser.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                chooser?.onReceiveValue(null); chooser = filePathCallback
                return try {
                    val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                    }
                    startActivityForResult(Intent.createChooser(intent, "اختر الغلاف أو الكتاب"), PICK_FILE)
                    true
                } catch (_: Exception) {
                    chooser?.onReceiveValue(null);chooser = null
                    false
                }
            }
        }
        browser.setDownloadListener { address, _, _, _, _ ->
            if (address.startsWith("https://")) {
                try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(address))) }
                catch (_: Exception) { Toast.makeText(this, "تعذر تنزيل الكتاب", Toast.LENGTH_SHORT).show() }
            }
        }
        if (savedInstanceState == null) browser.loadUrl(BOOKS_HOME)
        else browser.restoreState(savedInstanceState)
    }

    @Deprecated("Compatible file-picker callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != PICK_FILE) return
        chooser?.onReceiveValue(if (resultCode == RESULT_OK) data?.data?.let { arrayOf(it) } else null)
        chooser = null
    }

    @Deprecated("Android back navigation")
    override fun onBackPressed() {
        if (::browser.isInitialized && browser.canGoBack()) browser.goBack() else super.onBackPressed()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        if (::browser.isInitialized) browser.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        chooser?.onReceiveValue(null); chooser = null
        if (::browser.isInitialized) browser.destroy()
        super.onDestroy()
    }

    companion object {
        const val EXTRA_TOKEN = "dev.aurastore.store.deela.books.owner.jwt"
        private const val PICK_FILE = 6824
        private const val LOCAL_ROOT = "https://appassets.androidplatform.net/assets/books/"
        private const val BOOKS_HOME = "https://appassets.androidplatform.net/assets/books/index.html"
    }
}
