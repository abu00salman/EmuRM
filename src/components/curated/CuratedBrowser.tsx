"use client";

import Link from "next/link";
import { instantGames, userFileGames } from "@/lib/curated/games";
import { useLocale, useT } from "@/lib/i18n";
import { useUI } from "@/stores/ui";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function CuratedBrowser() {
  const t = useT();
  const ar = useLocale() === "ar";
  const openImport = useUI((s) => s.openImport);
  const games = instantGames();
  return (
    <div className="rm-container py-8">
      <p className="rm-eyebrow"><span /> {t("home.curatedEyebrow")}</p>
      <h1 className="font-display text-4xl font-extrabold">{t("curated.title")}</h1>
      <p className="mt-2 max-w-[62ch] text-muted">{t("curated.subtitle")}</p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button data-nav className="rm-button rm-button-secondary" onClick={() => openImport("device")}>{t("curated.byo")}</button>
        <p className="text-sm text-muted">{t("curated.byoHint")}</p>
      </div>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <li key={game.id} className="glass flex flex-col rounded-3xl p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE}${game.cover}`} alt="" className="aspect-[3/4] w-full rounded-2xl object-cover" />
            <h2 className="mt-3 font-display text-2xl font-bold" dir="auto">{game.title}</h2>
            <p className="text-xs text-muted">{game.platform.toUpperCase()} · {game.engine}</p>
            <p className="mt-2 line-clamp-3 text-sm text-muted" dir="auto">{ar ? game.description.ar : game.description.en}</p>
            <Link data-nav href={`/curated/${game.id}/`} className="rm-button rm-button-primary mt-4">{t("curated.play")}</Link>
          </li>
        ))}
      </ul>
      <h2 className="mt-12 font-display text-3xl font-extrabold">{t("curated.classics")}</h2>
      <p className="mt-2 max-w-[62ch] text-muted">{t("curated.classicsHint")}</p>
      <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {userFileGames().map((game) => (
          <li key={game.id} className="glass flex flex-col rounded-3xl p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE}${game.cover}`} alt="" className="aspect-[3/4] w-full rounded-2xl object-cover" />
            <h2 className="mt-3 font-display text-2xl font-bold" dir="auto">{game.title}</h2>
            <p className="text-xs text-muted">{game.platform.toUpperCase()} · {game.engine}</p>
            <p className="mt-2 line-clamp-3 text-sm text-muted" dir="auto">{ar ? game.description.ar : game.description.en}</p>
            <Link data-nav href={`/curated/${game.id}/`} className="rm-button rm-button-secondary mt-4">{t("curated.ownFile")}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
