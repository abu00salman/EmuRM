"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { REBUILT_GAMES, platformKey, statusOf, type RebuiltGame, type RebuiltStatus } from "@/lib/rebuilt";
import { RebuiltCover } from "./RebuiltCover";
import { StatusButton } from "./StatusButton";

export function Badges({ game }: { game: RebuiltGame }) {
  const t = useT();
  const chip = "rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-muted";
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={chip}>{game.browser ? t("rebuilt.badge.browser") : t("rebuilt.badge.native")}</span>
      {game.multiplayer && <span className={chip}>{t("rebuilt.badge.multiplayer")}</span>}
      {game.mods && <span className={chip}>{t("rebuilt.badge.mods")}</span>}
    </div>
  );
}

export function RebuiltBrowser() {
  const t = useT();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<RebuiltStatus | "all">("all");
  const [platform, setPlatform] = useState("all");

  const platforms = useMemo(() => [...new Set(REBUILT_GAMES.map(platformKey))].sort(), []);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return REBUILT_GAMES.filter(
      (g) =>
        (status === "all" || statusOf(g) === status) &&
        (platform === "all" || platformKey(g) === platform) &&
        (!needle || `${g.title} ${g.platform} ${g.description}`.toLowerCase().includes(needle)),
    );
  }, [q, status, platform]);

  const statuses = [...new Set(REBUILT_GAMES.map(statusOf))];
  const pill = (active: boolean) => `rounded-full border px-3.5 py-1.5 text-sm transition-colors ${active ? "border-white bg-white text-black" : "border-white/15 text-muted hover:border-white/40"}`;

  return (
    <div className="mx-auto max-w-[1600px] px-[max(1rem,var(--safe-l))] pb-28 pt-[calc(var(--safe-t)+6.5rem)] sm:px-8">
      <h1 className="font-display text-[clamp(2.5rem,6vw,5rem)] font-extrabold leading-[0.9]">{t("rebuilt.title")}</h1>
      <p className="mt-2 max-w-[64ch] text-muted">{t("rebuilt.subtitle")}</p>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("rebuilt.search")}
        aria-label={t("rebuilt.search")}
        className="mt-6 w-full max-w-xl rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 outline-none focus:border-white/50"
      />
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("rebuilt.status.view")}>
        <button className={pill(status === "all")} aria-pressed={status === "all"} onClick={() => setStatus("all")}>{t("rebuilt.all")}</button>
        {statuses.map((s) => (
          <button key={s} className={pill(status === s)} aria-pressed={status === s} onClick={() => setStatus(s)}>{t(`rebuilt.status.${s}` as const)}</button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Platform">
        <button className={pill(platform === "all")} aria-pressed={platform === "all"} onClick={() => setPlatform("all")}>{t("rebuilt.all")}</button>
        {platforms.map((p) => (
          <button key={p} className={pill(platform === p)} aria-pressed={platform === p} onClick={() => setPlatform(p)} dir="ltr">{p}</button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="mt-10 text-muted">{t("rebuilt.empty")}</p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((g) => (
            <li key={g.id} className="glass flex flex-col overflow-hidden rounded-3xl">
              <Link href={`/rebuilt/${g.id}/`} data-nav className="block" aria-label={g.title}>
                <RebuiltCover game={g} className="h-44" />
              </Link>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <Link href={`/rebuilt/${g.id}/`} data-nav className="font-semibold hover:underline" dir="auto">{g.title}</Link>
                <p className="line-clamp-3 text-sm text-muted" dir="ltr">{g.description}</p>
                <Badges game={g} />
                <div className="mt-auto"><StatusButton game={g} /></div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
