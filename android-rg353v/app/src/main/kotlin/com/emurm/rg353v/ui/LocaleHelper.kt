package com.emurm.rg353v.ui

import android.content.Context
import android.content.res.Configuration
import java.util.Locale

object LocaleHelper {
    /** `lang` is "system", "en" or "ar". Returns a context whose resources (and layout direction) follow it. */
    fun wrap(base: Context, lang: String): Context {
        if (lang == "system") return base
        val locale = Locale(lang)
        Locale.setDefault(locale)
        val cfg = Configuration(base.resources.configuration)
        cfg.setLocale(locale)
        cfg.setLayoutDirection(locale)
        return base.createConfigurationContext(cfg)
    }
}
