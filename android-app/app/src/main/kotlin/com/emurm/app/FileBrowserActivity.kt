package com.emurm.app

import android.Manifest
import android.content.ClipData
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ListView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.io.File
import java.util.Locale

/**
 * Built-in file browser for devices with no system document picker (many handhelds ship without
 * one, so the web app's "Add games" did nothing). Big text, D-pad/touch friendly. Returns the
 * chosen files as file:// URIs in the result's ClipData -- the same shape the system picker gives.
 */
class FileBrowserActivity : AppCompatActivity() {
    private data class Row(val file: File?, val label: String, val kind: Int) // kind: 0 up/root, 1 dir, 2 file

    private lateinit var list: ListView
    private lateinit var pathView: TextView
    private lateinit var confirm: Button
    private lateinit var adapter: ArrayAdapter<Row>
    private var dir: File? = null // null = list of storage roots
    private val selected = LinkedHashSet<File>()
    private var multiple = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        multiple = intent.getBooleanExtra(EXTRA_MULTIPLE, true)
        val bg = Color.rgb(10, 10, 13)
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(bg) }
        pathView = TextView(this).apply {
            setTextColor(Color.rgb(154, 163, 181)); textSize = 15f; setPadding(dp(14), dp(10), dp(14), dp(6)); maxLines = 1
            ellipsize = android.text.TextUtils.TruncateAt.START
        }
        root.addView(pathView, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))

        adapter = object : ArrayAdapter<Row>(this, 0) {
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                val row = getItem(position)!!
                val tv = (convertView as? TextView) ?: TextView(context).apply {
                    textSize = 21f; setPadding(dp(16), dp(14), dp(16), dp(14)); minHeight = dp(60); gravity = Gravity.CENTER_VERTICAL
                    setTextColor(Color.WHITE)
                }
                val on = row.file != null && row.file in selected
                tv.text = when (row.kind) { 0 -> row.label; 1 -> "📁  ${row.label}"; else -> (if (on) "✅  " else "⬜  ") + row.label }
                tv.setTextColor(if (on) Color.rgb(77, 141, 255) else Color.WHITE)
                tv.typeface = if (row.kind == 2) Typeface.DEFAULT else Typeface.DEFAULT_BOLD
                return tv
            }
        }
        list = ListView(this).apply {
            adapter = this@FileBrowserActivity.adapter
            divider = android.graphics.drawable.ColorDrawable(Color.argb(40, 255, 255, 255)); dividerHeight = 1
            selector = android.graphics.drawable.ColorDrawable(Color.argb(70, 77, 141, 255))
            isFocusable = true
            setOnItemClickListener { _, _, pos, _ -> open(this@FileBrowserActivity.adapter.getItem(pos)!!) }
        }
        root.addView(list, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))

        val bar = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; setPadding(dp(8), dp(6), dp(8), dp(6)) }
        val cancel = Button(this).apply { text = getString(R.string.browser_cancel); textSize = 18f; setOnClickListener { setResult(RESULT_CANCELED); finish() } }
        confirm = Button(this).apply { textSize = 18f; setOnClickListener { finishWithSelection() } }
        bar.addView(cancel, LinearLayout.LayoutParams(0, dp(56), 1f).apply { marginEnd = dp(8) })
        bar.addView(confirm, LinearLayout.LayoutParams(0, dp(56), 1f))
        root.addView(bar)
        setContentView(root)
        updateConfirm()

        if (hasStoragePermission()) show(null)
        else requestPermissions(arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE), 1)
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    private fun hasStoragePermission(): Boolean =
        Build.VERSION.SDK_INT < 23 || checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (hasStoragePermission()) show(null) else { pathView.text = getString(R.string.browser_no_permission) }
    }

    private fun roots(): List<File> {
        val out = mutableListOf<File>()
        out.add(Environment.getExternalStorageDirectory())
        File("/storage").listFiles()?.forEach { f ->
            if (f.isDirectory && f.name != "emulated" && f.name != "self" && f.canRead()) out.add(f)
        }
        return out.distinct()
    }

    private fun show(d: File?) {
        dir = d
        adapter.clear()
        if (d == null) {
            pathView.text = getString(R.string.browser_title)
            val internal = Environment.getExternalStorageDirectory()
            roots().forEach { r -> adapter.add(Row(r, if (r == internal) getString(R.string.browser_internal) else getString(R.string.browser_sd, r.name), 1)) }
        } else {
            pathView.text = d.absolutePath
            adapter.add(Row(d.parentFile.takeIf { p -> p != null && roots().none { r -> r == d } }, getString(R.string.browser_up), 0))
            val kids = d.listFiles()?.filter { !it.name.startsWith(".") }.orEmpty()
                .sortedWith(compareBy<File>({ !it.isDirectory }, { it.name.lowercase(Locale.ROOT) }))
            kids.forEach { adapter.add(Row(it, it.name, if (it.isDirectory) 1 else 2)) }
        }
        adapter.notifyDataSetChanged()
        list.setSelection(if (adapter.count > 1 && d != null) 1 else 0)
        list.requestFocus()
    }

    private fun open(row: Row) {
        when (row.kind) {
            0 -> show(row.file) // ".." (null parent = back to the roots list)
            1 -> show(row.file)
            else -> {
                val f = row.file ?: return
                if (!multiple) { selected.clear(); selected.add(f); finishWithSelection(); return }
                if (!selected.add(f)) selected.remove(f)
                adapter.notifyDataSetChanged(); updateConfirm()
            }
        }
    }

    private fun updateConfirm() {
        confirm.text = getString(R.string.browser_select, selected.size)
        confirm.isEnabled = selected.isNotEmpty()
    }

    private fun finishWithSelection() {
        if (selected.isEmpty()) return
        val uris = selected.map { Uri.fromFile(it) }
        val clip = ClipData.newRawUri("games", uris.first()).also { c -> uris.drop(1).forEach { c.addItem(ClipData.Item(it)) } }
        setResult(RESULT_OK, Intent().apply { clipData = clip; data = uris.first() })
        finish()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        // B (or Back) goes up a folder before leaving; X confirms the selection.
        if (keyCode == KeyEvent.KEYCODE_BUTTON_B || keyCode == KeyEvent.KEYCODE_BACK) {
            val d = dir
            if (d != null) { show(if (roots().any { it == d }) null else d.parentFile); return true }
            setResult(RESULT_CANCELED); finish(); return true
        }
        if (keyCode == KeyEvent.KEYCODE_BUTTON_START || keyCode == KeyEvent.KEYCODE_BUTTON_X) { finishWithSelection(); return true }
        return super.onKeyDown(keyCode, event)
    }

    companion object { const val EXTRA_MULTIPLE = "multiple" }
}
