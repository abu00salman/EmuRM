# Verified games

Launch checks on 12 Nov 2026 against a local static build (`npm run build`, then `serve` on port 4173). Headless Chrome used SwiftShader. A game is "instant" only if that run reached a title screen or gameplay. Commercial titles were not launched, because no redistributable copy was found.

Screenshots live in `docs/evidence/launch/`.

## Instant (hosted, license allows it)

| Game | Engine | License | Desktop | Mobile | Screenshot |
|---|---|---|---|---|---|
| Lunar Limit | libretro/fceumm | MIT code, CC BY 4.0 music ([LICENSE.txt](https://github.com/pubby/lunarlimit/blob/master/LICENSE.txt)) | Title screen and HUD | Android Chrome viewport: same screen. WebKit 18.4 iPhone viewport: Play did not open the player | `lunar-limit.png`, `lunar-limit-android.png`, `lunar-limit-webkit.png` |
| Concentration Room | libretro/fceumm | GPL-3.0-only ([LICENSE.txt](https://github.com/pinobatch/croom-nes/blob/master/LICENSE.txt)), ROM is the author's v0.02a | Title menu, including the 2018 copyright line | Not retested | `concentration-room.png` |
| Blind Jump | libretro/mgba | MIT ([LICENSE](https://github.com/evanbowman/blind-jump-portable/blob/master/LICENSE)), release 2021.11.20.0 | Language select | Not retested | `blind-jump.png` |

Keyboard and Gamepad API bindings already exist in the player. No physical controller was attached. The four save slots and autosave were not pressed in this pass.

The local-file control was tested on the Super Mario Bros. page by choosing `lunarlimit.nes` from disk. The player showed Lunar Limit, not Mario (`flow-nes-local-file.png`). The file was not uploaded.

## Priority titles

| Title | Status | Reason |
|---|---|---|
| Super Mario Bros. (NES) | user-file | Nintendo holds the ROM. No redistribution grant. Page loads a local file in libretro/fceumm. |
| Super Mario World (SNES) | user-file | Same. Core: libretro/snes9x (that core is non-commercial). |
| Super Mario 64 (N64) | user-file | `n64decomp/sm64` does not include Nintendo's data. Third-party web builds that embed the ROM were not linked. Core: bundled mupen64plus_next. |
| Sonic the Hedgehog (Mega Drive) | user-file | `sonicretro/s1disasm` is not a license for Sega's ROM. Core: libretro/genesis_plus_gx (non-commercial). |
| Sonic the Hedgehog (Game Gear) | user-file | No redistribution license found. |
| Sonic Advance (GBA) | user-file | No redistribution license found. Core: libretro/mgba. |
| Crash Bandicoot (PS1) | user-file | Sony / Naughty Dog. Disc image stays local. Core: libretro/pcsx_rearmed (HLE BIOS). |
| Crash Bash (PS1) | user-file | No redistribution license. A directory listing "Crash Bash Online" was rejected. |
| Pepsiman (PS1) | user-file | Commercial KID release. No rights-holder grant found. |
| Tomb Raider | user-file | OpenLara's engine is BSD-2-Clause. Its public WebGL demo includes the game's levels, so it was not embedded or iframed. |
| 2048, Hextris, Astray | not in this catalog | Dropped as simple casual games. |

## Sources not used for files

EmulatorJS (player only; the existing libretro player stays). bite-arcade, Browser-Games-Directory, both ultimate web-port catalogs, and Awesome-Browser-Game-Ports: no per-title redistribution grant, and several link to sites that host commercial games. awesome-decomp-games is a code index and says it does not host ROMs. None of those play URLs are embedded.
