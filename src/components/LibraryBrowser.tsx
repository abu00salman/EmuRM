"use client";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useCollections, useGames } from "@/lib/db/hooks";
import { deleteCollection } from "@/lib/db/repo";
import { CONSOLES, getConsole } from "@/lib/consoles/registry";
import type { ConsoleId } from "@/lib/consoles/types";
import type { GameRecord } from "@/lib/db/schema";
import { useUI } from "@/stores/ui";
import { useT } from "@/lib/i18n";
import { GameCard, GameRow } from "./GameCard";
import { GameActions } from "./GameActions";

type View = "all" | "favorites" | "recent" | `col:${string}`;
type Sort = "recent" | "title" | "added" | "time";

const VIEW_KEY = "rv:layout";

export function LibraryBrowser({ consoleId }: { consoleId?: ConsoleId }) {
  const games = useGames(consoleId);
  const collections = useCollections();
  const openImport = useUI((s) => s.openImport);
  const t = useT();
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim().toLowerCase());
  const [view, setView] = useState<View>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [system, setSystem] = useState<ConsoleId | "any">("any");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  useEffect(() => {
    try {
      if (localStorage.getItem(VIEW_KEY) === "list") setLayout("list");
    } catch {
      /* private mode */
    }
  }, []);
  const [active, setActive] = useState<GameRecord | null>(null);

  const systemsPresent = useMemo(() => {
    const s = new Set(games?.map((g) => g.consoleId));
    return CONSOLES.filter((c) => s.has(c.id));
  }, [games]);

  const list = useMemo(() => {
    if (!games) return [];
    let out = games;
    if (!consoleId && system !== "any") out = out.filter((g) => g.consoleId === system);
    if (view === "favorites") out = out.filter((g) => g.favorite);
    if (view === "recent") out = out.filter((g) => g.lastPlayedAt > 0);
    if (view.startsWith("col:")) {
      const id = view.slice(4);
      out = out.filter((g) => g.collections.includes(id));
    }
    if (q) {
      out = out.filter((g) => {
        const c = getConsole(g.consoleId);
        const hay = `${g.title} ${g.author ?? ""} ${c?.name} ${c?.short} ${c?.aliases.join(" ")}`.toLowerCase();
        return q.split(/\s+/).every((t) => hay.includes(t));
      });
    }
    const by: Record<Sort, (a: GameRecord, b: GameRecord) => number> = {
      recent: (a, b) => b.lastPlayedAt - a.lastPlayedAt || b.addedAt - a.addedAt,
      title: (a, b) => a.title.localeCompare(b.title),
      added: (a, b) => b.addedAt - a.addedAt,
      time: (a, b) => b.playTimeSec - a.playTimeSec,
    };
    return [...out].sort(view === "recent" ? by.recent : by[sort]);
  }, [games, consoleId, system, view, q, sort]);

  const setLayoutPersist = (l: "grid" | "list") => {
    setLayout(l);
    try {
      localStorage.setItem(VIEW_KEY, l);
    } catch {
      /* ignore */
    }
  };

  const views: { id: View; label: string }[] = [
    { id: "all", label: t("library.viewAll") },
    { id: "favorites", label: t("library.viewFavorites") },
    { id: "recent", label: t("library.viewRecent") },
    ...(collections ?? []).map((c) => ({ id: `col:${c.id}` as View, label: c.name })),
  ];

  if (games === undefined) return <div className="h-64" />;

  if (games.length === 0) {
    const c = consoleId ? getConsole(consoleId) : undefined;
    return (
      <div className="flex flex-col items-start gap-4 rounded-3xl border border-dashed border-white/15 px-6 py-14 sm:px-10">
        <p className="font-display text-4xl font-bold">{t("library.emptyTitle", { system: c ? `${c.short} ` : "" })}</p>
        <p className="max-w-[52ch] text-muted">{t("library.emptyHint")}</p>
        <div className="flex flex-wrap gap-2">
          <button data-nav onClick={() => openImport("device", consoleId)} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black">
            {t("library.chooseFiles")}
          </button>
          <button data-nav onClick={() => openImport("demo", consoleId)} className="rounded-full border border-white/20 px-5 py-2.5 text-sm hover:bg-white/10">
            {t("library.browseHomebrew")}
          </button>
        </div>
      </div>
    );
  }

  const activeCol = view.startsWith("col:") ? view.slice(4) : null;

  return (
    <div>
      {/* Toolbar */}
      <div className="rm-library-toolbar sticky top-[calc(var(--safe-t)+4.25rem)] z-30 -mx-2 mb-6 flex flex-col gap-3 rounded-2xl px-2 py-2 backdrop-blur-xl sm:flex-row sm:items-center">
        <label className="glass flex flex-1 items-center gap-2 rounded-full px-4 py-2.5 sm:max-w-sm">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={consoleId ? t("library.searchThis") : t("library.searchAll")}
            aria-label={t("library.searchAria")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-faint"
          />
        </label>
        <div className="scrollbar-none flex gap-1 overflow-x-auto">
          {views.map((v) => (
            <button
              key={v.id}
              data-nav
              aria-pressed={view === v.id}
              onClick={() => setView(v.id)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm transition-colors ${view === v.id ? "bg-white text-black" : "text-muted hover:text-white"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="rm-library-options flex items-center gap-2 sm:ms-auto">
          {!consoleId && systemsPresent.length > 1 && (
            <select
              aria-label={t("library.filterSystemAria")}
              value={system}
              onChange={(e) => setSystem(e.target.value as ConsoleId | "any")}
              className="glass rounded-full px-3 py-2 text-sm outline-none"
            >
              <option value="any">{t("library.allSystems")}</option>
              {systemsPresent.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {view !== "recent" && (
            <select aria-label={t("library.sortAria")} value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="glass rounded-full px-3 py-2 text-sm outline-none">
              <option value="recent">{t("library.sortRecent")}</option>
              <option value="title">{t("library.sortTitle")}</option>
              <option value="added">{t("library.sortAdded")}</option>
              <option value="time">{t("library.sortTime")}</option>
            </select>
          )}
          <div className="glass flex rounded-full p-1" role="group" aria-label={t("library.layoutAria")}>
            {(["grid", "list"] as const).map((l) => (
              <button
                key={l}
                aria-pressed={layout === l}
                aria-label={l === "grid" ? t("library.gridView") : t("library.listView")}
                onClick={() => setLayoutPersist(l)}
                className={`rounded-full p-1.5 ${layout === l ? "bg-white text-black" : "text-muted hover:text-white"}`}
              >
                {l === "grid" ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><rect x="4" y="5" width="16" height="3" rx="1.5" /><rect x="4" y="10.5" width="16" height="3" rx="1.5" /><rect x="4" y="16" width="16" height="3" rx="1.5" /></svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeCol && (
        <div className="mb-4 flex items-center gap-3 text-sm text-muted">
          <span>{t("library.inCollection", { count: list.length })}</span>
          <button
            onClick={async () => {
              await deleteCollection(activeCol);
              setView("all");
            }}
            className="underline-offset-4 hover:text-white hover:underline"
          >
            {t("library.deleteCollection")}
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <p className="py-16 text-center text-muted">
          {q ? t("library.noMatch", { query }) : view === "favorites" ? t("library.favHint") : t("library.nothingHere")}
        </p>
      ) : layout === "grid" ? (
        <motion.div layout className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          <AnimatePresence initial={false}>
            {list.map((g) => (
              <GameCard key={g.id} game={g} onMore={setActive} showConsole={!consoleId} />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="flex flex-col">
          {list.map((g) => (
            <GameRow key={g.id} game={g} onMore={setActive} />
          ))}
        </div>
      )}

      <GameActions game={active} onClose={() => setActive(null)} />
    </div>
  );
}
