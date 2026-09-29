import { Nostalgist } from "nostalgist";
import type { PadButton } from "@/lib/consoles/types";
import {
  CoreUnavailableError,
  type AspectMode,
  type EmulatorEngine,
  type EmulatorSession,
  type InputBindings,
  type LaunchSpec,
} from "./types";

const CORE_BASE = (process.env.NEXT_PUBLIC_CORE_BASE ?? "").replace(/\/$/, "");

const PAD: PadButton[] = ["up", "down", "left", "right", "a", "b", "x", "y", "l", "r", "l2", "r2", "start", "select"];

function inputConfig(input: InputBindings): Record<string, string | number> {
  const cfg: Record<string, string | number> = {};
  for (const b of PAD) {
    cfg[`input_player1_${b}`] = input.keyboard[b] ?? "nul";
    const pad = input.gamepad[b];
    cfg[`input_player1_${b}_btn`] = pad === undefined ? "nul" : pad;
  }
  return cfg;
}

function aspectConfig(mode: AspectMode, native: number, stage: number): Record<string, string | number | boolean> {
  switch (mode) {
    case "native":
      return { aspect_ratio_index: 22, video_scale_integer: false, video_force_aspect: true };
    case "integer":
      return { aspect_ratio_index: 22, video_scale_integer: true, video_force_aspect: true };
    case "4:3":
      return { aspect_ratio_index: 20, video_aspect_ratio: "1.333333", video_force_aspect: true, video_scale_integer: false };
    case "16:9":
      return { aspect_ratio_index: 20, video_aspect_ratio: "1.777778", video_force_aspect: true, video_scale_integer: false };
    case "stretch":
      return { aspect_ratio_index: 20, video_aspect_ratio: (stage || native).toFixed(6), video_force_aspect: true, video_scale_integer: false };
  }
}

const toDb = (v: number) => (v <= 0.001 ? -80 : Math.max(-80, 20 * Math.log10(v)));

interface ALContext {
  gain?: GainNode;
  audioCtx?: AudioContext;
}

function audioContexts(n: Nostalgist): ALContext[] {
  try {
    const AL = n.getEmscriptenAL() as { currentCtx?: ALContext; contexts?: Record<string, ALContext> } | undefined;
    if (!AL) return [];
    const list = Object.values(AL.contexts ?? {});
    if (AL.currentCtx && !list.includes(AL.currentCtx)) list.push(AL.currentCtx);
    return list.filter(Boolean);
  } catch {
    return [];
  }
}

class LibretroSession implements EmulatorSession {
  readonly capabilities = { saveStates: true, fastForward: true, runtimeVolume: true, screenshot: true, sram: true };
  private paused = false;
  private ff = false;

  constructor(private readonly n: Nostalgist) {}

  pause() {
    if (this.paused) return;
    this.n.pause();
    this.paused = true;
    for (const c of audioContexts(this.n)) void c.audioCtx?.suspend();
  }
  resume() {
    if (!this.paused) return;
    this.n.resume();
    this.paused = false;
    for (const c of audioContexts(this.n)) void c.audioCtx?.resume();
  }
  restart() {
    this.n.restart();
  }
  isPaused() {
    return this.paused;
  }
  async saveState() {
    const { state, thumbnail } = await this.n.saveState();
    return { state, thumbnail };
  }
  async loadState(state: Blob) {
    await this.n.loadState(state);
  }
  async saveSram() {
    try {
      const blob = await this.n.saveSRAM();
      return blob.size ? blob : null;
    } catch {
      return null; // core has no battery RAM
    }
  }
  screenshot() {
    return this.n.screenshot();
  }
  setFastForward(on: boolean) {
    if (on === this.ff) return;
    this.n.sendCommand("FAST_FORWARD");
    this.ff = on;
  }
  isFastForward() {
    return this.ff;
  }
  setVolume(v: number) {
    const ctxs = audioContexts(this.n);
    for (const c of ctxs) if (c.gain) c.gain.gain.value = Math.max(0, Math.min(1, v));
    return ctxs.some((c) => c.gain);
  }
  press(button: PadButton, down: boolean, player = 1) {
    if (down) this.n.pressDown({ button, player });
    else this.n.pressUp({ button, player });
  }
  resize(width: number, height: number) {
    if (width > 0 && height > 0) this.n.resize({ width, height });
  }
  frameCount() {
    try {
      const em = this.n.getEmscripten() as {
        Browser?: { mainLoop?: { currentFrameNumber?: number } };
        MainLoop?: { currentFrameNumber?: number };
      };
      return em?.MainLoop?.currentFrameNumber ?? em?.Browser?.mainLoop?.currentFrameNumber ?? null;
    } catch {
      return null;
    }
  }
  async destroy() {
    try {
      this.n.exit({ removeCanvas: false });
    } catch {
      /* already gone */
    }
  }
}

export const libretroEngine: EmulatorEngine = {
  id: "libretro",
  async launch(spec: LaunchSpec) {
    const { core } = spec;
    if (core.hosting === "self" && !CORE_BASE) {
      throw new CoreUnavailableError(
        core.id,
        `${spec.console.name} needs the ${core.id} core, which has no public web build. ` +
          `Build it with Emscripten and set NEXT_PUBLIC_CORE_BASE (see public/cores/README.md).`,
      );
    }
    spec.onPhase?.("core");

    const coreInput = CORE_BASE
      ? { name: core.id, js: `${CORE_BASE}/${core.id}_libretro.js`, wasm: `${CORE_BASE}/${core.id}_libretro.wasm` }
      : core.id;

    // Cue sheets must come first so the core opens the right file.
    const files = [...spec.files].sort((a, b) => Number(/\.(cue|m3u)$/i.test(b.name)) - Number(/\.(cue|m3u)$/i.test(a.name)));
    const rom = files.map((f) => new File([f.blob], f.name));
    const bios = spec.bios.map((f) => new File([f.blob], f.name));

    const n = await Nostalgist.launch({
      element: spec.canvas,
      core: coreInput,
      rom: rom.length === 1 ? rom[0] : rom,
      bios: bios.length ? bios : undefined,
      state: spec.state,
      sram: spec.sram,
      signal: spec.signal,
      respondToGlobalEvents: true,
      style: { width: "100%", height: "100%", backgroundColor: "transparent", imageRendering: spec.smoothing ? "auto" : "pixelated" },
      size: "auto",
      retroarchConfig: {
        ...inputConfig(spec.input),
        ...aspectConfig(spec.aspect, spec.console.aspect, spec.stageAspect),
        video_smooth: spec.smoothing,
        audio_volume: toDb(spec.volume),
        fastforward_ratio: 4,
        savestate_thumbnail_enable: true,
        savestate_auto_load: false,
        notification_show_fast_forward: false,
        menu_enable_widgets: false,
        input_joypad_driver: "rwebpad",
        input_autodetect_enable: true,
        rewind_enable: false,
        video_font_enable: false,
        // `respondToGlobalEvents: true` (below) makes RetroArch's own keyboard glue listen
        // on `document`, so without this it also reacts to its *own* default hotkeys for
        // the exact keys the player UI already owns (F11 fullscreen, F2/F4 save/load, Esc
        // menu, F9 screenshot) — two independent handlers racing on the same keypress is
        // what caused fullscreen to flicker on/off. The UI is the single source of truth
        // for all of these, so RetroArch's copies are unbound ("nul").
        input_toggle_fullscreen: "nul",
        input_save_state: "nul",
        input_load_state: "nul",
        input_screenshot: "nul",
        input_menu_toggle: "nul",
        input_exit_emulator: "nul",
        input_pause_toggle: "nul",
      } as never,
      beforeLaunch: () => spec.onPhase?.("boot"),
    });

    const session = new LibretroSession(n);
    spec.onPhase?.("running");
    return session;
  },
};
