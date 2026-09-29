import type { ConsoleId } from "@/lib/consoles/types";

export interface DemoGame {
  title: string;
  author: string;
  consoleId: ConsoleId;
  rom: string;
  cover: string;
  homepage: string;
  note: string;
}

/**
 * Freely distributed homebrew for testing — nothing commercial, nothing bundled.
 * Files stay on the authors' distribution channel (the RetroBrews archive, served by jsDelivr)
 * and are fetched only when the player taps "Add". RetroBrews notes these are approved for
 * distribution through that project; linking rather than re-hosting respects that.
 */
const RB = (repo: string, file: string) => `https://cdn.jsdelivr.net/gh/retrobrews/${repo}@master/${file}`;

export const DEMO_GAMES: DemoGame[] = [
  {
    title: "Concentration Room", author: "Damian Yerrick", consoleId: "nes",
    rom: RB("nes-games", "croom.nes"), cover: RB("nes-games", "croom.png"),
    homepage: "https://github.com/pinobatch/croom-nes", note: "Open-source card-matching game",
  },
  {
    title: "Astro Force", author: "Enrique Ruiz", consoleId: "sms",
    rom: RB("sms-games", "astroforce.sms"), cover: RB("sms-games", "astroforce.png"),
    homepage: "https://github.com/retrobrews/sms-games", note: "Vertical shoot-'em-up",
  },
  {
    title: "BoTTleD", author: "Cero", consoleId: "md",
    rom: RB("md-games", "bottled.md"), cover: RB("md-games", "bottled.png"),
    homepage: "https://github.com/retrobrews/md-games", note: "Tower defence",
  },
  {
    title: "BLT", author: "Charles Doty", consoleId: "snes",
    rom: RB("snes-games", "blt.sfc"), cover: RB("snes-games", "blt.png"),
    homepage: "https://github.com/retrobrews/snes-games", note: "Vertical shooter",
  },
  {
    title: "µCity", author: "Antonio Niño Díaz", consoleId: "gbc",
    rom: RB("gbc-games", "ucity.gbc"), cover: RB("gbc-games", "ucity.png"),
    homepage: "https://github.com/AntonioND/ucity", note: "Open-source city builder (GPL-3.0)",
  },
  {
    title: "Anguna", author: "Nathan Tolbert", consoleId: "gba",
    rom: RB("gba-games", "anguna.gba"), cover: RB("gba-games", "anguna.png"),
    homepage: "https://github.com/retrobrews/gba-games", note: "Top-down action adventure",
  },
];
