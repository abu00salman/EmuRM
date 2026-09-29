"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { importFiles, importUrl, ImportError, type ImportResult } from "@/lib/library/import";
import { useUI } from "@/stores/ui";
import { useT } from "@/lib/i18n";
import type { ConsoleId } from "@/lib/consoles/types";

export function useImport() {
  const router = useRouter();
  const askConsole = useUI((s) => s.askConsole);
  const toast = useUI((s) => s.toast);
  const t = useT();
  const [busy, setBusy] = useState(false);

  const report = useCallback(
    (r: ImportResult) => {
      const first = r.added[0] ?? r.existing[0];
      if (r.added.length === 1 && first) {
        toast({ message: t("toast.added", { title: first.title }), action: { label: t("quickResume.play"), run: () => router.push(`/play/?game=${first.id}`) } });
      } else if (r.added.length > 1) {
        toast({ message: t("toast.addedMultiple", { count: r.added.length }) });
      } else if (r.existing.length && first) {
        toast({ message: t("toast.alreadyIn", { title: first.title }), action: { label: t("quickResume.play"), run: () => router.push(`/play/?game=${first.id}`) } });
      }
      for (const s of r.skipped) toast({ message: `${s.name}: ${s.reason}`, tone: "error" });
      return r;
    },
    [router, toast, t],
  );

  const chooseConsole = useCallback(
    (rom: { title: string }, candidates: ConsoleId[]) => askConsole(rom.title, candidates),
    [askConsole],
  );

  const fromFiles = useCallback(
    async (files: File[], forceConsole?: ConsoleId) => {
      if (!files.length) return null;
      setBusy(true);
      try {
        return report(await importFiles(files, { chooseConsole, forceConsole }));
      } catch (e) {
        toast({ message: e instanceof Error ? e.message : t("toast.importFailed"), tone: "error" });
        return null;
      } finally {
        setBusy(false);
      }
    },
    [chooseConsole, report, toast, t],
  );

  const fromUrl = useCallback(
    async (url: string, extra?: { title?: string; author?: string; cover?: Blob; source?: "url" | "demo"; forceConsole?: ConsoleId }) => {
      setBusy(true);
      try {
        return report(
          await importUrl(url, {
            chooseConsole,
            titleOverride: extra?.title,
            author: extra?.author,
            cover: extra?.cover,
            source: extra?.source,
            forceConsole: extra?.forceConsole,
          }),
        );
      } catch (e) {
        toast({ message: e instanceof ImportError ? e.message : t("toast.downloadFailed"), tone: "error" });
        return null;
      } finally {
        setBusy(false);
      }
    },
    [chooseConsole, report, toast, t],
  );

  return { busy, fromFiles, fromUrl };
}
