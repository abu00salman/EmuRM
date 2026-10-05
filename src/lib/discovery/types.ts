import type { ConsoleId } from "@/lib/consoles/types";

/**
 * How a discoverable title can legally reach the player:
 * - "built-in-authorized": EmuRM already has distribution rights (today: the RetroBrews
 *   homebrew catalog) — one tap adds and starts it, same as the existing "demo" import tab.
 * - "external-discovery": EmuRM has metadata only. The user finds and obtains their own
 *   copy elsewhere; EmuRM never touches, proxies, or stores that file until they import it.
 * - "user-import": no discovery entry exists for the title at all — it only ever reaches
 *   the library through the user's own file/link, same as today's Import dialog.
 */
export type DistributionMode = "built-in-authorized" | "external-discovery" | "user-import";

export interface GameMetadata {
  /** Stable slug, e.g. "nes-super-mario-bros" — never a ROM hash, this isn't a library GameRecord. */
  id: string;
  title: string;
  consoleId: ConsoleId;
  year?: number;
  publisher?: string;
  genre?: string;
  description?: string;
  distributionMode: DistributionMode;
  /** Only for "built-in-authorized" entries — the matching src/lib/library/demo-catalog.ts title. */
  demoTitle?: string;
}

/**
 * Pluggable metadata source. Today's only implementation (LocalGameMetadataProvider) reads
 * a bundled JSON file — no network call, no API key, nothing that can go down. The interface
 * exists so a live metadata API (IGDB, TheGamesDB, ScreenScraper…) can be dropped in later
 * without the search UI or the rest of Game Discovery changing at all.
 */
export interface GameMetadataProvider {
  id: string;
  search(query: string, consoleId?: ConsoleId | "all"): Promise<GameMetadata[]>;
}
