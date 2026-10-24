package com.emurm.rg353v.input

import android.os.SystemClock
import android.view.InputDevice
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.Window

/**
 * Wraps a window's callback so that (1) rebound Confirm/Back buttons act as D-pad-center/Back
 * and (2) the left stick moves the selection. Works for the activity and for every dialog.
 * `onAction` lets the activity react to the other bound actions (favorite, search, ...).
 */
fun Window.installGamepad(keyMap: () -> KeyMap, onAction: ((Action) -> Boolean)? = null) {
    val original = callback ?: return
    val stick = StickNavigator()
    callback = object : Window.Callback by original {
        override fun dispatchKeyEvent(event: KeyEvent): Boolean {
            val map = keyMap()
            if (onAction != null && event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) {
                val a = map.actionFor(event.keyCode)
                if (a != null && a != Action.CONFIRM && a != Action.BACK && onAction(a)) return true
            }
            val nav = map.navigationKey(event.keyCode)
            if (nav != null && nav != event.keyCode) {
                val translated = KeyEvent(event.downTime, event.eventTime, event.action, nav, event.repeatCount, event.metaState, event.deviceId, 0, event.flags, event.source)
                return original.dispatchKeyEvent(translated)
            }
            // A bound non-navigation action must not also trigger framework behaviour (e.g. BUTTON_X click).
            if (map.actionFor(event.keyCode).let { it != null && it != Action.CONFIRM && it != Action.BACK }) return true
            return original.dispatchKeyEvent(event)
        }

        override fun dispatchGenericMotionEvent(event: MotionEvent): Boolean {
            if (event.source and InputDevice.SOURCE_JOYSTICK == InputDevice.SOURCE_JOYSTICK && event.action == MotionEvent.ACTION_MOVE) {
                val key = stick.step(event.getAxisValue(MotionEvent.AXIS_X), event.getAxisValue(MotionEvent.AXIS_Y), SystemClock.uptimeMillis())
                if (key != null) {
                    val now = SystemClock.uptimeMillis()
                    original.dispatchKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_DOWN, key, 0))
                    original.dispatchKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_UP, key, 0))
                }
                return true
            }
            return original.dispatchGenericMotionEvent(event)
        }
    }
}
