"use client";
import { importFiles } from "@/lib/library/import";
import { useUI } from "@/stores/ui";
import { classicCoverUrl, classicFileUrl, type ClassicGame } from "./catalog";

/** Downloads with real byte progress (falls back to the catalog size when there is no Content-Length). */
export async function download(url: string, expected: number, onProgress: (f: number) => void, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(url, { signal });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const total = Number(res.headers.get("content-length")) || expected;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    onProgress(total ? Math.min(1, got / total) : 0);
  }
  onProgress(1);
  return new Blob(chunks as BlobPart[]);
}

/** Puts the hosted game into the local library (deduplicated by content) and returns its id. */
export async function prepareClassic(g: ClassicGame, onProgress: (f: number) => void, signal?: AbortSignal): Promise<string> {
  const blob = await download(classicFileUrl(g), g.bytes, onProgress, signal);
  const cover = await fetch(classicCoverUrl(g), { signal }).then((r) => (r.ok ? r.blob() : undefined)).catch(() => undefined);
  const result = await importFiles([new File([blob], g.file)], {
    forceConsole: g.console,
    chooseConsole: async () => g.console,
    source: "demo",
    sourceUrl: g.source,
    author: g.author,
    cover,
  });
  const rec = result.added[0] ?? result.existing[0];
  if (!rec) throw new Error(result.skipped[0]?.reason ?? "import failed");
  return rec.id;
}

export function useClassicFavorites() {
  const KEY = "emurm:classics-fav";
  const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };
  const toggle = (id: string) => {
    const s = new Set(read());
    if (s.has(id)) s.delete(id); else s.add(id);
    try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch { /* private mode */ }
    return [...s];
  };
  return { read, toggle };
}

export const toastError = (message: string) => useUI.getState().toast({ message, tone: "error" });
