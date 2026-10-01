"use client";
import { useRef, useState } from "react";
import { buzz, sectorButtons } from "../TouchPad";
import type { ConsoleDef, PadButton } from "@/lib/consoles/types";
import { isCircleZone, layoutFor, resolveZone, skinImageUrl, type SkinDef } from "@/lib/skins";
import type { SkinFrameRect } from "./useSkinFrame";

type Press = (b: PadButton, down: boolean) => void;

interface ResolvedZone {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
  round: boolean;
  pad: PadButton | "dpad";
}

function resolveZones(c: ConsoleDef, skin: SkinDef, frame: SkinFrameRect): ResolvedZone[] {
  const layout = layoutFor(skin);
  if (!layout) return [];
  const out: ResolvedZone[] = [];
  for (const [key, zone] of Object.entries(layout)) {
    const pad = resolveZone(key, c);
    if (pad === null) continue; // this console has no button for this zone — skip it entirely
    if (isCircleZone(zone)) {
      out.push({
        key,
        left: frame.left + zone.x * frame.scale,
        top: frame.top + zone.y * frame.scale,
        width: zone.size * frame.scale,
        height: zone.size * frame.scale,
        round: true,
        pad,
      });
    } else {
      out.push({
        key,
        left: frame.left + zone.x * frame.scale,
        top: frame.top + zone.y * frame.scale,
        width: zone.w * frame.scale,
        height: zone.h * frame.scale,
        round: false,
        pad,
      });
    }
  }
  return out;
}

/**
 * One pointer-tracking surface over the whole skin, instead of per-button capture:
 * a captured pointer in the DOM only ever sees events for the element it went down
 * on, so a thumb sliding from one button to an adjacent one (or off the d-pad) would
 * never register the new target. Hit-testing registered zones on every move — once
 * per active pointer — is what makes multi-touch (e.g. holding Right on the d-pad
 * while tapping A with another finger) work: each finger's held buttons are tracked
 * and diffed independently.
 */
export function SkinOverlay({ console: c, skin, frame, onPress }: { console: ConsoleDef; skin: SkinDef; frame: SkinFrameRect; onPress: Press }) {
  const zones = resolveZones(c, skin, frame);
  const elements = useRef(new Map<string, HTMLElement>());
  const held = useRef(new Map<number, Set<PadButton>>());
  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set());

  const hitTest = (x: number, y: number): ResolvedZone | null => {
    for (const z of zones) {
      const el = elements.current.get(z.key);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return z;
    }
    return null;
  };

  const buttonsFor = (z: ResolvedZone, x: number, y: number): PadButton[] => {
    if (z.pad !== "dpad") return [z.pad];
    const el = elements.current.get(z.key);
    if (!el) return [];
    const r = el.getBoundingClientRect();
    const dx = (x - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (y - (r.top + r.height / 2)) / (r.height / 2);
    return Math.hypot(dx, dy) > 0.28 ? sectorButtons(dx, dy) : [];
  };

  const DIRS = new Set<PadButton>(["up", "down", "left", "right"]);
  const syncVisual = () => {
    const live = new Set<string>();
    for (const set of held.current.values()) {
      for (const z of zones) {
        if (z.pad === "dpad") {
          if ([...set].some((b) => DIRS.has(b))) live.add(z.key);
        } else if (set.has(z.pad)) {
          live.add(z.key);
        }
      }
    }
    setPressed(live);
  };

  const applyPointer = (pointerId: number, x: number, y: number) => {
    const prev = held.current.get(pointerId) ?? new Set<PadButton>();
    const zone = hitTest(x, y);
    const next = new Set<PadButton>(zone ? buttonsFor(zone, x, y) : []);
    for (const b of prev) if (!next.has(b)) onPress(b, false);
    for (const b of next) if (!prev.has(b)) {
      buzz();
      onPress(b, true);
    }
    held.current.set(pointerId, next);
    syncVisual();
  };

  const release = (pointerId: number) => {
    const prev = held.current.get(pointerId);
    if (prev) for (const b of prev) onPress(b, false);
    held.current.delete(pointerId);
    syncVisual();
  };

  return (
    <div
      className="absolute inset-0 select-none"
      dir="ltr"
      // z-0, explicitly below the host canvas's z-1 (see useSkinFrame.ts) — this image's
      // own "screen" rectangle is painted black, not a real cut-out, so the live canvas
      // has to out-rank it in stacking or it would hide the game it's meant to frame.
      style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none", zIndex: 0 }}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        applyPointer(e.pointerId, e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!held.current.has(e.pointerId)) return;
        applyPointer(e.pointerId, e.clientX, e.clientY);
      }}
      onPointerUp={(e) => release(e.pointerId)}
      onPointerCancel={(e) => release(e.pointerId)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* The device mockup itself — bezel, printed button glyphs, grip texture — is a
          flat image; all of it is purely visual, input comes only from the transparent
          zones below. pointer-events none so it never steals a hit-test coordinate. */}
      <img
        src={skinImageUrl(skin)}
        alt=""
        draggable={false}
        className="pointer-events-none absolute"
        style={{ left: frame.left, top: frame.top, width: frame.width, height: frame.height }}
      />
      {zones.map((z) => (
        <div
          key={z.key}
          ref={(el) => {
            if (el) elements.current.set(z.key, el);
            else elements.current.delete(z.key);
          }}
          aria-hidden
          className="pointer-events-none absolute transition-[background-color,box-shadow] duration-100 ease-out"
          style={{
            left: z.left,
            top: z.top,
            width: z.width,
            height: z.height,
            borderRadius: z.round ? "50%" : Math.min(z.height, 16),
            background: pressed.has(z.key) ? "color-mix(in oklab, var(--accent) 38%, transparent)" : "transparent",
            boxShadow: pressed.has(z.key) ? "0 0 18px color-mix(in oklab, var(--accent) 55%, transparent)" : "none",
            transform: pressed.has(z.key) ? "scale(0.94)" : "scale(1)",
          }}
        />
      ))}
    </div>
  );
}
