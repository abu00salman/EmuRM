"use client";
import Link from "next/link";
import { CLASSICS } from "@/lib/classics/catalog";
import { useT } from "@/lib/i18n";
import { ClassicCard } from "./ClassicCard";
import { usePlayClassic } from "./PlayClassic";

/** Home-page strip: the most popular classics, each one tap from gameplay. */
export function ClassicsRow() {
  const t = useT();
  const { play, overlay } = usePlayClassic();
  const top = [...CLASSICS].sort((a, b) => a.rank - b.rank).slice(0, 6);
  return (
    <section className="my-8" aria-labelledby="classics-row">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 id="classics-row" className="font-display text-2xl font-extrabold">{t("classics.homeTitle")}</h2>
        <Link data-nav href="/classics/" className="shrink-0 text-sm font-semibold text-muted hover:text-white">{t("classics.homeAll")} →</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {top.map((g) => <ClassicCard key={g.id} g={g} onPlay={() => void play(g)} />)}
      </div>
      {overlay}
    </section>
  );
}
