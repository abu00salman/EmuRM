"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { getConsole } from "@/lib/consoles/registry";
import type { GameRecord } from "@/lib/db/schema";
import { toggleFavorite } from "@/lib/db/repo";
import { formatPlayTime, formatRelative } from "@/lib/format";
import { prefetchEngine } from "@/lib/engine";
import { useT, useLocale } from "@/lib/i18n";
import { GameCover } from "./GameCover";

function Heart({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.8 4 4.5 7.3 4.5c2 0 3.5 1.1 4.7 2.7 1.2-1.6 2.7-2.7 4.7-2.7 3.3 0 5.7 3.3 4.5 6.7-1.7 4.7-9.2 9.3-9.2 9.3z" />
    </svg>
  );
}

function MoreButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className="rounded-full p-1.5 text-muted transition-colors hover:bg-white/10 hover:text-white"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
    </button>
  );
}

export function GameCard({ game, onMore, showConsole }: { game: GameRecord; onMore: (g: GameRecord) => void; showConsole: boolean }) {
  const c = getConsole(game.consoleId);
  const t = useT();
  const locale = useLocale();
  return (
    <motion.div layout="position" transition={{ type: "spring", stiffness: 400, damping: 38 }} className="group relative" style={{ ["--accent" as string]: c?.accent }}>
      <Link
        data-nav
        href={`/play/?game=${game.id}`}
        onPointerEnter={() => prefetchEngine()}
        className="block rounded-2xl outline-offset-4"
        aria-label={t("quickResume.play") + " " + game.title}
      >
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-graphite transition-[transform,box-shadow,border-color] duration-500 ease-[var(--ease-out-quint)] group-hover:-translate-y-1 group-hover:border-white/20 group-hover:shadow-[0_20px_50px_-20px_var(--accent)]">
          <GameCover game={game} />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </Link>
      <button
        onClick={() => void toggleFavorite(game.id)}
        aria-label={t(game.favorite ? "gameActions.removeFavoriteFor" : "gameActions.addFavoriteFor", { title: game.title })}
        aria-pressed={!!game.favorite}
        className={`absolute end-2 top-2 rounded-full bg-black/55 p-2 backdrop-blur transition-opacity ${game.favorite ? "text-[color:var(--accent)] opacity-100" : "text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`}
      >
        <Heart on={!!game.favorite} />
      </button>
      <div className="mt-3 flex items-start gap-2 px-0.5">
        <div className="min-w-0 flex-1">
          <p dir="auto" className="truncate text-sm font-semibold">{game.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {showConsole && <span style={{ color: c?.accent }}>{c?.short} </span>}
            {game.lastPlayedAt ? formatRelative(game.lastPlayedAt, locale) : t("library.notPlayedYet")}
          </p>
        </div>
        <MoreButton onClick={() => onMore(game)} label={t("gameActions.moreOptionsFor", { title: game.title })} />
      </div>
    </motion.div>
  );
}

export function GameRow({ game, onMore }: { game: GameRecord; onMore: (g: GameRecord) => void }) {
  const c = getConsole(game.consoleId);
  const t = useT();
  const locale = useLocale();
  return (
    <motion.div layout="position" className="group flex items-center gap-4 rounded-2xl px-2 py-2 transition-colors hover:bg-white/[0.04]" style={{ ["--accent" as string]: c?.accent }}>
      <Link data-nav href={`/play/?game=${game.id}`} onPointerEnter={() => prefetchEngine()} className="flex min-w-0 flex-1 items-center gap-4 rounded-xl">
        <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-line">
          <GameCover game={game} />
        </div>
        <div className="min-w-0 flex-1">
          <p dir="auto" className="truncate font-semibold">{game.title}</p>
          <p className="truncate text-xs text-muted">
            <span style={{ color: c?.accent }}>{c?.short}</span>
            {game.author ? ` ${t("library.byAuthor", { author: game.author })}` : ""}
          </p>
        </div>
        <span className="hidden w-32 text-end text-sm text-muted sm:block">{formatRelative(game.lastPlayedAt, locale)}</span>
        <span className="hidden w-32 text-end text-sm tabular-nums text-muted md:block">{formatPlayTime(game.playTimeSec, locale)}</span>
      </Link>
      <button
        onClick={() => void toggleFavorite(game.id)}
        aria-label={t(game.favorite ? "gameActions.removeFavorite" : "gameActions.addFavorite")}
        aria-pressed={!!game.favorite}
        className={`rounded-full p-2 ${game.favorite ? "text-[color:var(--accent)]" : "text-faint hover:text-white"}`}
      >
        <Heart on={!!game.favorite} />
      </button>
      <MoreButton onClick={() => onMore(game)} label={t("gameActions.moreOptionsFor", { title: game.title })} />
    </motion.div>
  );
}
