package com.deela.owner

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView
import android.widget.Toast

/**
 * Separate Android owner console. No privileged credentials embedded in the APK.
 */
class OwnerActivity : Activity() {
    private var pendingChooser: android.webkit.ValueCallback<Array<Uri>>? = null
    private lateinit var browser: WebView
    private val home = BuildConfig.DEELA_OWNER_URL
    private val origin: Uri by lazy { Uri.parse(home) }
    private val requestFile = 4701

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(10, 16, 29)
        window.navigationBarColor = Color.rgb(15, 25, 41)
        if (origin.scheme != "https" || origin.host.isNullOrBlank() ||
            origin.host!!.endsWith(".invalid")) {
            val warning = TextView(this).apply {
                text = "DEELA\n\nلم يتم ربط موقع Google Firebase بعد.\nيجب إعداد DEELA_OWNER_URL ثم إعادة بناء تطبيق المالك."
                textSize = 19f
                setTextColor(Color.WHITE)
                gravity = Gravity.CENTER
                setPadding(30, 30, 30, 30)
                setBackgroundColor(Color.rgb(10, 16, 29))
            }
            setContentView(warning)
            return
        }
        browser = WebView(this)
        val root = FrameLayout(this)
        root.addView(browser, FrameLayout.LayoutParams(-1, -1))
        setContentView(root)
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
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val target = request?.url ?: return true
                val internal = target.scheme == "https" &&
                    target.host.equals(origin.host, ignoreCase = true) &&
                    target.port == origin.port
                if (internal) return false
                openExternal(target)
                return true
            }
        }
        browser.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: android.webkit.ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                pendingChooser?.onReceiveValue(null)
                pendingChooser = filePathCallback
                return try {
                    val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                    }
                    startActivityForResult(Intent.createChooser(intent, "اختر ملف IPA أو APK"), requestFile)
                    true
                } catch (e: Exception) {
                    pendingChooser?.onReceiveValue(null)
                    pendingChooser = null
                    false
                }
            }
        }
        browser.setDownloadListener(DownloadListener { address, _, _, _, _ ->
            val target = Uri.parse(address)
            if (target.scheme == "https") openExternal(target)
            else Toast.makeText(this, "رابط غير آمن", Toast.LENGTH_SHORT).show()
        })
        if (savedInstanceState == null) browser.loadUrl(home) else browser.restoreState(savedInstanceState)
    }

    private fun openExternal(uri: Uri) {
        if (uri.scheme != "https") return
        try { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
        catch (_: Exception) { Toast.makeText(this, "تعذر فتح الرابط", Toast.LENGTH_SHORT).show() }
    }

    @Deprecated("Legacy callback retained for wide Android compatibility")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != requestFile) return
        val picked = if (resultCode == RESULT_OK) data?.data?.let { arrayOf(it) } else null
        pendingChooser?.onReceiveValue(picked)
        pendingChooser = null
    }

    override fun onSaveInstanceState(outState: Bundle) {
        if (::browser.isInitialized) browser.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    @Deprecated("Android compatibility")
    override fun onBackPressed() {
        if (::browser.isInitialized && browser.canGoBack()) browser.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        pendingChooser?.onReceiveValue(null)
        pendingChooser = null
        if (::browser.isInitialized) browser.destroy()
        super.onDestroy()
    }
}
