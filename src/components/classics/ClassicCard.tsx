"use client";
import Link from "next/link";
import { getConsole } from "@/lib/consoles/registry";
import { classicCoverUrl, type ClassicGame } from "@/lib/classics/catalog";
import { useLocale, useT } from "@/lib/i18n";

export function ClassicCard({ g, onPlay, fav, onFav }: { g: ClassicGame; onPlay: () => void; fav?: boolean; onFav?: () => void }) {
  const t = useT();
  const ar = useLocale() === "ar";
  const c = getConsole(g.console);
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#101621]">
      <button data-nav onClick={onPlay} className="block w-full text-start" aria-label={`${t("classics.playNow")}: ${g.title}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={classicCoverUrl(g)} alt="" loading="lazy" className="h-full w-full object-cover" style={{ imageRendering: "pixelated" }} />
          <span className="absolute start-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white" dir="ltr">{c?.short ?? g.console}</span>
          <span className="absolute bottom-2 end-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">▶ {t("classics.playNow")}</span>
        </div>
        <div className="p-3">
          <p className="truncate font-semibold" dir="auto">{g.title}</p>
          <p className="truncate text-xs text-muted">{ar ? g.genre.ar : g.genre.en} · {g.license}</p>
        </div>
      </button>
      <div className="absolute end-2 top-2 flex gap-1">
        {onFav && (
          <button data-nav onClick={onFav} aria-pressed={fav} aria-label={t("classics.favorite")} className={`grid h-8 w-8 place-items-center rounded-full bg-black/60 text-sm ${fav ? "text-[#FFD54A]" : "text-white"}`}>{fav ? "★" : "☆"}</button>
        )}
        <Link data-nav href={`/classics/${g.id}/`} aria-label={t("classics.details")} className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-sm text-white">i</Link>
      </div>
    </div>
  );
}
