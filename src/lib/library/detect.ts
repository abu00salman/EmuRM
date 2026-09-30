import type { ConsoleId } from "@/lib/consoles/types";
import { consolesForExtension } from "@/lib/consoles/registry";

/**
 * Identify a system from the file's own bytes first and its extension second.
 * Headers resolve the ambiguous extensions (.bin, .rom) that trip up most web emulators.
 * Pure function — runs inside the ROM worker.
 */
export function detectConsole(fileName: string, bytes: Uint8Array): ConsoleId[] {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const ascii = (off: number, len: number) =>
    off + len <= bytes.length ? String.fromCharCode(...bytes.subarray(off, off + len)) : "";

  // iNES / NES 2.0
  if (ascii(0, 3) === "NES" && bytes[3] === 0x1a) return ["nes"];
  // Famicom Disk System
  if (ascii(0, 4) === "FDS\x1a" || ascii(1, 14) === "*NINTENDO-HVC*") return ["nes"];

  // Nintendo 64 — three byte orders
  const n64 = bytes.length > 4 ? [bytes[0], bytes[1], bytes[2], bytes[3]].join(",") : "";
  if (n64 === "128,55,18,64" || n64 === "55,128,64,18" || n64 === "64,18,55,128") return ["n64"];

  // Game Boy family: Nintendo logo at 0x104, CGB flag at 0x143
  const gbLogo = [0xce, 0xed, 0x66, 0x66];
  if (bytes.length > 0x150 && gbLogo.every((b, i) => bytes[0x104 + i] === b)) {
    const cgb = bytes[0x143] ?? 0;
    return cgb === 0xc0 ? ["gbc"] : cgb === 0x80 ? ["gbc", "gb"] : ["gb"];
  }

  // Game Boy Advance: fixed value 0x96 at 0xB2 plus the logo start at 0x04
  if (bytes.length > 0xc0 && bytes[0xb2] === 0x96 && bytes[0x04] === 0x24 && bytes[0x05] === 0xff) return ["gba"];

  // Mega Drive: "SEGA" at 0x100
  if (ascii(0x100, 4) === "SEGA" || ascii(0x101, 4) === "SEGA") return ["md"];

  // Master System / Game Gear: "TMR SEGA" at 0x7FF0 (or 0x3FF0 / 0x1FF0)
  for (const off of [0x7ff0, 0x3ff0, 0x1ff0]) {
    if (ascii(off, 8) === "TMR SEGA") {
      const region = (bytes[off + 0x0f] ?? 0) >> 4;
      if (ext === "gg" || region === 5 || region === 6 || region === 7) return ["gg"];
      return ["sms"];
    }
  }

  // MSX cartridge: "AB" at offset 0
  if ((ext === "rom" || ext === "mx1" || ext === "mx2") && ascii(0, 2) === "AB") return ["msx"];

  // CD images: a raw PS1 sector carries "PLAYSTATION" in the licence area.
  // .pbp is PSX-only; .m3u playlists are shared by PSX and MSX.
  // .cue/.chd/.bin/.iso/.img
  // are shared with 3DO, so fall through to the console picker when the
  // signature doesn't confirm PSX.
  if (ext === "pbp") return ["psx"];
  if (ext === "cue" || ext === "chd" || ext === "bin" || ext === "iso" || ext === "img") {
    const head = ascii(0x9320, 64) + ascii(0x9340, 64);
    if (head.includes("PLAYSTATION")) return ["psx"];
    if (ext === "bin" && bytes.length > 64 * 1024 * 1024) return ["psx"];
  }

  return consolesForExtension(ext).map((c) => c.id);
}

/** "Super_Game (USA) [!].sfc" → "Super Game" */
export function cleanTitle(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  const cleaned = base
    .replace(/[_.]+/g, " ")
    .replace(/\s*[([][^)\]]*[)\]]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || base;
}
