package com.emurm.rg353v.data

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/** The on-device game library: scanned folders + games, stored as one small JSON file (works offline). */
class Library(private val ctx: Context) {
    private val file = File(ctx.filesDir, "library.json")
    private val lock = Any()
    var folders: MutableList<String> = mutableListOf()
        private set
    private var games: MutableList<Game> = mutableListOf()

    init { load() }

    fun all(): List<Game> = synchronized(lock) { games.toList() }

    fun update(id: String, change: (Game) -> Game) = synchronized(lock) {
        val i = games.indexOfFirst { it.id == id }
        if (i >= 0) { games[i] = change(games[i]); save() }
    }

    fun remove(id: String) = synchronized(lock) { games.removeAll { it.id == id }; save() }

    fun addFolder(uri: String) = synchronized(lock) { if (uri !in folders) { folders.add(uri); save() } }
    fun removeFolder(uri: String) = synchronized(lock) { folders.remove(uri); games.removeAll { !it.manual && it.uri.startsWith(uri.substringBefore("/document/")) }; save() }

    /** Adds games from a scan, keeping user state (favorite, plays, manual system) of ones already known. */
    fun merge(scanned: List<Game>, replaceScanned: Boolean) = synchronized(lock) {
        val existing = games.associateBy { it.id }
        val merged = scanned.map { n ->
            val o = existing[n.id]
            if (o == null) n else n.copy(favorite = o.favorite, lastPlayed = o.lastPlayed, plays = o.plays, system = o.system ?: n.system, cover = o.cover ?: n.cover, manual = o.manual || n.manual)
        }
        val keep = if (replaceScanned) games.filter { it.manual && it.id !in merged.map { m -> m.id }.toSet() } else games.filter { it.id !in merged.map { m -> m.id }.toSet() }
        games = (keep + merged).toMutableList()
        save()
    }

    private fun load() {
        if (!file.exists()) return
        try {
            val root = JSONObject(file.readText())
            folders = root.optJSONArray("folders").toStrings().toMutableList()
            val arr = root.optJSONArray("games") ?: JSONArray()
            games = (0 until arr.length()).mapNotNull { i -> arr.optJSONObject(i)?.let(::fromJson) }.toMutableList()
        } catch (_: Exception) { /* a corrupt file just means an empty library; the user can rescan */ }
    }

    private fun save() {
        val root = JSONObject()
        root.put("folders", JSONArray(folders))
        root.put("games", JSONArray(games.map(::toJson)))
        val tmp = File(file.parentFile, "library.json.tmp")
        tmp.writeText(root.toString())
        tmp.renameTo(file)
    }

    private fun JSONArray?.toStrings(): List<String> = if (this == null) emptyList() else (0 until length()).map { getString(it) }

    private fun toJson(g: Game) = JSONObject().apply {
        put("id", g.id); put("title", g.title); put("uri", g.uri); put("path", g.path ?: JSONObject.NULL)
        put("system", g.system?.id ?: JSONObject.NULL); put("fav", g.favorite); put("last", g.lastPlayed)
        put("plays", g.plays); put("cover", g.cover ?: JSONObject.NULL); put("manual", g.manual)
    }

    private fun fromJson(o: JSONObject) = Game(
        id = o.getString("id"), title = o.getString("title"), uri = o.getString("uri"),
        path = o.optString("path").takeIf { !o.isNull("path") && it.isNotEmpty() },
        system = EmuSystem.byId(o.optString("system").takeIf { !o.isNull("system") }),
        favorite = o.optBoolean("fav"), lastPlayed = o.optLong("last"), plays = o.optInt("plays"),
        cover = o.optString("cover").takeIf { !o.isNull("cover") && it.isNotEmpty() }, manual = o.optBoolean("manual"),
    )
}
