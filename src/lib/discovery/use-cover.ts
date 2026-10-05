"use client";
import { useEffect, useState } from "react";
import type { ConsoleId } from "@/lib/consoles/types";
import { fetchBoxArt } from "@/lib/library/boxart";

/** Module-level so the same title isn't re-fetched every time a card scrolls in and out
 *  of view, or the Discover grid re-renders after a filter/search change. */
const cache = new Map<string, Blob | null>();
const inflight = new Map<string, Promise<Blob | null>>();

/** Lazy, cached libretro-thumbnails lookup for a discovery entry — the same legal,
 *  no-API-key box-art source real imports already use (src/lib/library/boxart.ts),
 *  just keyed by title instead of an imported file's name. */
export function useDiscoveryCover(consoleId: ConsoleId, title: string): Blob | null | undefined {
  const key = `${consoleId}:${title}`;
  const [blob, setBlob] = useState<Blob | null | undefined>(cache.has(key) ? cache.get(key) : undefined);

  useEffect(() => {
    let cancelled = false;
    if (cache.has(key)) {
      setBlob(cache.get(key));
      return;
    }
    let promise = inflight.get(key);
    if (!promise) {
      promise = fetchBoxArt(consoleId, title, title);
      inflight.set(key, promise);
    }
    promise.then((b) => {
      cache.set(key, b);
      inflight.delete(key);
      if (!cancelled) setBlob(b);
    });
    return () => {
      cancelled = true;
    };
  }, [key, consoleId, title]);

  return blob;
}
