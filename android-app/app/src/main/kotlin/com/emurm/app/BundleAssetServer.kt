package com.emurm.app

import android.content.res.AssetManager
import android.net.Uri
import android.webkit.MimeTypeMap
import android.webkit.WebResourceResponse
import java.io.ByteArrayInputStream
import java.io.FileNotFoundException

/** Serves the Gradle-packaged export over a secure virtual origin, never file://. */
class BundleAssetServer(private val assets: AssetManager) {
    fun respond(uri: Uri): WebResourceResponse? {
        if (uri.scheme != "https" || uri.host != HOST) return null
        val path = (uri.path ?: "/").removePrefix("/")
        if (path.split('/').any { it == ".." || it == "." } || path.contains('\\')) {
            return notFound()
        }
        val file = if (path.isEmpty() || path.endsWith('/')) "${path}index.html" else path
        val mime = when (file.substringAfterLast('.').lowercase()) {
            "js" -> "application/javascript"
            "wasm" -> "application/wasm"
            "webmanifest" -> "application/manifest+json"
            else -> MimeTypeMap.getSingleton().getMimeTypeFromExtension(file.substringAfterLast('.'))
                ?: "application/octet-stream"
        }
        return try {
            WebResourceResponse(mime, "UTF-8", 200, "OK", mapOf("Cache-Control" to "no-cache", "Accept-Ranges" to "none"), assets.open("web/$file"))
        } catch (_: FileNotFoundException) {
            notFound()
        }
    }

    private fun notFound() = WebResourceResponse(
        "text/plain", "UTF-8", 404, "Not Found", emptyMap(), ByteArrayInputStream("Not found".toByteArray()),
    )

    companion object {
        const val HOST = "www.emurm.com"
        const val URL = "https://www.emurm.com/"
    }
}
