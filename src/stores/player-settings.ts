import type { AspectMode } from "@/lib/engine/types";

export type ScreenFilter = "off" | "scanlines" | "crt" | "lcd";
/** "fixed": the D-pad sits at a set spot. "floating": it recenters on the first touch,
 *  like the virtual sticks in most modern mobile games (PUBG Mobile, COD Mobile, …). */
export type TouchStyle = "fixed" | "floating";

export interface PlayerSettings {
  aspect: AspectMode;
  filter: ScreenFilter;
  volume: number;
  showFps: boolean;
  smoothing: boolean;
  autosave: boolean;
  /** Seconds between automatic saves while playing */
  autosaveEvery: number;
  touchControls: "auto" | "always" | "never";
  touchStyle: TouchStyle;
}

export const DEFAULT_PLAYER: PlayerSettings = {
  aspect: "native",
  filter: "off",
  volume: 0.8,
  showFps: false,
  smoothing: false,
  autosave: true,
  autosaveEvery: 60,
  touchControls: "auto",
  touchStyle: "floating",
};
