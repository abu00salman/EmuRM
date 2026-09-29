import type { ConsoleId } from "@/lib/consoles/types";

/**
 * libretro-thumbnails (the same free, curated box-art set RetroArch itself downloads) —
 * one GitHub repo per system, box art filed under Named_Boxarts/ using the exact
 * No-Intro/Redump dump name. No API key, no rate-limit auth needed: raw.githubusercontent.com
 * serves it directly with permissive CORS.
 *
 * This only ever helps official, well-known games whose filename already matches (or is
 * close to) that naming convention — unlicensed compilations/multicarts, romhacks, and
 * renamed files simply won't match, and silently fall back to the generated placeholder
 * exactly as they did before this existed.
 */
const THUMBS_REPO: Partial<Record<ConsoleId, string>> = {
  nes: "Nintendo_-_Nintendo_Entertainment_System",
  snes: "Nintendo_-_Super_Nintendo_Entertainment_System",
  n64: "Nintendo_-_Nintendo_64",
  gb: "Nintendo_-_Game_Boy",
  gbc: "Nintendo_-_Game_Boy_Color",
  gba: "Nintendo_-_Game_Boy_Advance",
  sms: "Sega_-_Master_System_-_Mark_III",
  md: "Sega_-_Mega_Drive_-_Genesis",
  gg: "Sega_-_Game_Gear",
  psx: "Sony_-_PlayStation",
  pce: "NEC_-_PC_Engine_-_TurboGrafx_16",
  a2600: "Atari_-_2600",
};

async function tryFetch(url: string, signal: AbortSignal): Promise<Blob | null> {
  try {
    const res = await fetch(url, { mode: "cors", signal });
    if (!res.ok) return null;
    const blob = await res.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

/** Best-effort box-art lookup by filename. Returns null (never throws) on any miss. */
export async function fetchBoxArt(consoleId: ConsoleId, fileName: string, title: string): Promise<Blob | null> {
  const repo = THUMBS_REPO[consoleId];
  if (!repo) return null;

  const withoutExt = fileName.replace(/\.[^.]+$/, "");
  const candidates = Array.from(new Set([withoutExt, title]));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    for (const name of candidates) {
      const url = `https://raw.githubusercontent.com/libretro-thumbnails/${repo}/master/Named_Boxarts/${encodeURIComponent(name)}.png`;
      const blob = await tryFetch(url, controller.signal);
      if (blob) return blob;
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
