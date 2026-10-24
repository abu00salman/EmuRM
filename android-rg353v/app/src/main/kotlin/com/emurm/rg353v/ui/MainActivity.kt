package com.emurm.rg353v.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.StrictMode
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.emurm.rg353v.BuildConfig
import com.emurm.rg353v.R
import com.emurm.rg353v.data.EmuSystem
import com.emurm.rg353v.data.Game
import com.emurm.rg353v.data.Library
import com.emurm.rg353v.data.Perf
import com.emurm.rg353v.data.RomScanner
import com.emurm.rg353v.data.Settings
import com.emurm.rg353v.emu.EmuOption
import com.emurm.rg353v.emu.Emulators
import com.emurm.rg353v.emu.Launcher
import com.emurm.rg353v.input.Action
import com.emurm.rg353v.input.KeyMap
import com.emurm.rg353v.input.installGamepad
import java.util.concurrent.Executors

/** One entry of the left sidebar: a view over the library. */
internal class Category(val label: String, val games: List<Game>, val system: EmuSystem? = null)

class MainActivity : AppCompatActivity() {
    private lateinit var library: Library
    private lateinit var settings: Settings
    private lateinit var scanner: RomScanner
    private lateinit var loader: CoverLoader
    private var keyMap = KeyMap()
    private val bg = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())

    private lateinit var sidebar: RecyclerView
    private lateinit var grid: RecyclerView
    private lateinit var header: TextView
    private lateinit var empty: TextView
    private lateinit var hints: TextView

    private var categories: List<Category> = emptyList()
    private var selected = 0
    private var query = ""
    private var shown: List<Game> = emptyList()
    private var coverTarget: Game? = null

    override fun attachBaseContext(newBase: Context) {
        super.attachBaseContext(LocaleHelper.wrap(newBase, Settings(newBase).language))
    }

    private val pickFolder = registerForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri -> if (uri != null) addFolder(uri) }
    private val pickFiles = registerForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris -> addFiles(uris) }
    private val pickCover = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        val g = coverTarget
        if (uri != null && g != null) {
            persist(uri)
            library.update(g.id) { it.copy(cover = uri.toString()) }
            refresh()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Emulators receive the game as a file:// URI; this opts out of the framework's blanket ban on that.
        StrictMode.setVmPolicy(StrictMode.VmPolicy.Builder().build())
        library = Library(this); settings = Settings(this); scanner = RomScanner(this); loader = CoverLoader(this)
        keyMap = settings.keyMap()
        buildUi()
        window.installGamepad({ keyMap }) { action -> onAction(action) }
        refresh()
    }

    override fun onResume() { super.onResume(); updateHints() }

    // ---------------------------------------------------------------- UI

    private fun buildUi() {
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(col(R.color.bg)) }

        val body = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        sidebar = RecyclerView(this).apply {
            layoutManager = LinearLayoutManager(this@MainActivity)
            adapter = SideAdapter()
            setPadding(dp(8), dp(8), dp(8), dp(8)); clipToPadding = false
            setBackgroundColor(col(R.color.surface))
            descendantFocusability = ViewGroup.FOCUS_AFTER_DESCENDANTS
        }
        body.addView(sidebar, LinearLayout.LayoutParams(dp(150), ViewGroup.LayoutParams.MATCH_PARENT))

        val content = android.widget.FrameLayout(this)
        val column = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        header = TextView(this).apply { setTextColor(col(R.color.text)); textSize = 18f; typeface = android.graphics.Typeface.DEFAULT_BOLD; setPadding(dp(14), dp(10), dp(14), dp(4)) }
        column.addView(header, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        grid = RecyclerView(this).apply {
            layoutManager = GridLayoutManager(this@MainActivity, 4)
            adapter = GameAdapter()
            setPadding(dp(8), dp(4), dp(8), dp(8)); clipToPadding = false
            setHasFixedSize(true)
        }
        column.addView(grid, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        content.addView(column, android.widget.FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        empty = TextView(this).apply {
            setTextColor(col(R.color.muted)); textSize = 14f; gravity = Gravity.CENTER; setPadding(dp(28), dp(28), dp(28), dp(28)); visibility = View.GONE
        }
        content.addView(empty, android.widget.FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        body.addView(content, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f))
        root.addView(body, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))

        hints = TextView(this).apply { setTextColor(col(R.color.muted)); textSize = 11f; setPadding(dp(12), dp(5), dp(12), dp(5)); setBackgroundColor(col(R.color.surface)); maxLines = 1; ellipsize = android.text.TextUtils.TruncateAt.END }
        root.addView(hints, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        setContentView(root)
    }

    private fun keyLabel(a: Action): String = KeyEvent.keyCodeToString(keyMap.code(a)).removePrefix("KEYCODE_").removePrefix("BUTTON_")

    private fun updateHints() {
        hints.text = "${keyLabel(Action.CONFIRM)} ${getString(R.string.hint_play)}  ·  ${keyLabel(Action.FAVORITE)} ${getString(R.string.hint_fav)}  ·  ${keyLabel(Action.SEARCH)} ${getString(R.string.hint_search)}  ·  ${keyLabel(Action.OPTIONS)} ${getString(R.string.hint_options)}  ·  ${keyLabel(Action.MENU)} ${getString(R.string.hint_menu)}  ·  ${keyLabel(Action.PREV_CATEGORY)}/${keyLabel(Action.NEXT_CATEGORY)} ${getString(R.string.hint_cats)}"
    }

    /** Rebuilds categories and the visible grid from the library. */
    private fun refresh() {
        val all = library.all()
        val cats = mutableListOf(
            Category(getString(R.string.all_games), all.sortedBy { it.title.lowercase() }),
            Category(getString(R.string.favorites), all.filter { it.favorite }.sortedBy { it.title.lowercase() }),
            Category(getString(R.string.recent), all.filter { it.lastPlayed > 0 }.sortedByDescending { it.lastPlayed }.take(30)),
        )
        EmuSystem.entries.forEach { s ->
            val g = all.filter { it.system == s }
            if (g.isNotEmpty()) cats.add(Category(s.short, g.sortedBy { it.title.lowercase() }, s))
        }
        all.filter { it.system == null }.takeIf { it.isNotEmpty() }?.let { cats.add(Category(getString(R.string.unsorted), it.sortedBy { g -> g.title.lowercase() })) }
        categories = cats
        if (selected >= cats.size) selected = 0
        sidebar.adapter?.notifyDataSetChanged()
        applyCategory()
        updateHints()
    }

    private fun applyCategory() {
        val cat = categories.getOrNull(selected)
        val q = query.trim().lowercase()
        shown = (cat?.games ?: emptyList()).filter { q.isEmpty() || it.title.lowercase().contains(q) }
        header.text = (cat?.label ?: "") + (if (q.isNotEmpty()) "  \"$query\"" else "") + "  ·  " + getString(R.string.games_count, shown.size)
        val isEmptyLibrary = library.all().isEmpty()
        empty.visibility = if (shown.isEmpty()) View.VISIBLE else View.GONE
        empty.text = if (isEmptyLibrary) getString(R.string.empty_title) + "\n\n" + getString(R.string.empty_body) else getString(R.string.games_count, 0)
        val spans = maxOf(2, (resources.displayMetrics.widthPixels - dp(150) - dp(16)) / dp(128))
        (grid.layoutManager as GridLayoutManager).spanCount = spans
        grid.adapter?.notifyDataSetChanged()
        sidebar.adapter?.notifyDataSetChanged()
        grid.post { if (currentFocus == null) (grid.getChildAt(0) ?: sidebar.getChildAt(selected.coerceAtLeast(0)))?.requestFocus() }
    }

    private inner class SideAdapter : RecyclerView.Adapter<RecyclerView.ViewHolder>() {
        override fun getItemCount() = categories.size
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
            val tv = TextView(this@MainActivity).apply {
                setTextColor(col(R.color.text)); textSize = 14f; gravity = Gravity.CENTER_VERTICAL or Gravity.START
                setPadding(dp(12), dp(8), dp(12), dp(8)); isFocusable = true; isClickable = true
                background = focusBackground(this@MainActivity, 8, 0x00000000)
                layoutParams = RecyclerView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(40))
            }
            return object : RecyclerView.ViewHolder(tv) {}
        }
        override fun onBindViewHolder(h: RecyclerView.ViewHolder, i: Int) {
            val tv = h.itemView as TextView
            val c = categories[i]
            tv.text = "${c.label}  (${c.games.size})"
            tv.isSelected = i == selected
            tv.setTextColor(col(if (i == selected) R.color.accent else R.color.text))
            tv.setOnClickListener { selected = i; applyCategory() }
        }
    }

    private inner class GameAdapter : RecyclerView.Adapter<RecyclerView.ViewHolder>() {
        override fun getItemCount() = shown.size
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
            val card = GameCardView(this@MainActivity)
            val w = (resources.displayMetrics.widthPixels - dp(150) - dp(16)) / (grid.layoutManager as GridLayoutManager).spanCount
            card.layoutParams = RecyclerView.LayoutParams(w, (w * 1.2f).toInt())
            return object : RecyclerView.ViewHolder(card) {}
        }
        override fun onBindViewHolder(h: RecyclerView.ViewHolder, i: Int) {
            val g = shown[i]
            val card = h.itemView as GameCardView
            card.bind(g, loader)
            card.tag = g
            card.setOnClickListener { launchGame(g, null) }
            card.setOnLongClickListener { gameOptions(g); true }
        }
    }

    // ---------------------------------------------------------------- input actions

    private fun focusedGame(): Game? = currentFocus?.tag as? Game

    private fun onAction(a: Action): Boolean {
        when (a) {
            Action.FAVORITE -> focusedGame()?.let { toggleFavorite(it) } ?: return false
            Action.SEARCH -> promptSearch()
            Action.OPTIONS -> focusedGame()?.let { gameOptions(it) } ?: return false
            Action.MENU -> showMenu()
            Action.PREV_CATEGORY -> selectCategory(selected - 1)
            Action.NEXT_CATEGORY -> selectCategory(selected + 1)
            Action.PAGE_UP -> grid.smoothScrollBy(0, -grid.height)
            Action.PAGE_DOWN -> grid.smoothScrollBy(0, grid.height)
            else -> return false
        }
        return true
    }

    private fun selectCategory(i: Int) {
        if (categories.isEmpty()) return
        selected = (i + categories.size) % categories.size
        applyCategory()
    }

    private fun toggleFavorite(g: Game) {
        library.update(g.id) { it.copy(favorite = !it.favorite) }
        refresh()
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_LONG).show()

    // ---------------------------------------------------------------- dialogs

    private fun dialog(builder: AlertDialog.Builder): AlertDialog = builder.create().also { d ->
        d.show()
        d.window?.installGamepad({ keyMap })
    }

    private fun list(title: String, items: List<String>, onPick: (Int) -> Unit) {
        dialog(AlertDialog.Builder(this).setTitle(title).setItems(items.toTypedArray()) { _, i -> onPick(i) }.setNegativeButton(R.string.close, null))
    }

    private fun promptSearch() {
        val input = EditText(this).apply { setSingleLine(); setText(query); hint = getString(R.string.search_hint); setTextColor(col(R.color.text)); setHintTextColor(col(R.color.muted)) }
        dialog(AlertDialog.Builder(this).setTitle(R.string.search_title).setView(input)
            .setPositiveButton(R.string.ok) { _, _ -> query = input.text.toString(); applyCategory() }
            .setNegativeButton(R.string.cancel, null))
    }

    private fun gameOptions(g: Game) {
        val items = listOf(
            getString(R.string.play), getString(R.string.play_with),
            getString(if (g.favorite) R.string.fav_remove else R.string.fav_add),
            getString(R.string.set_system), getString(R.string.set_cover), getString(R.string.remove_game),
        )
        list(g.title, items) { i ->
            when (i) {
                0 -> launchGame(g, null)
                1 -> chooseEmulatorFor(g)
                2 -> toggleFavorite(g)
                3 -> chooseSystem(g) { s -> library.update(g.id) { it.copy(system = s) }; refresh() }
                4 -> { coverTarget = g; pickCover.launch(arrayOf("image/*")) }
                5 -> { library.remove(g.id); refresh() }
            }
        }
    }

    private fun chooseSystem(g: Game, onPick: (EmuSystem) -> Unit) {
        list(g.title, EmuSystem.entries.map { it.short }) { onPick(EmuSystem.entries[it]) }
    }

    private fun chooseEmulatorFor(g: Game) {
        val s = g.system ?: return chooseSystem(g) { sys -> library.update(g.id) { it.copy(system = sys) }; refresh(); chooseEmulatorFor(g.copy(system = sys)) }
        val installed = Launcher.installedPackages(packageManager)
        val opts = Emulators.optionsFor(s)
        list(g.title, opts.map { label(it, installed) }) { launchGame(g, opts[it]) }
    }

    private fun label(o: EmuOption, installed: Set<String>): String =
        o.label + if (Emulators.installedPackage(o, installed) == null) "  (${getString(R.string.emu_missing)})" else ""

    private fun showMenu() {
        val langNow = settings.language
        val items = listOf(
            getString(R.string.add_folder), getString(R.string.add_files), getString(R.string.rescan),
            getString(R.string.emulators), getString(R.string.controls), getString(R.string.language), getString(R.string.about),
        )
        list(getString(R.string.menu_title), items) { i ->
            when (i) {
                0 -> pickFolder.launch(null)
                1 -> pickFiles.launch(arrayOf("*/*"))
                2 -> rescanAll()
                3 -> showEmulatorSettings()
                4 -> showControls()
                5 -> chooseLanguage(langNow)
                6 -> showAbout()
            }
        }
    }

    private fun chooseLanguage(current: String) {
        val codes = listOf("system", "en", "ar")
        val names = listOf(R.string.lang_system, R.string.lang_en, R.string.lang_ar).map { getString(it) }
        dialog(AlertDialog.Builder(this).setTitle(R.string.language).setSingleChoiceItems(names.toTypedArray(), codes.indexOf(current)) { d, i ->
            settings.language = codes[i]; d.dismiss(); recreate()
        })
    }

    private fun perfText(p: Perf) = getString(when (p) { Perf.GREAT -> R.string.perf_great; Perf.GOOD -> R.string.perf_good; Perf.MIXED -> R.string.perf_mixed })

    private fun showEmulatorSettings() {
        val installed = Launcher.installedPackages(packageManager)
        list(getString(R.string.emulators), EmuSystem.entries.map { s ->
            val pref = Emulators.optionsFor(s).firstOrNull { it.id == settings.preferredEmulator(s) }?.label ?: getString(R.string.emu_auto)
            "${s.short}: $pref\n   ${perfText(s.perf)}"
        }) { si ->
            val s = EmuSystem.entries[si]
            val opts = Emulators.optionsFor(s)
            val names = listOf(getString(R.string.emu_auto)) + opts.map { label(it, installed) + (it.needsCore?.let { c -> "\n   " + getString(R.string.core_needed, c) } ?: "") }
            list(s.short, names) { oi -> settings.setPreferredEmulator(s, if (oi == 0) null else opts[oi - 1].id) }
        }
    }

    private fun showAbout() {
        val ver = getString(R.string.about_version, BuildConfig.VERSION_NAME)
        dialog(AlertDialog.Builder(this).setTitle(R.string.about_title)
            .setMessage("$ver\n${getString(R.string.developed_by)}\n\n${getString(R.string.about_body)}")
            .setPositiveButton(R.string.ok, null))
    }

    /** Shows the code of every pressed button and lets the user rebind each action. */
    private fun showControls() {
        val actions = listOf(
            Action.CONFIRM to R.string.act_confirm, Action.BACK to R.string.act_back, Action.FAVORITE to R.string.act_favorite,
            Action.SEARCH to R.string.act_search, Action.PREV_CATEGORY to R.string.act_prev, Action.NEXT_CATEGORY to R.string.act_next,
            Action.PAGE_UP to R.string.act_pgup, Action.PAGE_DOWN to R.string.act_pgdn, Action.OPTIONS to R.string.act_options, Action.MENU to R.string.act_menu,
        )
        var capturing: Action? = null
        lateinit var dlg: AlertDialog
        fun rows() = actions.map { (a, r) -> "${getString(r)}: ${KeyEvent.keyCodeToString(keyMap.code(a)).removePrefix("KEYCODE_")} (${keyMap.code(a)})" } +
            listOf(getString(R.string.reset_defaults), getString(R.string.close))
        val lv = android.widget.ListView(this).apply { divider = null }
        fun refreshRows() {
            lv.adapter = android.widget.ArrayAdapter(this@MainActivity, android.R.layout.simple_list_item_1, rows())
        }
        refreshRows()
        lv.setOnItemClickListener { _, _, i, _ ->
            when {
                i < actions.size -> { capturing = actions[i].first; dlg.setTitle(R.string.press_button) }
                i == actions.size -> { keyMap.reset(); settings.saveKeyMap(keyMap); refreshRows(); updateHints() }
                else -> dlg.dismiss()
            }
        }
        dlg = AlertDialog.Builder(this).setTitle(R.string.controls_title).setMessage(R.string.controls_note).setView(lv).create()
        // This dialog deliberately has no gamepad wrapper: it must see raw key codes.
        dlg.setOnKeyListener { _, code, event ->
            if (event.action != KeyEvent.ACTION_DOWN || event.repeatCount != 0 || code == KeyEvent.KEYCODE_BACK && capturing == null) return@setOnKeyListener false
            val a = capturing
            if (a != null) {
                // A key can only drive one action: free it from any other binding first.
                val old = keyMap.code(a)
                Action.entries.filter { it != a && keyMap.code(it) == code }.forEach { keyMap.set(it, old) }
                keyMap.set(a, code)
                settings.saveKeyMap(keyMap); capturing = null
                dlg.setTitle(R.string.controls_title); refreshRows(); updateHints()
                true
            } else {
                dlg.setTitle(getString(R.string.last_key, KeyEvent.keyCodeToString(code).removePrefix("KEYCODE_"), code))
                false
            }
        }
        dlg.show()
    }

    // ---------------------------------------------------------------- library changes

    private fun persist(uri: Uri) {
        try { contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) } catch (_: Exception) { /* provider doesn't support persisting */ }
    }

    private fun addFolder(uri: Uri) {
        persist(uri)
        library.addFolder(uri.toString())
        runScan { scanner.scanTree(uri) }
    }

    private fun addFiles(uris: List<Uri>) {
        if (uris.isEmpty()) return
        uris.forEach { persist(it) }
        runScan { uris.mapNotNull { scanner.gameFromFile(it) } }
    }

    private fun rescanAll() {
        runScan(replace = true) { library.folders.flatMap { scanner.scanTree(Uri.parse(it)) } }
    }

    private fun runScan(replace: Boolean = false, work: () -> List<Game>) {
        val d = AlertDialog.Builder(this).setMessage(R.string.scanning).setCancelable(false).create().also { it.show() }
        bg.execute {
            val found = try { work() } catch (e: Exception) { emptyList() }
            library.merge(found, replace)
            main.post { d.dismiss(); refresh(); toast(getString(R.string.scan_done, library.all().size)) }
        }
    }

    // ---------------------------------------------------------------- launching

    private fun launchGame(g: Game, forced: EmuOption?) {
        val system = g.system ?: return chooseSystem(g) { s -> library.update(g.id) { it.copy(system = s) }; refresh(); launchGame(g.copy(system = s), forced) }
        val installed = Launcher.installedPackages(packageManager)
        val opts = Emulators.optionsFor(system)
        val opt = forced ?: opts.firstOrNull { it.id == settings.preferredEmulator(system) && Emulators.installedPackage(it, installed) != null }
            ?: opts.firstOrNull { Emulators.installedPackage(it, installed) != null }
        val pkg = opt?.let { Emulators.installedPackage(it, installed) }
        if (opt == null || pkg == null) {
            val list = opts.joinToString("\n") { "• ${it.label} — ${it.packages.first()}" }
            dialog(AlertDialog.Builder(this).setTitle(R.string.no_emu_title).setMessage(getString(R.string.no_emu_body, list)).setPositiveButton(R.string.ok, null))
            return
        }
        val path = g.path ?: return toast(getString(R.string.path_unavailable))
        val err = Launcher.start(this, opt.build(pkg, path))
        if (err != null) toast(getString(R.string.launch_failed, err)) else library.update(g.id) { it.copy(lastPlayed = System.currentTimeMillis(), plays = it.plays + 1) }
    }

    override fun onStop() { super.onStop(); if (!isChangingConfigurations) refreshQuietly() }
    private fun refreshQuietly() { if (::library.isInitialized) main.post { refresh() } }
}
