"use client";

import Link from "next/link";
import { instantGames } from "@/lib/curated/games";
import { useT } from "@/lib/i18n";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function CuratedShelf() {
  const t = useT();
  const games = instantGames();
  return (
    <section className="rm-systems" aria-labelledby="curated-heading">
      <div className="rm-section-heading">
        <div>
          <p className="rm-eyebrow">{t("home.curatedEyebrow")}</p>
          <h2 id="curated-heading">{t("home.curatedTitle")}</h2>
        </div>
        <Link data-nav href="/curated/" className="rm-button rm-button-secondary">{t("curated.browse")}</Link>
      </div>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <li key={game.id} className="glass flex items-center gap-4 rounded-3xl p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE}${game.cover}`} alt="" width={72} height={96} className="h-24 w-[72px] rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold" dir="auto">{game.title}</p>
              <p className="text-xs text-muted">{game.platform.toUpperCase()} · {game.author}</p>
              <Link data-nav href={`/curated/${game.id}/?play=1`} className="rm-button rm-button-primary mt-3">{t("curated.play")}</Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
