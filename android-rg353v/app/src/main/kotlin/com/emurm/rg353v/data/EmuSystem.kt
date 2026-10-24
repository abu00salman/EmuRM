package com.emurm.rg353v.data

/** How well the RG353V (RK3566, 2 GB) is expected to run a system. A hint, not a promise. */
enum class Perf { GREAT, GOOD, MIXED }

/**
 * Systems this frontend organizes. `aliases` are normalized folder names (lowercase letters
 * and digits only) used to place ambiguous files (.zip, .7z, .bin, .iso, .chd ...) by the
 * folder they sit in; `exts` are extensions that identify the system on their own.
 */
enum class EmuSystem(val id: String, val short: String, val perf: Perf, val aliases: Set<String>, val exts: Set<String>) {
    NES("nes", "NES", Perf.GREAT, setOf("nes", "famicom", "fc", "nintendoentertainmentsystem"), setOf("nes", "fds", "unf", "unif")),
    SNES("snes", "SNES", Perf.GREAT, setOf("snes", "sfc", "supernintendo", "superfamicom", "supernes"), setOf("sfc", "smc", "fig", "swc")),
    MSX("msx", "MSX", Perf.GREAT, setOf("msx", "msx1", "msx2"), setOf("mx1", "mx2")),
    MD("md", "Mega Drive", Perf.GREAT, setOf("md", "megadrive", "genesis", "segagenesis", "segamegadrive"), setOf("md", "gen", "smd")),
    GBA("gba", "GBA", Perf.GREAT, setOf("gba", "gameboyadvance"), setOf("gba")),
    PS1("ps1", "PS1", Perf.GOOD, setOf("psx", "ps1", "ps", "playstation", "playstation1", "sonyplaystation"), emptySet()),
    N64("n64", "N64", Perf.MIXED, setOf("n64", "nintendo64"), setOf("z64", "n64", "v64")),
    NDS("nds", "NDS", Perf.GOOD, setOf("nds", "ds", "nintendods"), setOf("nds")),
    DC("dc", "Dreamcast", Perf.MIXED, setOf("dc", "dreamcast", "segadreamcast"), setOf("gdi", "cdi")),
    PSP("psp", "PSP", Perf.MIXED, setOf("psp", "playstationportable"), setOf("cso", "pbp"));

    companion object {
        fun byId(id: String?): EmuSystem? = entries.firstOrNull { it.id == id }
    }
}

/** Result of looking at one file: is it a game file, and for which system (null = unknown). */
data class Detection(val isRom: Boolean, val system: EmuSystem?)

object SystemDetector {
    /** Extensions that are game files but don't name a system (disc images, archives, MSX roms). */
    private val AMBIGUOUS = setOf("zip", "7z", "bin", "iso", "cue", "chd", "img", "mdf", "ecm", "m3u", "rom", "dsk", "cas", "ccd")

    fun normalize(name: String): String = name.lowercase().filter { it.isLetterOrDigit() }

    fun extension(fileName: String): String = fileName.substringAfterLast('.', "").lowercase()

    /** `folders` are the directory names from the library root down to the file's directory. */
    fun detect(fileName: String, folders: List<String>): Detection {
        val ext = extension(fileName)
        EmuSystem.entries.firstOrNull { ext in it.exts }?.let { return Detection(true, it) }
        if (ext !in AMBIGUOUS) return Detection(false, null)
        val hinted = folders.asReversed().firstNotNullOfOrNull { f ->
            val n = normalize(f)
            EmuSystem.entries.firstOrNull { n in it.aliases }
        }
        return Detection(true, hinted)
    }

    fun title(fileName: String): String =
        fileName.substringBeforeLast('.', fileName).replace('_', ' ').replace(Regex("\\s*[\\[(][^\\])]*[\\])]"), "").trim().ifEmpty { fileName }
}
