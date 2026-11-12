"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { importFiles } from "@/lib/library/import";
import { useLocale, useT } from "@/lib/i18n";
import type { CuratedGame } from "@/lib/curated/games";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const starts = new Map<string, Promise<string | null>>();

async function importRom(game: CuratedGame & { launch: { kind: "rom" } }) {
  const response = await fetch(`${BASE}${game.launch.file}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const file = new File([await response.blob()], game.launch.filename);
  let cover: Blob | undefined;
  try {
    const art = await fetch(`${BASE}${game.cover}`);
    if (art.ok) cover = await art.blob();
  } catch { /* the page still has the static cover */ }
  const result = await importFiles([file], {
    forceConsole: game.launch.consoleId,
    titleOverride: game.title,
    author: game.author,
    source: "demo",
    sourceUrl: game.sourceUrl,
    cover,
    chooseConsole: async () => game.launch.consoleId,
  });
  const saved = result.added[0] ?? result.existing[0];
  if (!saved) throw new Error(result.skipped[0]?.reason || "Could not add this game");
  return saved.id;
}

export function CuratedDetail({ game }: { game: CuratedGame }) {
  const t = useT();
  const ar = useLocale() === "ar";
  const router = useRouter();
  const params = useSearchParams();
  const auto = params.get("play") === "1";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startLocal = (file: File) => {
    if (game.launch.kind !== "local-file") return;
    const consoleId = game.launch.consoleId;
    setBusy(true);
    setError(null);
    void importFiles([file], {
      forceConsole: consoleId,
      source: "file",
      chooseConsole: async () => consoleId,
    }).then((result) => {
      const saved = result.added[0] ?? result.existing[0];
      if (!saved) throw new Error(result.skipped[0]?.reason || t("curated.error"));
      router.push(`/play/?game=${saved.id}`);
    }).catch((reason: unknown) => {
      setBusy(false);
      setError(reason instanceof Error ? reason.message : t("curated.error"));
    });
  };

  const start = () => {
    if (game.launch.kind !== "rom") return;
    const existing = starts.get(game.id);
    const job = existing ?? importRom(game as CuratedGame & { launch: { kind: "rom" } });
    if (!existing) starts.set(game.id, job);
    setBusy(true);
    setError(null);
    void job.then(
      (id) => router.push(`/play/?game=${id}`),
      (reason: unknown) => {
        starts.delete(game.id);
        setBusy(false);
        setError(reason instanceof Error ? reason.message : t("curated.error"));
      },
    );
  };

  useEffect(() => {
    if (auto && game.launch.kind === "rom") start();
    // start is recreated each render; the module map keeps the import single-flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, game.id]);

  const description = ar ? game.description.ar : game.description.en;
  return (
    <article className="rm-container py-8">
      <Link href="/curated/" data-nav className="text-sm text-muted hover:text-white">{t("curated.back")}</Link>
      <div className="mt-5 grid gap-8 md:grid-cols-[220px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}${game.cover}`} alt="" width={220} height={293} className="w-full max-w-[220px] rounded-2xl border border-white/10" />
        <div>
          <p className="rm-eyebrow"><span /> {game.platform.toUpperCase()}</p>
          <h1 className="font-display text-4xl font-extrabold" dir="auto">{game.title}</h1>
          <p className="mt-2 text-muted" dir="auto">{description}</p>
          <dl className="mt-4 grid gap-1 text-sm text-muted">
            <div className="flex gap-2"><dt>{t("curated.by")}</dt><dd dir="auto">{game.author}</dd></div>
            <div className="flex gap-2"><dt>{t("curated.license")}</dt><dd><a className="underline" href={game.licenseEvidenceUrl}>{game.license}</a></dd></div>
            <div className="flex gap-2"><dt>{t("curated.source")}</dt><dd><a className="underline" href={game.sourceUrl} dir="ltr">{game.sourceUrl.replace("https://", "")}</a></dd></div>
          </dl>
          {game.permissionNote && <p className="mt-3 text-sm text-muted" dir="auto">{game.permissionNote}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {game.launch.kind === "rom" && (
              <button data-nav className="rm-button rm-button-primary" onClick={start} disabled={busy}>{busy ? t("curated.playing") : t("curated.play")}</button>
            )}
            {game.launch.kind === "local-file" && (
              <label className="rm-button rm-button-primary">
                {busy ? t("curated.playing") : t("curated.ownFile")}
                <input data-curated-file className="sr-only" type="file" disabled={busy} onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) startLocal(file);
                }} />
              </label>
            )}
          </div>
          {game.launch.kind === "local-file" && <p className="mt-2 text-sm text-muted">{t("curated.ownFileHint")}</p>}
          {error && <p className="mt-3 text-sm text-red-300" role="alert">{error}</p>}
        </div>
      </div>
    </article>
  );
}
