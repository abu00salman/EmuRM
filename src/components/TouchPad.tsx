"use client";
import { useRef, useState } from "react";
import type { ConsoleDef, PadButton } from "@/lib/consoles/types";
import type { TouchStyle, TouchTheme } from "@/stores/player-settings";
import { useT } from "@/lib/i18n";

type Press = (b: PadButton, down: boolean) => void;

/** Visual skins for the on-screen buttons. Each overrides the resting bg/border/text of
 *  every button and, optionally, the pressed-state accent color — the console's own
 *  accent (c.accent) stays the default so the pad still matches its game's branding. */
export const TOUCH_THEMES: Record<TouchTheme, { bg: string; border: string; text: string; accent?: string }> = {
  default: { bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.15)", text: "rgba(255,255,255,0.9)" },
  neon: { bg: "rgba(12,10,24,0.55)", border: "color-mix(in oklab, var(--accent) 55%, transparent)", text: "#ffffff" },
  mono: { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.24)", text: "rgba(255,255,255,0.82)", accent: "#e6e6e6" },
  retro: { bg: "rgba(46,26,10,0.6)", border: "rgba(255,183,77,0.4)", text: "#ffd699", accent: "#ff8a3d" },
};

const buzz = () => {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* unsupported */
  }
};

/** 8-way sector, shared by both the fixed and floating pads so they feel identical. */
const SECTOR_MAP: Record<string, PadButton[]> = {
  "0": ["right"], "1": ["right", "down"], "2": ["down"], "3": ["left", "down"],
  "4": ["left"], "-4": ["left"], "-3": ["left", "up"], "-2": ["up"], "-1": ["right", "up"],
};
function sectorButtons(dx: number, dy: number): PadButton[] {
  const angle = Math.atan2(dy, dx); // 45° sectors
  const sector = Math.round(angle / (Math.PI / 4));
  return SECTOR_MAP[String(sector)] ?? [];
}

/** A multi-touch pad: slide across the D-pad for diagonals, face buttons press on contact. */
export function TouchPad({ console: c, onPress, mode, style = "fixed", theme = "default" }: { console: ConsoleDef; onPress: Press; mode: "below" | "overlay"; style?: TouchStyle; theme?: TouchTheme }) {
  const shoulders = c.shoulderButtons;
  const overlay = mode === "overlay";
  const floating = style === "floating";
  const skin = TOUCH_THEMES[theme];
  const t = useT();
  const startLabel = t(c.id === "pce" ? "pad.run" : "pad.start");
  return (
    <div
      className={
        overlay
          ? "pointer-events-none absolute inset-0 z-20 flex select-none items-end justify-between px-[max(1.5rem,var(--safe-l))] pb-[max(1.25rem,var(--safe-b))]"
          : "relative flex shrink-0 select-none flex-col gap-4 px-5 pb-[max(1.5rem,var(--safe-b))] pt-4"
      }
      dir="ltr"
      style={{
        ["--accent" as string]: skin.accent ?? c.accent,
        ["--pad-bg" as string]: skin.bg,
        ["--pad-border" as string]: skin.border,
        ["--pad-text" as string]: skin.text,
        touchAction: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
      }}
    >
      {/* Floating mode (overlay/landscape only): a big invisible zone behind everything else,
          so the thumb can come down anywhere on the left side, like PUBG/COD Mobile's stick,
          instead of having to find a fixed 10rem box. Rendered first so the shoulder buttons,
          pills and face buttons (painted after) stay clickable on top of it. */}
      {overlay && floating && (
        <FloatingDPad onPress={onPress} zoneClassName="pointer-events-auto absolute inset-y-0 start-0 w-[52%] max-w-[26rem]" />
      )}

      {!overlay && shoulders.length > 0 && (
        <div className="flex justify-between">
          <div className="flex gap-2">{shoulders.filter((s) => s.pad === "l" || s.pad === "l2").map((s) => <Shoulder key={s.pad} b={s} onPress={onPress} />)}</div>
          <div className="flex gap-2">{shoulders.filter((s) => s.pad === "r" || s.pad === "r2").map((s) => <Shoulder key={s.pad} b={s} onPress={onPress} />)}</div>
        </div>
      )}
      <div className={overlay ? "pointer-events-auto flex flex-col items-start gap-3" : "flex items-center justify-between"}>
        {overlay && <div className="flex gap-2">{shoulders.filter((s) => s.pad === "l" || s.pad === "l2").map((s) => <Shoulder key={s.pad} b={s} onPress={onPress} />)}</div>}
        {overlay && floating ? (
          // The big zone above already handles input; this just keeps the shoulder/face
          // buttons at their usual spacing so the rest of the layout doesn't shift.
          <div aria-hidden className="h-40 w-40" />
        ) : floating ? (
          <FloatingDPad onPress={onPress} zoneClassName="relative h-44 w-44" />
        ) : (
          <DPad onPress={onPress} translucent={overlay} />
        )}
        {!overlay && <Face c={c} onPress={onPress} />}
      </div>
      <div className={overlay ? "pointer-events-auto mb-2 flex gap-3" : "flex justify-center gap-4"}>
        {c.hasSelect && <Pill label={t("pad.select")} pad="select" onPress={onPress} />}
        <Pill label={startLabel} pad="start" onPress={onPress} />
      </div>
      {overlay && (
        <div className="pointer-events-auto flex flex-col items-end gap-3">
          <div className="flex gap-2">{shoulders.filter((s) => s.pad === "r" || s.pad === "r2").map((s) => <Shoulder key={s.pad} b={s} onPress={onPress} />)}</div>
          <Face c={c} onPress={onPress} />
        </div>
      )}
    </div>
  );
}

/**
 * Drives the button's pressed visual from the same pointer handlers that send the actual
 * input, instead of the browser's own `:active` state — which on touch can lag a frame or
 * two behind the real press, or not show at all for a quick tap. That mismatch between
 * "what my thumb feels" and "what lit up" is what reads as an unresponsive button.
 */
function useHold(pad: PadButton, onPress: Press) {
  const [pressed, setPressed] = useState(false);
  const release = () => {
    setPressed(false);
    onPress(pad, false);
  };
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setPressed(true);
      buzz();
      onPress(pad, true);
    },
    onPointerUp: release,
    onPointerCancel: release,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    style: { touchAction: "none" as const },
  };
  return [pressed, handlers] as const;
}

/**
 * The face buttons share one multi-touch tracker instead of each capturing its own
 * pointer. A single captured pointer only ever gets events for the element it went
 * down on, so a thumb sliding straight from B to A — the run-then-jump move in Mario,
 * exactly what's slow otherwise — would never fire A at all; the finger would have to
 * lift and land again. Hit-testing on every move (per pointer, so two fingers still
 * work independently) re-presses whichever button is actually underneath it.
 */
function useButtonCluster(onPress: Press) {
  const elements = useRef(new Map<PadButton, HTMLElement>());
  const pointers = useRef(new Map<number, PadButton | null>());
  const [pressed, setPressed] = useState<ReadonlySet<PadButton>>(new Set());

  const hitTest = (x: number, y: number): PadButton | null => {
    for (const [pad, el] of elements.current) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return pad;
    }
    return null;
  };
  const setPad = (pad: PadButton, down: boolean) => {
    onPress(pad, down);
    setPressed((prev) => {
      const next = new Set(prev);
      if (down) next.add(pad);
      else next.delete(pad);
      return next;
    });
  };
  const endPointer = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (prev) setPad(prev, false);
    pointers.current.delete(e.pointerId);
  };

  const containerProps = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const pad = hitTest(e.clientX, e.clientY);
      pointers.current.set(e.pointerId, pad);
      if (pad) {
        buzz();
        setPad(pad, true);
      }
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      const prev = pointers.current.get(e.pointerId) ?? null;
      const pad = hitTest(e.clientX, e.clientY);
      if (pad === prev) return;
      if (prev) setPad(prev, false);
      if (pad) {
        buzz();
        setPad(pad, true);
      }
      pointers.current.set(e.pointerId, pad);
    },
    onPointerUp: endPointer,
    onPointerCancel: endPointer,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    style: { touchAction: "none" as const },
  };
  const registerRef = (pad: PadButton) => (el: HTMLElement | null) => {
    if (el) elements.current.set(pad, el);
    else elements.current.delete(pad);
  };

  return { pressed, containerProps, registerRef };
}

function Face({ c, onPress }: { c: ConsoleDef; onPress: Press }) {
  const bs = c.faceButtons;
  const { pressed, containerProps, registerRef } = useButtonCluster(onPress);
  // Up to 4 buttons in a diamond; 2–3 in a slanted row like the originals.
  if (bs.length === 4) {
    const pos = ["left-0 top-1/2 -translate-y-1/2", "left-1/2 top-0 -translate-x-1/2", "left-1/2 bottom-0 -translate-x-1/2", "right-0 top-1/2 -translate-y-1/2"];
    return (
      <div className="relative h-40 w-40" {...containerProps}>
        {bs.map((b, i) => (
          <FaceButton key={b.pad} refCb={registerRef(b.pad)} label={b.label} pressed={pressed.has(b.pad)} className={`absolute ${pos[i]}`} />
        ))}
      </div>
    );
  }
  // The staggered tilt reads as intentional for 2–3 buttons; a lone button (e.g. the
  // Atari 2600's single fire button) would just look crooked, so it stays upright.
  return (
    <div className={`flex items-end gap-3 ${bs.length > 1 ? "-rotate-[18deg]" : ""}`} {...containerProps}>
      {bs.map((b, i) => (
        <FaceButton key={b.pad} refCb={registerRef(b.pad)} label={b.label} pressed={pressed.has(b.pad)} className={i % 2 ? "-translate-y-5" : ""} />
      ))}
    </div>
  );
}

function FaceButton({ label, pressed, refCb, className = "" }: { label: string; pressed: boolean; refCb: (el: HTMLElement | null) => void; className?: string }) {
  return (
    <button
      ref={refCb}
      aria-label={label}
      aria-pressed={pressed}
      tabIndex={-1}
      className={`grid h-[3.6rem] w-[3.6rem] place-items-center rounded-full border font-display text-xl font-bold backdrop-blur transition-[transform,background-color,color,box-shadow,border-color] duration-100 ease-out ${
        pressed
          ? "scale-[0.86] border-transparent bg-[color:var(--accent)] text-black shadow-[0_0_0_7px_color-mix(in_oklab,var(--accent)_35%,transparent)]"
          : "scale-100 border-[color:var(--pad-border)] bg-[color:var(--pad-bg)] text-[color:var(--pad-text)]"
      } ${className}`}
    >
      {label}
    </button>
  );
}

function Pill({ label, pad, onPress }: { label: string; pad: PadButton; onPress: Press }) {
  const [pressed, hold] = useHold(pad, onPress);
  return (
    <button
      {...hold}
      className={`rounded-full border px-4 py-1.5 text-xs transition-[transform,background-color,color] duration-100 ease-out ${
        pressed ? "scale-[0.92] border-transparent bg-white text-black" : "scale-100 border-[color:var(--pad-border)] bg-[color:var(--pad-bg)] text-[color:var(--pad-text)]"
      }`}
    >
      {label}
    </button>
  );
}

function Shoulder({ b, onPress }: { b: { pad: PadButton; label: string }; onPress: Press }) {
  const [pressed, hold] = useHold(b.pad, onPress);
  return (
    <button
      {...hold}
      className={`min-w-16 rounded-xl border px-4 py-2 text-sm font-semibold transition-[transform,background-color,color] duration-100 ease-out ${
        pressed ? "scale-[0.94] border-transparent bg-white text-black" : "scale-100 border-[color:var(--pad-border)] bg-[color:var(--pad-bg)] text-[color:var(--pad-text)]"
      }`}
    >
      {b.label}
    </button>
  );
}

/** Fixed D-pad: thumb has to find this exact spot every time. */
function DPad({ onPress, translucent }: { onPress: Press; translucent: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const held = useRef(new Set<PadButton>());
  const t = useT();

  const update = (x: number, y: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const dx = (x - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (y - (r.top + r.height / 2)) / (r.height / 2);
    const next = new Set<PadButton>(Math.hypot(dx, dy) > 0.28 ? sectorButtons(dx, dy) : []);
    for (const b of held.current) if (!next.has(b)) onPress(b, false);
    for (const b of next) if (!held.current.has(b)) {
      buzz();
      onPress(b, true);
    }
    held.current = next;
  };
  const release = () => {
    for (const b of held.current) onPress(b, false);
    held.current = new Set();
  };

  return (
    <div
      ref={ref}
      role="group"
      aria-label={t("touch.dpadAria")}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => e.buttons && update(e.clientX, e.clientY)}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative h-40 w-40 rounded-full ${translucent ? "bg-white/[0.04]" : ""}`}
    >
      <div className="absolute left-1/2 top-1/2 h-[3.4rem] w-[9.4rem] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[color:var(--pad-border)] bg-[color:var(--pad-bg)] backdrop-blur" />
      <div className="absolute left-1/2 top-1/2 h-[9.4rem] w-[3.4rem] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[color:var(--pad-border)] bg-[color:var(--pad-bg)] backdrop-blur" />
      <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/40" />
    </div>
  );
}

/**
 * Floating stick: appears wherever the thumb first lands inside `zoneClassName`, like the
 * virtual sticks in most modern mobile games. The zone can be much bigger than the visible
 * base — only the knob is clamped to `RADIUS` so it never travels off the base graphic.
 */
function FloatingDPad({ onPress, zoneClassName }: { onPress: Press; zoneClassName: string }) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const held = useRef(new Set<PadButton>());
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const t = useT();

  const RADIUS = 46;
  const DEAD = 14;

  const move = (x: number, y: number, o: { x: number; y: number }) => {
    const r = zoneRef.current?.getBoundingClientRect();
    if (!r) return;
    const dx = x - r.left - o.x;
    const dy = y - r.top - o.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, RADIUS);
    const angle = Math.atan2(dy, dx);
    setKnob(dist > 0.001 ? { x: Math.cos(angle) * clamped, y: Math.sin(angle) * clamped } : { x: 0, y: 0 });
    const next = new Set<PadButton>(dist > DEAD ? sectorButtons(dx, dy) : []);
    for (const b of held.current) if (!next.has(b)) onPress(b, false);
    for (const b of next) if (!held.current.has(b)) {
      buzz();
      onPress(b, true);
    }
    held.current = next;
  };
  const release = () => {
    for (const b of held.current) onPress(b, false);
    held.current = new Set();
    setOrigin(null);
    setKnob({ x: 0, y: 0 });
  };

  return (
    <div
      ref={zoneRef}
      role="group"
      aria-label={t("touch.dpadAria")}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const r = zoneRef.current?.getBoundingClientRect();
        if (!r) return;
        buzz();
        setOrigin({ x: e.clientX - r.left, y: e.clientY - r.top });
        setKnob({ x: 0, y: 0 });
      }}
      onPointerMove={(e) => {
        if (!e.buttons || !origin) return;
        move(e.clientX, e.clientY, origin);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
      className={zoneClassName}
    >
      {origin && (
        <div
          aria-hidden
          className="pointer-events-none absolute h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[color:var(--pad-border)] bg-[color:var(--pad-bg)] backdrop-blur"
          style={{ left: origin.x, top: origin.y }}
        >
          <div
            className="absolute left-1/2 top-1/2 h-11 w-11 rounded-full border border-[color:var(--accent)] bg-[color:var(--accent)]/40"
            style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
          />
        </div>
      )}
    </div>
  );
}
