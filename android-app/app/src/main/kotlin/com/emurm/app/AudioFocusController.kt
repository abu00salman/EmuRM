package com.emurm.app

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager

/**
 * Requests GAME-usage audio focus while a game is running, and reports any loss back
 * to the caller rather than trying to mute or duck the WebView directly — there is no
 * public API for that on a per-WebView basis. The caller (MainActivity) responds by
 * pausing the emulator through the exact same code path the pause-menu Escape key and
 * the system Back button already use, instead of a one-off mechanism invented just
 * for this. Full ducking (lowering volume while keeping audio alive) isn't attempted:
 * a paused game is the standard, expected behavior for an interruption in basically
 * every game and emulator, not just this one.
 */
class AudioFocusController(context: Context, private val onFocusLost: () -> Unit) {
    private val audioManager = context.applicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var request: AudioFocusRequest? = null

    private val focusListener =
        AudioManager.OnAudioFocusChangeListener { change ->
            when (change) {
                AudioManager.AUDIOFOCUS_LOSS,
                AudioManager.AUDIOFOCUS_LOSS_TRANSIENT,
                AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK,
                -> onFocusLost()
            }
        }

    fun request() {
        if (request != null) return
        val attributes =
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_GAME)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
        val newRequest =
            AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(attributes)
                .setOnAudioFocusChangeListener(focusListener)
                .build()
        request = newRequest
        audioManager.requestAudioFocus(newRequest)
    }

    fun abandon() {
        request?.let { audioManager.abandonAudioFocusRequest(it) }
        request = null
    }
}
