import type { ConsoleId } from "@/lib/consoles/types";
import { getConsole } from "@/lib/consoles/registry";
import rawSources from "@/config/game-sources.json";

/**
 * Something "Search the Web" can hand a game off to. Kept as an interface (not just
 * WebSearchProvider below) so a future, differently-shaped source — e.g. a specific
 * storefront's own search API — can implement it without changing the UI that calls it.
 */
export interface GameSourceProvider {
  id: string;
  name: string;
  enabled: boolean;
  supports(consoleId: ConsoleId): boolean;
  /**
   * Deliberately NEVER includes words like "rom"/"download" in the built query — this is
   * a neutral, informational search for the game itself, not one engineered to surface
   * unauthorized-copy sites. The user picks whatever result and source they want from
   * there; EmuRM has no further part in it once this tab opens.
   */
  buildSearchUrl(title: string, consoleId: ConsoleId): string;
}

interface SourceConfig {
  id: string;
  name: string;
  searchUrlTemplate: string;
  supportedSystems: (ConsoleId | "*")[];
  enabled: boolean;
}

/** A neutral web search, built from a config entry's {query} template. This is the one
 *  kind of GameSourceProvider Game Discovery ships with — see src/config/game-sources.json
 *  to point it at a different search engine, or add more of these, without touching code. */
export class WebSearchProvider implements GameSourceProvider {
  id: string;
  name: string;
  enabled: boolean;
  private template: string;
  private supportedSystems: (ConsoleId | "*")[];

  constructor(config: SourceConfig) {
    this.id = config.id;
    this.name = config.name;
    this.enabled = config.enabled;
    this.template = config.searchUrlTemplate;
    this.supportedSystems = config.supportedSystems;
  }

  supports(consoleId: ConsoleId): boolean {
    return this.supportedSystems.includes("*") || this.supportedSystems.includes(consoleId);
  }

  buildSearchUrl(title: string, consoleId: ConsoleId): string {
    const system = getConsole(consoleId)?.short ?? "";
    const query = encodeURIComponent(`${title} ${system}`.trim());
    return this.template.replace("{query}", query);
  }
}

/** Used only if src/config/game-sources.json is missing, empty, or fails validation —
 *  "Search the Web" must never have nothing to do. */
const FALLBACK_CONFIG: SourceConfig = {
  id: "web-search",
  name: "Web Search",
  searchUrlTemplate: "https://www.google.com/search?q={query}",
  supportedSystems: ["*"],
  enabled: true,
};

function isValidConfig(x: unknown): x is SourceConfig {
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

function loadProviders(): GameSourceProvider[] {
  try {
    const configs = Array.isArray(rawSources) ? rawSources.filter(isValidConfig) : [];
    return (configs.length ? configs : [FALLBACK_CONFIG]).map((c) => new WebSearchProvider(c));
  } catch {
    return [new WebSearchProvider(FALLBACK_CONFIG)];
  }
}

const SOURCES = loadProviders();

export function getGameSources(consoleId?: ConsoleId): GameSourceProvider[] {
  return SOURCES.filter((s) => s.enabled && (!consoleId || s.supports(consoleId)));
}
