import type { ButtonLabel, ConsoleDef, ConsoleId, PadButton } from "@/lib/consoles/types";
import raw from "./skins.json";
import type { SkinDef, SkinsConfig } from "./types";

export type { SkinDef, SkinZone, SkinCircleZone, SkinRectZone } from "./types";
export { isCircleZone } from "./types";

export const SKINS_CONFIG = raw as SkinsConfig;

/** Sentinel id meaning "EmuRM's own built-in touch controls", not a pack skin. */
export const DEFAULT_SKIN_ID = "default";

/**
 * The skin pack was authored against its own "system" vocabulary (nes, famicom, ps1,
 * psp, genesis, megadrive, gamegear, …), not EmuRM's ConsoleId. This is the one place
 * that bridges the two, so neither the pack nor the emulator registry has to know
 * about the other.
 */
const SYSTEM_KEYS: Partial<Record<ConsoleId, string[]>> = {
  a2600: ["atari"],
  msx: ["msx"],
  nes: ["nes", "famicom"],
  md: ["genesis", "megadrive"],
  gb: ["gb"],
  gg: ["gamegear"],
  snes: ["snes"],
  psx: ["ps1"],
  n64: ["n64"],
  gbc: ["gbc"],
  gba: ["gba"],
  // sms, pce, tdo: no skins in this pack target them — they simply only offer
  // "Default / Original Controller" until a matching skin is added to skins.json.
};

export function getSkinsForConsole(consoleId: ConsoleId): SkinDef[] {
  const keys = SYSTEM_KEYS[consoleId];
  if (!keys?.length) return [];
  return SKINS_CONFIG.skins.filter((s) => s.systems.some((sys) => keys.includes(sys)));
}

export function getSkinById(id: string): SkinDef | undefined {
  return SKINS_CONFIG.skins.find((s) => s.id === id);
}

export function layoutFor(skin: SkinDef) {
  return SKINS_CONFIG.layouts[skin.layout];
}

// Same convention as every other public asset in this codebase (see ConsoleHall.tsx):
// NEXT_PUBLIC_BASE_PATH is "" on the real domain/Cloudflare and "/EmuRM" on GitHub
// Pages, inlined at build time — never an absolute host, so both deployments work.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** The pack's own `image`/`thumbnail` fields look like "assets/skins/foo.png"; this
 *  project serves them from public/skins/{skins,thumbs}/ instead, so only the
 *  filename survives the trip — keeps the folder layout this project already uses. */
function assetUrl(kind: "skins" | "thumbs", field: string): string {
  const file = field.split("/").pop();
  return `${BASE}/skins/${kind}/${file}`;
}

export function skinImageUrl(skin: SkinDef): string {
  return assetUrl("skins", skin.image);
}

export function skinThumbUrl(skin: SkinDef): string {
  return assetUrl("thumbs", skin.thumbnail);
}

/** The last skin the user picked for this console, kept independent per console so
 *  choosing a GBA skin doesn't affect what NES boots into. */
export function skinStorageKey(consoleId: ConsoleId) {
  return `emurm-skin:${consoleId}`;
}

export function loadSavedSkin(consoleId: ConsoleId): string {
  try {
    return localStorage.getItem(skinStorageKey(consoleId)) ?? DEFAULT_SKIN_ID;
  } catch {
    return DEFAULT_SKIN_ID;
  }
}

export function saveSkinChoice(consoleId: ConsoleId, skinId: string) {
  try {
    localStorage.setItem(skinStorageKey(consoleId), skinId);
  } catch {
    /* private mode or quota — the choice just won't survive a reload */
  }
}

/** Expected face/shoulder-button label text for each zone key the pack's layouts use,
 *  independent of which PadButton the console actually binds it to — e.g. the "a" zone
 *  always means "whichever button this console labels A", not RetroPad's "a" literally. */
const LABELS: Record<string, string[]> = {
  a: ["A"], b: ["B"], c: ["C"], x: ["X"], y: ["Y"],
  triangle: ["△"], square: ["□"], circle: ["○"], cross: ["✕"],
  l: ["L", "L1"], r: ["R", "R1"], l2: ["L2", "Z"], r2: ["R2"],
};

function findByLabel(buttons: ButtonLabel[], candidates: string[]): PadButton | null {
  const hit = buttons.find((b) => candidates.includes(b.label.trim().toUpperCase()));
  return hit?.pad ?? null;
}

/**
 * Mapping layer required by the brief: a skin's zone name (drawn from the pack's own
 * vocabulary) → the PadButton this particular console actually binds that role to,
 * read from the SAME ConsoleDef.faceButtons/shoulderButtons the existing TouchPad
 * uses — never a change to the emulator core or its input handling.
 *
 * Returns "dpad" (handled separately — it can fire two PadButtons at once for
 * diagonals) or null when this console has no button for that zone (e.g. NES has no
 * L/R, so the skin's grip-button zones are simply inert — the real NES pad didn't
 * have them either). A null zone is never rendered as a touch target.
 */
export function resolveZone(zoneKey: string, c: ConsoleDef): PadButton | "dpad" | null {
  if (zoneKey === "dpad") return "dpad";
  if (zoneKey === "start") return "start";
  if (zoneKey === "select") return c.hasSelect ? "select" : null;
  const candidates = LABELS[zoneKey];
  if (!candidates) return null; // cUp/cLeft/cRight/cDown/stick/leftStick/rightStick: no
  // discrete-button or analog-axis equivalent in EmuRM's input model today.
  return findByLabel([...c.faceButtons, ...c.shoulderButtons], candidates);
}
