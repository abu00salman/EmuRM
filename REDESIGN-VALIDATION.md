# Console lounge redesign — validation

Baseline for this patch: `3c8c75e5f04f426485ceeb7949f907f741ba33b2` (the previous
redesign, already merged to `main`). Applied via `git apply` on a fresh branch off
current `main`, with no conflicts.

## What was actually run and verified here

- `npm ci` — clean.
- `npm run typecheck` — 0 errors.
- `npm run test:sram` — passed (new test, real engine code path exercised via a
  transpiled-and-sandboxed run of `src/lib/engine/libretro-engine.ts`, not mocked away).
- `npm run test:msx` — passed (existing test, unaffected).
- `npm run build` (both default Turbopack and `--webpack`) — both produce the same
  23 static pages; `--webpack` was kept since it's now `package.json`'s `build` script.
- `NEXT_BASE_PATH=/EmuRM npm run build` — GitHub Pages path build, passed; confirmed
  `/EmuRM/...` asset prefixing resolves correctly and the root export (no
  `NEXT_BASE_PATH`) contains no `/EmuRM/_next/` references, satisfying the exact check
  `android-app/app/build.gradle.kts`'s new `bundleWebAssets` Gradle task performs before
  packaging it.
- **A real browser core boot**, not a mock: `scripts/smoke-msx.cjs` run against the
  patched build — ZIP cartridge import, system detection, a real blueMSX WASM core
  booting, changing video frames, F2/F4 save-state write and load via IndexedDB,
  keyboard input, and multi-disk `.m3u` BIOS-requirement detection. All passed.
- **A dedicated live test for the new shader feature**, built on the same real-core-boot
  pattern: opened the pause menu, confirmed the new GPU-shader control defaults to Off,
  switched it to "Gentle sharpness," confirmed a clean relaunch with video frames still
  advancing, switched back to Off with another clean relaunch, then confirmed a save
  state still writes correctly afterward (the toggle doesn't corrupt state). All passed.
- **UI regression + new-behavior pass** (Playwright against the real production build):
  nav (desktop + mobile bottom bar), the home/handheld console filter, Arabic RTL across
  home/Discover/library, mobile 2-column grids, Game Discovery's full flow, a real file
  import populating the library — plus, specific to this patch: the Import dialog's file
  input has no `accept` attribute (on both the unscoped and console-scoped picker), and
  nested-dialog Escape behavior (confirmed with a real two-dialog stack: importing an
  ambiguous `.bin` file opens the console picker on top of the still-open import dialog;
  the first Escape closes only the picker, the second closes the import dialog).
- Verified `shader`/`resolveShader` are real, documented Nostalgist options (not
  hallucinated API) by checking `node_modules/nostalgist`'s own type definitions.
- Verified the `deploy-pages.yml` change (switching to `actions/configure-pages@v5`'s
  dynamic `base_path`) is safe by confirming no `CNAME` file exists anywhere in this
  repo — GitHub Pages has no custom domain of its own configured, so `base_path`
  resolves to `/EmuRM` exactly as the previous hardcoded value did. `emurm.com` remains
  a separate Cloudflare deployment, unaffected either way.

## What was NOT verified here, and why

This sandbox has no Android SDK, no JDK Gradle toolchain wired to it, no Android
emulator, and no physical device — exactly as documented in every prior Android change
in this project's history. That means the following, despite being asserted as
already-passed in material supplied alongside this patch, have **not** been confirmed
by this validation pass and should not be treated as fact until the CI run below (or a
real device) confirms them:

- Whether `android-app` actually compiles against this patch (new `BundleAssetServer.kt`,
  the `JsBridge`/`MainActivity` changes, the Gradle `bundleWebAssets` task).
- APK signing (v1/v2/v3), `apksigner verify`, `zipalign`.
- Installation or launch on any emulator or physical device, TV or otherwise.
- **Most importantly**: whether the new bundled-assets architecture (serving the
  Gradle-packaged web export over a virtual `https://www.emurm.com` origin via
  `loadDataWithBaseURL` + `shouldInterceptRequest`, replacing the previous
  "WebView navigates to the live site" approach) actually preserves IndexedDB data —
  saved games and imported ROMs — for anyone who already has the **previous**,
  live-WebView version of this app installed. This is the single highest-risk item in
  this patch and is called out explicitly in the PR.

`.github/workflows/validate-redesign.yml` (new, included in this patch) builds the
Android app for real in CI — Gradle `assembleDebug`, `apksigner verify`, and uploads
the resulting APK as an artifact. That real CI run, triggered after this PR is opened,
is what actually answers the build/signing questions above — not this document.
