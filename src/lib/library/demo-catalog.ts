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
    title: "Nova the Squirrel", author: "NovaSquirrel", consoleId: "nes",
    rom: RB("nes-games", "novathesquirrel.nes"), cover: RB("nes-games", "novathesquirrel.png"),
    homepage: "https://github.com/NovaSquirrel/NovaTheSquirrel", note: "Open-source platformer, 33 levels (GPL)",
  },
  {
    title: "Astro Force", author: "Enrique Ruiz", consoleId: "sms",
    rom: RB("sms-games", "astroforce.sms"), cover: RB("sms-games", "astroforce.png"),
    homepage: "https://github.com/retrobrews/sms-games", note: "Vertical shoot-'em-up",
  },
  {
    title: "KunKun & KokoKun", author: "Omar Cornut", consoleId: "sms",
    rom: RB("sms-games", "kunkunkokokun.sms"), cover: RB("sms-games", "kunkunkokokun.png"),
    homepage: "https://www.smspower.org/dev/competition/", note: "SMS Power! 2006 coding competition entry",
  },
  {
    title: "BoTTleD", author: "Cero", consoleId: "md",
    rom: RB("md-games", "bottled.md"), cover: RB("md-games", "bottled.png"),
    homepage: "https://github.com/retrobrews/md-games", note: "Tower defence",
  },
  {
    title: "VilQ", author: "AceMan, Axi0maT, tehKaiN", consoleId: "md",
    rom: RB("md-games", "vilq.bin"), cover: RB("md-games", "vilq.png"),
    homepage: "https://www.pouet.net/prod.php?which=68213", note: "Runner platformer",
  },
  {
    title: "BLT", author: "Charles Doty", consoleId: "snes",
    rom: RB("snes-games", "blt.sfc"), cover: RB("snes-games", "blt.png"),
    homepage: "https://github.com/retrobrews/snes-games", note: "Vertical shooter",
  },
  {
    title: "Uwol, Quest for Money", author: "Alekmaul, Mojon Twins, KungFuFurby", consoleId: "snes",
    rom: RB("snes-games", "questformoney.sfc"), cover: RB("snes-games", "questformoney.png"),
    homepage: "https://github.com/retrobrews/snes-games", note: "Platformer, ZX Spectrum port",
  },
  {
    title: "µCity", author: "Antonio Niño Díaz", consoleId: "gbc",
    rom: RB("gbc-games", "ucity.gbc"), cover: RB("gbc-games", "ucity.png"),
    homepage: "https://github.com/AntonioND/ucity", note: "Open-source city builder (GPL-3.0)",
  },
  {
    title: "Geometrix", author: "Antonio Niño Díaz", consoleId: "gbc",
    rom: RB("gbc-games", "geometrix.gbc"), cover: RB("gbc-games", "geometrix.png"),
    homepage: "https://github.com/AntonioND/geometrix", note: "Open-source match-3 puzzle (GPL-3.0)",
  },
  {
    title: "Anguna", author: "Nathan Tolbert", consoleId: "gba",
    rom: RB("gba-games", "anguna.gba"), cover: RB("gba-games", "anguna.png"),
    homepage: "https://github.com/retrobrews/gba-games", note: "Top-down action adventure",
  },
  {
    title: "Goodboy Advance", author: "exelotl", consoleId: "gba",
    rom: RB("gba-games", "goodboyadvance.gba"), cover: RB("gba-games", "goodboyadvance.png"),
    homepage: "https://hotpengu.itch.io/goodboyadvance", note: "Exploration platformer, Ludum Dare jam game",
  },
];
