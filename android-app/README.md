# EmuRM for Android

A native Android shell around the real, deployed EmuRM web app (https://www.emurm.com) —
not a generic WebView wrapper. See `MainActivity.kt` for the full implementation; this
file explains *why* it's built the way it is, how to build it, and what to check before
you ship it.

## Before you build: this project was written, not tested, here

This was written entirely from a cloud sandbox with **no Android SDK available**
(network policy blocks `dl.google.com`, which is the only source for Android
platform/build-tools — Google's Maven repo has no mirror anywhere else). That means:

- Nothing here has been compiled. `./gradlew assembleDebug` has never actually been run
  against this code.
- Nothing has been tested on any device, emulator, or Android Studio instance —
  including the Galaxy S23 Ultra the spec calls out specifically. No cloud sandbox has
  physical hardware attached, so that step was always going to fall to you regardless
  of the SDK issue.

Every file was written carefully and reviewed by hand against the real EmuRM codebase
(see "Architecture" below for what was actually investigated), but "carefully
hand-reviewed" is not "compiled and run." **Open this in Android Studio, let it sync,
and fix whatever it flags before trusting any of it.** If something doesn't compile,
that's expected to be possible, not a sign you did something wrong — report it back
with the exact error and it'll get fixed.

## Quickstart

```bash
cd android-app
./gradlew assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

Open the `android-app/` folder directly in Android Studio (not the repo root — this is
a separate Gradle project, deliberately not nested inside the Next.js build) and it
should sync on its own. Android Studio may offer to upgrade the Android Gradle Plugin,
Gradle, or Kotlin — that's normal and fine to accept; the versions pinned in
`gradle/libs.versions.toml` are a known-good floor as of when this was written, not a
ceiling, since I had no way to check what's actually current.

## Architecture: why this isn't "bundle the web build into the APK"

The obvious-looking approach — copy `out/` (the Next.js static export) into
`app/src/main/assets` and serve it locally — was deliberately **not** taken. EmuRM
already ships a service worker (`public/sw.js`) that precaches the app shell, static
assets, and every emulator core, and keeps ROMs/saves in IndexedDB (never touching the
network). That's a complete, already-working, already-tested offline story. Bundling a
second copy of the same assets into the APK would mean:

- Two copies of the app to keep in sync (the live site and whatever snapshot got baked
  into the last Android build) — the app would silently serve a stale build until
  someone remembered to rebuild and re-publish the APK, independent of web deploys.
- Rebuilding the asset-loading layer (`WebViewAssetLoader` + a virtual HTTPS origin)
  to get a secure context for IndexedDB/WASM/Service-Worker APIs to work at all from
  `file://`, duplicating infrastructure that already exists and already works for the
  real domain.

So `MainActivity` just points the WebView at `https://www.emurm.com/`
(`BuildConfig.BASE_URL`) and lets the *existing* service worker do exactly what it
already does in a browser tab. First launch needs network; every launch after that is
offline-capable the same way the PWA already is. If you want this re-evaluated (e.g.
for a fully offline first-run experience), that's a real tradeoff worth a separate
conversation, not something to silently change.

## What's native vs. what's already in the web app

Before writing any native code, the actual EmuRM source was read end to end for this.
Most of what the original spec asked for **already exists in the web app** and needed
zero native reimplementation:

- Touch controls, multi-touch, remapping, per-console layouts, aspect-ratio modes
  (Fit/Fill/Integer/Native) — `src/components/player/*`, `src/stores/player-settings.ts`.
- Save states, slots, quick save/load, autosave — `usePlayerSession.ts`.
- Offline caching of the shell + cores — `public/sw.js`.
- `touch-action`/`user-select`/`overscroll-behavior` already locked down globally in
  `src/app/globals.css` — no scrolling/zooming/text-selection fights to solve natively.
- `viewport-fit=cover` + `env(safe-area-inset-*)` already wired through the CSS — edge-
  to-edge native layout (`WindowCompat.setDecorFitsSystemWindows(window, false)`) is
  all that's needed for insets/cutouts to resolve correctly on the web side; nothing
  native forwards inset values manually.
- Gamepad **input** (buttons/axes) — Chromium's WebView implements the standard W3C
  Gamepad API, same as desktop Chrome. A paired Bluetooth/USB controller is visible to
  `navigator.getGamepads()` with zero native relaying. Native only detects
  connect/disconnect (`GamepadMonitor.kt`) to show a toast — it never touches input.

What's actually native, and why each exists:

| Native piece | File | Why it can't be the web app's job |
|---|---|---|
| Hardware-accelerated, locked-down `WebView` config | `MainActivity.configureWebView()` | `WebSettings`, layer type, mixed-content policy — Android-only API |
| SAF file picker for ROM import | `onShowFileChooser` in `MainActivity` | Required for *any* `<input type=file>` to do anything at all in WebView — without it, taps on "Choose files" silently do nothing |
| Immersive fullscreen while playing | `setImmersive()`, driven by `native-bridge.ts` watching `data-playing` | Status/nav bar hide-on-play — `WindowInsetsControllerCompat` |
| Back button → pause menu, not app-exit | `backCallback` | Dispatches a synthetic Escape keydown into the page — reuses the pause menu's *existing* Escape handling instead of a second, parallel one |
| Audio focus (calls, other apps) | `AudioFocusController.kt` | No web API for this; on focus loss it pauses the same way Back does, for the same reason |
| Blob-URL downloads (screenshots) | `native-bridge.ts` intercept + `JsBridge.saveBlob` | WebView's `DownloadListener` can't resolve `blob:` URLs — a known Chromium WebView gap, not an EmuRM bug |
| Splash screen | `Theme.EmuRM.Starting` + `installSplashScreen()` | Android 12+ SplashScreen API, released as soon as the first page paints |
| Native error screen | `activity_main.xml` error overlay | Only for a failure *before* the page (and its own `error.tsx`/`global-error.tsx`) ever loaded — e.g. no network on first-ever launch |
| Share-to-import (`ACTION_SEND`) | `MainActivity.importSharedUri()` + `window.__androidImportSharedFile` | Reuses the *exact* existing `importFiles()` pipeline and ambiguous-format picker — nothing import-specific duplicated |

The JS↔native bridge (`src/lib/native-bridge.ts`) is a single new file, imported once
from `AppShell.tsx`, that no-ops entirely outside the Android WebView
(`window.AndroidNative` only exists there). It does not change behavior for web,
desktop, or iOS users, and nothing in the existing player/pause-menu/save code was
modified to support it.

## The native JS bridge (`window.AndroidNative`)

Deliberately tiny — four methods, declared in `JsBridge.kt`:

- `isNativeApp()` — feature-detection only.
- `notifyPlaying(playing)` — drives immersive fullscreen + audio focus.
- `notifyMenuOpen(open)` — lets a phone call avoid toggling an already-open pause menu
  shut.
- `saveBlob(base64, filename, mime)` — the blob-download workaround above.

No generic `eval`, no raw filesystem access, no reflection-exposed surface beyond
these four methods — see the security note in the main request this was built from.

## Signing

Release builds fall back to the **debug keystore** until you provide a real one, so
`./gradlew assembleRelease` / `bundleRelease` work out of the box without any extra
setup — the resulting APK/AAB just isn't signed for Play Store distribution yet.

To add real signing (needed before Play Store upload, not needed for "install this APK
directly on my phone"):

```bash
keytool -genkeypair -v -keystore emurm-release.keystore -alias emurm \
  -keyalg RSA -keysize 2048 -validity 10000
```

Then create `android-app/keystore.properties` (gitignored — never commit it):

```properties
storeFile=../emurm-release.keystore
storePassword=...
keyAlias=emurm
keyPassword=...
```

`app/build.gradle.kts` picks this up automatically if the file exists.

## Debugging against `npm run dev` instead of production

Debug builds point at `BuildConfig.BASE_URL = "https://www.emurm.com/"` by default (no
staging server exists). To point a debug build at a local dev server instead:

1. Run `npm run dev` on your machine.
2. Edit the `debug` block's `buildConfigField("String", "BASE_URL", ...)` in
   `app/build.gradle.kts` to `"http://10.0.2.2:3000/"` (emulator) or your machine's LAN
   IP (physical device).
3. `src/debug/res/xml/network_security_config.xml` already permits cleartext for
   `10.0.2.2`/`localhost`/`127.0.0.1` *only in debug builds* — release stays
   HTTPS-only, enforced by `network_security_config.xml` + `usesCleartextTraffic="false"`.

## Minimum SDK: 26 (Android 8.0)

Chosen deliberately, not as a default: it's the API level adaptive icons shipped in, so
there's no legacy raster-mipmap fallback to maintain (`mipmap-anydpi-v26/` is the only
icon resource needed), and `AudioFocusRequest` (the non-deprecated focus API) is
available unconditionally with no version branching. Covers the overwhelming majority
of active devices. Lower it if you have a specific reason to support Android 7 and
below — nothing here structurally depends on 26.

## What to actually test once it builds (the spec's own scenario list)

Open EmuRM → select NES → import a ROM → play with touch controls → press multiple
buttons at once → rotate to landscape (must not restart the emulator or lose the
session — `android:configChanges` on `MainActivity` is what prevents that) → save
state → close/reopen the app → load state → connect a Bluetooth controller (watch for
the "Controller connected" toast) → exit the game → import a GBA/MSX/PS1 title →
background the app and return → lock/unlock the screen mid-game → confirm audio stays
in sync → confirm no white screen on any of the above → test the Back gesture
specifically (should open/close the pause menu while playing, navigate normally
elsewhere) → and, at the end, all of it again on the actual Galaxy S23 Ultra this was
built for. None of this has been exercised once — this list is where to start, not a
checklist of things already confirmed working.
