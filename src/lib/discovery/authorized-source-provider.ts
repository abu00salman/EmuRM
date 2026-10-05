import type { ConsoleId } from "@/lib/consoles/types";
import { DEMO_GAMES } from "@/lib/library/demo-catalog";

/**
 * A title EmuRM actually has distribution rights to — the only kind of entry Game
 * Discovery is ever allowed to attach a real, playable file to (romUrl). Everything else
 * in the catalog is metadata-only; see GameMetadataProvider's own doc.
 */
export interface AuthorizedGame {
  title: string;
  consoleId: ConsoleId;
  publisher?: string;
  romUrl: string;
  coverUrl?: string;
  note?: string;
}

/**
 * A source of titles EmuRM is authorized to distribute directly — the extension point for
 * "I signed a deal with a publisher" or "I licensed this collection", added later without
 * touching Game Discovery's UI or the rest of this architecture. Each provider just lists
 * what it has rights to; getAuthorizedGames() below merges every registered one.
 */
export interface AuthorizedSourceProvider {
  id: string;
  list(): AuthorizedGame[];
}

/**
 * Today's only implementation: the free homebrew catalog (src/lib/library/demo-catalog.ts)
 * already linked from the Import dialog's "Homebrew" tab — the one set of games EmuRM has
 * clear, existing distribution rights to. A future licensed-publisher deal becomes a second
 * AuthorizedSourceProvider registered alongside this one, not a change to this file.
 */
export class RetroBrewsAuthorizedProvider implements AuthorizedSourceProvider {
  id = "retrobrews-homebrew";

  list(): AuthorizedGame[] {
    return DEMO_GAMES.map((d) => ({
      title: d.title,
      consoleId: d.consoleId,
      publisher: d.author,
      romUrl: d.rom,
      coverUrl: d.cover,
      note: d.note,
    }));
  }
}

let providers: AuthorizedSourceProvider[] = [new RetroBrewsAuthorizedProvider()];

export function getAuthorizedGames(): AuthorizedGame[] {
  return providers.flatMap((p) => p.list());
}

/** Register another authorized catalog later (e.g. a licensed publisher's) without
 *  touching Game Discovery's search, filters, or card/details UI at all. */
export function registerAuthorizedSourceProvider(provider: AuthorizedSourceProvider) {
  providers = [...providers, provider];
}
