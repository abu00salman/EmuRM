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

## Still genuinely unavailable

| System | Core | Why |
|---|---|---|
| MSX / Sakhr | `fmsx` (or `bluemsx`) | No working public web build anywhere. Re-checked jsDelivr's retroarch-emscripten-build, webretro, and [EmulatorJS](https://emulatorjs.org)'s own published core set (`@emulatorjs/cores` on npm) — none ship it. EmulatorJS's own tracker ([issue #1048](https://github.com/EmulatorJS/EmulatorJS/issues/1048)) reports that even a manually-built blueMSX core deadlocks in the browser: it reads machine-config XML synchronously while loading a game, which blocks Emscripten's event loop unless the core is built with JSPI (modern browsers) or an ASYNCIFY fallback — a fix EmulatorJS itself is still landing ([PR #46](https://github.com/EmulatorJS/RetroArch/pull/46)). So this isn't a missing-binary gap we can just bundle around; a build made without those flags would ship broken. |

To add one yourself:
1. Build RetroArch for Emscripten with the core statically linked
   (see libretro's `Makefile.emscripten` and `dist-scripts/dist-cores.sh emscripten`).
   For MSX specifically, compile with JSPI (or ASYNCIFY as a fallback) so the
   synchronous BIOS-config read doesn't deadlock the browser — see the EmulatorJS
   issue/PR linked above for the exact flags they're using.
2. Copy the output here as `<core>_libretro.js` and `<core>_libretro.wasm`.
3. Either mark it `bundled: true` in `cores.ts` (ships with every deployment, like N64
   above), or set `NEXT_PUBLIC_CORE_BASE=/cores` and rebuild (applies to every *non*-bundled
   "self"-hosted core at once, so every such core you want served locally must be present).

Serve `.wasm` with `Content-Type: application/wasm` and long-lived caching.
