"use client";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { CONSOLES } from "@/lib/consoles/registry";
import { useUI } from "@/stores/ui";
import { useT, useLocale } from "@/lib/i18n";
import { ConsoleHall } from "./ConsoleHall";
import { HowToPlay } from "./HowToPlay";
import { QuickResume } from "./QuickResume";

const INTRO_KEY = "rv:intro-seen";
// Raw <img src> isn't rewritten for GitHub Pages' /<repo>/ subpath the way next/link
// and metadata are — see layout.tsx for the same pattern.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function Home() {
  const [accent, setAccent] = useState<string | null>(null);
  const [cinematic, setCinematic] = useState<boolean | null>(null);
  const [howToPlay, setHowToPlay] = useState(false);
  const reduce = useReducedMotion();
  const openImport = useUI((s) => s.openImport);
  const total = useLiveQuery(() => db().games.count());
  const t = useT();
  const locale = useLocale();
  const HEADLINE = t("home.headline");
  // Arabic letters must stay adjacent to shape correctly, so animate whole words, not characters.
  const units = locale === "ar" ? HEADLINE.split(/(\s+)/) : HEADLINE.split("");

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(INTRO_KEY) === "1";
      localStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* private mode */
    }
    setCinematic(!seen && !reduce);
  }, [reduce]);

  if (cinematic === null) return <div className="min-h-dvh" />;

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* Hero backdrop: the console lineup photo, quiet at the top for the headline,
          fading into the plain dark background before the hall of cards begins. */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-[54vh] min-h-[380px] overflow-hidden sm:h-[62vh]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${BASE}/images/hero-consoles.jpg`}
          alt=""
          className="h-full w-full object-cover object-[center_68%] opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black" />
      </div>

      {/* Ambient room light — follows the console in focus */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 transition-[background] duration-[900ms] ease-[var(--ease-out-quint)]"
        style={{
          background: `radial-gradient(80% 60% at 50% 38%, color-mix(in oklab, ${accent ?? "#3a3d45"} ${accent ? 28 : 16}%, transparent) 0%, transparent 70%)`,
        }}
      />
      <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 h-[38vh] bg-gradient-to-t from-graphite/80 to-transparent" />

      <div className="relative mx-auto max-w-[1600px] px-[max(1rem,var(--safe-l))] pb-24 pt-[calc(var(--safe-t)+6.5rem)] sm:px-8 sm:pt-[calc(var(--safe-t)+8rem)]">
        <h1 className="font-display text-[clamp(3rem,9vw,8.5rem)] font-extrabold leading-[0.82] tracking-[-0.01em]" aria-label={HEADLINE}>
          {cinematic
            ? units.map((ch, i) => (
                <motion.span
                  key={i}
                  aria-hidden
                  className="inline-block"
                  initial={{ opacity: 0, y: "0.4em", filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 0.15 + i * 0.035, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                >
                  {ch === " " ? "\u00a0" : ch}
                </motion.span>
              ))
            : HEADLINE}
        </h1>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: cinematic ? 0.95 : 0.1, duration: 0.8 }}
          className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3"
        >
          <p className="max-w-[46ch] text-base text-muted sm:text-lg">
            {total
              ? t("home.tagline.withGames", {
                  count: total,
                  games: t(total === 1 ? "home.game.one" : "home.game.other"),
                  systems: CONSOLES.length,
                })
              : t("home.tagline.empty")}
          </p>
          {!total && (
            <button data-nav onClick={() => openImport("demo")} className="rounded-full border border-white/20 px-4 py-2 text-sm transition-colors hover:bg-white hover:text-black">
              {t("home.tryHomebrew")}
            </button>
          )}
          <button data-nav onClick={() => setHowToPlay(true)} className="rounded-full border border-white/20 px-4 py-2 text-sm transition-colors hover:bg-white hover:text-black">
            🎮 {t("howToPlay.button")}
          </button>
        </motion.div>

        <div id="console-hall">
          <ConsoleHall cinematic={cinematic} onAccent={setAccent} />
        </div>
        <QuickResume />
      </div>

      <HowToPlay
        open={howToPlay}
        onClose={() => setHowToPlay(false)}
        onChooseDevice={() => document.getElementById("console-hall")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      />
    </div>
  );
}
