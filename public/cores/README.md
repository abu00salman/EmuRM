# Self-hosted emulator cores

Most systems load prebuilt libretro WebAssembly cores from jsDelivr on first play.
Two systems have no public web build and must be compiled and served by you:

| System | Core | Build notes |
|---|---|---|
| MSX / Sakhr | `fmsx` (or `bluemsx`) | Emscripten build of fmsx-libretro; needs MSX.ROM (C-BIOS works) |
| Nintendo 64 | `mupen64plus_next` | Emscripten + WebGL2 (GLES3) build; desktop GPU recommended |

1. Build RetroArch for Emscripten with the core statically linked
   (see libretro's `Makefile.emscripten` and `dist-scripts/dist-cores.sh emscripten`).
2. Copy the output here as `<core>_libretro.js` and `<core>_libretro.wasm`.
   Every core you want served locally must be present, since the base URL applies to all.
3. Set `NEXT_PUBLIC_CORE_BASE=/cores` and rebuild.

Serve `.wasm` with `Content-Type: application/wasm` and long-lived caching.
