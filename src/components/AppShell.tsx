"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { registerServiceWorker } from "@/lib/pwa/register";
import { arrowKeyNav, startGamepadNav } from "@/lib/input/gamepad-nav";
import { useUI } from "@/stores/ui";
import { useLocaleStore, useT } from "@/lib/i18n";
import { ImportDialog } from "./ImportDialog";
import { ConsolePicker } from "./ConsolePicker";
import { useImport } from "./useImport";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const inPlayer = pathname?.startsWith("/play");

  // Next's usePathname() is already basePath-normalized (unlike window.location.pathname,
  // which under a GitHub Pages subpath would be "/EmuRM/" on the home page, not "/").
  // Kept in a ref since the effect below subscribes once and reads the latest value lazily.
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    useLocaleStore.getState().hydrateFromStorage();
    registerServiceWorker();
    const onKey = (e: KeyboardEvent) => arrowKeyNav(e);
    window.addEventListener("keydown", onKey);
    const stop = startGamepadNav(() => {
      // Let open surfaces (dialogs, the in-game menu) claim "back" first.
      const handled = !window.dispatchEvent(new CustomEvent("rv:back", { cancelable: true }));
      if (handled) return;
      if (useUI.getState().importOpen) useUI.getState().closeImport();
      else if (pathRef.current !== "/") router.back();
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      stop();
    };
  }, [router]);

  return (
    <>
      {!inPlayer && <TopBar />}
      <main id="main">{children}</main>
      {!inPlayer && <GlobalDrop />}
      <ImportDialog />
      <ConsolePicker />
      <Toasts />
    </>
  );
}

function TopBar() {
  const pathname = usePathname();
  const openImport = useUI((s) => s.openImport);
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const links = [
    { href: "/", label: t("nav.consoles") },
    { href: "/library/", label: t("nav.library") },
    { href: "/settings/", label: t("nav.settings") },
  ];
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 pt-[var(--safe-t)]">
      <div className="pointer-events-auto mx-auto flex max-w-[1600px] items-center gap-2 px-[max(1rem,var(--safe-l))] py-3 sm:px-8">
        <Link href="/" data-nav className="me-auto flex items-center gap-2 rounded-lg px-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE}/icons/icon-192.png`} alt="" width={32} height={32} className="h-7 w-7 rounded-[9px] sm:h-8 sm:w-8" />
          <span className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">{t("app.name")}</span>
        </Link>
        <nav className="glass flex items-center gap-0.5 rounded-full p-1 text-[13px] sm:gap-1 sm:text-sm">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname?.startsWith(l.href.replace(/\/$/, ""));
            return (
              <Link
                key={l.href}
                href={l.href}
                data-nav
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-2.5 py-1.5 transition-colors sm:px-3.5 ${active ? "bg-white/12 text-white" : "text-muted hover:text-white"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <button
          data-nav
          onClick={() => setLocale(locale === "en" ? "ar" : "en")}
          aria-label={t("lang.switch")}
          className="glass grid h-9 min-w-9 place-items-center rounded-full px-3 text-xs font-semibold text-muted transition-colors hover:text-white"
        >
          {locale === "en" ? "AR" : "EN"}
        </button>
        <button
          data-nav
          onClick={() => openImport("device")}
          aria-label={t("nav.addGames")}
          className="grid h-9 min-w-9 place-items-center rounded-full bg-white px-0 text-sm font-semibold text-black transition-transform active:scale-95 sm:h-auto sm:px-4 sm:py-2"
        >
          <span className="text-xl leading-none sm:hidden" aria-hidden>+</span>
          <span className="hidden sm:inline">{t("nav.addGames")}</span>
        </button>
      </div>
    </header>
  );
}

/** Drop ROMs anywhere on the page. */
function GlobalDrop() {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const { fromFiles } = useImport();
  const t = useT();

  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current++;
      setOver(true);
    };
    const leave = () => {
      depth.current = Math.max(0, depth.current - 1);
      if (!depth.current) setOver(false);
    };
    const overFn = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setOver(false);
      if (useUI.getState().importOpen) return; // the dialog handles its own drop
      void fromFiles(Array.from(e.dataTransfer?.files ?? []));
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", overFn);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", overFn);
      window.removeEventListener("drop", drop);
    };
  }, [fromFiles]);

  return (
    <AnimatePresence>
      {over && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-md"
        >
          <div className="rounded-3xl border border-dashed border-white/30 px-12 py-10 text-center">
            <p className="font-display text-4xl font-bold">{t("home.dropTitle")}</p>
            <p className="mt-2 text-muted">{t("home.dropHint")}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Toasts() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismiss);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[max(1.25rem,var(--safe-b))]"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className={`glass-strong pointer-events-auto flex max-w-lg items-center gap-4 rounded-2xl px-4 py-3 text-sm shadow-2xl ${t.tone === "error" ? "border-red-400/30" : ""}`}
          >
            <span className={t.tone === "error" ? "text-red-200" : ""}>{t.message}</span>
            {t.action && (
              <button
                className="shrink-0 rounded-full bg-white px-3 py-1 font-semibold text-black"
                onClick={() => {
                  t.action?.run();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
