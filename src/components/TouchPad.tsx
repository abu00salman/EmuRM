"use client";
import { useRef } from "react";
import type { ConsoleDef, PadButton } from "@/lib/consoles/types";
import { useT } from "@/lib/i18n";

type Press = (b: PadButton, down: boolean) => void;

const buzz = () => {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* unsupported */
  }
};

/** A multi-touch pad: slide across the D-pad for diagonals, face buttons press on contact. */
export function TouchPad({ console: c, onPress, mode }: { console: ConsoleDef; onPress: Press; mode: "below" | "overlay" }) {
  const shoulders = c.shoulderButtons;
  const overlay = mode === "overlay";
  const t = useT();
  const startLabel = t(c.id === "ngp" ? "pad.option" : c.id === "pce" ? "pad.run" : "pad.start");
  return (
    <div
      className={
        overlay
          ? "pointer-events-none absolute inset-0 z-20 flex items-end justify-between px-[max(1.5rem,var(--safe-l))] pb-[max(1.25rem,var(--safe-b))]"
          : "relative flex shrink-0 select-none flex-col gap-4 px-5 pb-[max(1.5rem,var(--safe-b))] pt-4"
      }
      dir="ltr"
      style={{ ["--accent" as string]: c.accent, touchAction: "none" }}
    >
      {!overlay && shoulders.length > 0 && (
        <div className="flex justify-between">
          <div className="flex gap-2">{shoulders.filter((s) => s.pad === "l" || s.pad === "l2").map((s) => <Shoulder key={s.pad} b={s} onPress={onPress} />)}</div>
          <div className="flex gap-2">{shoulders.filter((s) => s.pad === "r" || s.pad === "r2").map((s) => <Shoulder key={s.pad} b={s} onPress={onPress} />)}</div>
        </div>
      )}
      <div className={overlay ? "pointer-events-auto flex flex-col items-start gap-3" : "flex items-center justify-between"}>
        {overlay && <div className="flex gap-2">{shoulders.filter((s) => s.pad === "l" || s.pad === "l2").map((s) => <Shoulder key={s.pad} b={s} onPress={onPress} />)}</div>}
        <DPad onPress={onPress} translucent={overlay} />
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

function useHold(pad: PadButton, onPress: Press) {
  return {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      buzz();
      onPress(pad, true);
    },
    onPointerUp: () => onPress(pad, false),
    onPointerCancel: () => onPress(pad, false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}

function Face({ c, onPress }: { c: ConsoleDef; onPress: Press }) {
  const bs = c.faceButtons;
  // Up to 4 buttons in a diamond; 2–3 in a slanted row like the originals.
  if (bs.length === 4) {
    const pos = ["left-0 top-1/2 -translate-y-1/2", "left-1/2 top-0 -translate-x-1/2", "left-1/2 bottom-0 -translate-x-1/2", "right-0 top-1/2 -translate-y-1/2"];
    return (
      <div className="relative h-40 w-40">
        {bs.map((b, i) => (
          <FaceButton key={b.pad} label={b.label} pad={b.pad} onPress={onPress} className={`absolute ${pos[i]}`} />
        ))}
      </div>
    );
  }
  return (
    <div className="flex -rotate-[18deg] items-end gap-3">
      {bs.map((b, i) => (
        <FaceButton key={b.pad} label={b.label} pad={b.pad} onPress={onPress} className={i % 2 ? "-translate-y-5" : ""} />
      ))}
    </div>
  );
}

function FaceButton({ label, pad, onPress, className = "" }: { label: string; pad: PadButton; onPress: Press; className?: string }) {
  return (
    <button
      aria-label={label}
      {...useHold(pad, onPress)}
      className={`grid h-[3.6rem] w-[3.6rem] place-items-center rounded-full border border-white/15 bg-white/[0.08] font-display text-xl font-bold text-white/90 backdrop-blur active:scale-95 active:bg-[color:var(--accent)] active:text-black ${className}`}
    >
      {label}
    </button>
  );
}

function Pill({ label, pad, onPress }: { label: string; pad: PadButton; onPress: Press }) {
  return (
    <button {...useHold(pad, onPress)} className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-xs text-white/80 active:bg-white active:text-black">
      {label}
    </button>
  );
}

function Shoulder({ b, onPress }: { b: { pad: PadButton; label: string }; onPress: Press }) {
  return (
    <button {...useHold(b.pad, onPress)} className="min-w-16 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/85 active:bg-white active:text-black">
      {b.label}
    </button>
  );
}

function DPad({ onPress, translucent }: { onPress: Press; translucent: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const held = useRef(new Set<PadButton>());
  const t = useT();

  const update = (x: number, y: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const dx = (x - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (y - (r.top + r.height / 2)) / (r.height / 2);
    const next = new Set<PadButton>();
    const dead = 0.28;
    if (Math.hypot(dx, dy) > dead) {
      const angle = Math.atan2(dy, dx); // 8-way with 45° sectors
      const sector = Math.round(angle / (Math.PI / 4));
      const map: Record<string, PadButton[]> = {
        "0": ["right"], "1": ["right", "down"], "2": ["down"], "3": ["left", "down"],
        "4": ["left"], "-4": ["left"], "-3": ["left", "up"], "-2": ["up"], "-1": ["right", "up"],
      };
      for (const b of map[String(sector)] ?? []) next.add(b);
    }
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
      <div className="absolute left-1/2 top-1/2 h-[3.4rem] w-[9.4rem] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/12 bg-white/[0.08] backdrop-blur" />
      <div className="absolute left-1/2 top-1/2 h-[9.4rem] w-[3.4rem] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/12 bg-white/[0.08] backdrop-blur" />
      <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/40" />
    </div>
  );
}
