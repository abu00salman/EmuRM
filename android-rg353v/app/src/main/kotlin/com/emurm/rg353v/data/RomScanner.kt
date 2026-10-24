package com.emurm.rg353v.data

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.provider.DocumentsContract

/** Walks a SAF folder (internal storage or microSD) and turns game files into [Game]s. */
class RomScanner(private val ctx: Context) {
    private val resolver: ContentResolver = ctx.contentResolver
    private val imageExts = setOf("png", "jpg", "jpeg", "webp")
    private val coverDirs = setOf("covers", "images", "imgs", "media", "boxart", "box2d", "screenshots")

    private class Entry(val docId: String, val name: String, val mime: String)

    fun scanTree(treeUri: Uri, maxDepth: Int = 6): List<Game> {
        val rootId = DocumentsContract.getTreeDocumentId(treeUri)
        val games = mutableListOf<Pair<Game, String>>()
        val covers = HashMap<String, Uri>()
        walk(treeUri, rootId, emptyList(), 0, maxDepth, games, covers, inCoverDir = false)
        return games.map { (g, rawKey) ->
            val c = covers[rawKey] ?: covers[SystemDetector.normalize(g.title)]
            if (c != null && g.cover == null) g.copy(cover = c.toString()) else g
        }
    }

    private fun walk(tree: Uri, docId: String, folders: List<String>, depth: Int, maxDepth: Int, out: MutableList<Pair<Game, String>>, covers: MutableMap<String, Uri>, inCoverDir: Boolean) {
        if (depth > maxDepth) return
        for (e in children(tree, docId)) {
            if (e.mime == DocumentsContract.Document.MIME_TYPE_DIR) {
                val isCover = inCoverDir || SystemDetector.normalize(e.name) in coverDirs
                walk(tree, e.docId, folders + e.name, depth + 1, maxDepth, out, covers, isCover)
                continue
            }
            val ext = SystemDetector.extension(e.name)
            if (ext in imageExts) {
                // Cover art next to the games or in a covers/images folder: matched to games by file name.
                covers[SystemDetector.normalize(e.name.substringBeforeLast('.'))] = DocumentsContract.buildDocumentUriUsingTree(tree, e.docId)
                continue
            }
            val d = SystemDetector.detect(e.name, folders)
            if (!d.isRom) continue
            val uri = DocumentsContract.buildDocumentUriUsingTree(tree, e.docId).toString()
            out.add(Game(Game.idFor(uri), SystemDetector.title(e.name), uri, PathResolver.rawPath(e.docId), d.system) to SystemDetector.normalize(e.name.substringBeforeLast('.')))
        }
    }

    private fun children(tree: Uri, docId: String): List<Entry> {
        val uri = DocumentsContract.buildChildDocumentsUriUsingTree(tree, docId)
        val out = mutableListOf<Entry>()
        try {
            resolver.query(uri, arrayOf(DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME, DocumentsContract.Document.COLUMN_MIME_TYPE), null, null, null)?.use { c ->
                while (c.moveToNext()) out.add(Entry(c.getString(0), c.getString(1) ?: continue, c.getString(2) ?: ""))
            }
        } catch (_: Exception) { /* unreadable folder: skip it */ }
        return out
    }

    /** One file picked by hand (OPEN_DOCUMENT). */
    fun gameFromFile(uri: Uri): Game? {
        val docId = try { DocumentsContract.getDocumentId(uri) } catch (_: Exception) { return null }
        val name = resolver.query(uri, arrayOf(DocumentsContract.Document.COLUMN_DISPLAY_NAME), null, null, null)?.use { if (it.moveToFirst()) it.getString(0) else null } ?: return null
        val d = SystemDetector.detect(name, docId.substringAfter(':', "").split('/').dropLast(1))
        if (!d.isRom) return null
        return Game(Game.idFor(uri.toString()), SystemDetector.title(name), uri.toString(), PathResolver.rawPath(docId), d.system, manual = true)
    }
}
