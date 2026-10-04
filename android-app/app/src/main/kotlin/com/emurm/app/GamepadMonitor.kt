package com.emurm.app

import android.content.Context
import android.hardware.input.InputManager
import android.view.InputDevice

/**
 * Only decides when to show a "controller connected/disconnected" notice. Button and
 * axis input never passes through native code at all: Chromium (in both desktop
 * Chrome and WebView) already implements the standard W3C Gamepad API, so the same
 * `navigator.getGamepads()` polling EmuRM's web layer already does sees a Bluetooth or
 * USB gamepad automatically, with nothing to relay natively.
 */
class GamepadMonitor(context: Context, private val onConnectedChanged: (connected: Boolean) -> Unit) {
    private val inputManager = context.applicationContext.getSystemService(Context.INPUT_SERVICE) as InputManager
    private val gamepadDeviceIds = mutableSetOf<Int>()

    private fun isGamepad(deviceId: Int): Boolean {
        val device = inputManager.getInputDevice(deviceId) ?: return false
        if (device.isVirtual) return false
        val sources = device.sources
        return (sources and InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD ||
            (sources and InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK
    }

    private val listener =
        object : InputManager.InputDeviceListener {
            override fun onInputDeviceAdded(deviceId: Int) {
                if (!isGamepad(deviceId)) return
                val wasEmpty = gamepadDeviceIds.isEmpty()
                gamepadDeviceIds.add(deviceId)
                if (wasEmpty) onConnectedChanged(true)
            }

            override fun onInputDeviceRemoved(deviceId: Int) {
                // The device is already gone by now, so it can no longer be classified
                // via getInputDevice() — rely on the set built up from additions instead
                // of re-querying its type here.
                if (gamepadDeviceIds.remove(deviceId) && gamepadDeviceIds.isEmpty()) {
                    onConnectedChanged(false)
                }
            }

            override fun onInputDeviceChanged(deviceId: Int) = Unit
        }

    fun start() {
        inputManager.registerInputDeviceListener(listener, null)
        // Catches a gamepad that was already paired/plugged in before this screen
        // existed, instead of only reacting to changes from this point on.
        gamepadDeviceIds.clear()
        gamepadDeviceIds.addAll(inputManager.inputDeviceIds.filter(::isGamepad))
    }

    fun stop() {
        inputManager.unregisterInputDeviceListener(listener)
    }
}
