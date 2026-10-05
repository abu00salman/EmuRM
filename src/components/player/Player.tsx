"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useGame, useSetting, useStates } from "@/lib/db/hooks";
import { getConsole } from "@/lib/consoles/registry";
import type { PadButton } from "@/lib/consoles/types";
import { mergeBindings } from "@/lib/input/bindings";
import type { InputBindings } from "@/lib/engine/types";
import { CoreUnavailableError, MissingBiosError } from "@/lib/engine/types";
import { setCover, setSetting } from "@/lib/db/repo";
import { makeThumbnail } from "@/lib/library/worker-client";
import { DEFAULT_PLAYER, type PlayerSettings } from "@/stores/player-settings";
import { useUI } from "@/stores/ui";
import { useT } from "@/lib/i18n";
import { TouchPad } from "../TouchPad";
import { usePlayerSession } from "./usePlayerSession";
import { PauseMenu, type Panel } from "./PauseMenu";
import { Icon } from "./Icon";
import { AirPlayButton } from "./AirPlayButton";
import { DEFAULT_SKIN_ID, getSkinById, loadSavedSkin, saveSkinChoice } from "@/lib/skins";
import { useSkinFrame } from "./useSkinFrame";
import { SkinOverlay } from "./SkinOverlay";
import { SkinPicker } from "./SkinPicker";

/** Turned off for now at the requester's choice — the Controller Skin Manager (button,
 *  picker, screen-frame overlay) stays fully built and wired below, just unreachable,
 *  so it's a one-line flip to bring back rather than a re-implementation. */
const CONTROLLER_SKINS_ENABLED = false;

function useMedia(q: string) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}

export function Player() {
  const params = useSearchParams();
  const router = useRouter();
  const gameId = params.get("game");
  const resume = params.get("resume") === "auto";
  const game = useGame(gameId);
  const c = game ? getConsole(game.consoleId) : undefined;
  const toast = useUI((s) => s.toast);
  const t = useT();

  const savedSettings = useSetting<Partial<PlayerSettings>>("player", {});
  const settings = useMemo(() => ({ ...DEFAULT_PLAYER, ...savedSettings }), [savedSettings]);
  const savedBindings = useSetting<Partial<InputBindings> | undefined>("bindings", undefined);
  const bindings = useMemo(() => mergeBindings(savedBindings), [savedBindings]);

  const stage = useRef<HTMLDivElement>(null);
  const stageArea = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const fsBusy = useRef(false);
  const p = usePlayerSession({ game, resume, settings, bindings, host });
  const states = useStates(gameId);

  const [menu, setMenu] = useState(false);
  const [panel, setPanel] = useState<Panel>("main");
  const [chrome, setChrome] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [fps, setFps] = useState<number | null>(null);
  const [pendingRelaunch, setPendingRelaunch] = useState(false);
  const [skinId, setSkinId] = useState(DEFAULT_SKIN_ID);
  const [skinPickerOpen, setSkinPickerOpen] = useState(false);

  const coarse = useMedia("(pointer: coarse)");
  const portrait = useMedia("(orientation: portrait)");
  const showTouch = c && (settings.touchControls === "always" || (settings.touchControls === "auto" && coarse));

  // Each console remembers its own skin (emurm-skin:<consoleId> in localStorage) —
  // switching games reloads whichever one that console's player last chose.
  useEffect(() => {
    setSkinId(c ? loadSavedSkin(c.id) : DEFAULT_SKIN_ID);
  }, [c]);

  const activeSkin = c && skinId !== DEFAULT_SKIN_ID ? getSkinById(skinId) : undefined;
  // The pack only ships portrait art today; landscape falls back to the normal
  // floating/fixed touch pad regardless of the saved choice (see useSkinFrame.ts and
  // skins.json's own `orientation` field — a future landscape skin just needs that
  // field flipped and a second branch here, no other code changes).
  const skinApplies = CONTROLLER_SKINS_ENABLED && !!showTouch && portrait && activeSkin?.orientation === "portrait";
  const { windowStyle, hostStyle, frame } = useSkinFrame(stageArea, skinApplies ? activeSkin : undefined);

  const updateSettings = useCallback(
    async (patch: Partial<PlayerSettings>, needsRelaunch = false) => {
      await setSetting("player", { ...settings, ...patch });
      if (patch.volume !== undefined) p.session.current?.setVolume(patch.volume);
      if (needsRelaunch) setPendingRelaunch(true);
    },
    [settings, p.session],
  );

  const toggleTouchStyle = useCallback(async () => {
    const next = settings.touchStyle === "floating" ? "fixed" : "floating";
    await updateSettings({ touchStyle: next });
    toast({ message: t(next === "floating" ? "display.touchStyleFloating" : "display.touchStyleFixed") });
  }, [settings.touchStyle, updateSettings, toast, t]);

  // Apply relaunch-only changes once the new settings have landed
  useEffect(() => {
    if (!pendingRelaunch) return;
    setPendingRelaunch(false);
    void p.relaunch().then(() => menu && p.togglePause(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, bindings]);

  /* ---------- Body state: gamepad/keys belong to the game while it runs ---------- */
  useEffect(() => {
    document.body.dataset.playing = String(p.phase === "running" && !menu);
    return () => {
      delete document.body.dataset.playing;
    };
  }, [p.phase, menu]);

  /* ---------- Menu ---------- */
  const openMenu = useCallback(
    (to: Panel = "main") => {
      setPanel(to);
      setMenu(true);
      p.togglePause(true);
    },
    [p],
  );
  const closeMenu = useCallback(() => {
    setMenu(false);
    setPanel("main");
    p.togglePause(false);
    host.current?.querySelector("canvas")?.focus();
  }, [p]);

  const leave = useCallback(async () => {
    await p.exit();
    router.push(c ? `/console/${c.id}/` : "/library/");
  }, [p, router, c]);

  /* ---------- Actions ---------- */
  const quickSave = useCallback(async () => {
    try {
      const rec = await p.saveTo("1");
      if (rec) toast({ message: t("player.savedSlot1") });
    } catch (e) {
      toast({ message: e instanceof Error ? e.message : t("player.error.saveTimedOut"), tone: "error" });
    }
  }, [p, toast, t]);

  const quickLoad = useCallback(async () => {
    try {
      const ok = await p.loadFrom("1");
      toast({ message: t(ok ? "player.loadedSlot1" : "player.slot1Empty"), tone: ok ? "neutral" : "error" });
    } catch (e) {
      toast({ message: e instanceof Error ? e.message : t("player.error.loadTimedOut"), tone: "error" });
    }
  }, [p, toast, t]);

  const screenshot = useCallback(async () => {
    const s = p.session.current;
    if (!s || !game) return;
    const blob = await s.screenshot();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${game.title.replace(/[^\p{L}\p{N} _-]/gu, "")} ${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast({
      message: t("player.screenshotSaved"),
      action: { label: t("player.useAsCover"), run: async () => setCover(game.id, await makeThumbnail(blob, 480).catch(() => blob)) },
    });
  }, [p.session, game, toast, t]);

  const toggleFullscreen = useCallback(async () => {
    // Guards a double-fire (e.g. the F11 keydown handler and a near-simultaneous
    // double-click) from requesting/exiting fullscreen twice in a row, which is
    // what made it look like it was flickering on and off.
    if (fsBusy.current) return;
    fsBusy.current = true;
    setTimeout(() => (fsBusy.current = false), 400);
    const el = stage.current as (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> }) | null;
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> };
    const active = document.fullscreenElement ?? doc.webkitFullscreenElement;
    try {
      if (active) {
        await (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
      } else if (el?.requestFullscreen) {
        await el.requestFullscreen({ navigationUI: "hide" });
        const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        if (coarse && c?.form !== "handheld-v") await o.lock?.("landscape").catch(() => undefined);
      } else if (el?.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else {
        // iPhone Safari has no element fullscreen: hide all chrome instead
        setImmersive((v) => !v);
        if (!immersive) toast({ message: t("player.iphoneFullscreen") });
      }
    } catch {
      setImmersive((v) => !v);
    }
  }, [coarse, c, immersive, toast, t]);

  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  /* ---------- Hotkeys ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (p.phase !== "running" || e.repeat) return;
      const map: Record<string, () => void> = {
        Escape: () => (menu ? closeMenu() : openMenu()),
        F2: () => void quickSave(),
        F4: () => void quickLoad(),
        F6: () => p.toggleFf(),
        F9: () => void screenshot(),
        F11: () => void toggleFullscreen(),
      };
      const fn = map[e.code];
      if (!fn) return;
      // Defer to a dialog stacked ON TOP of the pause menu (e.g. the skin picker),
      // but not to the pause menu's own root — otherwise Escape could open the
      // menu but never close it, since the menu itself matches "[role=dialog]".
      if (e.code === "Escape" && document.querySelector("[role=dialog]:not([data-pause-menu-root])")) return;
      e.preventDefault();
      e.stopPropagation();
      fn();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [p, menu, openMenu, closeMenu, quickSave, quickLoad, screenshot, toggleFullscreen]);

  /* Controller: Home, or Select + Start together, opens the menu. B closes it. */
  useEffect(() => {
    let raf = 0;
    let was = false;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const pads = navigator.getGamepads?.() ?? [];
      let now = false;
      for (const gp of pads) {
        if (!gp) continue;
        if (gp.buttons[16]?.pressed || (gp.buttons[8]?.pressed && gp.buttons[9]?.pressed)) now = true;
      }
      if (now && !was && p.phase === "running") (menu ? closeMenu : openMenu)();
      was = now;
    };
    raf = requestAnimationFrame(loop);
    const onBack = (e: Event) => {
      if (!menu) return;
      e.preventDefault();
      if (panel !== "main") setPanel("main");
      else closeMenu();
    };
    window.addEventListener("rv:back", onBack);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("rv:back", onBack);
    };
  }, [p.phase, menu, panel, openMenu, closeMenu]);

  /* ---------- Auto-hiding chrome ---------- */
  useEffect(() => {
    if (menu || p.phase !== "running") return setChrome(true);
    let t = setTimeout(() => setChrome(false), 2600);
    const wake = () => {
      setChrome(true);
      clearTimeout(t);
      t = setTimeout(() => setChrome(false), 2600);
    };
    window.addEventListener("pointermove", wake);
    window.addEventListener("pointerdown", wake);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
    };
  }, [menu, p.phase]);

  /* ---------- FPS ---------- */
  useEffect(() => {
    if (!settings.showFps || p.phase !== "running") return setFps(null);
    let last = p.session.current?.frameCount() ?? null;
    let rafFrames = 0;
    let raf = 0;
    const count = () => {
      rafFrames++;
      raf = requestAnimationFrame(count);
    };
    raf = requestAnimationFrame(count);
    const iv = setInterval(() => {
      const now = p.session.current?.frameCount() ?? null;
      if (now !== null && last !== null) setFps(now - last);
      else setFps(rafFrames);
      last = now;
      rafFrames = 0;
    }, 1000);
    return () => {
      clearInterval(iv);
      cancelAnimationFrame(raf);
    };
  }, [settings.showFps, p.phase, p.session]);

  const press = useCallback((b: PadButton, down: boolean) => p.session.current?.press(b, down), [p.session]);

  /* ---------- Render ---------- */
  if (game === null || (!gameId && game === undefined)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-black p-6 text-center">
        <div>
          <p className="font-display text-4xl font-bold">{t("player.gameNotFound")}</p>
          <p className="mt-2 text-muted">{t("player.gameNotFoundHint")}</p>
          <Link href="/library/" className="mt-6 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black">{t("player.openLibrary")}</Link>
        </div>
      </div>
    );
  }

  const accent = c?.accent ?? "#8d919b";
  const hideChrome = immersive || (!chrome && !menu);

  return (
    <div ref={stage} className="fixed inset-0 flex flex-col bg-black" style={{ ["--accent" as string]: accent }}>
      <div ref={stageArea} className="relative min-h-0 flex-1 pt-[var(--safe-t)]">
        {/* This wrapper is always mounted, skin or not — only its style changes between
            full-bleed and the skin's small screen cut-out — so host (and the emulator's
            canvas appended into it) never gets reparented, which would unmount it. */}
        <div style={windowStyle}>
          <div ref={host} className={`filter-${settings.filter}`} style={hostStyle} onDoubleClick={() => void toggleFullscreen()} />
        </div>

        {skinApplies && activeSkin && frame && c && p.phase === "running" && !menu && (
          <SkinOverlay console={c} skin={activeSkin} frame={frame} onPress={press} />
        )}

        {showTouch && c && !portrait && p.phase === "running" && !menu && <TouchPad console={c} onPress={press} mode="overlay" style={settings.touchStyle} theme={settings.touchTheme} />}

        {/* Always-reachable menu button: unlike the top chrome, this never auto-hides —
            not even in "immersive" mode (the iPhone Safari fallback for real fullscreen),
            since that hides every OTHER way back to the menu. This has to stay visible
            precisely then, or there's no way out of fullscreen at all. The touch-style
            button next to it flips fixed/floating in one tap, right where it's needed,
            instead of only being reachable a few taps deep in Display settings.
            (The redesign patch gated this on `hideChrome` too, to stop it visually
            doubling up with the top chrome bar — but that hides the button for most of
            normal active play, which is exactly the regression this component's own
            comment above was written to prevent. Kept unconditional; z-40 already keeps
            it drawn above the chrome bar's z-30, so the two don't actually conflict.) */}
        {p.phase === "running" && !menu && (
          <div className="absolute left-1/2 top-[max(0.75rem,var(--safe-t))] z-40 flex -translate-x-1/2 items-center gap-2">
            <button
              onClick={() => openMenu()}
              aria-label={t("player.menuButton")}
              className="glass-strong flex items-center gap-1.5 rounded-full py-2 pe-4 ps-3 text-sm font-medium text-white/90 shadow-lg transition-transform active:scale-95"
            >
              <Icon name="menu" />
              {t("player.menuButton")}
            </button>
            {showTouch && (
              <button
                onClick={() => void toggleTouchStyle()}
                aria-label={t("display.touchStyle")}
                title={t(settings.touchStyle === "floating" ? "display.touchStyleFixed" : "display.touchStyleFloating")}
                className="glass-strong grid h-10 w-10 place-items-center rounded-full text-white/90 shadow-lg transition-transform active:scale-95"
              >
                <Icon name="stick" />
              </button>
            )}
          </div>
        )}

        {/* Mounted for the whole session (not just while chrome is visible) — an active
            AirPlay cast must survive the chrome auto-hiding after a few seconds idle,
            which would otherwise unmount this and cut the mirroring off mid-game.
            Parked at the bottom-end corner, well clear of the crowded top chrome row
            (menu/ff/save/load/camera/fullscreen buttons all fight for space there) and
            of the top-start/top-end fps and fast-forward badges.
            z-40, same as the always-reachable menu button, so the auto-hiding chrome's
            own z-30 overlay (painted after it in the DOM) can't steal its clicks. */}
        {p.phase === "running" && (
          <div className="absolute end-[max(0.75rem,var(--safe-r))] bottom-[max(0.75rem,var(--safe-b))] z-40">
            <AirPlayButton host={host} session={p.session} scaling={settings.airplayScaling} visible={!hideChrome && !menu} />
          </div>
        )}

        {/* Its own corner, opposite AirPlay, for the same reason: the top chrome row is
            already packed (menu/ff/save/load/camera/fullscreen), and this needs to stay
            reachable in one tap, not buried in Display settings. */}
        {CONTROLLER_SKINS_ENABLED && showTouch && p.phase === "running" && (
          <div
            className={`absolute start-[max(0.75rem,var(--safe-l))] bottom-[max(0.75rem,var(--safe-b))] z-40 transition-opacity duration-200 ${!hideChrome && !menu ? "" : "pointer-events-none opacity-0"}`}
          >
            <ChromeButton label={t("player.controllerSkin")} onClick={() => setSkinPickerOpen(true)} icon="gamepad" />
          </div>
        )}

        {/* Top chrome */}
        <AnimatePresence>
          {!hideChrome && p.phase === "running" && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-x-0 top-0 z-30 flex items-center gap-2 bg-gradient-to-b from-black/80 to-transparent px-[max(0.75rem,var(--safe-l))] pb-8 pt-[max(0.75rem,var(--safe-t))]"
            >
              <button onClick={() => void leave()} className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-white/85 hover:bg-white/10" aria-label={t("player.saveAndReturn")}>
                <Icon name="back" />
                <span className="hidden sm:inline">{t("player.library")}</span>
              </button>
              <p dir="auto" className="min-w-0 flex-1 truncate text-sm text-white/70">{game?.title}</p>
              <ChromeButton label={t(p.ff ? "player.normalSpeed" : "player.fastForwardKey")} active={p.ff} onClick={p.toggleFf} icon="ff" />
              <ChromeButton label={t("player.quickSave")} onClick={() => void quickSave()} icon="save" className="hidden sm:grid" />
              <ChromeButton label={t("player.quickLoad")} onClick={() => void quickLoad()} icon="load" className="hidden sm:grid" />
              <ChromeButton label={t("player.screenshotKey")} onClick={() => void screenshot()} icon="camera" className="hidden sm:grid" />
              <ChromeButton label={t(fullscreen ? "player.exitFullscreen" : "player.enterFullscreen")} onClick={() => void toggleFullscreen()} icon={fullscreen ? "shrink" : "expand"} />
              <ChromeButton label={t("player.menuKey")} onClick={() => openMenu()} icon="menu" />
            </motion.div>
          )}
        </AnimatePresence>

        {settings.showFps && fps !== null && (
          <div className="absolute start-[max(0.75rem,var(--safe-l))] top-[calc(var(--safe-t)+3.75rem)] z-30 rounded-md bg-black/70 px-2 py-1 font-mono text-xs tabular-nums text-white/80">
            {fps} fps
          </div>
        )}
        {p.ff && (
          <div className="absolute end-[max(0.75rem,var(--safe-r))] top-[calc(var(--safe-t)+3.75rem)] z-30 rounded-md px-2 py-1 text-xs font-semibold text-black" style={{ background: accent }}>
            {t("player.fastForward")}
          </div>
        )}

        {/* Loading / error */}
        <AnimatePresence>
          {p.phase !== "running" && p.phase !== "idle" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.5 } }}
              className="absolute inset-0 z-40 grid place-items-center bg-black px-6"
              style={{ background: `radial-gradient(60% 50% at 50% 45%, color-mix(in oklab, ${accent} 18%, black), black 75%)` }}
            >
              {p.phase === "error" ? (
                <ErrorView error={p.error} consoleShort={c?.short} onRetry={() => void p.boot()} onBack={() => void leave()} />
              ) : (
                <div className="flex flex-col items-center text-center">
                  <p dir="auto" className="font-display text-[clamp(2rem,6vw,4.5rem)] font-extrabold leading-[0.9]">{game?.title ?? ""}</p>
                  <p className="mt-3 text-sm text-muted">
                    {p.phase === "engine" && t("player.loadingEmulator")}
                    {p.phase === "core" && t("player.loadingCore", { system: c?.short ?? "" })}
                    {p.phase === "boot" && t(resume ? "player.pickingUp" : "player.starting")}
                  </p>
                  <div className="mt-6 h-px w-48 overflow-hidden bg-white/10">
                    <motion.div className="h-full w-1/3" style={{ background: accent }} animate={{ x: ["-100%", "300%"] }} transition={{ repeat: Infinity, duration: 1.3, ease: "easeInOut" }} />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <PauseMenu
          open={menu}
          panel={panel}
          setPanel={setPanel}
          game={game ?? null}
          console={c}
          settings={settings}
          states={states ?? []}
          busy={p.busy}
          onResume={closeMenu}
          onRestart={async () => {
            await p.restart();
            closeMenu();
          }}
          onSave={async (slot) => {
            try {
              const rec = await p.saveTo(slot);
              if (rec) toast({ message: slot === "auto" ? t("player.savedGeneric") : t("player.savedSlot", { slot }) });
            } catch (e) {
              toast({ message: e instanceof Error ? e.message : t("player.error.saveTimedOut"), tone: "error" });
            }
          }}
          onLoad={async (slot) => {
            try {
              if (await p.loadFrom(slot)) closeMenu();
            } catch (e) {
              toast({ message: e instanceof Error ? e.message : t("player.error.loadTimedOut"), tone: "error" });
            }
          }}
          onScreenshot={() => void screenshot()}
          onFullscreen={() => void toggleFullscreen()}
          onExit={() => void leave()}
          onSettings={updateSettings}
          onBindingsChanged={() => setPendingRelaunch(true)}
        />
      </div>

      {showTouch && c && portrait && !skinApplies && p.phase === "running" && !menu && (
        <TouchPad console={c} onPress={press} mode="below" style={settings.touchStyle} theme={settings.touchTheme} />
      )}

      {CONTROLLER_SKINS_ENABLED && (
        <SkinPicker
          open={skinPickerOpen}
          onClose={() => setSkinPickerOpen(false)}
          console={c}
          currentSkinId={skinId}
          onSelect={(id) => {
            setSkinId(id);
            if (c) saveSkinChoice(c.id, id);
            setSkinPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

export function ChromeButton({ label, icon, onClick, active, className = "" }: { label: string; icon: Parameters<typeof Icon>[0]["name"]; onClick: () => void; active?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`grid h-10 w-10 place-items-center rounded-full transition-colors ${active ? "bg-[color:var(--accent)] text-black" : "text-white/85 hover:bg-white/10"} ${className}`}
    >
      <Icon name={icon} />
    </button>
  );
}

function ErrorView({ error, consoleShort, onRetry, onBack }: { error: Error | null; consoleShort?: string; onRetry: () => void; onBack: () => void }) {
  const t = useT();
  const bios = error instanceof MissingBiosError;
  const core = error instanceof CoreUnavailableError;
  return (
    <div className="max-w-lg text-center">
      <p className="font-display text-4xl font-bold">
        {t(bios ? "player.error.biosTitle" : core ? "player.error.coreTitle" : "player.error.genericTitle", { system: consoleShort ?? "" })}
      </p>
      <p className="mt-3 text-muted">
        {bios
          ? t("player.error.biosBody", { files: (error as MissingBiosError).files.join(", ") })
          : error?.message ?? t("player.error.genericBody")}
      </p>
      {!bios && !core && <p className="mt-2 text-sm text-faint">{t("player.error.checkConnection")}</p>}
      <div className="mt-6 flex justify-center gap-2">
        <button data-nav onClick={onBack} className="rounded-full border border-white/20 px-5 py-2.5 text-sm hover:bg-white/10">{t("player.error.backToLibrary")}</button>
        {bios ? (
          <Link data-nav href="/settings/#bios" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black">{t("player.error.addSystemFiles")}</Link>
        ) : (
          !core && <button data-nav data-autofocus onClick={onRetry} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black">{t("player.error.tryAgain")}</button>
        )}
      </div>
    </div>
  );
}
