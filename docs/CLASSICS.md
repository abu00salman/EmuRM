# EmuRM Classics

Complete games that EmuRM hosts itself and plays straight away. **Play now** opens the game
inside emurm.com, with nothing to download or import and no outside site involved. The catalog is in
`src/lib/classics/catalog.ts`, and the files are in `public/classics/<id>/` next to their licence text.

## Rules for adding a game

1. Code **and** assets must be under a licence that allows redistribution. The licence text
   ships next to the file. Commercial game data is never added, and neither are "bring your own
   files" titles: those go in Rebuilt Games (`docs/REBUILT_GAMES.md`).
2. The game has to run on one of EmuRM's existing cores with no extra files from the player.
3. It has to be **played past its menus** in EmuRM: add a key plan for it to
   `scripts/smoke-classics.cjs`. That script presses the buttons and checks that the game
   reacts. Only then set `verified`.
4. Each file is at most 25 MiB, because that is Cloudflare's per-file limit. Larger WADs are
   zipped, and the importer unpacks them.

## Playable now (all 28 played into actual gameplay on 2026-10-25)

| Game | System / core | Licence | What the test reached |
| --- | --- | --- | --- |
| Freedoom: Phase 1 | Doom engine / PrBoom (bundled) | BSD-3-Clause | E1M1: moved, fired, picked up items |
| Freedoom: Phase 2 | Doom engine / PrBoom (bundled) | BSD-3-Clause | MAP01: moved, fired, picked up armour |
| Super Tilt Bro. | NES / FCEUmm | WTFPL | A match against the CPU, with damage dealt |
| Nova the Squirrel | NES / FCEUmm | GPL-3.0+ code, CC BY-NC-SA 4.0 assets (hosted free of charge, unmodified) | Level 1-1: walking and scrolling |
| Horizontal Shooter | SNES / Snes9x | MIT + CC0 art | Flying and shooting, through to game over |
| Lunar Limit | NES / FCEUmm | MIT | Wave 1: orbiting and shooting, lives lost |
| Blast Arena Advance | GBA / mGBA | MIT | A full round, through to game over |
| Gold Rush | Mega Drive / Genesis Plus GX | MIT | Song playing, notes scored |
| Gravity Beam: Master Gaiden | Master System / Gearsystem | BSD-3-Clause | Flying through the Mars caverns |
| robotfindskitten | NES / FCEUmm | zlib | Robot moving and examining items |
| Concentration Room | NES / FCEUmm | GPL-3.0+ (ROM exception) | Board dealt, cursor moving |
| Falling | NES / FCEUmm | MIT | Falling and steering |
| AGB_Hack | GBA / mGBA | GPL | Character created, exploring the first dungeon room |
| Collision Course | GBA / mGBA | Public domain | Ship flying among asteroids |
| Pnakys | GBA / mGBA | Public domain | Balls dropping and stacking |
| Geometrix | GBC / Gambatte | GPL-3.0 | Board play, cursor swapping |
| Double Action Blaster Guys | NES / FCEUmm | GPL-3.0 | Level 1, enemies and shooting |
| F-FF | NES / FCEUmm | MIT | Racing, lap timer running |
| Jet Paco | NES / FCEUmm | LGPL-3.0 | Flying around the first room |
| Lala the Magical | NES / FCEUmm | LGPL-3.0 | First screen, a life lost to an enemy |
| Ralph 4 | NES / FCEUmm | MIT | Floor 1, Ralph moving |
| Sgt. Helmet: Training Day | NES / FCEUmm | LGPL-3.0 | Mission A, moving and shooting |
| Spacey McRacey | NES / FCEUmm | Free release; art CC0 / CC BY 3.0 | Race against bots |
| Wo Xiang Niao Niao | NES / FCEUmm | LGPL-3.0 | Level 1-1, walking |
| Yun | NES / FCEUmm | LGPL-3.0 | Level 1, walking |
| Digger Chan | Master System / Gearsystem | GPL | Digging, score rising |
| Lander | Master System / Gearsystem | GPL-3.0+ | Level 1, rocket descending |
| Lander 2 | Master System / Gearsystem | GPL-3.0+ | Take-off and landing ("Great!") |

How to run the test: `npm run build`, serve `out/`, then
`CLASSICS_TEST_URL=http://127.0.0.1:4100/ npm run test:classics`. If a machine can't reach
jsDelivr, the script can take the cores from a local folder; see the script's header.

## Tested and left out

| Game | Why |
| --- | --- |
| Mega Cheril Perils (MD) | It plays, but its cut-scenes show cartoon nudity, which doesn't fit a general-audience catalog. (It is also non-commercial, CC BY-NC-SA.) |
| µCity (GBC) | Boots and reaches map generation, but the test couldn't confirm Start finishing the map. It stays out until it is verified. |
| Star Evil (NES) | The title screen ignores every input on FCEUmm. |
| GBA Tactics | Its characters copy Final Fantasy job sprites (Square Enix IP). |
| NESertBus, Chocobo World Deluxe, Indivisible (NES) | Based on other companies' games or characters. |
| Cave Story MD, Griel's Quest, Diggerball | Asset licence unclear or not redistributable. |

## Candidates for the next phase (not yet "Play now")

These need their own WebAssembly builds. EmuRM's libretro cores can't run them as they are.
Each one still has to pass the same checks before it is listed: data licence, a size budget,
and a gameplay test.

| Project | Data | Status |
| --- | --- | --- |
| LibreQuake | BSD-3 (LibreQuake data) | The `tyrquake` core exists. Needs the LibreQuake release PAKs packaged under 25 MiB. |
| OpenTyrian | Tyrian 2000 freeware data | Needs an SDL2/Emscripten build. The freeware data's terms have to be checked. |
| C-Dogs SDL | Free data shipped with the game | Needs an Emscripten build. |
| GNU FreeDink | Free FreeDink data | Needs an Emscripten build. |
| OpenTTD | OpenGFX / OpenSFX / OpenMSX (GPL) | Needs an Emscripten build, and saves would have to go into EmuRM's storage. |
| Neverball | GPL data | Needs an Emscripten build with WebGL. |
| FreeRCT | GPL data | Needs an Emscripten build. |

PlayChive (MahanKenway/PlayChive) publishes build scripts for most of these. It is the starting
point to evaluate. Its builds can't be embedded directly, because "Play now" has to stay inside EmuRM.

## Sources checked (2026-10-25)

| Source | Reachable from the build sandbox | Used for |
| --- | --- | --- |
| SubmitGame/awesome-decomp-games | yes (git) | Rebuilt Games index; weekly scan (`.github/workflows/scan-rebuilt.yml`) |
| bitburner/Awesome-Browser-Game-Ports | yes (raw README) | candidate list |
| matapandax/ultimate-catalog-of-web-game-ports | yes (raw README) | candidate list |
| MahanKenway/PlayChive | yes (raw README) | candidate list, WASM build references |
| retrobrews (nes/snes/md/gbc/gba/sms-games) | yes (git) | homebrew ROMs + per-game licence files |
| thegamingemporium.com, reddit r/decomps, vl.mr | no (blocked from the sandbox) | not used yet |

## Periodic scan

Every Monday, `scan-rebuilt.yml` rebuilds the Rebuilt Games index from upstream and opens a
pull request. A person reviews it. Nothing becomes "Play now" automatically.

Developed by abu00salman.
