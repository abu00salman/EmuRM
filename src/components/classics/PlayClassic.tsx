"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import type { ClassicGame } from "@/lib/classics/catalog";
import { prepareClassic, toastError } from "@/lib/classics/play";

/** Download (with real progress) -> local library -> player. One component so every entry point behaves the same. */
export function usePlayClassic() {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState<{ game: ClassicGame; progress: number } | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  const play = async (g: ClassicGame) => {
    if (loading) return;
    ctrl.current = new AbortController();
    setLoading({ game: g, progress: 0 });
    try {
      const id = await prepareClassic(g, (progress) => setLoading({ game: g, progress }), ctrl.current.signal);
      router.push(`/play/?game=${id}`);
    } catch (e) {
      if ((e as Error).name !== "AbortError") toastError(`${g.title}: ${t("classics.loadFailed")}`);
      setLoading(null);
    }
  };
  const cancel = () => { ctrl.current?.abort(); setLoading(null); };

  const overlay = loading ? (
    <div role="dialog" aria-modal="true" aria-label={t("classics.loading")} className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-6">
      <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#0d0d10] p-6 text-center">
        <p className="text-sm text-muted">{t("classics.loading")}</p>
        <p className="mt-1 text-lg font-semibold" dir="auto">{loading.game.title}</p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(loading.progress * 100)}>
          <div className="h-full rounded-full bg-[#4D8DFF]" style={{ width: `${Math.round(loading.progress * 100)}%` }} />
        </div>
        <p className="mt-2 text-xs tabular-nums text-muted">{Math.round(loading.progress * 100)}% · {(loading.game.bytes / 1048576).toFixed(1)} MB</p>
        <button data-nav onClick={cancel} className="mt-5 rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/10">{t("classics.cancel")}</button>
      </div>
    </div>
  ) : null;

  return { play, overlay, busy: !!loading };
}
