"use client";
import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import { SKINS_CONFIG, type SkinDef } from "@/lib/skins";

export interface SkinFrameRect {
  /** px, relative to the observed container */
  left: number;
  top: number;
  width: number;
  height: number;
  /** reference-canvas units (941×1672) → device px */
  scale: number;
}

/**
 * Fits the skin's 941×1672 reference canvas inside `containerRef` — contain-style, so
 * the whole device mockup is always visible and never stretched or cropped — and
 * derives the exact pixel box the live game canvas (`host`) needs so it lands inside
 * the skin's own drawn screen cut-out.
 *
 * Returns `hostStyle` to apply to the *existing* host div (never replace that element —
 * only its inline style — so the emulator's own canvas, appended into it imperatively,
 * is never unmounted by a skin change) and `frame`, the same box in reference-space,
 * for the skin image and its button zones to position themselves against.
 */
export function useSkinFrame(containerRef: RefObject<HTMLElement | null>, skin: SkinDef | undefined) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  if (!skin || size.w <= 0 || size.h <= 0) {
    const hostStyle: CSSProperties = { position: "absolute", inset: 0 };
    return { hostStyle, frame: null as SkinFrameRect | null };
  }

  const { width: refW, height: refH } = SKINS_CONFIG.coordinateSystem;
  const scale = Math.min(size.w / refW, size.h / refH);
  const frameW = refW * scale;
  const frameH = refH * scale;
  const frame: SkinFrameRect = {
    left: (size.w - frameW) / 2,
    top: (size.h - frameH) / 2,
    width: frameW,
    height: frameH,
    scale,
  };

  const s = SKINS_CONFIG.screen;
  const hostStyle: CSSProperties = {
    position: "absolute",
    left: frame.left + s.x * scale,
    top: frame.top + s.y * scale,
    width: s.width * scale,
    height: s.height * scale,
    borderRadius: s.radius * scale,
    overflow: "hidden",
  };

  return { hostStyle, frame };
}
