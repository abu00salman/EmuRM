import type { CoreDef } from "./types";

/**
 * Open-source libretro cores chosen per system, balancing accuracy against
 * what runs at full speed in single-threaded WebAssembly on a mid-range phone.
 * Licences are the upstream project's; EmuRM only loads them, unmodified.
 */
export const CORES = {
  fceumm: { id: "fceumm", engine: "libretro", license: "GPL-2.0", upstream: "https://github.com/libretro/libretro-fceumm", hosting: "cdn" },
  nestopia: { id: "nestopia", engine: "libretro", license: "GPL-2.0", upstream: "https://github.com/libretro/nestopia", hosting: "cdn", notes: "Higher accuracy, slightly heavier" },
  snes9x: { id: "snes9x", engine: "libretro", license: "Snes9x licence (non-commercial)", upstream: "https://github.com/libretro/snes9x", hosting: "cdn", notes: "Non-commercial licence: keep EmuRM free if you ship it" },
  snes9x2010: { id: "snes9x2010", engine: "libretro", license: "Snes9x licence (non-commercial)", upstream: "https://github.com/libretro/snes9x2010", hosting: "cdn", notes: "Faster on low-end phones" },
  genesis_plus_gx: { id: "genesis_plus_gx", engine: "libretro", license: "Genesis Plus GX licence (non-commercial)", upstream: "https://github.com/libretro/Genesis-Plus-GX", hosting: "cdn" },
  picodrive: { id: "picodrive", engine: "libretro", license: "PicoDrive licence (non-commercial)", upstream: "https://github.com/libretro/picodrive", hosting: "cdn", notes: "Lighter; also runs 32X" },
  gearsystem: { id: "gearsystem", engine: "libretro", license: "GPL-3.0", upstream: "https://github.com/drhelius/Gearsystem", hosting: "cdn" },
  gambatte: { id: "gambatte", engine: "libretro", license: "GPL-2.0", upstream: "https://github.com/libretro/gambatte-libretro", hosting: "cdn" },
  mgba: { id: "mgba", engine: "libretro", license: "MPL-2.0", upstream: "https://github.com/libretro/mgba", hosting: "cdn" },
  pcsx_rearmed: { id: "pcsx_rearmed", engine: "libretro", license: "GPL-2.0", upstream: "https://github.com/libretro/pcsx_rearmed", hosting: "cdn", notes: "Built-in HLE BIOS; a real BIOS improves compatibility" },
  mednafen_pce_fast: { id: "mednafen_pce_fast", engine: "libretro", license: "GPL-2.0", upstream: "https://github.com/libretro/beetle-pce-fast-libretro", hosting: "cdn" },
  fmsx: { id: "fmsx", engine: "libretro", license: "fMSX licence (non-commercial)", upstream: "https://github.com/libretro/fmsx-libretro", hosting: "self", notes: "No public web build — compile with Emscripten, or use blueMSX" },
  bluemsx: { id: "bluemsx", engine: "libretro", license: "GPL-2.0", upstream: "https://github.com/libretro/blueMSX-libretro", hosting: "self", notes: "Most complete MSX/MSX2 core; needs its Machines folder" },
  mupen64plus_next: { id: "mupen64plus_next", engine: "libretro", license: "GPL-2.0", upstream: "https://github.com/libretro/mupen64plus-libretro-nx", hosting: "self", notes: "Needs a WebGL2 build; desktop-class GPU recommended" },
  gearboy: { id: "gearboy", engine: "libretro", license: "GPL-3.0", upstream: "https://github.com/drhelius/Gearboy", hosting: "cdn", notes: "Alternate Game Boy / Color core" },
  opera: { id: "opera", engine: "libretro", license: "See upstream licence (research use; confirm terms before commercial use)", upstream: "https://github.com/libretro/opera-libretro", hosting: "cdn", notes: "3DO — BIOS required" },
  stella: { id: "stella", engine: "libretro", license: "GPL-2.0", upstream: "https://github.com/stella-emu/stella", hosting: "cdn", notes: "Full-accuracy Atari 2600 core" },
  stella2014: { id: "stella2014", engine: "libretro", license: "GPL-2.0", upstream: "https://github.com/libretro/stella2014-libretro", hosting: "cdn", notes: "Lighter Atari 2600 core; faster on low-end phones" },
} as const satisfies Record<string, CoreDef>;
