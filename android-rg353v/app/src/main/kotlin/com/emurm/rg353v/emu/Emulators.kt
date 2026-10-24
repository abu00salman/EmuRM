package com.emurm.rg353v.emu

import com.emurm.rg353v.data.EmuSystem

/** Everything needed to start an external emulator, as plain data (turned into an Intent elsewhere). */
data class LaunchSpec(
    val pkg: String,
    /** Fully-qualified activity class, or null to let Android pick the package's VIEW handler. */
    val activity: String?,
    val action: String,
    /** File path to pass as the intent data (file://) -- or null when only extras are used. */
    val dataPath: String?,
    val extras: Map<String, String>,
)

/**
 * One way of running a system. `needsCore` is shown to the user: RetroArch only starts a game if
 * the matching core was already downloaded inside RetroArch.
 */
data class EmuOption(
    val id: String,
    val label: String,
    val packages: List<String>,
    val needsCore: String? = null,
    val documented: Boolean,
    val build: (pkg: String, romPath: String) -> LaunchSpec,
)

object Emulators {
    private const val VIEW = "android.intent.action.VIEW"
    private const val MAIN = "android.intent.action.MAIN"
    private val RETROARCH_PACKAGES = listOf("com.retroarch.aarch64", "com.retroarch")

    fun retroArch(core: String) = EmuOption(
        id = "ra-$core",
        label = "RetroArch ($core)",
        packages = RETROARCH_PACKAGES,
        needsCore = core,
        documented = true,
    ) { pkg, rom ->
        LaunchSpec(
            pkg = pkg,
            activity = "com.retroarch.browser.retroactivity.RetroActivityFuture",
            action = MAIN,
            dataPath = null,
            // Same extras that other Android frontends pass to RetroArch.
            extras = mapOf("ROM" to rom, "LIBRETRO" to "/data/data/$pkg/cores/${core}_libretro_android.so", "QUITFOCUS" to ""),
        )
    }

    private fun viewIntent(id: String, label: String, packages: List<String>, activity: String? = null, documented: Boolean = false) =
        EmuOption(id, label, packages, null, documented) { pkg, rom -> LaunchSpec(pkg, activity, VIEW, rom, emptyMap()) }

    private val ppsspp = viewIntent("ppsspp", "PPSSPP", listOf("org.ppsspp.ppsspp", "org.ppsspp.ppssppgold"), "org.ppsspp.ppsspp.PpssppActivity", documented = true)
    private val drastic = viewIntent("drastic", "DraStic", listOf("com.dsstudios.drastic"))
    private val melonds = viewIntent("melonds", "melonDS", listOf("me.magnum.melonds"))
    private val flycast = viewIntent("flycast", "Flycast", listOf("com.flycast.emulator"))
    private val duckstation = viewIntent("duckstation", "DuckStation", listOf("com.github.stenzek.duckstation"))
    private val mupenFz = viewIntent("m64plusfz", "M64Plus FZ", listOf("org.mupen64plusae.v3.fzurita"))

    fun optionsFor(system: EmuSystem): List<EmuOption> = when (system) {
        EmuSystem.NES -> listOf(retroArch("fceumm"), retroArch("nestopia"))
        EmuSystem.SNES -> listOf(retroArch("snes9x"), retroArch("snes9x2010"))
        EmuSystem.MSX -> listOf(retroArch("bluemsx"), retroArch("fmsx"))
        EmuSystem.MD -> listOf(retroArch("genesis_plus_gx"), retroArch("picodrive"))
        EmuSystem.GBA -> listOf(retroArch("mgba"), retroArch("gpsp"))
        EmuSystem.PS1 -> listOf(retroArch("pcsx_rearmed"), duckstation)
        EmuSystem.N64 -> listOf(mupenFz, retroArch("mupen64plus_next"), retroArch("parallel_n64"))
        EmuSystem.NDS -> listOf(drastic, melonds, retroArch("melonds"))
        EmuSystem.DC -> listOf(flycast, retroArch("flycast"))
        EmuSystem.PSP -> listOf(ppsspp, retroArch("ppsspp"))
    }

    /** First installed package of an option, given the set of installed package names. */
    fun installedPackage(option: EmuOption, installed: Set<String>): String? = option.packages.firstOrNull { it in installed }
}
