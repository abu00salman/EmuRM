package com.emurm.app

import android.content.res.AssetManager
import android.net.Uri
import android.webkit.MimeTypeMap
import android.webkit.WebResourceResponse
import java.io.ByteArrayInputStream
import java.io.FileNotFoundException

/** Serves the Gradle-packaged export over a secure virtual origin, never file://. */
class BundleAssetServer(private val assets: AssetManager) {
    /**
     * Game files the user just picked in the built-in file browser, served at
     * https://www.emurm.com/__local/<token> so the page can fetch() them as a stream (no
     * base64 copy through the JS bridge -- PS1 discs are hundreds of MB). Only tokens handed
     * out for an explicit pick are ever served; nothing else on storage is reachable.
     */
    @Volatile var localFiles: Map<String, java.io.File> = emptyMap()

    fun respond(uri: Uri): WebResourceResponse? {
        if (uri.scheme != "https" || uri.host != HOST) return null
        val path = (uri.path ?: "/").removePrefix("/")
        if (path.startsWith("__local/")) {
            val f = localFiles[path.removePrefix("__local/")] ?: return notFound()
            return try {
                WebResourceResponse("application/octet-stream", null, 200, "OK", mapOf("Cache-Control" to "no-store", "Content-Length" to f.length().toString()), java.io.FileInputStream(f))
            } catch (_: Exception) { notFound() }
        }
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
