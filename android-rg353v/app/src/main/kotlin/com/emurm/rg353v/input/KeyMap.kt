package com.emurm.rg353v.input

/** UI actions that physical buttons can be bound to. Defaults follow Android's gamepad key codes. */
enum class Action(val default: Int) {
    CONFIRM(96),   // BUTTON_A
    BACK(97),      // BUTTON_B
    FAVORITE(99),  // BUTTON_X
    SEARCH(100),   // BUTTON_Y
    PREV_CATEGORY(102), // BUTTON_L1
    NEXT_CATEGORY(103), // BUTTON_R1
    PAGE_UP(104),  // BUTTON_L2
    PAGE_DOWN(105), // BUTTON_R2
    OPTIONS(109),  // BUTTON_SELECT
    MENU(108),     // BUTTON_START
}

const val KEYCODE_BACK = 4
const val KEYCODE_DPAD_UP = 19
const val KEYCODE_DPAD_DOWN = 20
const val KEYCODE_DPAD_LEFT = 21
const val KEYCODE_DPAD_RIGHT = 22
const val KEYCODE_DPAD_CENTER = 23

/** Bindings from Action to key code; the D-pad itself is never rebindable (always navigates). */
class KeyMap(private val codes: MutableMap<Action, Int> = defaults()) {
    fun code(a: Action): Int = codes[a] ?: a.default
    fun set(a: Action, code: Int) { codes[a] = code }
    fun reset() { codes.clear(); codes.putAll(defaults()) }

    /** Which action (if any) the given key code is bound to. */
    fun actionFor(keyCode: Int): Action? = Action.entries.firstOrNull { code(it) == keyCode }

    fun serialize(): String = Action.entries.joinToString(",") { "${it.name}=${code(it)}" }

    companion object {
        fun defaults(): MutableMap<Action, Int> = Action.entries.associateWithTo(mutableMapOf()) { it.default }

        fun parse(s: String?): KeyMap {
            val m = defaults()
            s?.split(',')?.forEach { part ->
                val (k, v) = part.split('=').takeIf { it.size == 2 } ?: return@forEach
                val action = Action.entries.firstOrNull { it.name == k }
                val code = v.toIntOrNull()
                if (action != null && code != null && code > 0) m[action] = code
            }
            return KeyMap(m)
        }
    }
}

/** Maps a pressed key to the system navigation key the framework understands, if it is one. */
fun KeyMap.navigationKey(keyCode: Int): Int? = when {
    keyCode in KEYCODE_DPAD_UP..KEYCODE_DPAD_RIGHT -> keyCode
    actionFor(keyCode) == Action.CONFIRM -> KEYCODE_DPAD_CENTER
    actionFor(keyCode) == Action.BACK -> KEYCODE_BACK
    else -> null
}

/** Turns analog stick positions into repeated D-pad presses (deadzone + repeat interval). */
class StickNavigator(private val deadzone: Float = 0.6f, private val repeatMs: Long = 170L) {
    private var lastDir = 0
    private var lastAt = 0L

    /** Returns a DPAD key code to press for this stick position at `nowMs`, or null. */
    fun step(x: Float, y: Float, nowMs: Long): Int? {
        val dir = when {
            kotlin.math.abs(x) < deadzone && kotlin.math.abs(y) < deadzone -> 0
            kotlin.math.abs(x) >= kotlin.math.abs(y) -> if (x > 0) KEYCODE_DPAD_RIGHT else KEYCODE_DPAD_LEFT
            else -> if (y > 0) KEYCODE_DPAD_DOWN else KEYCODE_DPAD_UP
        }
        if (dir == 0) { lastDir = 0; return null }
        if (dir == lastDir && nowMs - lastAt < repeatMs) return null
        lastDir = dir
        lastAt = nowMs
        return dir
    }
}
