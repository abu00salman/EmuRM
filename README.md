# EmuRM

محاكي EmuRM 

1. 🎮 كل المحاكيات في مكان واحد
    من Atari أتاري وMSX صخر وNES العائلة وGame Boy وصولًا إلى PS1 بلاي ستيشن وغيرها.
2. ⚡ العب مباشرة من المتصفح
    بدون تثبيت برامج معقدة؛ أضف لعبتك وابدأ اللعب.
3. 📱 يعمل على مختلف الأجهزة
    تجربة مصممة للجوال والكمبيوتر والأجهزة اللوحية والتلفاز.
4. 💾 ألعابك أنت، بطريقتك
    استخدم ملفات الألعاب التي تملكها واستمتع بها عبر واجهة واحدة سهلة.
5. 🕹️ رحلة عبر أجيال الألعاب
    واجهة حديثة تجمع إحساس الألعاب الكلاسيكية مع تجربة استخدام عصرية وسريعة

[ من تطويرنا ® abu00salman © | 2026 ]

A local-first, installable console museum that plays classic games in the browser.
Fourteen systems, from the Atari 2600 to the PlayStation and 3DO. Games you add never leave the device.

- **Home — Console Universe.** A hall of display cases; the room's light takes the colour of the console you hover. First launch plays a short "Choose your console" intro.
- **Library.** Covers (or generated per-console placeholders), last played, play time, favourites, search, recently played, collections, grid / list.
- **Player.** Centred max-size stage, real fullscreen, keyboard + gamepad + touch, remapping, 4 save slots + autosave, fast forward, pause, restart, screenshot, aspect modes, CRT / scanline / LCD filters, volume, FPS counter. Leaving the game autosaves; Quick Resume on the home page picks up from that exact point.
- **PWA.** Installable on iPhone / iPad / Android / macOS / Windows; works offline once a core has been played.
- **Arabic and English**, with full right-to-left layout — switch with the language button in the header; the choice is remembered per device.

## Run

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static export → out/
npm start            # serve out/ locally
```

Node ≥ 20.9. The build is a fully static site (`output: "export"`), so `out/` deploys to any static host: Cloudflare Pages, Netlify, Vercel, GitHub Pages, S3 + CloudFront, nginx. Serve it over HTTPS (required for the service worker, gamepads and storage persistence).

### Optional: self-hosting cores

By default, cores load lazily from jsDelivr (`arianrhodsandlot/retroarch-emscripten-build`). To self-host — recommended for production — place `<core>_libretro.js` and `<core>_libretro.wasm` in `public/cores/` (or a CDN) and set:

```
NEXT_PUBLIC_CORE_BASE=/cores
```

MSX (`bluemsx`) and Nintendo 64 (`mupen64plus_next`) are bundled under `public/cores/` and need no environment variable. MSX cartridge files (`.rom`, `.mx1`, `.mx2`) use bundled C-BIOS. Disk/tape games need user-provided system ROMs from Settings → System files; a `blueMSX.zip` containing `Machines/` and `Databases/` is also accepted. See `public/cores/README.md`.

3DO (`opera`) additionally needs a BIOS file (`panafz1.bin`) added in Settings → System files before it will boot any disc.

## Keys

| Action | Keyboard | Controller |
|---|---|---|
| Menu / pause | Esc | Home, or Select + Start |
| Quick save / load | F2 / F4 | menu |
| Fast forward (toggle) | F6 | menu |
| Screenshot | F9 | menu |
| Fullscreen | F11 | menu |

Default pad: arrows, X = A, Z = B, S = X, A = Y, Q / W = L / R, E / R = L2 / R2, Enter = Start, Right Shift = Select. Everything remaps in Settings or the in-game menu, per console.

## Architecture

```
src/
  app/                 routes (/, /library, /console/[id], /play, /settings) — static
  components/          UI (hall, library, dialogs) — knows nothing about emulation
  components/player/   Player, pause menu, session hook
  lib/consoles/        registry.ts (systems), cores.ts (cores + licences) — add systems here
  lib/engine/          EmulatorEngine / EmulatorSession interface + libretro adapter
  lib/db/              Dexie (IndexedDB): games, roms, states, srams, collections, bios, settings
  lib/library/         import (file / drop / URL / demo), header detection, worker client
  lib/input/           bindings, remap, gamepad spatial navigation (TV)
  workers/             rom.worker.ts — unzip, hashing, detection, thumbnails (OffscreenCanvas)
public/sw.js           app shell + versioned core cache
```

Principles:

1. **Engine behind an interface.** The UI only calls `EmulatorSession` (`pause`, `saveState`, `setFastForward`, `press`…). `lib/engine/index.ts` picks an engine by `CoreDef.engine`; the libretro adapter wraps Nostalgist.js (RetroArch compiled to WASM). A new engine = one file implementing `EmulatorEngine`.
2. **Lazy everything.** No emulator code in the first load. The engine chunk is prefetched on hover of a game card; each core downloads only the first time that system is played, then is served from the service-worker cache.
3. **Local-first.** ROMs, states, SRAM, covers and BIOS live in IndexedDB. Nothing is uploaded. The app asks for persistent storage so the browser won't evict the library.
4. **Heavy work off the main thread.** Importing runs in a Web Worker: zip extraction (fflate), SHA-1 identity (deduplication), header sniffing to pick the system for ambiguous extensions, `.cue` / `.bin` grouping, and cover/thumbnail resizing with OffscreenCanvas.
5. **Adding a system:** add a `CoreDef` in `cores.ts`, a `ConsoleDef` in `registry.ts` (extensions, accent, glyph form factor, BIOS, pad layout). Routes, hall, picker and library pick it up automatically.

Honest limits: RetroArch's emscripten build renders with WebGL on the main thread, so the core itself doesn't run in a worker; WebGPU is not used by any current libretro web build. Fast forward and heavy systems (PS1, N64) depend on device speed. iPhone Safari has no element fullscreen; EmuRM falls back to an immersive layout and suggests Add to Home Screen.

## Recommended cores

| System | Core (default first) | Licence |
|---|---|---|
| Atari 2600 | Stella, Stella 2014 (low-end) | GPL-2.0 |
| MSX / Sakhr | blueMSX (bundled ASYNCIFY + C-BIOS) | GPL-2.0 / BSD-like C-BIOS |
| NES / Famicom | FCEUmm, Nestopia UE | GPL-2.0 |
| Master System | Genesis Plus GX, Gearsystem | GPX non-commercial / GPL-3.0 |
| PC Engine | Beetle PCE Fast | GPL-2.0 |
| Mega Drive / Genesis | Genesis Plus GX, PicoDrive | non-commercial |
| Game Boy | Gambatte, mGBA, Gearboy | GPL-2.0 / MPL-2.0 / GPL-3.0 |
| Game Gear | Genesis Plus GX, Gearsystem | GPX non-commercial / GPL-3.0 |
| SNES | Snes9x, Snes9x 2010 (low-end) | Snes9x — non-commercial |
| 3DO | Opera (BIOS required) | see upstream |
| PlayStation | PCSX ReARMed (HLE BIOS built in) | GPL-2.0 |
| Nintendo 64 | Mupen64Plus-Next (bundled under public/cores/, WebGL2) | GPL-2.0 |
| Game Boy Color | Gambatte, mGBA, Gearboy | GPL-2.0 / MPL-2.0 / GPL-3.0 |
| Game Boy Advance | mGBA | MPL-2.0 |

Several cores forbid commercial use. If EmuRM is ever monetised (ads, subscriptions), replace them (e.g. Gearsystem for Sega 8-bit) or confirm terms with the authors. Settings → About lists every core with its licence and source.

## Legal

EmuRM ships no games and no BIOS files. The demo shelf links to freely distributable homebrew from the [retrobrews](https://github.com/retrobrews) collection and loads it on demand; credit goes to each author. Users add only games and BIOS they have the right to use. Because the site is static and local-first, the operator never receives or stores ROMs.

## Next steps

- Library backup: export / import a single archive of states, SRAM and metadata.
- Optional, opt-in cloud sync of saves (never ROMs).
- Netplay via WebRTC for 2-player systems.
- Self-host all cores with integrity hashes; rebuild bundled cores in CI.
- Arcade (FBNeo / MAME) support — needs multi-file romset handling that the current single-file import pipeline doesn't do yet.
