# EmuRM for iOS

A native iOS shell around the real, deployed EmuRM web app (https://www.emurm.com) —
the same `WKWebView`-shell approach as `android-app/`, not a generic wrapper. See
`EmuRM/WebViewController.swift` for the full implementation; this file explains *why*
it's built the way it is, how to build it, and — since this one ships unsigned — how to
get it onto an actual iPhone.

## Before you build: this has even less verification behind it than the Android app

The Android app was at least written from a sandbox with real Kotlin/Gradle tooling
available, even without the SDK. This one was written from a **plain Linux sandbox with
no Apple tooling of any kind** — no Xcode, no Swift compiler, no `xcodebuild`, no
simulator, nothing (`which xcodegen xcodebuild swift` all come back empty here). That
means:

- **Not even the Swift syntax has been checked**, let alone compiled. Every `.swift`
  file here was written by hand against Apple's documented WKWebView/AVFoundation/
  Photos APIs as best as they're known, then read back carefully — but "carefully
  reviewed by eye" is strictly weaker than "ran through a compiler," which is itself
  weaker than "ran on a device." Expect a real chance of at least one build error on
  the first CI run — a typo, an API that's actually spelled slightly differently, a
  missing import.
- Expect more fix-iteration rounds than the Android build needed, not fewer. Android's
  first build already surfaced three real errors (a resource-linking failure, a name
  collision, an unresolved reference) despite Kotlin/Gradle tooling existing locally to
  partially sanity-check things first. Nothing here has had even that level of
  pre-check.
- Nothing has been tested on any simulator or physical iPhone/iPad. Every item on
  whatever manual test pass you run is genuinely unverified, not "probably fine."

Report back the exact error text from any failed GitHub Actions run (or from your own
Xcode, if you open the project there) and it'll get fixed, the same way the Android
build errors did.

## Why this ships as an *unsigned* IPA, and what you do with it

Apple requires every app to be cryptographically signed with a certificate tied to an
Apple Developer account before it can run on a real device — there's no equivalent of
Android's "unknown sources" sideloading. This project has no Apple Developer account,
certificate, or provisioning profile, and isn't able to get one from here, so it
deliberately stops at producing an **unsigned** `.app`, zipped into an unsigned `.ipa`
(`Payload/EmuRM.app` inside a zip, renamed `.ipa`) in CI. That's as far as anything
build from this sandbox can take it.

You said you'd sign it yourself from your own machine with your own Apple Developer
account — two ways to do that with the artifact this produces:

1. **Easiest and most reliable: don't resign the IPA at all.** Download the repo (or
   just `ios-app/`), run `xcodegen generate` yourself (`brew install xcodegen` first;
   see Quickstart below) to get `EmuRM.xcodeproj`, open it in your own Xcode, sign in
   with your Apple ID under Settings → Accounts, select your Team in the project's
   Signing & Capabilities tab, plug in your iPhone, and hit Run. Xcode handles the
   provisioning profile and signing automatically. This sidesteps IPA-resigning
   entirely and is the path most likely to just work.
2. **Resign the CI-built unsigned IPA directly**, if you specifically want the `.ipa`
   file itself (e.g. to install via Apple Configurator, or a tool like **iOS App
   Signer**): feed `EmuRM-unsigned.ipa` plus your signing certificate and a
   provisioning profile that matches `com.emurm.app` (or your own bundle ID, if you
   change it) into that tool. This app has no special entitlements — no push
   notifications, no app groups, no background modes beyond the default, just the one
   Photos add-only permission already declared in `Info.plist` — so there's no
   entitlements mismatch to fight; a plain re-sign should be enough. If you change the
   bundle identifier during resigning, it needs to match whatever provisioning profile
   you're embedding.

Either way, you're signing with your own identity on your own machine, exactly as you
asked — nothing here does or could sign on your behalf.

## Quickstart (building it yourself, locally, instead of via CI)

```bash
brew install xcodegen
cd ios-app
xcodegen generate
open EmuRM.xcodeproj
```

Then build/run from Xcode directly — this is the path described as option 1 above, and
the one most likely to need the fewest extra steps.

To build the same unsigned `.app`/`.ipa` CI produces, from the command line instead:

```bash
xcodebuild build -project EmuRM.xcodeproj -scheme EmuRM -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath build \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO
```

## Architecture: why this isn't "bundle the web build into the app"

Same reasoning as the Android build: EmuRM already ships a service worker
(`public/sw.js`) that precaches the app shell, static assets, and every emulator core,
and keeps ROMs/saves in IndexedDB — a complete, already-working, already-tested offline
story. `WebViewController` just points a `WKWebView` at `https://www.emurm.com/` and
lets that existing service worker do what it already does in Safari. First launch
needs network; everything after that is offline-capable the same way the PWA already
is. No second copy of the web build to bundle, version, and keep in sync.

## What's native vs. what's already in the web app

As with Android, the actual EmuRM source was read first, and most of what a full native
rewrite would otherwise need already exists in the web app untouched — touch controls,
save states, offline caching, safe-area handling via `env(safe-area-inset-*)`, and the
standard W3C Gamepad API for physical controllers (WKWebView on iOS 14.5+ supports it
the same way Safari does — no native relaying needed).

What's actually native here, and why:

| Native piece | File | Why it can't be the web app's job |
|---|---|---|
| `WKWebView` configuration (autoplay, inline media, persistent storage) | `WebViewController.configureWebView()` | `WKWebViewConfiguration` is iOS-only API |
| Immersive fullscreen (status bar + home indicator hidden while playing) | `prefersStatusBarHidden`/`prefersHomeIndicatorAutoHidden`, driven by `notifyPlaying` from `native-bridge.ts` | No web API controls these |
| Audio session handling (calls, other apps interrupting playback) | `configureAudioSession()`/`audioSessionInterrupted(_:)` | `AVAudioSession` is iOS-only; on interruption it dispatches a synthetic Escape keydown into the page, reusing the pause menu's *existing* Escape handling instead of a second one |
| Blob-URL downloads (screenshots) | `native-bridge.ts` intercept + `saveBlob(base64Data:filename:mimeType:)` | `WKWebView` can't resolve `blob:` URLs through native download handling any more than Android's WebView can; images go to Photos (add-only permission), everything else to the app's Documents folder |
| External links leaving the app's own host | `decidePolicyFor` in the `WKNavigationDelegate` extension | Opens in `SFSafariViewController` instead of navigating the app's own WebView away from EmuRM |
| Native error screen | `configureErrorOverlay()`/`showError(httpFailure:)` | Only for a failure *before* the page (and its own `error.tsx`/`global-error.tsx`) ever loaded — e.g. no network on first-ever launch |

The JS↔native bridge is the same `src/lib/native-bridge.ts` file the Android app uses,
generalized to detect either `window.AndroidNative` or iOS's
`window.webkit.messageHandlers.emurmNative` and normalize both to the same three-method
interface (`notifyPlaying`, `notifyMenuOpen`, `saveBlob`). It changes no behavior for
web, desktop, or Android users, and nothing in the existing player/pause-menu/save code
was modified to support it.

## Deliberately out of scope for this iOS build (gaps vs. Android, on purpose)

- **No back-button equivalent.** Android has a hardware/gesture back button that needed
  explicit handling (dispatch Escape instead of exiting). iOS has no equivalent
  concept — there's nothing to wire up.
- **No share-to-import / "Open In" extension.** Android's `ACTION_SEND` handling (share
  a ROM file into the app from another app) has no iOS build here. It would need a
  separate Share Extension target, which is a meaningfully bigger addition than
  anything else in this list — flagged as a real gap, not an oversight, and worth its
  own follow-up if you want it.
- **Native `<input type=file>` ROM import is assumed to work via WKWebView's standard
  document-picker behavior, unverified.** Chromium's Android WebView needed an explicit
  `onShowFileChooser` override to make file inputs work at all; WKWebView's handling of
  `<input type=file>` is standard, built-in, system-provided-picker behavior with no
  native code required on Apple's side, as far as the documentation describes it — but
  since nothing here has run on a device, treat "ROM import works" as the first thing
  to actually test, not an assumption to build on.

## Minimum target: iOS 15.0

Matches `IPHONEOS_DEPLOYMENT_TARGET` in `project.yml`. Chosen as a reasonably
conservative floor (`mediaTypesRequiringUserActionForPlayback` and the WKWebView APIs
used here have been stable since well before iOS 15) — lower it if you have a specific
reason to support older devices.

## What to actually test once it builds (none of this has been exercised once)

Install on a real device → open EmuRM → select a console → tap "Choose files" and
import a ROM (the one item flagged above as unverified) → play with touch controls →
rotate to landscape and back → trigger a save state → background the app and return →
receive a phone call or Siri interruption mid-game (should pause, not keep playing
audio) → lock/unlock the screen mid-game → take a screenshot via the in-app button and
confirm it lands in Photos → tap an external link (e.g. a credits/about link, if one
exists) and confirm it opens in-app via Safari View Controller rather than leaving the
app → force-quit and relaunch, confirming the service worker still serves everything
offline → connect a physical Bluetooth/USB controller and confirm input is seen → test
on both an iPhone and an iPad, given both are declared supported in `Info.plist`. This
list is where to start, not a checklist of things already confirmed working.
