"use client";
import Link from "next/link";
import { useT, useLocale } from "@/lib/i18n";
import { KIND_LABELS, REBUILT_SOURCE, statusOf, type RebuiltGame } from "@/lib/rebuilt";
import { Badges } from "./RebuiltBrowser";
import { RebuiltCover } from "./RebuiltCover";
import { StatusButton } from "./StatusButton";

const fmtDate = (iso: string | null, locale: string) =>
  iso ? new Date(iso).toLocaleDateString(locale === "ar" ? "ar" : "en", { year: "numeric", month: "short", day: "numeric" }) : "-";

export function RebuiltDetail({ game }: { game: RebuiltGame }) {
  const t = useT();
  const locale = useLocale();
  const status = statusOf(game);
  const needsOwnFiles = status !== "play";
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 border-b border-white/10 py-2.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-end" dir="auto">{value}</dd>
    </div>
  );
  return (
    <div className="mx-auto max-w-5xl px-[max(1rem,var(--safe-l))] pb-28 pt-[calc(var(--safe-t)+6.5rem)] sm:px-8">
      <Link href="/rebuilt/" data-nav className="text-sm text-muted hover:text-white">← {t("rebuilt.back")}</Link>
      <div className="mt-4 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <RebuiltCover game={game} className="aspect-[4/3] rounded-3xl" />
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-4xl font-extrabold leading-[0.95]" dir="auto">{game.title}</h1>
          <Badges game={game} />
          <p className="text-muted" dir="ltr">{game.description}</p>
          <div className="flex flex-wrap items-center gap-3">
            <StatusButton game={game} />
            {status !== "view" && status !== "soon" && (
              <a href={game.projectUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-muted underline">{t("rebuilt.openProject")}</a>
            )}
          </div>
          <p className="text-sm text-muted">{t(`rebuilt.help.${status}` as const)}</p>
        </div>
      </div>

      <section className="mt-10 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-semibold">{t("rebuilt.requirements")}</h2>
          <p className="text-sm text-muted">{needsOwnFiles ? t("rebuilt.reqOwnFiles") : "-"}</p>
          {status === "view" && <p className="mt-2 text-sm text-muted">{t("rebuilt.reqBuild")}</p>}
          <h2 className="mb-2 mt-6 font-semibold">{t("rebuilt.features")}</h2>
          {game.multiplayer || game.mods ? <Badges game={game} /> : <p className="text-sm text-muted">{t("rebuilt.featuresNone")}</p>}
          <h2 className="mb-2 mt-6 font-semibold">{t("rebuilt.controllers")}</h2>
          <p className="text-sm text-muted">{t("rebuilt.controllersNote")}</p>
        </div>
        <dl>
          {row(t("rebuilt.platform"), <span dir="ltr">{game.platform}</span>)}
          {row(t("rebuilt.type"), KIND_LABELS[game.kind] ?? game.kind)}
          {row(t("rebuilt.license"), game.license && game.license !== "NOASSERTION" ? game.license : t("rebuilt.licenseUnknown"))}
          {row(t("rebuilt.latest"), game.release ?? "-")}
          {row(t("rebuilt.lastCommit"), fmtDate(game.lastCommit, locale))}
          {row(t("rebuilt.source"), <a className="underline" href={game.projectUrl} target="_blank" rel="noopener noreferrer" dir="ltr">{game.projectUrl.replace("https://", "")}</a>)}
        </dl>
      </section>

      <p className="mt-10 text-xs text-muted">
        {t("rebuilt.indexNote", { source: "SubmitGame/awesome-decomp-games", commit: REBUILT_SOURCE.commit.slice(0, 7) })}
      </p>
    </div>
  );
}
