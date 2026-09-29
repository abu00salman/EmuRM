"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GameRecord } from "@/lib/db/schema";
import { createCollection, deleteGame, renameGame, setCover, toggleFavorite, toggleInCollection } from "@/lib/db/repo";
import { useCollections, useGame } from "@/lib/db/hooks";
import { importCoverImage } from "@/lib/library/import";
import { getConsole } from "@/lib/consoles/registry";
import { formatBytes, formatPlayTime, formatRelative } from "@/lib/format";
import { useUI } from "@/stores/ui";
import { useT, useLocale } from "@/lib/i18n";
import { Modal } from "./Modal";
import { GameCover } from "./GameCover";

export function GameActions({ game: initial, onClose }: { game: GameRecord | null; onClose: () => void }) {
  const live = useGame(initial?.id ?? null);
  const game = live ?? initial;
  const collections = useCollections();
  const router = useRouter();
  const toast = useUI((s) => s.toast);
  const t = useT();
  const locale = useLocale();
  const [title, setTitle] = useState("");
  const [newCol, setNewCol] = useState("");
  const [confirm, setConfirm] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(initial?.title ?? "");
    setConfirm(false);
  }, [initial]);

  if (!game) return <Modal open={false} onClose={onClose} label={t("gameActions.optionsLabel", { title: "" })}>{null}</Modal>;
  const c = getConsole(game.consoleId);

  return (
    <Modal open={!!initial} onClose={onClose} label={t("gameActions.optionsLabel", { title: game.title })}>
      <div className="flex gap-4" style={{ ["--accent" as string]: c?.accent }}>
        <div className="h-32 w-24 shrink-0 overflow-hidden rounded-xl border border-line">
          <GameCover game={game} />
        </div>
        <div className="min-w-0 flex-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void renameGame(game.id, title);
            }}
          >
            <input
              dir="auto"
              aria-label={t("gameActions.titleLabel")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title !== game.title && void renameGame(game.id, title)}
              className="w-full rounded-lg border border-transparent bg-transparent px-1 font-display text-2xl font-bold outline-none hover:border-line focus:border-white/30"
            />
          </form>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-1 text-xs">
            <dt className="text-faint">{t("gameActions.system")}</dt><dd className="text-muted">{c?.name}</dd>
            <dt className="text-faint">{t("gameActions.lastPlayed")}</dt><dd className="text-muted">{formatRelative(game.lastPlayedAt, locale)}</dd>
            <dt className="text-faint">{t("gameActions.playTime")}</dt><dd className="text-muted">{formatPlayTime(game.playTimeSec, locale)}</dd>
            <dt className="text-faint">{t("gameActions.size")}</dt><dd className="text-muted">{formatBytes(game.size)}</dd>
            {game.author && (<><dt className="text-faint">{t("gameActions.author")}</dt><dd className="text-muted">{game.author}</dd></>)}
          </dl>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button data-nav data-autofocus onClick={() => router.push(`/play/?game=${game.id}`)} className="rounded-full bg-white py-2.5 text-sm font-semibold text-black">
          {t("gameActions.play")}
        </button>
        <button data-nav onClick={() => void toggleFavorite(game.id)} className="rounded-full border border-white/15 py-2.5 text-sm hover:bg-white/10">
          {t(game.favorite ? "gameActions.removeFavorite" : "gameActions.addFavorite")}
        </button>
        <button data-nav onClick={() => coverInput.current?.click()} className="rounded-full border border-white/15 py-2.5 text-sm hover:bg-white/10">
          {t("gameActions.changeCover")}
        </button>
        <button data-nav disabled={!game.cover} onClick={() => void setCover(game.id, undefined)} className="rounded-full border border-white/15 py-2.5 text-sm hover:bg-white/10 disabled:opacity-40">
          {t("gameActions.useGeneratedCover")}
        </button>
        <input
          ref={coverInput}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              await importCoverImage(game.id, f);
            } catch (err) {
              toast({ message: err instanceof Error ? err.message : t("gameActions.couldntUseImage"), tone: "error" });
            }
          }}
        />
      </div>

      <h3 className="mt-6 text-sm font-semibold">{t("gameActions.collections")}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {collections?.map((col) => {
          const on = game.collections.includes(col.id);
          return (
            <button
              key={col.id}
              data-nav
              aria-pressed={on}
              onClick={() => void toggleInCollection(game.id, col.id)}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${on ? "bg-white text-black" : "border border-white/15 text-muted hover:text-white"}`}
            >
              {col.name}
            </button>
          );
        })}
        <form
          className="flex"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newCol.trim()) return;
            const id = await createCollection(newCol);
            await toggleInCollection(game.id, id);
            setNewCol("");
          }}
        >
          <input
            value={newCol}
            onChange={(e) => setNewCol(e.target.value)}
            placeholder={t("gameActions.newCollectionPlaceholder")}
            aria-label={t("gameActions.newCollectionAria")}
            className="w-36 rounded-full border border-dashed border-white/20 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-white/50"
          />
        </form>
      </div>

      <div className="mt-6 border-t border-line pt-4">
        {confirm ? (
          <div className="flex items-center gap-2">
            <p className="flex-1 text-sm text-muted">{t("gameActions.deleteConfirm")}</p>
            <button onClick={() => setConfirm(false)} className="rounded-full px-3 py-1.5 text-sm text-muted hover:text-white">{t("gameActions.keep")}</button>
            <button
              onClick={async () => {
                await deleteGame(game.id);
                toast({ message: t("gameActions.deletedToast", { title: game.title }) });
                onClose();
              }}
              className="rounded-full bg-red-500/90 px-4 py-1.5 text-sm font-semibold text-white"
            >
              {t("gameActions.delete")}
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)} className="text-sm text-red-300/80 hover:text-red-200">
            {t("gameActions.deleteFromLibrary")}
          </button>
        )}
      </div>
    </Modal>
  );
}
