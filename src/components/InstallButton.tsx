"use client";
import { useEffect, useState } from "react";
import { isIOS } from "@/lib/pwa/install";
import { usePwa } from "@/stores/pwa";
import { useT } from "@/lib/i18n";
import { Modal } from "./Modal";

export function InstallButton() {
  const { installed, canInstall, promptInstall } = usePwa();
  const [ios, setIos] = useState(false);
  const [guide, setGuide] = useState(false);
  const t = useT();

  // iOS detection reads navigator, so it must happen client-side after mount.
  useEffect(() => setIos(isIOS()), []);

  if (installed || !(canInstall || ios)) return null;

  return (
    <>
      <button
        data-nav
        onClick={() => (canInstall ? void promptInstall() : setGuide(true))}
        className="glass hidden items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-white sm:flex sm:text-sm"
      >
        <DownloadIcon />
        {t("pwa.install")}
      </button>
      <button
        data-nav
        onClick={() => (canInstall ? void promptInstall() : setGuide(true))}
        aria-label={t("pwa.install")}
        className="glass grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-white sm:hidden"
      >
        <DownloadIcon />
      </button>

      <Modal open={guide} onClose={() => setGuide(false)} label={t("pwa.install")}>
        <h2 className="font-display text-2xl font-bold">{t("pwa.install")}</h2>
        <p className="mt-2 text-sm text-muted">{t("pwa.iosStep1")}</p>
        <ol className="mt-4 flex flex-col gap-3 text-sm">
          <li className="flex items-center gap-3 rounded-2xl border border-line bg-white/[0.02] p-3">
            <ShareIcon />
            {t("pwa.iosStep2")}
          </li>
          <li className="flex items-center gap-3 rounded-2xl border border-line bg-white/[0.02] p-3">
            <PlusSquareIcon />
            {t("pwa.iosStep3")}
          </li>
        </ol>
        <button
          data-nav
          data-autofocus
          onClick={() => setGuide(false)}
          className="mt-5 w-full rounded-full bg-white py-3 text-sm font-semibold text-black transition-transform active:scale-[0.98]"
        >
          {t("pwa.gotIt")}
        </button>
      </Modal>
    </>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 16V4m0 0-3.5 3.5M12 4l3.5 3.5M6 10H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1" />
    </svg>
  );
}

function PlusSquareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8m-4-4h8" />
    </svg>
  );
}
