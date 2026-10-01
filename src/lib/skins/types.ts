/** Reference-canvas coordinates (the 941×1672 space every skin image is drawn at). */
export interface SkinCircleZone {
  x: number;
  y: number;
  size: number;
}
export interface SkinRectZone {
  x: number;
  y: number;
  w: number;
  h: number;
}
export type SkinZone = SkinCircleZone | SkinRectZone;

export function isCircleZone(z: SkinZone): z is SkinCircleZone {
  return "size" in z;
}

export interface SkinDef {
  id: string;
  name: string;
  /** Skin-pack "system" keys this skin is offered for — translated from EmuRM's own
   *  ConsoleId via SYSTEM_KEYS in index.ts, since the pack predates this project's ids. */
  systems: string[];
  orientation: "portrait" | "landscape";
  /** Relative to public/skins/, e.g. "assets/skins/nes-classic.png" */
  image: string;
  thumbnail: string;
  /** Key into SkinsConfig.layouts */
  layout: string;
}

export interface SkinsConfig {
  version: number;
  coordinateSystem: { width: number; height: number };
  /** Where the live game canvas goes — shared by every skin, since they're all drawn on
   *  the same reference canvas with the screen cut-out in the same place. */
  screen: { x: number; y: number; width: number; height: number; radius: number };
  skins: SkinDef[];
  layouts: Record<string, Record<string, SkinZone>>;
}
