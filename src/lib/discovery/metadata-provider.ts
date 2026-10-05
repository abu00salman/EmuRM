import type { ConsoleId } from "@/lib/consoles/types";
import { DEMO_GAMES } from "@/lib/library/demo-catalog";
import { getConsole } from "@/lib/consoles/registry";
import { GAME_DATABASE } from "./game-database";
import type { GameMetadata, GameMetadataProvider } from "./types";

/** RetroBrews homebrew (demo-catalog.ts) is the one catalog EmuRM already has clear
 *  distribution rights to — everything else in Game Discovery is metadata-only. */
function demoGamesAsMetadata(): GameMetadata[] {
  return DEMO_GAMES.map((d) => ({
    id: `demo:${d.rom}`,
    title: d.title,
    consoleId: d.consoleId,
    publisher: d.author,
    genre: getConsole(d.consoleId)?.short,
    description: d.note,
    distributionMode: "built-in-authorized" as const,
    demoTitle: d.title,
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
    const all = [...demoGamesAsMetadata(), ...GAME_DATABASE];
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
