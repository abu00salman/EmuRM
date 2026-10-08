# EmuRM desktop (macOS, Windows)

An Electron shell around the same static export the website, Android and iOS apps
ship — nothing server-side, same local-first IndexedDB storage for ROMs/saves.

Build from the repo root first, then package here:

```sh
npm ci
npm run typecheck
npm run build        # without NEXT_BASE_PATH — same requirement as android-app/ios-app
cd desktop-app
npm ci
npm run dist:mac      # or: npm run dist:win
# desktop-app/dist/*.dmg or *.exe
```

`npm run prebuild` (run automatically by `dist:mac`/`dist:win`) copies the root
project's `out/` into `desktop-app/web`, and refuses a missing export or one built
with `/EmuRM` as its base path.

`main.js` serves that bundled export over a custom `app://` scheme rather than
`file://`: a static export's absolute asset paths (`/_next/static/...`,
`/manifest.webmanifest`, ...) resolve to the filesystem root under `file://`, which
breaks every one of them — the same reason the Android app serves its bundled assets
over a virtual `https://` origin instead of `file://`. MIME types for every extension
the export produces are set explicitly rather than inferred, for the same reason the
Android build now does that too (see `android-app/README.md`).

Website deployment does not update this packaged app; rebuild it for new web changes.
Mac builds here are unsigned/unnotarized (no Apple Developer account configured) —
Gatekeeper will warn on first launch; right-click → Open bypasses that for a local
build. Windows builds are unsigned too — SmartScreen may warn similarly.
