"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { CONSOLES } from "@/lib/consoles/registry";
import type { ConsoleDef } from "@/lib/consoles/types";
import { useCountsByConsole } from "@/lib/db/hooks";
import { useT } from "@/lib/i18n";
import { DeviceGlyph } from "./DeviceGlyph";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * The hall: a row of lit display cases. The room's ambient light takes the colour
 * of whichever console you're looking at — the one orchestrated effect on the page.
 */
export function ConsoleHall({ cinematic, onAccent }: { cinematic: boolean; onAccent: (hex: string | null) => void }) {
  const counts = useCountsByConsole();
  const router = useRouter();
  const [leaving, setLeaving] = useState<ConsoleDef | null>(null);
  const reduce = useReducedMotion();

  const open = (c: ConsoleDef) => {
    if (reduce) return router.push(`/console/${c.id}/`);
    setLeaving(c);
    setTimeout(() => router.push(`/console/${c.id}/`), 420);
  };

  return (
    <>
      <div
        className="scrollbar-none -mx-[max(1rem,var(--safe-l))] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1rem,var(--safe-l))] pb-16 pt-6 sm:-mx-8 sm:gap-6 sm:px-8 [perspective:1400px]"
        onMouseLeave={() => onAccent(null)}
      >
        {CONSOLES.map((c, i) => (
          <motion.div
            key={c.id}
            className="snap-start"
            initial={cinematic ? { opacity: 0, y: 60, z: -300, filter: "blur(14px)" } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0, z: 0, filter: "blur(0px)" }}
            transition={
              cinematic
                ? { delay: 1.15 + i * 0.07, duration: 1.1, ease: [0.22, 1, 0.36, 1] }
                : { delay: i * 0.025, duration: 0.5, ease: [0.22, 1, 0.36, 1] }
            }
          >
            <ConsoleCase console={c} count={counts?.[c.id] ?? 0} onFocus={() => onAccent(c.accent)} onOpen={() => open(c)} />
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {leaving && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: `radial-gradient(120% 90% at 50% 0%, color-mix(in oklab, ${leaving.accent} 38%, black) 0%, black 70%)`,
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function ConsoleCase({
  console: c,
  count,
  onFocus,
  onOpen,
}: {
  console: ConsoleDef;
  count: number;
  onFocus: () => void;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const t = useT();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 220, damping: 22 });
  const sy = useSpring(py, { stiffness: 220, damping: 22 });
  const rotY = useTransform(sx, [-0.5, 0.5], [9, -9]);
  const rotX = useTransform(sy, [-0.5, 0.5], [-7, 7]);
  const glyphX = useTransform(sx, [-0.5, 0.5], [-10, 10]);
  const glyphY = useTransform(sy, [-0.5, 0.5], [-6, 6]);
  const sheen = useTransform(sx, [-0.5, 0.5], ["10%", "90%"]);
  const sheenBg = useTransform(sheen, (v) => `linear-gradient(105deg, transparent calc(${v} - 18%), rgb(255 255 255 / 0.07) ${v}, transparent calc(${v} + 18%))`);
  const [active, setActive] = useState(false);

  const move = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => {
    px.set(0);
    py.set(0);
    setActive(false);
  };

  const makers = c.maker.split(" · ");
  const show = active;

  return (
    <motion.button
      ref={ref}
      data-nav
      onClick={onOpen}
      onPointerMove={move}
      onPointerEnter={() => {
        setActive(true);
        onFocus();
      }}
      onPointerLeave={reset}
      onFocus={() => {
        setActive(true);
        onFocus();
      }}
      onBlur={reset}
      whileTap={{ scale: 0.97 }}
      style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d", ["--accent" as string]: c.accent }}
      aria-label={t("consoleCase.aria", { name: c.name, maker: c.maker, year: c.year, count, games: t(count === 1 ? "home.game.one" : "home.game.other") })}
      className="group relative block h-[340px] w-[216px] shrink-0 rounded-[28px] text-start outline-offset-8 sm:h-[380px] sm:w-[244px]"
    >
      {/* Case */}
      <div className="glass absolute inset-0 overflow-hidden rounded-[28px] transition-[border-color] duration-500 group-hover:border-white/20 group-focus-visible:border-white/25">
        {/* The photo itself carries the mood (and its own fade to black at the bottom for
            the placard), so photographed consoles skip the drawn backdrop entirely. */}
        {c.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${BASE}/images/consoles/${c.photo}`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover:scale-[1.04]"
          />
        ) : (
          <>
            {/* Spotlight from the ceiling of the case */}
            <div
              className="absolute inset-x-6 top-0 h-px transition-opacity duration-500"
              style={{ background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)`, opacity: show ? 1 : 0.55 }}
            />
            <div
              className="absolute inset-0 transition-opacity duration-700"
              style={{
                background: `radial-gradient(70% 55% at 50% 0%, color-mix(in oklab, ${c.accent} 30%, transparent) 0%, transparent 70%)`,
                opacity: show ? 1 : 0.45,
              }}
            />
          </>
        )}
        {/* Accent glow on hover — kept subtle over a photo, full strength over line art */}
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            background: `radial-gradient(70% 55% at 50% 0%, color-mix(in oklab, ${c.accent} ${c.photo ? 16 : 0}%, transparent) 0%, transparent 70%)`,
            opacity: show ? 1 : 0,
            mixBlendMode: c.photo ? "screen" : "normal",
          }}
        />
        {/* Moving sheen on the glass */}
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: sheenBg,
          }}
        />
        {/* Status */}
        {c.status === "experimental" && (
          <span className="absolute end-4 top-4 rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-muted">{t("consoleCase.experimental")}</span>
        )}
      </div>

      {/* Exhibit — only the systems without a photo get the drawn glyph */}
      {!c.photo && (
        <motion.div className="absolute inset-x-0 top-[18%] flex justify-center" style={{ x: glyphX, y: glyphY, translateZ: 40 }}>
          <DeviceGlyph
            form={c.form}
            className="w-[72%] text-[color:var(--accent)] drop-shadow-[0_0_18px_color-mix(in_oklab,var(--accent)_55%,transparent)] transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover:-translate-y-2"
            strokeWidth={1.6}
          />
        </motion.div>
      )}

      {/* Placard */}
      <div className="absolute inset-x-0 bottom-0 p-5" style={{ transform: "translateZ(30px)" }}>
        <p className="font-display text-[3.4rem] font-extrabold leading-[0.8] tracking-tight text-white">{c.short}</p>
        <p className="mt-2 truncate text-sm text-white/80">{c.name}</p>
        <div
          className="grid transition-[grid-template-rows,opacity] duration-500 ease-[var(--ease-out-quint)]"
          style={{ gridTemplateRows: show ? "1fr" : "0fr", opacity: show ? 1 : 0 }}
        >
          <div className="overflow-hidden">
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-faint">{t("consoleCase.released")}</dt>
              <dd className="text-muted">{c.year}</dd>
              <dt className="text-faint">{t("consoleCase.madeBy")}</dt>
              <dd className="truncate text-muted">{makers.join(", ")}</dd>
              <dt className="text-faint">{t("consoleCase.yourGames")}</dt>
              <dd className="text-muted tabular-nums">{count === 0 ? t("consoleCase.noneYet") : count}</dd>
            </dl>
          </div>
        </div>
      </div>

      {/* Floor reflection */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 left-1/2 h-10 w-[80%] -translate-x-1/2 rounded-[50%] blur-xl transition-opacity duration-700"
        style={{ background: c.accent, opacity: show ? 0.35 : 0.1 }}
      />
    </motion.button>
  );
}
