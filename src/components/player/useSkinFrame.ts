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

const FULL_BLEED: CSSProperties = { position: "absolute", inset: 0 };

/**
 * Fits the skin's 941×1672 reference canvas inside `containerRef` — contain-style, so
 * the whole device mockup is always visible and never stretched or cropped — and
 * places the live game canvas inside the skin's own drawn screen cut-out.
 *
 * Shrinking the engine's own canvas element down to that small cut-out turns out to
 * break its internal video geometry (confirmed directly: the libretro/RetroArch web
 * build keeps rendering — frame count keeps advancing — but the image lands outside
 * the now-tiny buffer and never appears; reproduced with a plain resize, nothing to do
 * with skins specifically). So `host` is never actually resized for a skin: it keeps
 * being measured and resized at the player's full natural stage size — exactly the
 * size class that has always worked — and is instead visually scaled down with a CSS
 * transform into a separate, stably-mounted clipping window sized to the screen
 * cut-out. `windowStyle` goes on that always-present wrapper div (never conditionally
 * mounted, so it never forces host to remount either); `hostStyle` goes on the
 * existing host div itself, which an emulator session's canvas is appended into
 * imperatively and must never be unmounted by a skin change.
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
    return { windowStyle: FULL_BLEED, hostStyle: FULL_BLEED, frame: null as SkinFrameRect | null };
  }

  const { width: refW, height: refH } = SKINS_CONFIG.coordinateSystem;
  const deviceScale = Math.min(size.w / refW, size.h / refH);
  const frameW = refW * deviceScale;
  const frameH = refH * deviceScale;
  const frame: SkinFrameRect = {
    left: (size.w - frameW) / 2,
    top: (size.h - frameH) / 2,
    width: frameW,
    height: frameH,
    scale: deviceScale,
  };

  const s = SKINS_CONFIG.screen;
  const screenW = s.width * deviceScale;
  const screenH = s.height * deviceScale;

  const windowStyle: CSSProperties = {
    position: "absolute",
    left: frame.left + s.x * deviceScale,
    top: frame.top + s.y * deviceScale,
    width: screenW,
    height: screenH,
    borderRadius: s.radius * deviceScale,
    overflow: "hidden",
    zIndex: 1,
  };

  // Contain-fit the host's own *natural, full-stage* size (size.w×size.h — the exact
  // dimensions it would have with no skin at all) into the small screen window, purely
  // as a paint-time transform. Host's actual CSS width/height stay pinned to that full
  // size (not 100% of the now-small window), so resize()/ResizeObserver always see the
  // same kind of dimensions as the no-skin case.
  const fitScale = Math.min(screenW / size.w, screenH / size.h);
  const tx = (screenW - size.w * fitScale) / 2;
  const ty = (screenH - size.h * fitScale) / 2;

  const hostStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: size.w,
    height: size.h,
    transformOrigin: "0 0",
    transform: `translate(${tx}px, ${ty}px) scale(${fitScale})`,
  };

  return { windowStyle, hostStyle, frame };
}
