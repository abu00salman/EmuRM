package com.emurm.rg353v.data

/** Turns a Storage Access Framework document id into a real file path external emulators can open. */
object PathResolver {
    private val SD_VOLUME = Regex("[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}")

    fun rawPath(documentId: String): String? {
        if (documentId.startsWith("raw:")) return documentId.removePrefix("raw:")
        val i = documentId.indexOf(':')
        if (i < 0) return null
        val volume = documentId.substring(0, i)
        val rel = documentId.substring(i + 1)
        val base = when {
            volume.equals("primary", ignoreCase = true) -> "/storage/emulated/0"
            SD_VOLUME.matches(volume) -> "/storage/$volume"
            else -> return null
        }
        return if (rel.isEmpty()) base else "$base/$rel"
    }
}
