"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { registerServiceWorker } from "@/lib/pwa/register";
import { initPwaInstall } from "@/lib/pwa/install";
import "@/lib/native-bridge";
import { arrowKeyNav, remoteKey, startGamepadNav } from "@/lib/input/gamepad-nav";
import { useUI } from "@/stores/ui";
import { useLocaleStore, useT } from "@/lib/i18n";
import { ImportDialog } from "./ImportDialog";
import { ConsolePicker } from "./ConsolePicker";
import { InstallButton } from "./InstallButton";
import { useImport } from "./useImport";
import { Icon } from "./player/Icon";

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
    if (window.AndroidNative?.isBundledApp?.()) {
      // APK updates carry their own assets; retain IndexedDB, discard only obsolete
      // worker registrations from the older online wrapper on the same origin.
      void navigator.serviceWorker?.getRegistrations().then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      ).catch(() => undefined);
    } else registerServiceWorker();
    if (!window.AndroidNative) initPwaInstall();
    const onKey = (e: KeyboardEvent) => arrowKeyNav(e);
    window.addEventListener("keydown", onKey);
    const onRemote = (e: Event) => remoteKey((e as CustomEvent<string>).detail);
    window.addEventListener("emurm:remote", onRemote);
    const stop = startGamepadNav(() => {
      // Let open surfaces (dialogs, the in-game menu) claim "back" first.
      const handled = !window.dispatchEvent(new CustomEvent("rv:back", { cancelable: true }));
      if (handled) return;
      if (useUI.getState().importOpen) useUI.getState().closeImport();
      else if (pathRef.current !== "/") router.back();
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("emurm:remote", onRemote);
      stop();
    };
  }, [router]);

  return (
    <>
      {!inPlayer && <TopBar />}
      <main id="main" tabIndex={-1}>{children}</main>
      {!inPlayer && <GlobalDrop />}
      {!inPlayer && <Footer />}
      <ImportDialog />
      <ConsolePicker />
      <Toasts />
    </>
  );
}

function Footer() {
  const t = useT();
  return (
    <footer className="rm-footer flex flex-col items-center gap-2 px-[max(1rem,var(--safe-l))] pb-[max(1.5rem,var(--safe-b))] pt-8 text-center text-xs text-faint">
      <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
      <VisitorCounter />
    </footer>
  );
}

/**
 * hits.sh: a free, no-signup hit counter (shields.io-compatible badge). It counts a request
 * to this exact URL each time the badge image loads, so the number is real cross-visitor
 * traffic — not per-device localStorage, which would only ever count "1" for a returning
 * visitor. The badge's own font can't render Arabic, hence the separate label beside it.
 */
function VisitorCounter() {
  const t = useT();
  return (
    <span className="flex items-center gap-1.5 opacity-80">
      {t("footer.visitors")}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://hits.sh/emurm.com.svg?style=flat-square&label=visits&color=15161a&labelColor=15161a&logo=none"
        alt=""
        className="h-[18px] rounded"
        loading="lazy"
      />
    </span>
  );
}

function TopBar() {
  const pathname = usePathname();
  const openImport = useUI((s) => s.openImport);
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const links = [
    { href: "/", label: t("nav.consoles"), icon: "gamepad" as const },
    { href: "/discover/", label: t("nav.discover"), icon: "discover" as const },
    { href: "/library/", label: t("nav.library"), icon: "library" as const },
    { href: "/settings/", label: t("nav.settings"), icon: "settings" as const },
  ];
  const nav = (mobile: boolean) => <nav className={mobile ? "rm-mobile-nav" : "rm-desktop-nav"} aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"}>
    {links.map(l => {
      const active = l.href === "/" ? pathname === "/" || pathname?.startsWith("/console/") : pathname?.startsWith(l.href.replace(/\/$/, ""));
      return <Link key={l.href} href={l.href} data-nav aria-current={active ? "page" : undefined}><Icon name={l.icon} /><span>{l.label}</span></Link>;
    })}
  </nav>;
  return <>
    <a href="#main" className="rm-skip">{locale === "ar" ? "انتقل إلى المحتوى" : "Skip to content"}</a>
    <header className="rm-topbar"><div className="rm-topbar-inner">
      <Link href="/" data-nav className="rm-brand" aria-label="EmuRM">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/icons/icon-192.png`} alt="" width={40} height={40} />
        <span dir="ltr">Emu<b>RM</b><small>PRESS PLAY. AGAIN.</small></span>
      </Link>
      {nav(false)}
      <div className="rm-top-actions">
        <button data-nav onClick={() => setLocale(locale === "en" ? "ar" : "en")} aria-label={t("lang.switch")} className="rm-language">{locale === "en" ? "عربي" : "EN"}</button>
        <span className="rm-install"><InstallButton /></span>
        <button data-nav onClick={() => openImport("device")} aria-label={t("nav.addGames")} className="rm-button rm-button-primary rm-add"><Icon name="plus" /><span>{t("nav.addGames")}</span></button>
      </div>
    </div></header>
    {nav(true)}
  </>;
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
      className="rm-toasts pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[max(1.25rem,var(--safe-b))]"
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
