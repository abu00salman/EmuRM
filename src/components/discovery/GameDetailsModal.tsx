"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getConsole } from "@/lib/consoles/registry";
import { DEMO_GAMES } from "@/lib/library/demo-catalog";
import { useUI } from "@/stores/ui";
import { useImport } from "@/components/useImport";
import { useT } from "@/lib/i18n";
import { Modal } from "@/components/Modal";
import { getGameSources, buildSearchUrl } from "@/lib/discovery/game-sources";
import type { GameMetadata } from "@/lib/discovery/types";

export function GameDetailsModal({ game, onClose }: { game: GameMetadata | null; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const openImport = useUI((s) => s.openImport);
  const { fromUrl } = useImport();
  const [starting, setStarting] = useState(false);

  if (!game) return <Modal open={false} onClose={onClose} label="">{null}</Modal>;
  const c = getConsole(game.consoleId);
  const sources = getGameSources(game.consoleId);
  const primarySource = sources[0];

  const playBuiltIn = async () => {
    const demo = DEMO_GAMES.find((d) => d.title === game.demoTitle);
    if (!demo) return;
    setStarting(true);
    try {
      const cover = await fetch(demo.cover).then((r) => (r.ok ? r.blob() : undefined)).catch(() => undefined);
      const result = await fromUrl(demo.rom, { title: demo.title, author: demo.author, cover, source: "demo", forceConsole: demo.consoleId });
      const game_ = result?.added[0] ?? result?.existing[0];
      if (game_) {
        onClose();
        router.push(`/play/?game=${game_.id}`);
      }
    } finally {
      setStarting(false);
    }
  };

  const findGame = () => {
    if (!primarySource) return;
    window.open(buildSearchUrl(primarySource, game.title, game.consoleId), "_blank", "noopener,noreferrer");
  };

  const importAndPlay = () => {
    onClose();
    openImport("device", game.consoleId);
  };

  return (
    <Modal open={!!game} onClose={onClose} label={game.title}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 dir="auto" className="font-display text-3xl font-bold">{game.title}</h2>
          <p className="mt-1 text-sm text-muted">
            <span style={{ color: c?.accent }}>{c?.name ?? c?.short}</span>
            {game.year ? ` · ${game.year}` : ""}
          </p>
        </div>
        <button onClick={onClose} aria-label={t("import.close")} className="shrink-0 rounded-full p-2 text-muted hover:bg-white/10 hover:text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {game.publisher && <span>{t("discover.details.publisher")}: {game.publisher}</span>}
        {game.genre && <span>{t("discover.details.genre")}: {game.genre}</span>}
      </div>
      {game.description && <p className="mt-3 max-w-prose text-sm text-muted">{game.description}</p>}

      <div className="mt-6 flex flex-wrap gap-2">
        {game.distributionMode === "built-in-authorized" && (
          <button
            data-nav
            data-autofocus
            disabled={starting}
            onClick={() => void playBuiltIn()}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
          >
            {starting ? t("discover.action.starting") : t("discover.action.playNow")}
          </button>
        )}
        {game.distributionMode === "external-discovery" && (
          <>
            <button
              data-nav
              data-autofocus
              disabled={!primarySource}
              onClick={findGame}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
            >
              {t("discover.action.findGame")}
            </button>
            <button data-nav onClick={importAndPlay} className="rounded-full border border-white/20 px-5 py-2.5 text-sm hover:bg-white/10">
              {t("discover.action.alreadyHaveIt")}
            </button>
          </>
        )}
        {game.distributionMode === "user-import" && (
          <button data-nav data-autofocus onClick={importAndPlay} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black">
            {t("discover.action.importAndPlay")}
          </button>
        )}
      </div>
      {game.distributionMode === "external-discovery" && (
        <p className="mt-3 text-xs text-faint">{t("discover.details.externalNote")}</p>
      )}
    </Modal>
  );
}
