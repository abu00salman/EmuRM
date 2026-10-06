"use client";
import { getConsole } from "@/lib/consoles/registry";
import { useObjectUrl } from "@/lib/object-url";
import type { GameRecord } from "@/lib/db/schema";
import { DeviceGlyph } from "./DeviceGlyph";
import { bundledCoverUrl } from "@/lib/library/bundled-covers";

/** Stable 0..1 from a string, so a generated cover never changes between visits. */
function seeded(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

export function GameCover({ game, className = "" }: { game: Pick<GameRecord, "id" | "title" | "consoleId" | "cover">; className?: string }) {
  const objectUrl = useObjectUrl(game.cover);
  const bundledUrl = bundledCoverUrl(game.consoleId, game.title, game.id);
  const url = objectUrl ?? bundledUrl;
  const c = getConsole(game.consoleId);
  const accent = c?.accent ?? "#8d919b";

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" draggable={false} className={`h-full w-full object-cover [image-rendering:pixelated] ${className}`} />
    );
  }

  // Generated placeholder: a cartridge/disc label lit in the console's accent.
  const r = seeded(game.id);
  const angle = Math.round(120 + r * 120);
  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(${angle}deg, color-mix(in oklab, ${accent} 34%, #0c0d10) 0%, #0c0d10 62%)`,
      }}
    >
      <DeviceGlyph
        form={c?.form ?? "home"}
        className="absolute -right-[12%] top-[8%] w-[88%] opacity-[0.16]"
        strokeWidth={1.2}
      />
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
      <div className="absolute inset-x-[9%] bottom-[9%] flex flex-col gap-1.5">
        <span className="text-[10px] font-medium tracking-wide" style={{ color: accent }}>
          {c?.short}
        </span>
        <span
          dir="auto"
          className="font-display text-[clamp(1.05rem,2.2vw,1.6rem)] font-bold leading-[0.95] text-white/90 [text-wrap:balance] line-clamp-3"
        >
          {game.title}
        </span>
      </div>
    </div>
  );
}
