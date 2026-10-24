package com.emurm.rg353v.data

import java.security.MessageDigest

data class Game(
    val id: String,
    val title: String,
    /** SAF document URI of the game file. */
    val uri: String,
    /** Real file path derived from the URI (null for providers that don't map to storage). */
    val path: String?,
    /** User/detected system; null = unsorted. */
    val system: EmuSystem?,
    val favorite: Boolean = false,
    val lastPlayed: Long = 0L,
    val plays: Int = 0,
    /** SAF document URI of a cover image, if one was found or chosen. */
    val cover: String? = null,
    /** Added by hand (not from a scanned folder), so a rescan never drops it. */
    val manual: Boolean = false,
) {
    companion object {
        fun idFor(uri: String): String =
            MessageDigest.getInstance("SHA-1").digest(uri.toByteArray()).take(8).joinToString("") { "%02x".format(it) }
    }
}
