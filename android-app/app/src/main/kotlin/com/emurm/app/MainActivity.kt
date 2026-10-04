package com.emurm.app

import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.util.Base64
import android.util.Log
import android.view.View
import android.webkit.ConsoleMessage
import android.webkit.PermissionRequest
import android.webkit.SslErrorHandler
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebChromeClient.FileChooserParams
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.emurm.app.databinding.ActivityMainBinding
import org.json.JSONObject
import java.io.File

/**
 * The entire native shell. One Activity, one WebView, pointed at the real deployed
 * site (BuildConfig.BASE_URL) rather than a bundled copy of it — see README.md
 * "Architecture" for why that's the right call here: EmuRM's existing service worker
 * (public/sw.js) already gives it an offline-capable app shell + permanent core cache,
 * so duplicating that inside the APK would only add a second copy to keep in sync for
 * no real benefit. Everything in this file is strictly what a browser tab cannot do on
 * its own: a real app icon/splash, a scoped native file picker, immersive fullscreen,
 * back-button semantics, audio focus, and a native fallback for the one network error
 * a page can't render its own error screen for (failing before it ever loaded).
 */
class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private lateinit var audioFocusController: AudioFocusController
    private lateinit var gamepadMonitor: GamepadMonitor

    // Derived from BASE_URL rather than a second BuildConfig constant, so pointing a
    // debug build at a local dev server (see README.md) can't leave the "is this
    // navigation same-origin" check out of sync with where the app actually loaded.
    private val baseHost: String? by lazy { Uri.parse(BuildConfig.BASE_URL).host }

    private var pageReady = false
    private var isPlaying = false
    private var isMenuOpen = false
    private var pendingFileCallback: ValueCallback<Array<Uri>>? = null
    private var pendingSharedImportJs: String? = null

    private val filePickerLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val callback = pendingFileCallback
            pendingFileCallback = null
            if (result.resultCode != RESULT_OK) {
                callback?.onReceiveValue(null)
                return@registerForActivityResult
            }
            val data = result.data
            val uris: Array<Uri> =
                when {
                    data?.clipData != null -> {
                        val clip = data.clipData!!
                        Array(clip.itemCount) { i -> clip.getItemAt(i).uri }
                    }
                    data?.data != null -> arrayOf(data.data!!)
                    else -> emptyArray()
                }
            callback?.onReceiveValue(uris)
        }

    private val backCallback =
        object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when {
                    // Reuses the pause menu's own Escape handling (opens it if closed,
                    // closes it if already open) instead of a second, parallel code path.
                    isPlaying -> dispatchSyntheticEscape()
                    binding.webView.canGoBack() -> binding.webView.goBack()
                    else -> {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                    }
                }
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)
        splashScreen.setKeepOnScreenCondition { !pageReady }
        // Safety net: never let a slow first load hold the splash screen up forever.
        // The loading spinner (shown below) takes over past this point instead.
        Handler(Looper.getMainLooper()).postDelayed({ pageReady = true }, 2500)

        WindowCompat.setDecorFitsSystemWindows(window, false)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        configureWebView()
        onBackPressedDispatcher.addCallback(this, backCallback)

        audioFocusController =
            AudioFocusController(this) {
                if (isPlaying && !isMenuOpen) runOnUiThread { dispatchSyntheticEscape() }
            }
        gamepadMonitor =
            GamepadMonitor(this) { connected ->
                runOnUiThread {
                    toastShort(if (connected) R.string.controller_connected else R.string.controller_disconnected)
                }
            }
        gamepadMonitor.start()

        binding.errorRetryButton.setOnClickListener {
            binding.errorOverlay.visibility = View.GONE
            binding.loadingSpinner.visibility = View.VISIBLE
            binding.webView.reload()
        }

        binding.webView.loadUrl(BuildConfig.BASE_URL)
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    override fun onResume() {
        super.onResume()
        binding.webView.onResume()
        binding.webView.resumeTimers()
    }

    override fun onPause() {
        binding.webView.onPause()
        binding.webView.pauseTimers()
        super.onPause()
    }

    override fun onDestroy() {
        gamepadMonitor.stop()
        audioFocusController.abandon()
        (binding.webView.parent as? android.view.ViewGroup)?.removeView(binding.webView)
        binding.webView.destroy()
        super.onDestroy()
    }

    // ---------- WebView setup ----------

    private fun configureWebView() {
        val webView = binding.webView
        // Ensures WebGL/canvas compositing goes through the GPU layer rather than
        // falling back to software rendering, which some OEM WebView builds default to
        // under certain conditions — this is the explicit opt-in the performance
        // requirements call for, on top of the manifest's hardwareAccelerated="true".
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            // The emulator starts audio as a direct result of the user tapping a game
            // in the library, not on page load — but that tap already happened on a
            // *different* page before WebView's own gesture tracking carries over, so
            // without this, first-launch audio can silently fail to start.
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportMultipleWindows(false)
            javaScriptCanOpenWindowsAutomatically = false
            // No file:// access of any kind — every file the app ever reads comes in
            // through the system document picker (SAF) or a share Intent, never a raw
            // filesystem path, so this stays off.
            allowFileAccess = false
            allowContentAccess = false
            // A fixed, app-like layout: the system's font-scale accessibility setting
            // would otherwise distort the touch-control layout independently of the
            // page's own (already responsive) sizing.
            textZoom = 100
        }

        webView.addJavascriptInterface(
            JsBridge(
                object : JsBridge.Listener {
                    override fun onPlayingChanged(playing: Boolean) {
                        runOnUiThread { handlePlayingChanged(playing) }
                    }

                    override fun onMenuOpenChanged(open: Boolean) {
                        runOnUiThread { isMenuOpen = open }
                    }

                    override fun onSaveBlob(base64Data: String, filename: String, mimeType: String) {
                        saveBlob(base64Data, filename, mimeType)
                    }
                },
            ),
            "AndroidNative",
        )

        webView.webViewClient =
            object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val uri = request.url
                    if (uri.host == baseHost) return false
                    openExternalLink(uri)
                    return true
                }

                override fun onPageFinished(view: WebView, url: String?) {
                    pageReady = true
                    binding.loadingSpinner.visibility = View.GONE
                    binding.errorOverlay.visibility = View.GONE
                    pendingSharedImportJs?.let {
                        view.evaluateJavascript(it, null)
                        pendingSharedImportJs = null
                    }
                }

                override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                    pageReady = true
                    if (request.isForMainFrame) showErrorOverlay(isHttp = false)
                }

                override fun onReceivedHttpError(view: WebView, request: WebResourceRequest, errorResponse: WebResourceResponse) {
                    pageReady = true
                    if (request.isForMainFrame && errorResponse.statusCode >= 400) showErrorOverlay(isHttp = true)
                }

                // Deliberately NOT overridden to call handler.proceed() anywhere — the
                // default (handler.cancel(), failing the load) is exactly the required
                // behavior, so this override exists only as a visible, explicit record
                // of that choice rather than leaving it implicit.
                override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
                    handler.cancel()
                }
            }

        webView.webChromeClient =
            object : WebChromeClient() {
                override fun onShowFileChooser(
                    view: WebView,
                    filePathCallback: ValueCallback<Array<Uri>>,
                    fileChooserParams: FileChooserParams,
                ): Boolean {
                    pendingFileCallback?.onReceiveValue(null)
                    pendingFileCallback = filePathCallback
                    val intent =
                        Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                            addCategory(Intent.CATEGORY_OPENABLE)
                            // Intentionally "*/*" with no MIME filtering: ROM extensions
                            // like .nes/.sfc/.gba have no registered MIME type, and many
                            // OEM document providers report the wrong (or no) type for
                            // them — filtering by type risks hiding valid files on some
                            // devices. The page's own import pipeline already validates
                            // and rejects anything unplayable with a clear reason.
                            type = "*/*"
                            if (fileChooserParams.mode == FileChooserParams.MODE_OPEN_MULTIPLE) {
                                putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                            }
                        }
                    filePickerLauncher.launch(intent)
                    return true
                }

                override fun onPermissionRequest(request: PermissionRequest) {
                    // EmuRM has no use for camera/mic/sensors — deny everything by
                    // default rather than prompting the user for access nothing needs.
                    request.deny()
                }

                override fun onConsoleMessage(message: ConsoleMessage): Boolean {
                    if (BuildConfig.DEBUG) {
                        Log.d(TAG, "${message.message()} (${message.sourceId()}:${message.lineNumber()})")
                    }
                    return true
                }
            }

        webView.setDownloadListener { url, _, _, _, _ ->
            // Real network downloads only — blob: URLs are intercepted on the page side
            // (src/lib/android-bridge.ts) before a click ever reaches here, since
            // WebView's download path can't resolve page-local blob storage at all.
            if (!url.startsWith("blob:")) openExternalLink(Uri.parse(url))
        }
    }

    // ---------- Playing / fullscreen / audio focus ----------

    private fun handlePlayingChanged(playing: Boolean) {
        isPlaying = playing
        setImmersiveMode(playing)
        if (playing) audioFocusController.request() else audioFocusController.abandon()
    }

    // Named setImmersiveMode rather than setImmersive: android.app.Activity (a
    // supertype here) already declares a public setImmersive(boolean) method of its
    // own — reusing that exact name would silently hide the inherited one instead of
    // overriding it, which Kotlin correctly refuses to compile without an explicit
    // `override` (and this isn't actually overriding it; it's an unrelated method).
    private fun setImmersiveMode(enabled: Boolean) {
        val controller = WindowCompat.getInsetsController(window, binding.root)
        if (enabled) {
            controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            controller.hide(WindowInsetsCompat.Type.systemBars())
        } else {
            controller.show(WindowInsetsCompat.Type.systemBars())
        }
    }

    private fun dispatchSyntheticEscape() {
        binding.webView.evaluateJavascript(
            "window.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true}))",
            null,
        )
    }

    // ---------- Errors ----------

    private fun showErrorOverlay(isHttp: Boolean) {
        binding.loadingSpinner.visibility = View.GONE
        binding.errorTitle.text = getString(if (isHttp) R.string.http_error_title else R.string.error_title)
        binding.errorBody.text = getString(if (isHttp) R.string.http_error_body else R.string.error_body)
        binding.errorOverlay.visibility = View.VISIBLE
    }

    // ---------- External links ----------

    private fun openExternalLink(uri: Uri) {
        runCatching {
            CustomTabsIntent.Builder().build().launchUrl(this, uri)
        }.onFailure {
            runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
        }
    }

    // ---------- Blob downloads (screenshots, etc.) ----------

    private fun saveBlob(base64Data: String, filename: String, mimeType: String) {
        Thread {
            try {
                val bytes = Base64.decode(base64Data, Base64.DEFAULT)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val values =
                        ContentValues().apply {
                            put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                            put(MediaStore.MediaColumns.MIME_TYPE, mimeType.ifBlank { "application/octet-stream" })
                            put(MediaStore.MediaColumns.RELATIVE_PATH, "${Environment.DIRECTORY_DOWNLOADS}/EmuRM")
                        }
                    val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    uri?.let { contentResolver.openOutputStream(it)?.use { out -> out.write(bytes) } }
                } else {
                    // Pre-API 29: no MediaStore.Downloads, and asking for the legacy
                    // broad WRITE_EXTERNAL_STORAGE permission for this one feature isn't
                    // worth it — the app-private external files dir needs no permission
                    // at all and is still reachable from a file manager.
                    val dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: filesDir
                    dir.mkdirs()
                    File(dir, filename).writeBytes(bytes)
                }
            } catch (e: Exception) {
                if (BuildConfig.DEBUG) Log.e(TAG, "saveBlob failed", e)
            }
        }.start()
    }

    // ---------- Share-to-import (ACTION_SEND) ----------

    private fun handleIntent(intent: Intent?) {
        if (intent?.action != Intent.ACTION_SEND) return
        val uri = intent.getStreamUriCompat() ?: return
        importSharedUri(uri)
    }

    private fun importSharedUri(uri: Uri) {
        Thread {
            try {
                val name = queryDisplayName(uri) ?: "shared-file"
                val bytes = contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return@Thread
                val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                val mime = contentResolver.getType(uri) ?: "application/octet-stream"
                val js =
                    "window.__androidImportSharedFile && window.__androidImportSharedFile(" +
                        "${JSONObject.quote(name)},${JSONObject.quote(base64)},${JSONObject.quote(mime)})"
                runOnUiThread {
                    if (pageReady) binding.webView.evaluateJavascript(js, null) else pendingSharedImportJs = js
                }
            } catch (e: Exception) {
                if (BuildConfig.DEBUG) Log.e(TAG, "shared file import failed", e)
            }
        }.start()
    }

    private fun queryDisplayName(uri: Uri): String? {
        contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (idx >= 0 && cursor.moveToFirst()) return cursor.getString(idx)
        }
        return null
    }

    @Suppress("DEPRECATION")
    private fun Intent.getStreamUriCompat(): Uri? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
        } else {
            getParcelableExtra(Intent.EXTRA_STREAM)
        }

    private fun toastShort(resId: Int) {
        android.widget.Toast.makeText(this, resId, android.widget.Toast.LENGTH_SHORT).show()
    }

    companion object {
        private const val TAG = "EmuRM"
    }
}
