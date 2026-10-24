package com.emurm.rg353v.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorFilter
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.LayerDrawable
import android.graphics.drawable.StateListDrawable
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.LruCache
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.emurm.rg353v.R
import com.emurm.rg353v.data.Game
import java.util.concurrent.Executors

fun Context.dp(v: Int): Int = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt()
fun Context.col(id: Int): Int = ContextCompat.getColor(this, id)

fun focusBackground(ctx: Context, radiusDp: Int = 10, fill: Int = ctx.col(R.color.surface)): Drawable {
    fun shape(stroke: Int, w: Int) = GradientDrawable().apply {
        setColor(fill); cornerRadius = ctx.dp(radiusDp).toFloat(); setStroke(ctx.dp(w), stroke)
    }
    return StateListDrawable().apply {
        addState(intArrayOf(android.R.attr.state_focused), shape(ctx.col(R.color.accent), 3))
        addState(intArrayOf(android.R.attr.state_selected), shape(0x66_4D8DFF, 2))
        addState(intArrayOf(), shape(Color.TRANSPARENT, 0))
    }
}

/** Generated cover for games without artwork: a stable gradient from the title, plus the title. */
class PlaceholderDrawable(private val title: String) : Drawable() {
    private val hue = (title.fold(0) { h, c -> (h * 31 + c.code) % 360 }).toFloat()
    private val bg = Paint()
    override fun draw(c: Canvas) {
        val b = bounds
        bg.shader = android.graphics.LinearGradient(0f, 0f, b.width().toFloat(), b.height().toFloat(),
            Color.HSVToColor(floatArrayOf(hue, 0.65f, 0.55f)), Color.HSVToColor(floatArrayOf((hue + 60) % 360, 0.7f, 0.18f)), android.graphics.Shader.TileMode.CLAMP)
        c.drawRect(b, bg)
    }
    override fun setAlpha(alpha: Int) {}
    override fun setColorFilter(cf: ColorFilter?) {}
    @Deprecated("Deprecated in Java") override fun getOpacity() = PixelFormat.OPAQUE
}

/** Small LRU bitmap cache + background decoding; covers are downsampled so 2 GB RAM is never a concern. */
class CoverLoader(private val ctx: Context) {
    private val cache = object : LruCache<String, Bitmap>(24) {}
    private val pool = Executors.newFixedThreadPool(2)
    private val main = Handler(Looper.getMainLooper())

    fun load(game: Game, into: ImageView, targetPx: Int) {
        into.tag = game.id
        into.setImageDrawable(PlaceholderDrawable(game.title))
        val uri = game.cover ?: return
        cache.get(uri)?.let { into.setImageBitmap(it); return }
        pool.execute {
            val bmp = decode(Uri.parse(uri), targetPx) ?: return@execute
            cache.put(uri, bmp)
            main.post { if (into.tag == game.id) into.setImageBitmap(bmp) }
        }
    }

    private fun decode(uri: Uri, target: Int): Bitmap? = try {
        val o = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        ctx.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, o) }
        var sample = 1
        while (o.outWidth / (sample * 2) >= target && o.outHeight / (sample * 2) >= target) sample *= 2
        val o2 = BitmapFactory.Options().apply { inSampleSize = sample; inPreferredConfig = Bitmap.Config.RGB_565 }
        ctx.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, o2) }
    } catch (_: Exception) { null }
}

/** One game tile: cover, title, system badge, favorite star. Focusable for D-pad navigation. */
class GameCardView(ctx: Context) : FrameLayout(ctx) {
    val cover = ImageView(ctx).apply { scaleType = ImageView.ScaleType.CENTER_CROP }
    private val title = TextView(ctx).apply {
        setTextColor(ctx.col(R.color.text)); textSize = 12f; maxLines = 2; ellipsize = android.text.TextUtils.TruncateAt.END
        setPadding(ctx.dp(6), ctx.dp(14), ctx.dp(6), ctx.dp(5)); gravity = Gravity.START
        background = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, intArrayOf(Color.TRANSPARENT, 0xDD000000.toInt()))
    }
    private val badge = TextView(ctx).apply {
        setTextColor(Color.WHITE); textSize = 10f; setPadding(ctx.dp(6), ctx.dp(2), ctx.dp(6), ctx.dp(2))
        background = GradientDrawable().apply { setColor(0x99000000.toInt()); cornerRadius = ctx.dp(8).toFloat() }
    }
    private val star = TextView(ctx).apply { text = "★"; setTextColor(0xFFFFD54A.toInt()); textSize = 16f }

    init {
        isFocusable = true; isClickable = true
        background = focusBackground(ctx)
        val pad = ctx.dp(3)
        setPadding(pad, pad, pad, pad)
        addView(cover, LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        addView(title, LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM))
        addView(badge, LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP or Gravity.START).apply { setMargins(ctx.dp(6), ctx.dp(6), 0, 0) })
        addView(star, LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP or Gravity.END).apply { setMargins(0, ctx.dp(4), ctx.dp(6), 0) })
        setOnFocusChangeListener { v, focused -> v.animate().scaleX(if (focused) 1.05f else 1f).scaleY(if (focused) 1.05f else 1f).setDuration(90).start() }
    }

    fun bind(g: Game, loader: CoverLoader) {
        title.text = g.title
        badge.text = g.system?.short ?: "?"
        star.visibility = if (g.favorite) View.VISIBLE else View.GONE
        loader.load(g, cover, 300)
    }
}

internal fun solid(color: Int) = ColorDrawable(color)
internal fun layers(vararg d: Drawable) = LayerDrawable(d)
