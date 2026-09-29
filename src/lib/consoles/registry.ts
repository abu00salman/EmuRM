import { CORES } from "./cores";
import type { ButtonLabel, ConsoleDef, ConsoleId } from "./types";

const nintendoFace: ButtonLabel[] = [{ pad: "b", label: "B" }, { pad: "a", label: "A" }];
const snesFace: ButtonLabel[] = [
  { pad: "y", label: "Y" }, { pad: "x", label: "X" }, { pad: "b", label: "B" }, { pad: "a", label: "A" },
];

/**
 * Ordered by generation, so the Console Universe reads like a museum hall:
 * home computers → 8-bit → 16-bit → handhelds → 32/64-bit.
 */
export const CONSOLES: ConsoleDef[] = [
  {
    id: "msx", name: "MSX", short: "MSX", aliases: ["Sakhr", "صخر", "MSX2", "AX-170"],
    maker: "ASCII · Microsoft · Sakhr", year: 1983, family: "msx", form: "computer",
    accent: "#D8A84E", extensions: ["rom", "mx1", "mx2", "dsk", "cas"],
    cores: [CORES.fmsx, CORES.bluemsx], aspect: 4 / 3,
    faceButtons: [{ pad: "a", label: "1" }, { pad: "b", label: "2" }], shoulderButtons: [], hasSelect: true,
    bios: [
      { fileName: "MSX.ROM", required: true, description: "MSX1 BIOS — the open-source C-BIOS works" },
      { fileName: "MSX2.ROM", required: false, description: "MSX2 BIOS" },
      { fileName: "MSX2EXT.ROM", required: false, description: "MSX2 extended BIOS" },
      { fileName: "DISK.ROM", required: false, description: "Disk drive ROM for .dsk images" },
    ],
    status: "experimental",
  },
  {
    id: "nes", name: "Nintendo Entertainment System", short: "NES", aliases: ["Famicom", "Family Computer", "فاميلي"],
    maker: "Nintendo", year: 1983, family: "nintendo", form: "home",
    accent: "#E5484D", extensions: ["nes", "fds", "unf", "unif"],
    cores: [CORES.fceumm, CORES.nestopia], aspect: 4 / 3,
    faceButtons: nintendoFace, shoulderButtons: [], hasSelect: true, bios: [], status: "ready",
  },
  {
    id: "sms", name: "Master System", short: "SMS", aliases: ["Sega Mark III"],
    maker: "Sega", year: 1985, family: "sega", form: "home",
    accent: "#4C7DFF", extensions: ["sms", "sg"],
    cores: [CORES.genesis_plus_gx, CORES.gearsystem], aspect: 4 / 3,
    faceButtons: [{ pad: "b", label: "1" }, { pad: "a", label: "2" }], shoulderButtons: [], hasSelect: false, bios: [], status: "ready",
  },
  {
    id: "pce", name: "PC Engine", short: "PCE", aliases: ["TurboGrafx-16"],
    maker: "NEC · Hudson Soft", year: 1987, family: "nec", form: "home",
    accent: "#F08A3C", extensions: ["pce"],
    cores: [CORES.mednafen_pce_fast], aspect: 4 / 3,
    faceButtons: [{ pad: "b", label: "II" }, { pad: "a", label: "I" }], shoulderButtons: [], hasSelect: true, bios: [], status: "ready",
  },
  {
    id: "md", name: "Mega Drive", short: "MD", aliases: ["Genesis", "Sega Genesis"],
    maker: "Sega", year: 1988, family: "sega", form: "home",
    accent: "#3068FF", extensions: ["md", "gen", "smd", "bin"],
    cores: [CORES.genesis_plus_gx, CORES.picodrive], aspect: 4 / 3,
    faceButtons: [{ pad: "y", label: "A" }, { pad: "b", label: "B" }, { pad: "a", label: "C" }],
    shoulderButtons: [], hasSelect: false, bios: [], status: "ready",
  },
  {
    id: "gb", name: "Game Boy", short: "GB", aliases: ["DMG"],
    maker: "Nintendo", year: 1989, family: "gameboy", form: "handheld-v",
    accent: "#8FB573", extensions: ["gb"],
    cores: [CORES.gambatte, CORES.mgba, CORES.gearboy], aspect: 10 / 9,
    faceButtons: nintendoFace, shoulderButtons: [], hasSelect: true, bios: [], status: "ready",
  },
  {
    id: "gg", name: "Game Gear", short: "GG", aliases: [],
    maker: "Sega", year: 1990, family: "sega", form: "handheld-h",
    accent: "#5AA2FF", extensions: ["gg"],
    cores: [CORES.genesis_plus_gx, CORES.gearsystem], aspect: 10 / 9,
    faceButtons: [{ pad: "b", label: "1" }, { pad: "a", label: "2" }], shoulderButtons: [], hasSelect: false, bios: [], status: "ready",
  },
  {
    id: "snes", name: "Super Nintendo", short: "SNES", aliases: ["Super Famicom", "SFC"],
    maker: "Nintendo", year: 1990, family: "nintendo", form: "home",
    accent: "#C9506E", extensions: ["sfc", "smc", "fig", "swc"],
    cores: [CORES.snes9x, CORES.snes9x2010], aspect: 4 / 3,
    faceButtons: snesFace, shoulderButtons: [{ pad: "l", label: "L" }, { pad: "r", label: "R" }], hasSelect: true, bios: [], status: "ready",
  },
  {
    id: "tdo", name: "3DO", short: "3DO", aliases: ["3DO Interactive Multiplayer"],
    maker: "Panasonic · Sanyo · GoldStar", year: 1993, family: "3do", form: "disc",
    accent: "#8A5FC7", extensions: ["iso", "cue", "chd"],
    cores: [CORES.opera], aspect: 4 / 3,
    faceButtons: [{ pad: "y", label: "C" }, { pad: "x", label: "B" }, { pad: "b", label: "A" }],
    shoulderButtons: [{ pad: "l", label: "L" }, { pad: "r", label: "R" }],
    hasSelect: false,
    bios: [{ fileName: "panafz1.bin", required: true, description: "3DO BIOS (Panasonic FZ-1) — needed to boot any disc" }],
    status: "experimental",
  },
  {
    id: "psx", name: "PlayStation", short: "PS1", aliases: ["PSX", "PSone"],
    maker: "Sony", year: 1994, family: "sony", form: "disc",
    accent: "#6F6BF5", extensions: ["cue", "chd", "pbp", "iso", "img", "m3u", "bin"],
    cores: [CORES.pcsx_rearmed], aspect: 4 / 3,
    faceButtons: [
      { pad: "y", label: "□" }, { pad: "x", label: "△" }, { pad: "b", label: "✕" }, { pad: "a", label: "○" },
    ],
    shoulderButtons: [{ pad: "l", label: "L1" }, { pad: "r", label: "R1" }, { pad: "l2", label: "L2" }, { pad: "r2", label: "R2" }],
    hasSelect: true,
    bios: [{ fileName: "scph5501.bin", required: false, description: "US BIOS — optional, improves compatibility" }],
    status: "ready",
  },
  {
    id: "n64", name: "Nintendo 64", short: "N64", aliases: ["Ultra 64"],
    maker: "Nintendo", year: 1996, family: "nintendo", form: "home",
    accent: "#E0643C", extensions: ["n64", "z64", "v64"],
    cores: [CORES.mupen64plus_next], aspect: 4 / 3,
    faceButtons: [{ pad: "y", label: "B" }, { pad: "b", label: "A" }],
    shoulderButtons: [{ pad: "l", label: "L" }, { pad: "r", label: "R" }, { pad: "l2", label: "Z" }],
    hasSelect: false, bios: [], status: "experimental",
  },
  {
    id: "gbc", name: "Game Boy Color", short: "GBC", aliases: [],
    maker: "Nintendo", year: 1998, family: "gameboy", form: "handheld-v",
    accent: "#4FB79C", extensions: ["gbc"],
    cores: [CORES.gambatte, CORES.mgba, CORES.gearboy], aspect: 10 / 9,
    faceButtons: nintendoFace, shoulderButtons: [], hasSelect: true, bios: [], status: "ready",
  },
  {
    id: "gba", name: "Game Boy Advance", short: "GBA", aliases: ["AGB"],
    maker: "Nintendo", year: 2001, family: "gameboy", form: "handheld-h",
    accent: "#8A9BE0", extensions: ["gba"],
    cores: [CORES.mgba], aspect: 3 / 2,
    faceButtons: nintendoFace, shoulderButtons: [{ pad: "l", label: "L" }, { pad: "r", label: "R" }], hasSelect: true,
    bios: [{ fileName: "gba_bios.bin", required: false, description: "Optional — mGBA ships an HLE BIOS" }],
    status: "ready",
  },
];

const byId = new Map(CONSOLES.map((c) => [c.id, c]));

export function getConsole(id: string): ConsoleDef | undefined {
  return byId.get(id as ConsoleId);
}

export function requireConsole(id: string): ConsoleDef {
  const c = byId.get(id as ConsoleId);
  if (!c) throw new Error(`Unknown console "${id}"`);
  return c;
}

export function consolesForExtension(ext: string): ConsoleDef[] {
  const e = ext.toLowerCase().replace(/^\./, "");
  return CONSOLES.filter((c) => c.extensions.includes(e));
}

export const ALL_EXTENSIONS = Array.from(new Set(CONSOLES.flatMap((c) => c.extensions))).concat(["zip"]);
