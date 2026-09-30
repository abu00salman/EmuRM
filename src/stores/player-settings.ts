import type { AspectMode } from "@/lib/engine/types";

export type ScreenFilter = "off" | "scanlines" | "crt" | "lcd";
/** "fixed": the D-pad sits at a set spot. "floating": it recenters on the first touch,
 *  like the virtual sticks in most modern mobile games (PUBG Mobile, COD Mobile, …). */
export type TouchStyle = "fixed" | "floating";
/** Visual skin for the on-screen buttons — independent of `touchStyle`, which is layout. */
export type TouchTheme = "default" | "neon" | "mono" | "retro";

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
  touchTheme: TouchTheme;
  /** How the mirrored picture is composed for AirPlay — independent of the on-device `aspect`,
   *  since the receiving TV's screen shape has nothing to do with this device's own stage. */
  airplayScaling: AspectMode;
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
  touchTheme: "default",
  airplayScaling: "native",
};
