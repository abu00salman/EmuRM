# Rebuilt Games

A section of EmuRM (`/rebuilt/`) that catalogs decompilations, static recompilations,
source ports and engine remakes of classic games.

## Where the data comes from
`src/data/rebuilt-games.json` is generated from
[SubmitGame/awesome-decomp-games](https://github.com/SubmitGame/awesome-decomp-games)
(`data/games.json`, CC0-1.0) by `scripts/build-rebuilt-index.mjs`. The site never fetches
that repo at runtime. Refresh process:

```sh
git clone --depth 1 https://github.com/SubmitGame/awesome-decomp-games /tmp/adg
npm run build:rebuilt-index -- /tmp/adg   # rewrites src/data/rebuilt-games.json
git diff src/data/rebuilt-games.json      # review every link/title change
npm run test:rebuilt                      # invariants
```
The diff goes through a pull request, so an upstream change cannot reach visitors unreviewed.
The index records the exact upstream commit.

## What is selected (and what is not)
Kept: upstream "top picks" with a live link and not archived, the roadmap projects (Ship of
Harkinian, sm64coopdx, Zelda64Recomp), and hand-reviewed browser ports that make the player
bring their own files (`BROWSER_BYO_OK`). Left out: projects flagged AI-generated upstream,
and hosted browser copies of commercial games (their authorization can't be verified).
Upstream presence is **not** treated as proof that something runs in a browser.

## Statuses (derived in `src/lib/rebuilt/index.ts`, never copied from upstream)
| Status | Meaning | Rule |
|---|---|---|
| Play Now | runs in a browser, legally available | id listed in `rebuilt-vetted.json` `play` (hand-vetted, with evidence) |
| Import Your Files | project's own web page; the player loads their own files | browser port needing user files |
| View Project | needs a local build/download | everything else |
| Coming Soon | planned | id listed in `rebuilt-vetted.json` `planned` |

`rebuilt-vetted.json` is empty: no game has been verified as legally playable in-browser yet.
EmuRM never hosts or proxies game files; all action buttons open the project's own pages.
Covers are generated gradients (no game artwork is bundled or hotlinked). Feature badges
(Multiplayer, Mods) only appear when the upstream data says so; no FPS/widescreen claims are made.
