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
        // Hardcoded rather than left to android.webkit.MimeTypeMap: its built-in table is
        // missing entries (css above all) on a lot of OEM/TV firmware, including TCL's —
        // a stylesheet served as application/octet-stream gets silently refused by the
        // WebView, leaving the page fully unstyled (plain blue links, oversized icons)
        // while everything still "works". Every extension this export actually produces
        // (see public/ and the Next.js build output) is listed explicitly so none of them
        // depend on a device's possibly-incomplete table.
        val mime = when (file.substringAfterLast('.').lowercase()) {
            "html" -> "text/html"
            "css" -> "text/css"
            "js" -> "application/javascript"
            "json" -> "application/json"
            "webmanifest" -> "application/manifest+json"
            "wasm" -> "application/wasm"
            "svg" -> "image/svg+xml"
            "png" -> "image/png"
            "jpg", "jpeg" -> "image/jpeg"
            "ico" -> "image/x-icon"
            "woff" -> "font/woff"
            "woff2" -> "font/woff2"
            "xml" -> "application/xml"
            "txt", "md", "glsl", "glslp" -> "text/plain"
            "zip" -> "application/zip"
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
