// Invariants for the curated Rebuilt Games index. Run: npm run test:rebuilt
const assert = require("node:assert/strict");
const idx = require("../src/data/rebuilt-games.json");
const vetted = require("../src/data/rebuilt-vetted.json");

assert.ok(idx.games.length > 0, "index is empty");
assert.match(idx.source, /^https:\/\/github\.com\/SubmitGame\/awesome-decomp-games$/);
assert.match(idx.sourceCommit, /^[0-9a-f]{40}$/, "index must record the exact upstream commit");
const ids = new Set();
for (const g of idx.games) {
  assert.ok(!ids.has(g.id), `duplicate id ${g.id}`); ids.add(g.id);
  assert.match(g.id, /^[a-z0-9._-]+$/i, `unsafe id ${g.id}`);
  for (const k of ["projectUrl", "homepage", "webUrl"]) if (g[k] != null) assert.ok(g[k].startsWith("https://"), `${g.id}.${k} must be https`);
  assert.ok(g.title && g.platform && g.kind, `${g.id} missing fields`);
  assert.ok(!("play" in g) && !("status" in g), "the index must not carry a playable status; it is derived in code");
}
// Nothing may be playable without an explicit, hand-vetted entry.
for (const id of vetted.play) assert.ok(ids.has(id), `vetted id ${id} not in index`);
assert.equal(vetted.play.length, 0, "no game is verified playable yet: review the evidence before adding one");
// Commercial hosted browser copies must stay out of the index.
for (const g of idx.games) if (g.browser) assert.equal(g.needsAssets, "byo", `${g.id}: only bring-your-own-files browser ports may be listed`);
console.log(`Rebuilt index OK: ${idx.games.length} projects, 0 playable, source ${idx.sourceCommit.slice(0, 7)}`);
