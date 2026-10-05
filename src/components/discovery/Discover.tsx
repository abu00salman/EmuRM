"use client";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CONSOLES } from "@/lib/consoles/registry";
import type { ConsoleId } from "@/lib/consoles/types";
import { getMetadataProvider } from "@/lib/discovery/metadata-provider";
import type { GameMetadata } from "@/lib/discovery/types";
import { useUI } from "@/stores/ui";
import { useT } from "@/lib/i18n";
import { DiscoveryCard } from "./DiscoveryCard";
import { GameDetailsModal } from "./GameDetailsModal";

const PAGE_SIZE = 24;

export function Discover() {
  const t = useT();
  const openImport = useUI((s) => s.openImport);
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim());
  const [system, setSystem] = useState<ConsoleId | "all">("all");
  const [results, setResults] = useState<GameMetadata[] | null>(null);
  const [error, setError] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [active, setActive] = useState<GameMetadata | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setVisible(PAGE_SIZE);
    getMetadataProvider()
      .search(q, system)
      .then((r) => {
        if (!cancelled) setResults(r);
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [q, system, reloadToken]);

  const shown = useMemo(() => results?.slice(0, visible) ?? [], [results, visible]);

  const filters: { id: ConsoleId | "all"; label: string }[] = [
    { id: "all", label: t("discover.filterAll") },
    ...CONSOLES.map((c) => ({ id: c.id, label: c.short })),
  ];

  return (
    <div className="mx-auto max-w-[1600px] px-[max(1rem,var(--safe-l))] pb-24 pt-[calc(var(--safe-t)+6.5rem)] sm:px-8">
      <h1 className="font-display text-[clamp(2.75rem,6vw,5.5rem)] font-extrabold leading-[0.85]">{t("discover.title")}</h1>
      <p className="mt-2 max-w-[60ch] text-muted">{t("discover.subtitle")}</p>

      {/* Always available, independent of search — a user who already has their game file
          never needs to go through Game Discovery to add it. */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="glass flex flex-1 items-center gap-2 rounded-full px-4 py-3 sm:max-w-xl">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("discover.searchPlaceholder")}
            aria-label={t("discover.searchAria")}
            className="w-full bg-transparent text-base outline-none placeholder:text-faint"
          />
        </label>
        <button
          data-nav
          onClick={() => openImport("device")}
          className="shrink-0 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold transition-colors hover:bg-white hover:text-black"
        >
          {t("discover.importGame")}
        </button>
      </div>

      <div className="scrollbar-none mt-4 flex gap-1 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.id}
            data-nav
            aria-pressed={system === f.id}
            onClick={() => setSystem(f.id)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-sm transition-colors ${system === f.id ? "bg-white text-black" : "text-muted hover:text-white"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {error ? (
          <div className="flex flex-col items-start gap-3 py-16">
            <p className="text-muted">{t("discover.error.search")}</p>
            <button onClick={() => setReloadToken((n) => n + 1)} className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/10">
              {t("discover.error.retry")}
            </button>
          </div>
        ) : results === null ? (
          <div className="h-64" />
        ) : shown.length === 0 ? (
          <p className="py-16 text-center text-muted">{t("discover.noResults")}</p>
        ) : (
          <>
            <motion.div layout className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              <AnimatePresence initial={false}>
                {shown.map((g) => (
                  <DiscoveryCard key={g.id} game={g} onOpen={setActive} />
                ))}
              </AnimatePresence>
            </motion.div>
            {results.length > shown.length && (
              <div className="mt-8 flex justify-center">
                <button onClick={() => setVisible((n) => n + PAGE_SIZE)} className="rounded-full border border-white/20 px-5 py-2.5 text-sm hover:bg-white/10">
                  {t("discover.loadMore")}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <GameDetailsModal game={active} onClose={() => setActive(null)} />
    </div>
  );
}
