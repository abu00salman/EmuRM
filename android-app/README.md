# EmuRM Android phone, tablet and TV

Build from the original Gradle project, with the redesigned web export bundled:

```sh
npm ci
npm run typecheck
npm run build
cd android-app
bash ./gradlew build assembleDebug
# app/build/outputs/apk/debug/app-debug.apk
```

Use JDK 17 and Android SDK platform 35 with Build Tools 34.0.0 (AGP default).
Build the web export without NEXT_BASE_PATH. Gradle copies all of `out/`, including
cores and skins, into generated assets, and rejects a missing or /EmuRM export.

The native shell serves packaged content over the existing https://www.emurm.com
origin, starting with loadDataWithBaseURL, instead of this app's previous approach
(a live WebView navigation to the deployed site). It does not use file:// or require
an online first launch for bundled files. The intent is for that origin to retain
existing IndexedDB data when updating a previous wrapper that used the same origin —
**this has not been confirmed on a real device or emulator**, and is the single
highest-risk claim in this change: if you already have the older, live-WebView build
of this app installed with real saves/imported ROMs in it, do not install this build
over it until someone has verified on a spare device that IndexedDB data actually
survives the switch. Bundled native mode unregisters older service workers without
deleting databases; browser PWA behavior is unchanged. Some emulator cores and
Discovery images still come from their existing external providers and require
connectivity until cached/downloaded. Website deployment does not update this bundled
APK; rebuild it for new web changes.

TV support: optional Leanback/gamepad/touchscreen features; mobile and TV launcher
entries; TV banner; landscape and immersive TV mode; visible focus and overscan
padding. Remote D-pad uses shared spatial navigation, OK activates, and Back closes
open dialogs or the pause menu before navigating. OK opens the menu during gameplay.
Gamepads remain owned by Chromium/Gamepad API and the existing emulator bindings.
Touch controls remain available on phones/tablets; TV auto mode hides them.

SAF file selection accepts all MIME types because ROM extensions often lack MIME
mappings. The unchanged web import pipeline validates content, ZIPs and console
compatibility. content:// reads are enabled for user-selected documents; file://
access stays disabled. A missing TV document picker produces a localized message.

Debug APKs use Android debug signing with explicit v2/v3 signing. Verification:

```sh
apksigner verify --verbose --print-certs app/build/outputs/apk/debug/app-debug.apk
zipalign -c -P 16 4 app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

An update requires the same package ID, signing certificate and a non-decreasing
version code. The supplied reference APK was not available during this session;
its certificate and install/update compatibility have not been checked. Do not
uninstall an existing app to resolve a signature mismatch without backing up its
library and saves. Keep the signing keystore private and reuse it for later builds.
Release signing remains configured through gitignored keystore.properties.

This sandbox has no Android SDK, Gradle toolchain, emulator, or device attached to
it, same as every earlier Android change in this project — nothing above about the
Gradle build or signature verification has been run here. `.github/workflows/
validate-redesign.yml` builds this for real in CI (Gradle `assembleDebug`, `apksigner
verify`, uploads the APK) — that run is the actual source of truth for whether this
compiles and signs correctly, not this file. No Android emulator, physical TV, phone,
or Bluetooth controller has been used to verify installation, remote behavior, real
gameplay, or — most importantly — the IndexedDB-continuity claim above.
