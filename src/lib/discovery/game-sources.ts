import type { ConsoleId } from "@/lib/consoles/types";
import { getConsole } from "@/lib/consoles/registry";
import rawSources from "@/config/game-sources.json";

export interface GameSourceProvider {
  id: string;
  name: string;
  searchUrlTemplate: string;
  supportedSystems: (ConsoleId | "*")[];
  enabled: boolean;
}

/** Used only if src/config/game-sources.json is missing, empty, or fails validation —
 *  Game Discovery's "Find Game" action must never have nothing to do. */
const FALLBACK_SOURCE: GameSourceProvider = {
  id: "web-search",
  name: "Web Search",
  searchUrlTemplate: "https://www.google.com/search?q={query}",
  supportedSystems: ["*"],
  enabled: true,
};

function isValid(x: unknown): x is GameSourceProvider {
  if (!x || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.name === "string" &&
    typeof s.searchUrlTemplate === "string" &&
    s.searchUrlTemplate.includes("{query}") &&
    Array.isArray(s.supportedSystems) &&
    typeof s.enabled === "boolean"
  );
}

function loadSources(): GameSourceProvider[] {
  try {
    const list = Array.isArray(rawSources) ? rawSources.filter(isValid) : [];
    return list.length ? list : [FALLBACK_SOURCE];
  } catch {
    return [FALLBACK_SOURCE];
  }
}

const SOURCES = loadSources();

export function getGameSources(consoleId?: ConsoleId): GameSourceProvider[] {
  return SOURCES.filter((s) => s.enabled && (s.supportedSystems.includes("*") || (consoleId && s.supportedSystems.includes(consoleId))));
}

/**
 * Deliberately NEVER includes words like "rom"/"download" in the built query — this opens
 * a neutral, informational search for the game itself (official storefronts, Wikipedia,
 * reviews…), not a search engineered to surface unauthorized-copy sites. What the user
 * does once that external page opens in their own browser tab is entirely up to them;
 * EmuRM has no part in it from here on — see the external-source rules this satisfies
 * in the feature's own design notes.
 */
export function buildSearchUrl(source: GameSourceProvider, title: string, consoleId: ConsoleId): string {
  const system = getConsole(consoleId)?.short ?? "";
  const query = encodeURIComponent(`${title} ${system}`.trim());
  return source.searchUrlTemplate.replace("{query}", query);
}
