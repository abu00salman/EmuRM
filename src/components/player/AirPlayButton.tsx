"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AspectMode, EmulatorSession } from "@/lib/engine/types";
import { useT } from "@/lib/i18n";
import { ChromeButton } from "./Player";

/** Safari's own AirPlay API predates (and isn't) the standard Remote Playback API. */
interface WebKitVideo extends HTMLVideoElement {
  webkitShowPlaybackTargetPicker?: () => void;
}
interface PlaybackTargetEvent extends Event {
  availability: "available" | "not-available";
}

function outputSizeFor(mode: AspectMode, source: HTMLCanvasElement): [number, number] {
  if (mode === "4:3") return [1440, 1080];
  if (mode === "16:9" || mode === "stretch") return [1920, 1080];
  // native/integer: scale the game's own resolution up to roughly fill a 1080p frame,
  // rather than mirroring it at its tiny native pixel size.
  const scale = Math.max(1, Math.floor(1080 / Math.max(1, source.height)));
  return [source.width * scale, source.height * scale];
}

/** Draws the live game canvas into a fixed-size output frame, honoring the chosen
 *  scaling mode — independent of how the game is actually sized on this device's
 *  own screen, since the TV on the other end has its own, unrelated aspect ratio. */
function composeFrame(ctx: CanvasRenderingContext2D, source: HTMLCanvasElement, outW: number, outH: number, mode: AspectMode) {
  const sw = source.width;
  const sh = source.height;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, outW, outH);
  if (!sw || !sh) return;
  if (mode === "stretch") {
    ctx.drawImage(source, 0, 0, outW, outH);
    return;
  }
  const targetAspect = mode === "4:3" ? 4 / 3 : mode === "16:9" ? 16 / 9 : sw / sh;
  let drawW = outW;
  let drawH = outW / targetAspect;
  if (drawH > outH) {
    drawH = outH;
    drawW = outH * targetAspect;
  }
  ctx.drawImage(source, (outW - drawW) / 2, (outH - drawH) / 2, drawW, drawH);
}

export function AirPlayButton({
  host,
  session,
  scaling,
  visible,
}: {
  host: React.RefObject<HTMLDivElement | null>;
  session: React.RefObject<EmulatorSession | null>;
  scaling: AspectMode;
  visible: boolean;
}) {
  const t = useT();
  const video = useRef<HTMLVideoElement>(null);
  const offscreen = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  const [supported, setSupported] = useState(false);
  const [available, setAvailable] = useState(false);
  const [active, setActive] = useState(false);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
    setActive(false);
  }, []);

  useEffect(() => {
    const v = video.current as WebKitVideo | null;
    if (!v || typeof v.webkitShowPlaybackTargetPicker !== "function") return;
    setSupported(true);
    const onAvailability = (e: Event) => setAvailable((e as PlaybackTargetEvent).availability === "available");
    v.addEventListener("webkitplaybacktargetavailabilitychanged", onAvailability);
    const onEnded = () => stop();
    v.addEventListener("webkitcurrentplaybacktargetiswirelesschanged", onEnded);
    return () => {
      v.removeEventListener("webkitplaybacktargetavailabilitychanged", onAvailability);
      v.removeEventListener("webkitcurrentplaybacktargetiswirelesschanged", onEnded);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A scaling change mid-cast can't resize an already-captured stream cleanly; stop
  // instead of silently mirroring the old frame size.
  useEffect(() => stop, [scaling, stop]);

  const start = useCallback(() => {
    const v = video.current as WebKitVideo | null;
    const source = host.current?.querySelector("canvas");
    if (!v || !source) return;

    const off = offscreen.current ?? (offscreen.current = document.createElement("canvas"));
    const [outW, outH] = outputSizeFor(scaling, source);
    off.width = outW;
    off.height = outH;
    const ctx = off.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      composeFrame(ctx, source, outW, outH, scaling);
      raf.current = requestAnimationFrame(loop);
    };
    loop();

    const videoTrack = off.captureStream(30).getVideoTracks()[0];
    const audioTracks = session.current?.captureAudioStream?.()?.getAudioTracks() ?? [];
    const combined = new MediaStream(videoTrack ? [videoTrack, ...audioTracks] : audioTracks);
    stream.current = combined;
    v.srcObject = combined;
    v.muted = false;
    v.play().catch(() => undefined);
    setActive(true);
    v.webkitShowPlaybackTargetPicker?.();
  }, [host, session, scaling]);

  return (
    <>
      {/* Off-screen: AirPlay needs a real <video> element as its media source, but the
          picture it mirrors is the composited canvas above, not this element itself. */}
      <video ref={video} playsInline muted={false} className="pointer-events-none absolute h-px w-px opacity-0" aria-hidden />
      {supported && (
        <ChromeButton
          label={t(active ? "player.airplayActive" : "player.airplay")}
          icon="airplay"
          active={active}
          onClick={active ? stop : start}
          className={`transition-opacity duration-200 ${!visible ? "pointer-events-none opacity-0" : available || active ? "" : "opacity-40"}`}
        />
      )}
    </>
  );
}
