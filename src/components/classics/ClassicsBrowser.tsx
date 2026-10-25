"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CLASSICS } from "@/lib/classics/catalog";
import { useClassicFavorites } from "@/lib/classics/play";
import { getConsole } from "@/lib/consoles/registry";
import { useLocale, useT } from "@/lib/i18n";
import { ClassicCard } from "./ClassicCard";
import { usePlayClassic } from "./PlayClassic";

export function ClassicsBrowser() {
  const t = useT();
  const ar = useLocale() === "ar";
  const { play, overlay } = usePlayClassic();
  const favs = useClassicFavorites();
  const [fav, setFav] = useState<string[]>([]);
  useEffect(() => setFav(favs.read()), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [q, setQ] = useState("");
  const [system, setSystem] = useState("all");
  const [sort, setSort] = useState<"popular" | "new" | "fav">("popular");

  const systems = useMemo(() => [...new Set(CLASSICS.map((g) => g.console))], []);
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    let list = CLASSICS.filter((g) => (system === "all" || g.console === system) && (!n || `${g.title} ${g.genre.en} ${g.genre.ar} ${g.author}`.toLowerCase().includes(n)));
    if (sort === "fav") list = list.filter((g) => fav.includes(g.id));
    return [...list].sort((a, b) => (sort === "new" ? b.added.localeCompare(a.added) || a.rank - b.rank : a.rank - b.rank));
  }, [q, system, sort, fav]);
  const pill = (on: boolean) => `rounded-full border px-3.5 py-1.5 text-sm ${on ? "border-white bg-white text-black" : "border-white/15 text-muted hover:border-white/40"}`;

  return (
    <div className="mx-auto max-w-[1600px] px-[max(1rem,var(--safe-l))] pb-28 pt-[calc(var(--safe-t)+6.5rem)] sm:px-8">
      <h1 className="font-display text-[clamp(2.5rem,6vw,5rem)] font-extrabold leading-[0.9]">EmuRM Classics</h1>
      <p className="mt-2 max-w-[62ch] text-muted">{t("classics.subtitle")}</p>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("classics.search")} aria-label={t("classics.search")}
        className="mt-6 w-full max-w-xl rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 outline-none focus:border-white/50" />
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("classics.sort")}>
        {(["popular", "new", "fav"] as const).map((s) => <button key={s} data-nav className={pill(sort === s)} aria-pressed={sort === s} onClick={() => setSort(s)}>{t(`classics.sort.${s}` as const)}</button>)}
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t("classics.system")}>
        <button data-nav className={pill(system === "all")} aria-pressed={system === "all"} onClick={() => setSystem("all")}>{t("rebuilt.all")}</button>
        {systems.map((s) => <button key={s} data-nav className={pill(system === s)} aria-pressed={system === s} onClick={() => setSystem(s)} dir="ltr">{getConsole(s)?.short ?? s}</button>)}
      </div>
      {shown.length === 0 ? <p className="mt-10 text-muted">{t("rebuilt.empty")}</p> : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((g) => <ClassicCard key={g.id} g={g} onPlay={() => void play(g)} fav={fav.includes(g.id)} onFav={() => setFav(favs.toggle(g.id))} />)}
        </div>
      )}
      <p className="mt-10 text-xs text-muted">{t("classics.legal")} <Link href="/rebuilt/" className="underline">{t("nav.rebuilt")}</Link> {ar ? "" : ""}</p>
      {overlay}
    </div>
  );
}
