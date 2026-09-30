# Self-hosted emulator cores

Most systems load prebuilt libretro WebAssembly cores from jsDelivr on first play.

## Bundled here already

`mupen64plus_next_libretro.{js,wasm}` (Nintendo 64) ships in this folder as part of the
repo — no env var needed, it's always used. Built by the
[BinBashBanana/webretro](https://github.com/BinBashBanana/webretro) project (MIT) from
[libretro/mupen64plus-libretro-nx](https://github.com/libretro/mupen64plus-libretro-nx)
(GPL-2.0); redistributed unmodified. `ConsoleDef.cores[].bundled = true` in
`src/lib/consoles/cores.ts` marks a core as one of these — see `libretro-engine.ts`,
which points bundled cores at this folder regardless of `NEXT_PUBLIC_CORE_BASE`.

## MSX / Sakhr (bundled)

`bluemsx_libretro.{js,wasm}` is built from blueMSX and RetroArch with Emscripten
4.0.15, full ASYNCIFY, single-threaded WebGL and OpenAL. No JSPI, browser feature
flag or cross-origin isolation header is required. `bluemsx-system.zip` contains
Databases, machine configs and only C-BIOS ROM binaries. It is installed into
`/home/web_user/retroarch/userdata/system` before RetroArch starts.

Cartridges need no uploaded BIOS. Disk images and tapes require a suitable real
system BIOS: add `MSX.ROM` (or `MSX2.ROM` + `MSX2EXT.ROM`) in Settings → System files;
disks additionally require `DISK.ROM`. A full user-provided `blueMSX.zip` with
Machines/ and Databases/ is accepted, including wrapped system-directory archives.
C-BIOS does not implement BASIC or disk boot. Some cartridge games also need a real
BIOS for compatibility. Save states are specific to the selected core and machine.

MSX is the default bundled blueMSX core. Earlier saved fMSX core preferences fall
back to it. ROM and BIOS inputs use explicit `fileName`/`fileContent` objects:
Nostalgist 0.22 treats a bare File as Blob and otherwise generates a `.bin` name,
which prevents blueMSX from recognizing the media type.

### Sources, licences and rebuilding

- blueMSX: https://github.com/libretro/blueMSX-libretro/tree/e3086eb5d36d77fa11704cf53dc176686e70127d
- RetroArch: https://github.com/libretro/RetroArch/tree/2790aa0cce9308695c0f612cc56a803e978beb08
- C-BIOS source: https://sourceforge.net/projects/cbios/files/cbios/0.23/
- Licence notices: `BLUEMSX-LICENSE.txt`, `RETROARCH-LICENSE.txt`, `C-BIOS-LICENSE.txt`.

Activate Emscripten 4.0.15, then run `bash scripts/build-bluemsx.sh`. The script pins
both source commits, packages system files reproducibly, and records these patches:

1. Define missing OpenAL calling-convention macros for Emscripten's headers.
2. Call the no-argument board saveState callback without an extra argument. Native
   C tolerates the old call, but WebAssembly traps on the indirect-call signature.
3. Expose the runtime helpers and canvas sizing expected by Nostalgist 0.22.

Other self-hosted cores can be added as `<core>_libretro.js` and
`<core>_libretro.wasm`, then marked `bundled: true` in `cores.ts`.
Serve `.wasm` with `Content-Type: application/wasm`.

### Verification

`npm run test:msx` validates the packaged system, archive paths, GitHub Pages
base path, disk/tape firmware requirements and cancellation. For the browser
test, install Chromium using `npx playwright install chromium`, start the app,
then run `npm run test:msx:browser`. It downloads blueMSX's diagnostic test
cartridge from the pinned source commit (or accepts `MSX_TEST_ROM=/path/testcart.rom`),
imports it as ZIP and checks changing video, state save/load, keyboard and
multi-disk playlist handling. `MSX_TEST_URL` can point to a static export under
`/EmuRM/`. The diagnostic ROM is not shipped in the public website.
