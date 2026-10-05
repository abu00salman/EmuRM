"use client";
import Link from "next/link";
import { useQuickResume } from "@/lib/db/hooks";
import { getConsole } from "@/lib/consoles/registry";
import { formatRelative } from "@/lib/format";
import { useObjectUrl } from "@/lib/object-url";
import { prefetchEngine } from "@/lib/engine";
import type { GameRecord, StateRecord } from "@/lib/db/schema";
import { useT, useLocale } from "@/lib/i18n";
import { GameCover } from "./GameCover";

export function QuickResume() {
  const items = useQuickResume(10);
  const t = useT();
  if (!items?.length) return null;
  return (
    <section aria-labelledby="resume-h" className="rm-resume">
      <h2 id="resume-h" className="rm-resume-title">
        {t("quickResume.heading")}
      </h2>
      <div className="scrollbar-none -mx-[max(1rem,var(--safe-l))] mt-4 flex snap-x gap-4 overflow-x-auto px-[max(1rem,var(--safe-l))] pb-4 sm:-mx-8 sm:px-8">
        {items.map(({ game, auto }) => (
          <ResumeCard key={game.id} game={game} auto={auto} />
        ))}
      </div>
    </section>
  );
}

function ResumeCard({ game, auto }: { game: GameRecord; auto?: StateRecord }) {
  const c = getConsole(game.consoleId);
  const shot = useObjectUrl(auto?.thumbnail);
  const t = useT();
  const locale = useLocale();
  return (
    <Link
      data-nav
      href={`/play/?game=${game.id}${auto ? "&resume=auto" : ""}`}
      onPointerEnter={() => prefetchEngine()}
      style={{ ["--accent" as string]: c?.accent }}
      className="group relative w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-graphite sm:w-[340px]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-black">
        {shot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot} alt="" className="h-full w-full object-contain [image-rendering:pixelated] transition-transform duration-700 group-hover:scale-[1.03]" />
        ) : (
          <GameCover game={game} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <span className="absolute bottom-3 start-3 flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-black transition-opacity">
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor"><path d="M7 4v16l13-8z" /></svg>
          {t(auto ? "quickResume.resume" : "quickResume.play")}
        </span>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c?.accent }} />
        <div className="min-w-0">
          <p dir="auto" className="truncate text-sm font-semibold">{game.title}</p>
          <p className="truncate text-xs text-muted">
            {c?.short}, {formatRelative(game.lastPlayedAt, locale)}
          </p>
        </div>
      </div>
    </Link>
  );
}
