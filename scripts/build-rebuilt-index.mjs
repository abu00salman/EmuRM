// Builds src/data/rebuilt-games.json from a local checkout of
// https://github.com/SubmitGame/awesome-decomp-games (data/games.json, CC0-1.0).
//
//   node scripts/build-rebuilt-index.mjs <path-to-awesome-decomp-games> [--check]
//
// The site never fetches that repo at runtime. A maintainer runs this, reviews the diff of
// the generated JSON in a pull request, and only then does it ship -- so an upstream change
// (bad link, hijacked URL, takedown) can't reach visitors unreviewed.
//
// Selection is deliberately conservative:
//  * only projects whose own link was verified alive upstream and that aren't archived
//  * AI-generated projects (upstream `ai_flag`) are left out
//  * hosted browser copies of commercial games are left out -- the site doesn't point people
//    at unlicensed hosted copies; only hand-reviewed browser ports (BROWSER_BYO_OK) are kept
//  * kept: upstream "top picks" (rated, maintained projects) and the roadmap projects
// Nothing here marks a game "playable": that is decided in code from src/data/rebuilt-vetted.json.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../src/data/rebuilt-games.json", import.meta.url));
const src = process.argv[2];
if (!src) { console.error("usage: build-rebuilt-index.mjs <awesome-decomp-games dir> [--check]"); process.exit(2); }

const raw = JSON.parse(readFileSync(`${src}/data/games.json`, "utf8"));
if (!Array.isArray(raw.games)) throw new Error("unexpected games.json shape");
let sha = "unknown";
try { sha = execFileSync("git", ["-C", src, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch { /* not a git checkout */ }

// Projects named in the roadmap are kept even when upstream's AI flag is set (that flag is a
// source-list heuristic; Ship of Harkinian is a long-established project).
const ROADMAP = new Set(["harbourmasters-shipwright", "coop-deluxe-sm64coopdx", "zelda64recomp-zelda64recomp"]);
// Browser ports that ask for the user's own files, reviewed by hand. Unofficial browser ports
// of commercial titles (Halo, GTA, C&C...) are not listed: their takedown/authorization status
// can't be verified from here.
const BROWSER_BYO_OK = new Set(["wadcmd-doom-in-the-browser"]);
const https = (u) => { try { const x = new URL(u); return x.protocol === "https:" ? x.href : null; } catch { return null; } };
const clip = (s, n) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, n) : "");

const picked = raw.games.filter((g) => {
  if (!g.link_ok || g.archived || !https(g.url)) return false;
  if (g.ai_flag && !ROADMAP.has(g.id)) return false;
  if (g.browser_playable) return BROWSER_BYO_OK.has(g.id) && g.needs_assets === "byo" && !!https(g.play_url);
  return g.top_pick || ROADMAP.has(g.id);
});

const games = picked
  .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.title.localeCompare(b.title))
  .map((g) => ({
    id: g.id,
    title: clip(g.title, 120),
    platform: clip(g.platform, 60),
    kind: g.type,
    description: clip(g.note || g.description, 280),
    projectUrl: https(g.url),
    homepage: https(g.homepage),
    // only meaningful for browser ports that ask for the user's own files
    webUrl: g.browser_playable ? https(g.play_url) : null,
    browser: !!g.browser_playable,
    needsAssets: g.needs_assets ?? null,
    license: g.license ?? null, // as reported by GitHub; null = unspecified, never assumed
    stars: g.stars ?? 0,
    lastCommit: g.last_commit ?? null,
    release: g.release ?? null,
    multiplayer: !!g.multiplayer,
    mods: !!g.mod_group,
    score: g.score ?? 0,
  }));

const out = {
  source: "https://github.com/SubmitGame/awesome-decomp-games",
  sourceLicense: "CC0-1.0 (data); links only, no game assets",
  sourceCommit: sha,
  sourceGeneratedAt: raw.generated_at,
  count: games.length,
  games,
};
const text = JSON.stringify(out, null, 1) + "\n";
if (process.argv.includes("--check")) {
  console.log(readFileSync(OUT, "utf8") === text ? "index is up to date" : "index differs from source");
} else {
  writeFileSync(OUT, text);
  console.log(`wrote ${games.length} projects (source ${sha.slice(0, 7)})`);
}
