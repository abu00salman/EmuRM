"use client";
import { motion } from "motion/react";
import { getConsole } from "@/lib/consoles/registry";
import { useObjectUrl } from "@/lib/object-url";
import { useDiscoveryCover } from "@/lib/discovery/use-cover";
import { DeviceGlyph } from "@/components/DeviceGlyph";
import type { GameMetadata } from "@/lib/discovery/types";
import { useT } from "@/lib/i18n";

function DiscoveryCover({ game }: { game: GameMetadata }) {
  const c = getConsole(game.consoleId);
  const accent = c?.accent ?? "#8d919b";
  const cover = useDiscoveryCover(game.consoleId, game.title);
  const url = useObjectUrl(cover ?? undefined);

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover [image-rendering:pixelated]" />
    );
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: `linear-gradient(140deg, color-mix(in oklab, ${accent} 34%, #0c0d10) 0%, #0c0d10 62%)` }}
    >
      <DeviceGlyph form={c?.form ?? "home"} className="absolute -right-[12%] top-[8%] w-[88%] opacity-[0.16]" strokeWidth={1.2} />
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
      <div className="absolute inset-x-[9%] bottom-[9%] flex flex-col gap-1.5">
        <span className="text-[10px] font-medium tracking-wide" style={{ color: accent }}>{c?.short}</span>
        <span dir="auto" className="font-display text-[clamp(1.05rem,2.2vw,1.6rem)] font-bold leading-[0.95] text-white/90 [text-wrap:balance] line-clamp-3">
          {game.title}
        </span>
      </div>
    </div>
  );
}

export function DiscoveryCard({ game, onOpen }: { game: GameMetadata; onOpen: (g: GameMetadata) => void }) {
  const c = getConsole(game.consoleId);
  const t = useT();
  return (
    <motion.button
      layout="position"
      transition={{ type: "spring", stiffness: 400, damping: 38 }}
      onClick={() => onOpen(game)}
      style={{ ["--accent" as string]: c?.accent }}
      className="group relative block w-full rounded-2xl text-start outline-offset-4"
      aria-label={`${game.title}, ${c?.short ?? ""}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-graphite transition-[transform,box-shadow,border-color] duration-500 ease-[var(--ease-out-quint)] group-hover:-translate-y-1 group-hover:border-white/20 group-hover:shadow-[0_20px_50px_-20px_var(--accent)]">
        <DiscoveryCover game={game} />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        {game.distributionMode === "built-in-authorized" && (
          <span className="absolute end-2 top-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-black">
            {t("discover.badge.playNow")}
          </span>
        )}
      </div>
      <div className="mt-3 px-0.5">
        <p dir="auto" className="truncate text-sm font-semibold">{game.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          <span style={{ color: c?.accent }}>{c?.short}</span>
          {game.year ? ` · ${game.year}` : ""}
          {game.genre ? ` · ${game.genre}` : ""}
        </p>
      </div>
    </motion.button>
  );
}
