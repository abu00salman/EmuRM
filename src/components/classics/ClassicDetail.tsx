"use client";
import Link from "next/link";
import { classicCoverUrl, type ClassicGame } from "@/lib/classics/catalog";
import { getConsole } from "@/lib/consoles/registry";
import { useLocale, useT } from "@/lib/i18n";
import { usePlayClassic } from "./PlayClassic";

export function ClassicDetail({ g }: { g: ClassicGame }) {
  const t = useT();
  const ar = useLocale() === "ar";
  const { play, overlay, busy } = usePlayClassic();
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const c = getConsole(g.console);
  const row = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-4 border-b border-white/10 py-2.5 text-sm"><dt className="text-muted">{k}</dt><dd className="text-end" dir="auto">{v}</dd></div>
  );
  return (
    <div className="mx-auto max-w-5xl px-[max(1rem,var(--safe-l))] pb-28 pt-[calc(var(--safe-t)+6.5rem)] sm:px-8">
      <Link href="/classics/" data-nav className="text-sm text-muted hover:text-white">← EmuRM Classics</Link>
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <button data-nav onClick={() => void play(g)} disabled={busy} className="overflow-hidden rounded-3xl border border-white/10 bg-black" aria-label={`${t("classics.playNow")}: ${g.title}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={classicCoverUrl(g)} alt={g.title} className="aspect-[4/3] w-full object-cover" style={{ imageRendering: "pixelated" }} />
        </button>
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-4xl font-extrabold leading-[0.95]" dir="auto">{g.title}</h1>
          <p className="text-muted">{ar ? g.description.ar : g.description.en}</p>
          <button data-nav onClick={() => void play(g)} disabled={busy} className="rm-button rm-button-primary self-start">▶ {t("classics.playNow")}</button>
          <p className="text-sm text-muted"><b className="text-white">{t("classics.controls")}:</b> {ar ? g.controls.ar : g.controls.en}</p>
        </div>
      </div>
      <dl className="mt-10 max-w-2xl">
        {row(t("rebuilt.platform"), <span dir="ltr">{c?.name ?? g.console}</span>)}
        {row(t("classics.genre"), ar ? g.genre.ar : g.genre.en)}
        {row(t("classics.author"), `${g.author} · ${g.year}`)}
        {row(t("rebuilt.license"), <a className="underline" href={`${base}/classics/${g.id}/${g.console === "doom" ? "COPYING.txt" : "README-LICENSE.txt"}`} target="_blank" rel="noopener noreferrer">{g.license}</a>)}
        {row(t("rebuilt.source"), <a className="underline" href={g.source} target="_blank" rel="noopener noreferrer" dir="ltr">{g.source.replace("https://", "")}</a>)}
        {row(t("classics.size"), `${(g.bytes / 1048576).toFixed(1)} MB`)}
      </dl>
      {g.licenseNote && <p className="mt-4 text-xs text-muted">{g.licenseNote}</p>}
      {overlay}
    </div>
  );
}
