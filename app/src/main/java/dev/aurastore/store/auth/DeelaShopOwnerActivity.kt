package dev.aurastore.store.auth

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject

/**
 * The store's owner administration inside the existing DEELA APK.
 * This Activity is not exported and is opened only by the native owner screen.
 * All API requests independently re-check the JWT and profiles.role=owner.
 * No service-role credential or merchant payment secret is stored in the APK.
 */
class DeelaShopOwnerActivity : Activity() {
    private lateinit var browser: WebView
    private val ownerToken: String by lazy { intent.getStringExtra(EXTRA_TOKEN).orEmpty() }
    private val assets by lazy {
        WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (ownerToken.isBlank()) {
            Toast.makeText(this, "هذه اللوحة لحساب المالك فقط", Toast.LENGTH_LONG).show()
            finish()
            return
        }
        window.statusBarColor = Color.rgb(10, 22, 39)
        window.navigationBarColor = Color.rgb(10, 22, 39)
        browser = WebView(this)
        setContentView(browser)
        WebView.setWebContentsDebuggingEnabled(false)
        browser.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
            safeBrowsingEnabled = true
        }
        CookieManager.getInstance().setAcceptThirdPartyCookies(browser, false)
        browser.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? =
                request?.let { assets.shouldInterceptRequest(it.url) }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                if (view == null || url == null ||
                    !url.startsWith("https://appassets.androidplatform.net/assets/store/")) return
                // The official app passes its authenticated owner session to the
                // bundled real storefront AND management panel, on this trusted origin only.
                val token = JSONObject.quote(ownerToken)
                view.evaluateJavascript(
                    "(function(){var t=" + token + ";" +
                        "var changed=sessionStorage.getItem('deela-shop-owner-session')!==t" +
                        "||sessionStorage.getItem('deela-shop-token')!==t;" +
                        "if(changed){" +
                        "sessionStorage.setItem('deela-shop-owner-session',t);" +
                        "sessionStorage.setItem('deela-shop-token',t);" +
                        "location.reload();" +
                        "}})();",
                    null
                )
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return true
                if (uri.scheme == "https" &&
                    uri.host.equals("appassets.androidplatform.net", ignoreCase = true) &&
                    uri.path?.startsWith("/assets/store/") == true) return false
                if (uri.scheme == "https") {
                    try { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
                    catch (_: Exception) {
                        Toast.makeText(this@DeelaShopOwnerActivity, "تعذّر فتح الرابط", Toast.LENGTH_SHORT).show()
                    }
                }
                return true
            }
        }
        val start = if (intent.getStringExtra(EXTRA_PAGE) == "shop") STORE_URL else ADMIN_URL
        if (savedInstanceState == null) browser.loadUrl(start)
        else browser.restoreState(savedInstanceState)
    }

    @Deprecated("Android compatibility")
    override fun onBackPressed() {
        if (::browser.isInitialized && browser.canGoBack()) browser.goBack()
        else super.onBackPressed()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        if (::browser.isInitialized) browser.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        if (::browser.isInitialized) browser.destroy()
        super.onDestroy()
    }

    companion object {
        const val EXTRA_TOKEN = "dev.aurastore.store.deela.shop.owner.session"
        const val EXTRA_PAGE = "dev.aurastore.store.deela.shop.page"
        private const val ADMIN_URL = "https://appassets.androidplatform.net/assets/store/admin/index.html"
        private const val STORE_URL = "https://appassets.androidplatform.net/assets/store/index.html"
    }
}
