"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { requireConsole } from "@/lib/consoles/registry";
import { loadEngine, MissingBiosError, type EmulatorSession, type InputBindings, type LaunchPhase } from "@/lib/engine";
import { getT } from "@/lib/i18n";
import { getRom, getSram, getState, listBios, markPlayed, putSram, putState } from "@/lib/db/repo";
import type { GameRecord, SlotId } from "@/lib/db/schema";
import { makeThumbnail } from "@/lib/library/worker-client";
import type { PlayerSettings } from "@/stores/player-settings";

export type Phase = "idle" | LaunchPhase | "error";

interface Options {
  game: GameRecord | null | undefined;
  resume: boolean;
  settings: PlayerSettings;
  bindings: InputBindings;
  host: React.RefObject<HTMLDivElement | null>;
}

/**
 * Owns one emulator session's lifecycle: boot, relaunch with carried state,
 * autosave, battery-save sync, play-time accounting and teardown.
 */
export function usePlayerSession({ game, resume, settings, bindings, host }: Options) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [paused, setPaused] = useState(false);
  const [ff, setFf] = useState(false);
  const session = useRef<EmulatorSession | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const abort = useRef<AbortController | null>(null);
  const saving = useRef(false);
  const tick = useRef<number>(0);
  const live = useRef({ settings, bindings, game });
  live.current = { settings, bindings, game };

  const teardown = useCallback(async () => {
    abort.current?.abort();
    const s = session.current;
    session.current = null;
    await s?.destroy();
    canvas.current?.remove();
    canvas.current = null;
  }, []);

  const boot = useCallback(
    async (carry?: Blob) => {
      const g = live.current.game;
      const el = host.current;
      if (!g || !el) return;
      await teardown();
      const ctrl = new AbortController();
      abort.current = ctrl;
      setError(null);
      setPhase("engine");
      try {
        const c = requireConsole(g.consoleId);
        const core = c.cores.find((x) => x.id === g.coreId) ?? c.cores[0];
        const [rom, bios, sram, state] = await Promise.all([
          getRom(g.id),
          listBios(c.id),
          getSram(g.id),
          carry ? Promise.resolve(carry) : resume ? getState(g.id, "auto").then((s) => s?.state) : Promise.resolve(undefined),
        ]);
        if (!rom) throw new Error("This game's file is missing from this device. Add it again from the library.");
        const have = new Set(bios.map((b) => b.fileName));
        const missing = c.bios.filter((b) => b.required && !have.has(b.fileName)).map((b) => b.fileName);
        if (missing.length) throw new MissingBiosError(missing);

        const engine = await loadEngine(core.engine);
        if (ctrl.signal.aborted) return;

        const cv = document.createElement("canvas");
        cv.id = `rv-canvas-${Date.now()}`;
        cv.className = "absolute inset-0 h-full w-full";
        cv.tabIndex = -1;
        el.appendChild(cv);
        canvas.current = cv;
        const rect = el.getBoundingClientRect();
        const { settings: st, bindings: bd } = live.current;

        const s = await engine.launch({
          canvas: cv,
          console: c,
          core,
          files: rom.files,
          bios: bios.map((b) => ({ name: b.fileName, blob: b.blob })),
          state,
          sram,
          input: bd,
          volume: st.volume,
          aspect: st.aspect,
          stageAspect: rect.width / Math.max(1, rect.height),
          smoothing: st.smoothing,
          signal: ctrl.signal,
          onPhase: (p) => !ctrl.signal.aborted && setPhase(p),
        });
        if (ctrl.signal.aborted) {
          await s.destroy();
          return;
        }
        session.current = s;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        s.resize(Math.round(rect.width * dpr), Math.round(rect.height * dpr));
        s.setVolume(st.volume);
        setPaused(false);
        setFf(false);
        tick.current = performance.now();
        setPhase("running");
      } catch (e) {
        if (ctrl.signal.aborted) return;
        console.error(e);
        setError(e instanceof Error ? e : new Error(String(e)));
        setPhase("error");
      }
    },
    [host, resume, teardown],
  );

  /** Play time is counted only while the game is visibly running. */
  const flushTime = useCallback(async () => {
    const g = live.current.game;
    if (!g || !tick.current) return;
    const now = performance.now();
    const running = session.current && !session.current.isPaused() && document.visibilityState === "visible";
    const secs = running ? (now - tick.current) / 1000 : 0;
    tick.current = now;
    if (secs > 0.5) await markPlayed(g.id, Math.min(secs, 120));
  }, []);

  const saveTo = useCallback(async (slot: SlotId) => {
    const s = session.current;
    const g = live.current.game;
    if (!s || !g || saving.current) return null;
    saving.current = true;
    try {
      const { state, thumbnail } = await s.saveState();
      const thumb = thumbnail ? await makeThumbnail(thumbnail, 480).catch(() => thumbnail) : undefined;
      const rec = await putState(g.id, slot, state, thumb);
      const sram = await s.saveSram();
      if (sram) await putSram(g.id, sram);
      return rec;
    } finally {
      saving.current = false;
    }
  }, []);

  const loadFrom = useCallback(async (slot: SlotId) => {
    const s = session.current;
    const g = live.current.game;
    if (!s || !g) return false;
    const rec = await getState(g.id, slot);
    if (!rec) return false;
    await s.loadState(rec.state);
    return true;
  }, []);

  const autosave = useCallback(async () => {
    if (!live.current.settings.autosave) {
      const s = session.current;
      const g = live.current.game;
      const sram = await s?.saveSram();
      if (sram && g) await putSram(g.id, sram);
      return;
    }
    await saveTo("auto").catch((e) => console.warn("[EmuRM] autosave failed", e));
  }, [saveTo]);

  /** Re-create the session (new aspect, bindings…) without losing the moment. */
  const relaunch = useCallback(async () => {
    const s = session.current;
    let carry: Blob | undefined;
    if (s) carry = (await s.saveState().catch(() => null))?.state;
    await boot(carry);
  }, [boot]);

  const exit = useCallback(async () => {
    await flushTime();
    if (session.current) await autosave();
    await teardown();
    setPhase("idle");
  }, [autosave, flushTime, teardown]);

  const togglePause = useCallback((force?: boolean) => {
    const s = session.current;
    if (!s) return;
    const next = force ?? !s.isPaused();
    if (next) {
      void flushTime();
      s.pause();
    } else {
      s.resume();
      tick.current = performance.now();
    }
    setPaused(next);
  }, [flushTime]);

  const toggleFf = useCallback(() => {
    const s = session.current;
    if (!s) return;
    s.setFastForward(!s.isFastForward());
    setFf(s.isFastForward());
  }, []);

  // Boot when the game record arrives
  const gameId = game?.id;
  useEffect(() => {
    if (!gameId) return;
    void boot();
    return () => {
      void teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // Periodic autosave + play time
  useEffect(() => {
    if (phase !== "running") return;
    const every = Math.max(20, settings.autosaveEvery) * 1000;
    const a = setInterval(() => {
      if (session.current && !session.current.isPaused() && document.visibilityState === "visible") void autosave();
    }, every);
    const t = setInterval(() => void flushTime(), 15000);
    return () => {
      clearInterval(a);
      clearInterval(t);
    };
  }, [phase, settings.autosaveEvery, autosave, flushTime]);

  // Save when the app goes to the background — the last reliable moment on mobile
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && session.current) {
        void flushTime();
        void autosave();
        session.current.pause();
        setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [autosave, flushTime]);

  // Keep the canvas matched to the stage (and to devicePixelRatio)
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      session.current?.resize(Math.round(entry.contentRect.width * dpr), Math.round(entry.contentRect.height * dpr));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [host]);

  // A stuck loading screen (hung engine/core fetch, a boot() that never settles) or a
  // core that's technically "running" but never actually produces a frame (crashed
  // mid-init, a corrupted asset) would otherwise leave the full-screen player overlay
  // up forever with no way out. Neither failure is hypothetical — this is what catches
  // them and turns them into the normal error screen (which already has working
  // "back to library" and "try again" actions), instead of a dead screen.
  const fail = useCallback(
    (messageKey: "player.error.timeout" | "player.error.stalled") => {
      setError(new Error(getT()(messageKey)));
      setPhase("error");
      void teardown();
    },
    [teardown],
  );
  useEffect(() => {
    if (phase === "engine" || phase === "core" || phase === "boot") {
      const timer = setTimeout(() => fail("player.error.timeout"), 30_000);
      return () => clearTimeout(timer);
    }
    if (phase === "running" && !paused) {
      let lastFrame = session.current?.frameCount() ?? null;
      let lastProgress = performance.now();
      const iv = setInterval(() => {
        const now = session.current?.frameCount() ?? null;
        if (now === null) return; // this engine can't report a frame count — nothing to watch
        if (now !== lastFrame) {
          lastFrame = now;
          lastProgress = performance.now();
          return;
        }
        if (performance.now() - lastProgress > 8_000) {
          fail("player.error.stalled");
        }
      }, 1000);
      return () => clearInterval(iv);
    }
  }, [phase, paused, fail]);

  return { phase, error, paused, ff, session, boot, relaunch, exit, saveTo, loadFrom, togglePause, toggleFf };
}
