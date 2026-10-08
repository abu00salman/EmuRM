package com.emurm.app

import android.app.UiModeManager
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.view.InputDevice
import android.view.KeyEvent
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
import android.webkit.ServiceWorkerClient
import android.webkit.ServiceWorkerController
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

/** Native phone/tablet/TV shell, serving the Gradle-packaged web export over HTTPS. */
class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private lateinit var audioFocusController: AudioFocusController
    private lateinit var gamepadMonitor: GamepadMonitor

    private val baseHost: String = BundleAssetServer.HOST
    private val bundledAssets by lazy { BundleAssetServer(assets) }
    private val isTelevision: Boolean by lazy {
        (getSystemService(UI_MODE_SERVICE) as UiModeManager).currentModeType == Configuration.UI_MODE_TYPE_TELEVISION
    }

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
                    else -> binding.webView.evaluateJavascript(
                        "(()=>{const handled=!window.dispatchEvent(new CustomEvent('rv:back',{cancelable:true}));" +
                            "if(handled)return true;window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));" +
                            "return !!document.querySelector('[role=dialog]')})()",
                    ) { handled ->
                        if (handled != "true") {
                            if (binding.webView.canGoBack()) binding.webView.goBack()
                            else {
                                isEnabled = false
                                onBackPressedDispatcher.onBackPressed()
                            }
                        }
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
        if (isTelevision) {
            requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
            setImmersiveMode(true)
        }
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

        // Load the packaged export as a normal URL navigation through BundleAssetServer's
        // shouldInterceptRequest, the same way every one of its sub-resources (CSS, JS, ...)
        // gets served — rather than injecting the HTML directly via loadDataWithBaseURL, which
        // two earlier attempts at this (MIME-fixing the asset server, then inlining the
        // stylesheet into that injected HTML) both failed to get rendering correctly on real
        // hardware (a TCL Android TV, then a Samsung phone) for a reason that couldn't be
        // reproduced or root-caused remotely. loadDataWithBaseURL's injected-string-as-document
        // path is a narrower, less-tested corner of WebView than an ordinary URL load is, and is
        // the one thing that changed between "broken on real devices" and this. Same HTTPS
        // origin either way, so installed users keep their IndexedDB saves.
        binding.webView.loadUrl(BundleAssetServer.URL)
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


    // TV remotes are keyboard devices, not gamepads. Route only remote keys into
    // the shared spatial navigation; leave joystick/buttons to Chromium's Gamepad API.
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        val gamepad = event.isFromSource(InputDevice.SOURCE_GAMEPAD) ||
            event.isFromSource(InputDevice.SOURCE_JOYSTICK)
        if (!gamepad && binding.errorOverlay.visibility != View.VISIBLE) {
            val key = when (event.keyCode) {
                KeyEvent.KEYCODE_DPAD_UP -> "ArrowUp"
                KeyEvent.KEYCODE_DPAD_DOWN -> "ArrowDown"
                KeyEvent.KEYCODE_DPAD_LEFT -> "ArrowLeft"
                KeyEvent.KEYCODE_DPAD_RIGHT -> "ArrowRight"
                KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> "Enter"
                else -> null
            }
            if (key != null) {
                if (event.action == KeyEvent.ACTION_DOWN) {
                    if (isPlaying && !isMenuOpen) {
                        // OK opens the menu during gameplay; a TV remote cannot replace
                        // the console's controller. D-pad gameplay belongs to gamepads.
                        if (key == "Enter" && event.repeatCount == 0) dispatchSyntheticEscape()
                    } else {
                        binding.webView.evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('emurm:remote',{detail:${JSONObject.quote(key)}}))",
                            null,
                        )
                    }
                }
                return true
            }
        }
        return super.dispatchKeyEvent(event)
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
            // SAF grants access only to documents chosen by the user. Chromium
            // needs content:// reads to upload those files; file:// remains disabled.
            allowContentAccess = true
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
                television = isTelevision,
            ),
            "AndroidNative",
        )

        // The site registers a service worker (offline shell + core cache). Its own
        // fetches do NOT pass through the WebViewClient above, so on the virtual
        // https://www.emurm.com origin they went to the REAL network and came back as
        // whatever the live site serves -- hashed CSS/JS names from a different build
        // -- which is how the page ended up with both stylesheets present but empty
        // (0 rules) on a current WebView. Route the worker's requests through the same
        // bundled-asset server so it sees exactly the files the page was built from.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            ServiceWorkerController.getInstance().setServiceWorkerClient(
                object : ServiceWorkerClient() {
                    override fun shouldInterceptRequest(request: WebResourceRequest): WebResourceResponse? =
                        bundledAssets.respond(request.url)
                },
            )
        }

        webView.webViewClient =
            object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    bundledAssets.respond(request.url)

                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val uri = request.url
                    if (uri.host == baseHost) return false
                    openExternalLink(uri)
                    return true
                }

                override fun onPageFinished(view: WebView, url: String?) {
                    pageReady = true
                    view.evaluateJavascript("document.documentElement.dataset.tv = ${JSONObject.quote(isTelevision.toString())}", null)
                    binding.loadingSpinner.visibility = View.GONE
                    binding.errorOverlay.visibility = View.GONE
                    pendingSharedImportJs?.let {
                        view.evaluateJavascript(it, null)
                        pendingSharedImportJs = null
                    }
                    scheduleRenderSelfCheck(view)
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
                    runCatching { filePickerLauncher.launch(intent) }.onFailure {
                        pendingFileCallback = null
                        filePathCallback.onReceiveValue(null)
                        toastShort(R.string.file_picker_unavailable)
                    }
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
            // (src/lib/native-bridge.ts) before a click ever reaches here, since
            // WebView's download path can't resolve page-local blob storage at all.
            if (!url.startsWith("blob:")) openExternalLink(Uri.parse(url))
        }
    }

    // ---------- Playing / fullscreen / audio focus ----------

    private fun handlePlayingChanged(playing: Boolean) {
        isPlaying = playing
        setImmersiveMode(playing || isTelevision)
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
            "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}))",
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

    // ---------- Share-to-import (ACTION_SEND) and "Open with EmuRM" (ACTION_VIEW) ----------
    // Both end up at the same importSharedUri() — and from there, the same JS-side
    // importFiles() pipeline the in-page file picker uses — so a ROM opened from a file
    // manager goes through identical system detection, core mapping and SAF/ContentResolver
    // handling as one dragged onto the page by hand. See AndroidManifest.xml for why the
    // ACTION_VIEW filter is declared the way it is.
    private fun handleIntent(intent: Intent?) {
        val uri = when (intent?.action) {
            Intent.ACTION_SEND -> intent.getStreamUriCompat()
            Intent.ACTION_VIEW -> intent.data
            else -> null
        } ?: return
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

    // ---------- Render self-check ----------
    // Old Android System WebView builds have repeatedly rendered the page with NO styles
    // (the failure is invisible to the app otherwise: the load "succeeds"). If that
    // happens, say so on screen with the WebView version and stylesheet state, so the
    // cause can be read straight off a screenshot instead of guessed at.
    private var selfCheckShown = false

    private fun scheduleRenderSelfCheck(view: WebView) {
        if (selfCheckShown) return
        view.postDelayed({
            view.evaluateJavascript(
                """(function(){try{
var bg=getComputedStyle(document.body).backgroundColor;
var sheets=[].map.call(document.styleSheets,function(s){var n;try{n=s.cssRules.length}catch(e){n='ERR '+e.name}return (s.href||'inline').split('/').pop()+':'+n});
var probe=getComputedStyle(document.documentElement).getPropertyValue('--spacing');
return JSON.stringify({bg:bg,sheets:sheets,spacing:probe,ua:navigator.userAgent});
}catch(e){return JSON.stringify({err:String(e)})}})()""",
            ) { raw ->
                if (selfCheckShown || isFinishing) return@evaluateJavascript
                val json = try {
                    JSONObject(JSONObject("{\"v\":$raw}").getString("v"))
                } catch (e: Exception) {
                    return@evaluateJavascript
                }
                val bg = json.optString("bg")
                val styled = bg != "rgb(18, 18, 18)" && bg != "rgba(0, 0, 0, 0)" && bg != "rgb(255, 255, 255)" && json.optString("spacing").isNotBlank()
                if (styled) return@evaluateJavascript
                selfCheckShown = true
                val pkg = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WebView.getCurrentWebViewPackage() else null
                val msg = "WebView: ${pkg?.packageName} ${pkg?.versionName}\nAndroid ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})\n" +
                    "bg=$bg spacing='${json.optString("spacing")}'\nsheets=${json.optJSONArray("sheets")}\n${json.optString("ua")}"
                androidx.appcompat.app.AlertDialog.Builder(this)
                    .setTitle("EmuRM: page did not style correctly")
                    .setMessage(msg + "\n\nPlease screenshot this and send it. Updating 'Android System WebView' in Google Play may fix it.")
                    .setPositiveButton("OK", null)
                    .show()
            }
        }, 3000)
    }
}
