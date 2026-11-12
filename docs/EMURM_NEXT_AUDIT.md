# EmuRM NEXT audit

Read-only look at `main` (commit `dbbd497`) and at https://emurm.com on 12 Nov 2026. Nothing here was deployed.

## Stack

Next.js 16 static export (`output: "export"`), React 19, Tailwind 4, Dexie (IndexedDB), Nostalgist 0.22 (libretro / RetroArch WASM). Node 20.9+. `npm run build` writes `out/` and downlevels JS for older browsers.

The player, gamepad, touch controls, fullscreen, four save slots plus autosave, favourites, Arabic/English with RTL, and light/dark theme already exist. ROMs the player adds stay in IndexedDB. The import dialog already accepts a local file and does not upload it.

## What publishes emurm.com

Two workflows run on every push to `main`:

- **Deploy to Cloudflare Workers** (`wrangler deploy` of `out/`). This is the live site. `emurm.com` and `www.emurm.com` answer with `server: cloudflare`, `cache-control: public, max-age=0, must-revalidate`, and Next assets at `/`. DNS is Cloudflare anycast (`104.21.60.153`, `172.67.197.253`). The Workers run on `dbbd497` succeeded.
- **Deploy to GitHub Pages.** Pages is enabled. The project site is https://abu00salman.github.io/EmuRM/ (base path `/EmuRM/`). The Pages API has no custom domain (`cname: null`), so Pages is not emurm.com.

Android, iOS, and desktop workflows are `workflow_dispatch` only. They do not publish the website.

## Apps in the repo

- `android-app/`: Gradle shell. It bundles a web export and serves it against the `www.emurm.com` origin. The README says IndexedDB survival across that switch is unverified on a device.
- `ios-app/`: unsigned WKWebView shell around the deployed site. It was written without Apple tooling in the environment that added it.
- `desktop-app/`: Electron wrapper.

## Games and cores already on main

Cores are declared in `src/lib/consoles/cores.ts`. Stella 2014, blueMSX, and Mupen64Plus-Next are bundled under `public/cores/`. The others load from jsDelivr (`arianrhodsandlot/retroarch-emscripten-build`) the first time that system is played. Several Sega and SNES cores are non-commercial.

The playable shelf on main is six RetroBrews homebrew titles in `src/lib/library/demo-catalog.ts` (Concentration Room, Astro Force, BoTTleD, BLT, µCity, Anguna). They are fetched when the visitor taps Add. This pass did not launch those six on the live site. Rebuilt Games (`/rebuilt/`) has an empty Play Now list on purpose: nothing there has been vetted as legally playable in the browser. Discovery also lists commercial metadata (Mario, Zelda, and others) with no ROM attached; web search is the only outbound link.

## Lighthouse baseline

Measured on the live URL https://emurm.com (production build, not this branch).

| | Performance | LCP | JS transfer |
|---|---|---|---|
| Mobile | 96 | 2.7 s | 298,380 bytes |
| Desktop | 99 | 0.9 s | 298,253 bytes |

## Gaps against the target

Instant Play Now existed only as "add homebrew, then play". There were no per-game SEO pages for a curated catalog (the sitemap had home, discover, library, and consoles). Favourites, continue, gamepad, touch, fullscreen, saves, RTL, and theme already work for library games. Commercial box art must not be hotlinked; this branch uses generated covers.

## Open work on the repo

There are no standalone open issues. Five pull requests are open:

1. **#10** More RetroBrews homebrew in the free-homebrew tab. Not launch-tested there.
2. **#23** RG353V handheld layout and Android build. Not tested on the device.
3. **#24** Twelve instant classics, including Freedoom. Not merged. This branch does not take that set.
4. **#25** REA audit scripts. The Actions workflow had not been run by its author.
5. **#26** Animal Crossing GameCube Android port as an information-only Rebuilt Games entry. It needs the player's own disc.

## Catalogs reviewed and not imported

- **EmulatorJS** is a GPL emulator front end, not a source of games. EmuRM already has a libretro player. It was not swapped in.
- **bite-arcade** is an MIT portal. The README does not attach a redistribution license to each game.
- **awesome-decomp-games** links source and says it does not host ROMs. Useful as a pointer. A decomp is not permission to ship the game.
- **Browser-Games-Directory** lists Call of Duty, GTA, Halo, and Crash Bash Online with no per-title license. Rejected.
- **ultimate-catalog-of-web-game-ports** (both copies) sends many "play" links to third-party sites that host commercial games, including gn-math.dev. Rejected. Those URLs are not iframed.
- **Awesome-Browser-Game-Ports** mixes engines that need your own files with freeware. Not bulk-imported.
- **OpenLara** is BSD-2-Clause for the engine. Its public WebGL demo includes Tomb Raider levels. The demo was not copied or embedded.
