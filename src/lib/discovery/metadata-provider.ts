import type { ConsoleId } from "@/lib/consoles/types";
import { getConsole } from "@/lib/consoles/registry";
import { getAuthorizedGames } from "./authorized-source-provider";
import { GAME_DATABASE } from "./game-database";
import type { GameMetadata, GameMetadataProvider } from "./types";

/** Every registered AuthorizedSourceProvider's titles, surfaced as "built-in-authorized"
 *  Game Discovery entries — today that's just the RetroBrews homebrew catalog, but a
 *  future licensed-publisher provider appears here automatically once registered. */
function authorizedGamesAsMetadata(): GameMetadata[] {
  return getAuthorizedGames().map((a) => ({
    id: `authorized:${a.romUrl}`,
    title: a.title,
    consoleId: a.consoleId,
    publisher: a.publisher,
    genre: getConsole(a.consoleId)?.short,
    description: a.note,
    distributionMode: "built-in-authorized" as const,
    authorized: a,
  }));
}

function matches(entry: GameMetadata, terms: string[], consoleId?: ConsoleId | "all") {
  if (consoleId && consoleId !== "all" && entry.consoleId !== consoleId) return false;
  if (!terms.length) return true;
  const c = getConsole(entry.consoleId);
  const hay = `${entry.title} ${entry.publisher ?? ""} ${entry.genre ?? ""} ${c?.name ?? ""} ${c?.short ?? ""} ${(c?.aliases ?? []).join(" ")}`.toLowerCase();
  return terms.every((term) => hay.includes(term));
}

/**
 * Local, bundled, always-available metadata source — no network call, no API key, can't
 * go down. Satisfies the GameMetadataProvider interface so a live metadata API can be
 * swapped in later (see the type's own doc) without touching the search UI.
 */
export class LocalGameMetadataProvider implements GameMetadataProvider {
  id = "local";

  async search(query: string, consoleId?: ConsoleId | "all"): Promise<GameMetadata[]> {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const all = [...authorizedGamesAsMetadata(), ...GAME_DATABASE];
    return all.filter((e) => matches(e, terms, consoleId));
  }
}

let active: GameMetadataProvider = new LocalGameMetadataProvider();

export function getMetadataProvider(): GameMetadataProvider {
  return active;
}

/** Swap in a different provider later (e.g. a live metadata API) without changing callers. */
export function setMetadataProvider(provider: GameMetadataProvider) {
  active = provider;
}
