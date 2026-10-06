import type { ConsoleDef, CoreDef, PadButton } from "@/lib/consoles/types";
import type { ShaderChoice } from "./shaders";

/**
 * The seam between EmuRM's UI and whatever actually emulates.
 * The player only speaks this interface, so a core can be swapped (libretro today,
 * a native WASM emulator or a worker-hosted engine tomorrow) without touching UI code.
 */

export type AspectMode = "native" | "4:3" | "16:9" | "stretch" | "integer";

export interface InputBindings {
  /** RetroPad button → RetroArch keyboard key name ("x", "enter", "up"…) */
  keyboard: Partial<Record<PadButton, string>>;
  /** RetroPad button → W3C standard-gamepad button index */
  gamepad: Partial<Record<PadButton, number>>;
}

export interface LaunchSpec {
  canvas: HTMLCanvasElement;
  console: ConsoleDef;
  core: CoreDef;
  files: { name: string; blob: Blob }[];
  bios: { name: string; blob: Blob }[];
  state?: Blob;
  sram?: Blob;
  input: InputBindings;
  /** 0..1 */
  volume: number;
  aspect: AspectMode;
  /** Current stage aspect, used for "stretch" */
  stageAspect: number;
  smoothing: boolean;
  shader?: ShaderChoice;
  signal?: AbortSignal;
  onPhase?: (phase: LaunchPhase) => void;
}

export type LaunchPhase = "engine" | "core" | "boot" | "running";

export interface EngineCapabilities {
  saveStates: boolean;
  fastForward: boolean;
  runtimeVolume: boolean;
  screenshot: boolean;
  sram: boolean;
  /** Can hand out a live MediaStream of its audio output (for AirPlay, recording, etc.) */
  audioStream: boolean;
}

export interface EmulatorSession {
  readonly capabilities: EngineCapabilities;
  pause(): void;
  resume(): void;
  restart(): void;
  isPaused(): boolean;
  saveState(): Promise<{ state: Blob; thumbnail?: Blob }>;
  loadState(state: Blob): Promise<void>;
  saveSram(): Promise<Blob | null>;
  screenshot(): Promise<Blob>;
  setFastForward(on: boolean): void;
  isFastForward(): boolean;
  /** 0..1; returns false if the engine can only apply it on next launch */
  setVolume(v: number): boolean;
  press(button: PadButton, down: boolean, player?: number): void;
  resize(width: number, height: number): void;
  /** Emulated frames since boot, or null if the engine can't report it */
  frameCount(): number | null;
  /** A live MediaStream of the engine's own audio output, for piping alongside a
   *  captured video track (AirPlay mirroring, recording…) without touching the
   *  normal speaker output. Null if the engine has no audio graph to tap right now. */
  captureAudioStream?(): MediaStream | null;
  destroy(): Promise<void>;
}

export interface EmulatorEngine {
  readonly id: string;
  launch(spec: LaunchSpec): Promise<EmulatorSession>;
}

export class CoreUnavailableError extends Error {
  constructor(public readonly coreId: string, message: string) {
    super(message);
    this.name = "CoreUnavailableError";
  }
}

export class MissingBiosError extends Error {
  constructor(public readonly files: string[]) {
    super(`This system needs ${files.join(", ")} before games can start.`);
    this.name = "MissingBiosError";
  }
}
