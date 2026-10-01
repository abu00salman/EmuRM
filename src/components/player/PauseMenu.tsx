"use client";
import { AnimatePresence, motion } from "motion/react";
import type { ConsoleDef } from "@/lib/consoles/types";
import type { GameRecord, SlotId, StateRecord } from "@/lib/db/schema";
import type { AspectMode } from "@/lib/engine/types";
import { formatRelative } from "@/lib/format";
import { useObjectUrl } from "@/lib/object-url";
import type { PlayerSettings, ScreenFilter, TouchTheme } from "@/stores/player-settings";
import { useT, useLocale } from "@/lib/i18n";
import { RemapEditor } from "../RemapEditor";
import { Icon } from "./Icon";
import { TOUCH_THEMES } from "../TouchPad";

export type Panel = "main" | "states" | "display" | "controls";

interface Props {
  open: boolean;
  panel: Panel;
  setPanel: (p: Panel) => void;
  game: GameRecord | null;
  console?: ConsoleDef;
  settings: PlayerSettings;
  states: StateRecord[];
  /** A save/load/restart already in flight — disables the matching controls instead
   *  of leaving them tappable, so a slow operation reads as "working" rather than
   *  "unresponsive, try tapping again" (which is what used to race two loads
   *  against each other and corrupt the session). */
  busy?: "saving" | "loading" | "restarting" | null;
  onResume: () => void;
  onRestart: () => void | Promise<void>;
  onSave: (slot: SlotId) => Promise<void>;
  onLoad: (slot: SlotId) => Promise<void>;
  onScreenshot: () => void;
  onFullscreen: () => void;
  onExit: () => void;
  onSettings: (patch: Partial<PlayerSettings>, relaunch?: boolean) => Promise<void>;
  onBindingsChanged: () => void;
}

export function PauseMenu(props: Props) {
  const { open, panel, setPanel, game, console: c } = props;
  const t = useT();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-50 flex items-stretch justify-end bg-black/55 backdrop-blur-[6px]"
          onPointerDown={(e) => e.target === e.currentTarget && props.onResume()}
        >
          <motion.aside
            role="dialog"
            data-pause-menu-root=""
            aria-label={t("pauseMenu.aria")}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="glass-strong flex h-full w-full max-w-md flex-col overflow-y-auto px-6 pb-[max(1.5rem,var(--safe-b))] pt-[max(1.5rem,var(--safe-t))] pe-[max(1.5rem,var(--safe-r))] sm:rounded-s-3xl"
          >
            <div className="flex items-start gap-3">
              {panel !== "main" && (
                <button data-nav onClick={() => setPanel("main")} aria-label={t("pauseMenu.back")} className="mt-1 rounded-full p-1.5 text-muted hover:bg-white/10 hover:text-white">
                  <Icon name="back" />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs" style={{ color: c?.accent }}>{c?.name}</p>
                <h2 dir="auto" className="mt-1 font-display text-3xl font-bold leading-none">
                  {panel === "main" ? game?.title : t(panel === "states" ? "pauseMenu.panel.states" : panel === "display" ? "pauseMenu.panel.display" : "pauseMenu.panel.controls")}
                </h2>
              </div>
              <button onClick={props.onResume} aria-label={t("pauseMenu.close")} className="rounded-full p-1.5 text-muted hover:bg-white/10 hover:text-white">
                <Icon name="close" />
              </button>
            </div>

            <div className="mt-6 flex-1">
              {panel === "main" && <Main {...props} />}
              {panel === "states" && <States {...props} />}
              {panel === "display" && <Display {...props} />}
              {panel === "controls" && (
                <>
                  <RemapEditor console={c} onChange={props.onBindingsChanged} />
                  <p className="mt-4 text-xs text-faint">{t("pauseMenu.controlsFooter")}</p>
                </>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Item({
  children,
  onClick,
  primary,
  autoFocus,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      data-nav
      data-autofocus={autoFocus || undefined}
      autoFocus={autoFocus}
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl px-4 py-3.5 text-left text-base transition-colors disabled:opacity-40 ${primary ? "bg-white font-semibold text-black" : "hover:bg-white/[0.07]"}`}
    >
      {children}
    </button>
  );
}

function Main(p: Props) {
  const t = useT();
  return (
    <div className="flex flex-col gap-1">
      <Item primary autoFocus onClick={p.onResume}>{t("pauseMenu.resume")}</Item>
      <Item onClick={() => p.setPanel("states")}>{t("pauseMenu.saveLoad")}</Item>
      <Item onClick={() => p.setPanel("display")}>{t("pauseMenu.displaySound")}</Item>
      <Item onClick={() => p.setPanel("controls")}>{t("pauseMenu.controls")}</Item>
      <Item onClick={p.onScreenshot}>{t("pauseMenu.takeScreenshot")}</Item>
      <Item onClick={p.onFullscreen}>{t("pauseMenu.fullScreen")}</Item>
      <Item onClick={p.onRestart} disabled={!!p.busy}>
        {p.busy === "restarting" ? t("pauseMenu.restarting") : t("pauseMenu.restartGame")}
      </Item>
      <div className="my-2 h-px bg-line" />
      <Item onClick={p.onExit}>{t("pauseMenu.saveExit")}</Item>
      <p className="mt-4 px-4 text-xs leading-relaxed text-faint">{t("pauseMenu.hotkeysFooter")}</p>
    </div>
  );
}

function States(p: Props) {
  const t = useT();
  const slots: SlotId[] = ["auto", "1", "2", "3", "4"];
  const by = new Map(p.states.map((s) => [s.slot, s]));
  const busy = !!p.busy;
  return (
    <div className="flex flex-col gap-3">
      {slots.map((slot) => (
        <Slot key={slot} slot={slot} rec={by.get(slot)} busy={busy} busyKind={p.busy} onSave={() => p.onSave(slot)} onLoad={() => p.onLoad(slot)} />
      ))}
      <p className="text-xs text-faint">{t("pauseMenu.autoSlotFooter", { seconds: p.settings.autosaveEvery })}</p>
    </div>
  );
}

function Slot({
  slot,
  rec,
  busy,
  busyKind,
  onSave,
  onLoad,
}: {
  slot: SlotId;
  rec?: StateRecord;
  busy: boolean;
  busyKind?: "saving" | "loading" | "restarting" | null;
  onSave: () => void;
  onLoad: () => void;
}) {
  const url = useObjectUrl(rec?.thumbnail);
  const t = useT();
  const locale = useLocale();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line p-2">
      <div className="grid aspect-[4/3] w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-black">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-contain [image-rendering:pixelated]" />
        ) : (
          <span className="text-xs text-faint">{t("pauseMenu.empty")}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{slot === "auto" ? t("pauseMenu.automatic") : t("pauseMenu.slot", { n: slot })}</p>
        <p className="text-xs text-muted">{rec ? formatRelative(rec.createdAt, locale) : t("pauseMenu.nothingSaved")}</p>
      </div>
      <div className="flex gap-1">
        {slot !== "auto" && (
          <button data-nav disabled={busy} onClick={onSave} className="rounded-full border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-40">
            {busyKind === "saving" ? t("pauseMenu.saving") : t("pauseMenu.save")}
          </button>
        )}
        <button data-nav disabled={!rec || busy} onClick={onLoad} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-30">
          {busyKind === "loading" ? t("pauseMenu.loading") : t("pauseMenu.load")}
        </button>
      </div>
    </div>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-2xl bg-white/[0.04] p-1">
      {options.map((o) => (
        <button
          key={o.v}
          data-nav
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-xl px-3 py-2 text-sm transition-colors ${value === o.v ? "bg-white text-black" : "text-muted hover:text-white"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Visual skin picker: a swatch preview of each theme's own colors (not just a text
 *  label), like the skin-picker grids in third-party emulator apps — pick with your
 *  eyes, not a settings label. */
function ThemeSwatches({ value, options, onChange, label }: { value: TouchTheme; options: { v: TouchTheme; label: string }[]; onChange: (v: TouchTheme) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {options.map((o) => {
        const skin = TOUCH_THEMES[o.v];
        const accent = skin.accent ?? "var(--accent)";
        return (
          <button
            key={o.v}
            data-nav
            role="radio"
            aria-checked={value === o.v}
            onClick={() => onChange(o.v)}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition-colors ${value === o.v ? "border-white bg-white/10" : "border-line hover:border-white/30"}`}
          >
            <span
              className="grid h-12 w-12 place-items-center rounded-full border-2"
              style={{ background: skin.bg, borderColor: skin.border, boxShadow: `0 0 0 3px color-mix(in oklab, ${accent} 35%, transparent)` }}
            >
              <span className="h-5 w-5 rounded-full" style={{ background: accent }} />
            </span>
            <span className="text-xs text-muted">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs text-faint">{hint}</span>}
      </span>
      <button
        data-nav
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-[color:var(--accent)]" : "bg-white/15"}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </label>
  );
}

function Display({ settings: s, onSettings }: Props) {
  const t = useT();
  const aspects: { v: AspectMode; label: string }[] = [
    { v: "native", label: t("display.original") }, { v: "integer", label: t("display.pixelPerfect") }, { v: "4:3", label: t("display.fourThree") }, { v: "16:9", label: t("display.sixteenNine") }, { v: "stretch", label: t("display.fill") },
  ];
  const filters: { v: ScreenFilter; label: string }[] = [
    { v: "off", label: t("display.filterOff") }, { v: "scanlines", label: t("display.scanlines") }, { v: "crt", label: t("display.crt") }, { v: "lcd", label: t("display.lcd") },
  ];
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-2 text-sm text-muted">{t("display.shape")}</h3>
        <Segmented label={t("display.aspectRatioAria")} value={s.aspect} options={aspects} onChange={(v) => void onSettings({ aspect: v }, true)} />
      </section>
      <section>
        <h3 className="mb-2 text-sm text-muted">{t("display.screenFilter")}</h3>
        <Segmented label={t("display.screenFilter")} value={s.filter} options={filters} onChange={(v) => void onSettings({ filter: v })} />
      </section>
      <section>
        <label className="flex items-center justify-between text-sm text-muted">
          <span>{t("display.volume")}</span>
          <span className="tabular-nums">{Math.round(s.volume * 100)}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={s.volume}
          onChange={(e) => void onSettings({ volume: Number(e.target.value) })}
          aria-label={t("display.volumeAria")}
          className="mt-2 w-full accent-[color:var(--accent)]"
        />
      </section>
      <section className="divide-y divide-line">
        <Toggle label={t("display.smoothPixels")} hint={t("display.smoothHint")} checked={s.smoothing} onChange={(v) => void onSettings({ smoothing: v }, true)} />
        <Toggle label={t("display.showFrameRate")} checked={s.showFps} onChange={(v) => void onSettings({ showFps: v })} />
        <Toggle label={t("display.saveAutomatically")} hint={t("display.autosaveHint")} checked={s.autosave} onChange={(v) => void onSettings({ autosave: v })} />
      </section>
      <section>
        <h3 className="mb-2 text-sm text-muted">{t("display.touchControls")}</h3>
        <Segmented
          label={t("display.touchControls")}
          value={s.touchControls}
          options={[{ v: "auto", label: t("display.touchOnScreens") }, { v: "always", label: t("display.touchAlways") }, { v: "never", label: t("display.touchNever") }]}
          onChange={(v) => void onSettings({ touchControls: v })}
        />
      </section>
      {s.touchControls !== "never" && (
        <section>
          <h3 className="mb-2 text-sm text-muted">{t("display.touchStyle")}</h3>
          <Segmented
            label={t("display.touchStyle")}
            value={s.touchStyle}
            options={[{ v: "floating", label: t("display.touchStyleFloating") }, { v: "fixed", label: t("display.touchStyleFixed") }]}
            onChange={(v) => void onSettings({ touchStyle: v })}
          />
        </section>
      )}
      {s.touchControls !== "never" && (
        <section>
          <h3 className="mb-2 text-sm text-muted">{t("display.touchTheme")}</h3>
          <ThemeSwatches
            label={t("display.touchTheme")}
            value={s.touchTheme}
            options={[
              { v: "default", label: t("display.themeDefault") },
              { v: "neon", label: t("display.themeNeon") },
              { v: "mono", label: t("display.themeMono") },
              { v: "retro", label: t("display.themeRetro") },
            ]}
            onChange={(v) => void onSettings({ touchTheme: v })}
          />
        </section>
      )}
      <section>
        <h3 className="mb-2 text-sm text-muted">{t("display.airplayScaling")}</h3>
        <Segmented label={t("display.airplayScaling")} value={s.airplayScaling} options={aspects} onChange={(v) => void onSettings({ airplayScaling: v })} />
        <p className="mt-2 text-xs text-faint">{t("display.airplayScalingHint")}</p>
      </section>
    </div>
  );
}
