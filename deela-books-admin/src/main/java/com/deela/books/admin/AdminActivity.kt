package com.deela.books.admin

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast

/** Official, independently installable owner app. All authorization stays on DEELA's server. */
class AdminActivity : Activity() {
    private lateinit var browser: WebView
    private var chooser: ValueCallback<Array<Uri>>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(16, 24, 44)
        window.navigationBarColor = Color.rgb(16, 24, 44)
        browser = WebView(this)
        browser.setBackgroundColor(Color.rgb(16, 24, 44))
        setContentView(browser)
        WebView.setWebContentsDebuggingEnabled(false)
        browser.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = true
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            safeBrowsingEnabled = true
        }
        CookieManager.getInstance().setAcceptThirdPartyCookies(browser, false)
        browser.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return true
                if (uri.scheme == "https" && (uri.host.equals("mzo77.github.io", true) || uri.host.equals("rxlynynjetajtsqlhkrq.supabase.co", true) || uri.host.equals("cdn.jsdelivr.net", true))) return false
                if (uri.scheme == "https") {
                    try { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
                    catch (_: Exception) { Toast.makeText(this@AdminActivity, "تعذر فتح الرابط", Toast.LENGTH_SHORT).show() }
                }
                return true
            }
        }
        browser.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView?, callback: ValueCallback<Array<Uri>>?, params: FileChooserParams?): Boolean {
                chooser?.onReceiveValue(null)
                chooser = callback
                return try {
                    val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "image/*"
                    }
                    startActivityForResult(Intent.createChooser(intent, "اختر صورة من الجهاز"), PICK_IMAGE)
                    true
                } catch (_: Exception) {
                    chooser?.onReceiveValue(null); chooser = null; false
                }
            }
        }
        if (savedInstanceState == null) browser.loadUrl(OWNER_PORTAL) else browser.restoreState(savedInstanceState)
    }

    @Deprecated("Activity result for broad Android version support")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != PICK_IMAGE) return
        chooser?.onReceiveValue(if (resultCode == RESULT_OK) data?.data?.let { arrayOf(it) } else null)
        chooser = null
    }

    @Deprecated("Android back navigation")
    override fun onBackPressed() { if (browser.canGoBack()) browser.goBack() else super.onBackPressed() }

    override fun onSaveInstanceState(outState: Bundle) {
        browser.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        chooser?.onReceiveValue(null); chooser = null
        browser.destroy()
        super.onDestroy()
    }

    companion object {
        private const val PICK_IMAGE = 6841
        private const val OWNER_PORTAL = "https://mzo77.github.io/DEELA-V2/books-private/"
    }
}
