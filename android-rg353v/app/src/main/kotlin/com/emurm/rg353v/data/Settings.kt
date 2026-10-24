package com.emurm.rg353v.data

import android.content.Context
import com.emurm.rg353v.input.KeyMap

class Settings(ctx: Context) {
    private val p = ctx.getSharedPreferences("settings", Context.MODE_PRIVATE)

    /** "system", "en" or "ar". */
    var language: String
        get() = p.getString("lang", "system") ?: "system"
        set(v) { p.edit().putString("lang", v).apply() }

    fun preferredEmulator(system: EmuSystem): String? = p.getString("emu_${system.id}", null)
    fun setPreferredEmulator(system: EmuSystem, optionId: String?) { p.edit().putString("emu_${system.id}", optionId).apply() }

    fun keyMap(): KeyMap = KeyMap.parse(p.getString("keymap", null))
    fun saveKeyMap(m: KeyMap) { p.edit().putString("keymap", m.serialize()).apply() }
}
