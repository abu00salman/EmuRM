package com.emurm.app

import android.webkit.JavascriptInterface

/**
 * The entire native surface exposed to page JavaScript (injected in MainActivity as
 * `window.AndroidNative`, consumed by src/lib/android-bridge.ts). Deliberately tiny —
 * four methods, no generic eval/exec, no filesystem access beyond the one scoped save
 * path — because every method here must be treated as callable by any script running
 * in the WebView, not just EmuRM's own trusted code.
 *
 * Each @JavascriptInterface method runs on a WebView-owned background thread, never
 * the main thread, so [Listener] implementations must hop back to the UI thread
 * themselves before touching any View.
 */
class JsBridge(private val listener: Listener) {

    interface Listener {
        fun onPlayingChanged(playing: Boolean)
        fun onMenuOpenChanged(open: Boolean)
        fun onSaveBlob(base64Data: String, filename: String, mimeType: String)
    }

    @JavascriptInterface
    fun isNativeApp(): Boolean = true

    @JavascriptInterface
    fun notifyPlaying(playing: Boolean) {
        listener.onPlayingChanged(playing)
    }

    @JavascriptInterface
    fun notifyMenuOpen(open: Boolean) {
        listener.onMenuOpenChanged(open)
    }

    @JavascriptInterface
    fun saveBlob(base64Data: String, filename: String, mimeType: String) {
        listener.onSaveBlob(base64Data, filename, mimeType)
    }
}
