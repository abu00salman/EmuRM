package com.emurm.rg353v

import com.emurm.rg353v.data.EmuSystem
import com.emurm.rg353v.data.PathResolver
import com.emurm.rg353v.data.SystemDetector
import com.emurm.rg353v.emu.Emulators
import com.emurm.rg353v.input.Action
import com.emurm.rg353v.input.KEYCODE_BACK
import com.emurm.rg353v.input.KEYCODE_DPAD_CENTER
import com.emurm.rg353v.input.KEYCODE_DPAD_DOWN
import com.emurm.rg353v.input.KEYCODE_DPAD_RIGHT
import com.emurm.rg353v.input.KeyMap
import com.emurm.rg353v.input.StickNavigator
import com.emurm.rg353v.input.navigationKey
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LogicTest {
    @Test fun sdCardAndInternalPaths() {
        assertEquals("/storage/emulated/0/Roms/NES/a.nes", PathResolver.rawPath("primary:Roms/NES/a.nes"))
        assertEquals("/storage/1A2B-3C4D/Roms/gba/x.gba", PathResolver.rawPath("1A2B-3C4D:Roms/gba/x.gba"))
        assertEquals("/storage/emulated/0/Download/x.zip", PathResolver.rawPath("raw:/storage/emulated/0/Download/x.zip"))
        assertNull(PathResolver.rawPath("msf:1234"))
        assertNull(PathResolver.rawPath("nocolon"))
    }

    @Test fun detectsSystemsByExtensionAndFolder() {
        assertEquals(EmuSystem.NES, SystemDetector.detect("Contra.nes", emptyList()).system)
        assertEquals(EmuSystem.SNES, SystemDetector.detect("Zelda.sfc", listOf("roms")).system)
        assertEquals(EmuSystem.GBA, SystemDetector.detect("a.gba", emptyList()).system)
        assertEquals(EmuSystem.PSP, SystemDetector.detect("g.cso", emptyList()).system)
        // ambiguous files take the nearest hinted folder
        assertEquals(EmuSystem.PS1, SystemDetector.detect("Crash.chd", listOf("Roms", "PSX")).system)
        assertEquals(EmuSystem.MD, SystemDetector.detect("Sonic.zip", listOf("Sega Genesis")).system)
        assertEquals(EmuSystem.PSP, SystemDetector.detect("g.iso", listOf("psp", "games")).system)
        // no hint = game file but unsorted; non-game = ignored
        assertTrue(SystemDetector.detect("Mystery.zip", listOf("stuff")).isRom)
        assertNull(SystemDetector.detect("Mystery.zip", listOf("stuff")).system)
        assertFalse(SystemDetector.detect("readme.txt", emptyList()).isRom)
        assertFalse(SystemDetector.detect("cover.png", emptyList()).isRom)
    }

    @Test fun titlesDropTags() {
        assertEquals("Super Mario Bros", SystemDetector.title("Super_Mario_Bros (USA) [!].nes"))
    }

    @Test fun retroArchSpecMatchesDocumentedExtras() {
        val spec = Emulators.retroArch("fceumm").build("com.retroarch.aarch64", "/storage/emulated/0/Roms/a.nes")
        assertEquals("com.retroarch.browser.retroactivity.RetroActivityFuture", spec.activity)
        assertEquals("/storage/emulated/0/Roms/a.nes", spec.extras["ROM"])
        assertEquals("/data/data/com.retroarch.aarch64/cores/fceumm_libretro_android.so", spec.extras["LIBRETRO"])
    }

    @Test fun everySystemHasAnEmulatorOption() {
        EmuSystem.entries.forEach { assertTrue(it.short, Emulators.optionsFor(it).isNotEmpty()) }
    }

    @Test fun keyMapNavigationAndRebind() {
        val m = KeyMap()
        assertEquals(KEYCODE_DPAD_CENTER, m.navigationKey(96))
        assertEquals(KEYCODE_BACK, m.navigationKey(97))
        assertEquals(KEYCODE_DPAD_DOWN, m.navigationKey(KEYCODE_DPAD_DOWN))
        assertNull(m.navigationKey(99))
        m.set(Action.CONFIRM, 99)
        assertEquals(KEYCODE_DPAD_CENTER, m.navigationKey(99))
        val back = KeyMap.parse(m.serialize())
        assertEquals(99, back.code(Action.CONFIRM))
        assertEquals(Action.FAVORITE.default, back.code(Action.FAVORITE))
    }

    @Test fun stickRepeatsWithDeadzone() {
        val s = StickNavigator(0.6f, 170)
        assertNull(s.step(0.2f, 0.1f, 0))
        assertEquals(KEYCODE_DPAD_RIGHT, s.step(0.9f, 0f, 1000))
        assertNull(s.step(0.9f, 0f, 1050))
        assertEquals(KEYCODE_DPAD_RIGHT, s.step(0.9f, 0f, 1200))
    }
}
