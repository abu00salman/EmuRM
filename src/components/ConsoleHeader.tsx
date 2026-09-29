"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { useLiveQuery } from "dexie-react-hooks";
import { requireConsole } from "@/lib/consoles/registry";
import type { ConsoleId } from "@/lib/consoles/types";
import { useCountsByConsole } from "@/lib/db/hooks";
import { db } from "@/lib/db/schema";
import { useUI } from "@/stores/ui";
import { useT } from "@/lib/i18n";
import { DeviceGlyph } from "./DeviceGlyph";

const CORE_BASE = process.env.NEXT_PUBLIC_CORE_BASE ?? "";

export function ConsoleHeader({ id }: { id: ConsoleId }) {
  const c = requireConsole(id);
  const counts = useCountsByConsole();
  const openImport = useUI((s) => s.openImport);
  const t = useT();
  const biosHave = useLiveQuery(async () => new Set((await db().bios.where("consoleId").equals(id).toArray()).map((b) => b.fileName)), [id]);
  const missingBios = c.bios.filter((b) => b.required && biosHave && !biosHave.has(b.fileName));
  const needsCore = c.cores[0].hosting === "self" && !CORE_BASE;
  const n = counts?.[id] ?? 0;

  return (
    <header className="relative overflow-hidden">
      {/* Continues the light flood from the hall */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0.55 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ background: `radial-gradient(120% 90% at 50% 0%, color-mix(in oklab, ${c.accent} 34%, black) 0%, transparent 70%)` }}
      />
      <div className="relative mx-auto flex max-w-[1600px] flex-col gap-6 px-[max(1rem,var(--safe-l))] pb-10 pt-[calc(var(--safe-t)+6.5rem)] sm:flex-row sm:items-end sm:px-8 sm:pt-[calc(var(--safe-t)+8rem)]">
        <div className="flex-1">
          <Link href="/" className="text-sm text-muted hover:text-white" data-nav>
            {t("consoleHeader.allConsoles")}
          </Link>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3 font-display text-[clamp(3rem,9vw,8rem)] font-extrabold leading-[0.82]"
          >
            {c.name}
          </motion.h1>
          <p className="mt-4 text-muted">
            {c.maker.split(" · ").join(", ")}, {c.year}. {n === 0 ? t("consoleHeader.noGamesYet") : t("consoleHeader.gamesInLibrary", { count: n, games: t(n === 1 ? "home.game.one" : "home.game.other") })}
          </p>
          {c.aliases.length > 0 && <p className="mt-1 text-sm text-faint">{t("consoleHeader.alsoKnownAs", { aliases: c.aliases.join(", ") })}</p>}
        </div>
        <DeviceGlyph form={c.form} className="hidden h-36 w-48 text-[color:var(--accent)] opacity-80 sm:block" strokeWidth={1.4} />
        <button data-nav onClick={() => openImport("device", id)} className="self-start rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black sm:self-end">
          {t("consoleHeader.addGames", { system: c.short })}
        </button>
      </div>

      {(needsCore || missingBios.length > 0) && (
        <div className="relative mx-auto mb-8 max-w-[1600px] px-[max(1rem,var(--safe-l))] sm:px-8">
          <div className="rounded-2xl border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/[0.06] px-5 py-4 text-sm">
            {needsCore && (
              <p>{t("consoleHeader.needsCoreHost", { core: c.cores[0].id, system: c.short })}</p>
            )}
            {missingBios.length > 0 && (
              <p className={needsCore ? "mt-2" : ""}>
                {t("consoleHeader.needsBios", { system: c.short, files: missingBios.map((b) => b.fileName).join(", ") })}{" "}
                <Link href="/settings/#bios" className="underline underline-offset-4">{t("consoleHeader.addSystemFiles")}</Link>
              </p>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
