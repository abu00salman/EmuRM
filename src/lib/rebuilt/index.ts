import index from "@/data/rebuilt-games.json";
import vetted from "@/data/rebuilt-vetted.json";

/** One entry of the curated index (see scripts/build-rebuilt-index.mjs). */
export interface RebuiltGame {
  id: string;
  title: string;
  platform: string;
  kind: string;
  description: string;
  projectUrl: string;
  homepage: string | null;
  webUrl: string | null;
  browser: boolean;
  needsAssets: string | null;
  license: string | null;
  stars: number;
  lastCommit: string | null;
  release: string | null;
  multiplayer: boolean;
  mods: boolean;
  score: number;
}

/**
 * play   - legitimately playable in a browser tab (hand-vetted only)
 * import - a browser port where the player supplies their own game files
 * view   - needs a local build/download, or isn't integrated: information only
 * soon   - integration planned, not available
 */
export type RebuiltStatus = "play" | "import" | "view" | "soon";

export const REBUILT_SOURCE = {
  url: index.source,
  license: index.sourceLicense,
  commit: index.sourceCommit,
  generatedAt: index.sourceGeneratedAt,
};

export const REBUILT_GAMES: readonly RebuiltGame[] = index.games as RebuiltGame[];

const PLAY = new Set<string>(vetted.play);
const SOON = new Set<string>(vetted.planned);

/** Status is derived here from vetted data -- never taken from the upstream list. */
export function statusOf(g: RebuiltGame): RebuiltStatus {
  if (PLAY.has(g.id) && g.webUrl) return "play";
  if (g.browser && g.needsAssets === "byo" && g.webUrl) return "import";
  if (SOON.has(g.id)) return "soon";
  return "view";
}

/** The one link a status's button may open. Play/Import go to the project's own web page. */
export function actionUrl(g: RebuiltGame): string {
  const s = statusOf(g);
  return (s === "play" || s === "import") && g.webUrl ? g.webUrl : g.projectUrl;
}

export function getRebuilt(id: string): RebuiltGame | undefined {
  return REBUILT_GAMES.find((g) => g.id === id);
}

export const KIND_LABELS: Record<string, string> = {
  decompilation: "Decompilation",
  "static-recomp": "Static recompilation",
  "source-port": "Source port",
  "engine-remake": "Engine remake",
  disassembly: "Disassembly",
  "browser-port": "Browser port",
};

/** First platform token ("N64 / GameCube" -> "N64") used for filtering. */
export const platformKey = (g: RebuiltGame) => g.platform.split("/")[0]!.trim() || "PC";
