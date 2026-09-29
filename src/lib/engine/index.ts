import type { CoreDef } from "@/lib/consoles/types";
import type { EmulatorEngine } from "./types";

/**
 * Engines are code-split: none of this is downloaded until a game starts,
 * and each libretro core (.wasm) is fetched only for the system being played.
 */
const loaders: Record<CoreDef["engine"], () => Promise<EmulatorEngine>> = {
  libretro: async () => (await import("./libretro-engine")).libretroEngine,
};

const cache = new Map<string, Promise<EmulatorEngine>>();

export function loadEngine(kind: CoreDef["engine"]): Promise<EmulatorEngine> {
  let p = cache.get(kind);
  if (!p) {
    p = loaders[kind]();
    cache.set(kind, p);
    p.catch(() => cache.delete(kind));
  }
  return p;
}

/** Warm the engine bundle (not the core) when the user hovers a game — cheap and makes Play instant. */
export function prefetchEngine(kind: CoreDef["engine"] = "libretro") {
  void loadEngine(kind).catch(() => undefined);
}

export * from "./types";
