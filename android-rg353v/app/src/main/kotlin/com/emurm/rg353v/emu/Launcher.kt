package com.emurm.rg353v.emu

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import com.emurm.rg353v.data.EmuSystem
import java.io.File

/** Android side of launching: which emulators are installed, and starting one for a game file. */
object Launcher {
    fun candidatePackages(): Set<String> = EmuSystem.entries.flatMap { s -> Emulators.optionsFor(s).flatMap { it.packages } }.toSet()

    fun installedPackages(pm: PackageManager): Set<String> = candidatePackages().filterTo(HashSet()) { pkg ->
        try { pm.getPackageInfo(pkg, 0); true } catch (_: PackageManager.NameNotFoundException) { false }
    }

    /** Builds the Intent for a spec. Kept separate so the data-only [LaunchSpec] stays testable. */
    fun toIntent(spec: LaunchSpec): Intent {
        val i = Intent(spec.action)
        if (spec.activity != null) i.setClassName(spec.pkg, spec.activity) else i.setPackage(spec.pkg)
        spec.dataPath?.let { i.setDataAndType(Uri.fromFile(File(it)), "*/*") }
        spec.extras.forEach { (k, v) -> i.putExtra(k, v) }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        return i
    }

    /** Returns null on success, or a short error message. */
    fun start(ctx: Context, spec: LaunchSpec): String? = try {
        ctx.startActivity(toIntent(spec))
        null
    } catch (e: ActivityNotFoundException) {
        "activity not found (${spec.pkg})"
    } catch (e: SecurityException) {
        e.message ?: "permission denied"
    } catch (e: Exception) {
        e.message ?: e.javaClass.simpleName
    }
}
