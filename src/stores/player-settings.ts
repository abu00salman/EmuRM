import type { AspectMode } from "@/lib/engine/types";

export type ScreenFilter = "off" | "scanlines" | "crt" | "lcd";

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
};
